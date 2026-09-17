/* Clock_r — regenera los vectores dorados del hash de asiento.
   Uso:
     node --experimental-strip-types scripts/clock-hash-vectors.ts sql
     node --experimental-strip-types scripts/clock-hash-vectors.ts escribir resultado.json

   POR QUÉ ES UN SCRIPT Y NO UN TEST. Ningún test de este repo habla con Supabase, y el hash de
   producción lo calcula SOLO Postgres (plan, H4). Para que el test de node pueda comprobar que
   lib/clock/hash.ts calcula lo mismo que la base de datos, los valores esperados tienen que salir
   de la base de datos una vez y quedarse escritos. Esto es lo que los saca.

   POR QUÉ EN DOS PASOS. No hay cliente de SQL crudo en el repo —`@supabase/supabase-js` habla
   PostgREST, no SQL— y meter uno solo para esto no compensa. Así que el paso `sql` imprime la
   consulta, se pega en el SQL Editor de Supabase, y el paso `escribir` recibe el JSON de vuelta.
   El orden de los campos NO se repite aquí: se lee de HASH_FIELD_ORDER, porque dos listas en dos
   ficheros acaban divergiendo y ese es justo el fallo que esto viene a impedir.

   ANTES DE ESCRIBIR NADA comprueba que la función de TypeScript reproduce lo que devolvió Postgres.
   Si no coincide, no toca el fixture: un fixture regenerado a ciegas convertiría una divergencia
   real en un test que pasa. */

import { readFileSync, writeFileSync } from 'node:fs';
import {
  HASH_FIELD_ORDER,
  clockEntryHash,
  clockEntryPayload,
  type ClockHashFields,
} from '../lib/clock/hash.ts';

type Caso = { label: string; why: string; fields: ClockHashFields };

/* Las entradas. Cada una existe por un motivo que se escribe al lado: un vector sin motivo es un
   vector que nadie sabrá si puede borrar. */
const CASOS: Caso[] = [
  {
    label: 'primero',
    why: 'Primer asiento de una persona: prev_hash vacío.',
    fields: {
      prevHash: '', personId: '11111111-1111-4111-8111-111111111111',
      personEmail: 'ana@interactius.com', personName: 'Ana Ruiz',
      op: 'record', corrects: '', reason: '', kind: 'in',
      occurredAtMicros: '1789624991123456', workDate: '2026-09-17',
      mode: 'onsite', source: 'home_card', authorPersonId: '11111111-1111-4111-8111-111111111111',
    },
  },
  {
    label: 'motivo-multibyte',
    why: '«José Muñoz» son 10 caracteres y 12 bytes. Si el prefijo midiera caracteres, fallaría.',
    fields: {
      prevHash: '', personId: '33333333-3333-4333-8333-333333333333',
      personEmail: 'jose@interactius.com', personName: 'José Muñoz',
      op: 'amend', corrects: '22222222-2222-4222-8222-222222222222',
      reason: 'Reunión en cliente — cambió la hora', kind: 'in',
      occurredAtMicros: '1789628400000000', workDate: '2026-09-17',
      mode: 'remote', source: 'app', authorPersonId: '33333333-3333-4333-8333-333333333333',
    },
  },
];

/* Un literal de SQL, escapando la comilla simple. Entra texto que hemos escrito nosotros, pero la
   costumbre de no concatenar sin escapar no se hace excepciones. */
const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

function sql(): string {
  const filas = CASOS.map((c) => {
    const f = c.fields;
    return `    (${lit(c.label)},\n     ${lit(f.prevHash)}, ${lit(f.personId)}::uuid, ${lit(f.personEmail)}, ${lit(f.personName)},\n` +
      `     ${lit(f.op)}, ${f.corrects ? `${lit(f.corrects)}::uuid` : 'null::uuid'}, ${f.reason ? lit(f.reason) : 'null::text'}, ${lit(f.kind)},\n` +
      /* Los microsegundos se reconstruyen multiplicando un interval, NO dividiendo: dividir pasa
         por un double y 1789624991.123456 tiene 16 cifras significativas, justo en el límite de la
         precisión. Un microsegundo perdido aquí saldría como un hash distinto y parecería una
         divergencia entre TypeScript y Postgres donde solo habría un fallo del generador. */
      `     (to_timestamp(0) + ${f.occurredAtMicros}::bigint * interval '1 microsecond'), ${lit(f.workDate)}::date, ${lit(f.mode)}, ${lit(f.source)},\n` +
      `     ${lit(f.authorPersonId)}::uuid)`;
  }).join(',\n');

  /* El hash sale de la función REAL, la que escribe en producción. La carga útil se reconstruye
     aquí porque clock_entry_hash devuelve solo el hash; si las dos no encajaran, el hash tampoco
     cuadraría y el paso `escribir` se negaría a tocar el fixture. */
  return `with entradas(label, prev_hash, person_id, person_email, person_name, op, corrects, reason, kind, occurred_at, work_date, mode, source, author_person_id) as (
  values
${filas}
)
select e.label,
       (select string_agg(octet_length(v) || ':' || v, '' order by ord)
          from unnest(array[
            coalesce(e.prev_hash, ''), coalesce(e.person_id::text, ''),
            coalesce(e.person_email, ''), coalesce(e.person_name, ''),
            coalesce(e.op, ''), coalesce(e.corrects::text, ''), coalesce(e.reason, ''),
            coalesce(e.kind, ''),
            coalesce(((extract(epoch from e.occurred_at) * 1000000)::bigint)::text, ''),
            coalesce(to_char(e.work_date, 'YYYY-MM-DD'), ''),
            coalesce(e.mode, ''), coalesce(e.source, ''), coalesce(e.author_person_id::text, '')
          ]) with ordinality as t(v, ord)) as payload,
       public.clock_entry_hash(
         e.prev_hash, e.person_id, e.person_email, e.person_name, e.op, e.corrects, e.reason,
         e.kind, e.occurred_at, e.work_date, e.mode, e.source, e.author_person_id
       ) as hash
from entradas e;`;
}

function escribir(ruta: string): void {
  const filas = JSON.parse(readFileSync(ruta, 'utf8')) as {
    label: string;
    payload: string;
    hash: string;
  }[];

  const vectors = CASOS.map((c) => {
    const fila = filas.find((f) => f.label === c.label);
    if (!fila) throw new Error(`Postgres no devolvió el caso "${c.label}"`);

    // El guardia: si TypeScript y Postgres no coinciden, NO se escribe. Regenerar a ciegas
    // convertiría una divergencia real en un test verde, que es peor que no tener test.
    const payload = clockEntryPayload(c.fields);
    const hash = clockEntryHash(c.fields);
    if (payload !== fila.payload) {
      throw new Error(`"${c.label}": la carga útil de TypeScript no es la de Postgres.\n  ts: ${payload}\n  pg: ${fila.payload}`);
    }
    if (hash !== fila.hash) {
      throw new Error(`"${c.label}": el hash de TypeScript no es el de Postgres (${hash} / ${fila.hash})`);
    }
    return { label: c.label, why: c.why, fields: c.fields, payload: fila.payload, hash: fila.hash };
  });

  /* El comentario se reescribe con el fichero: si la primera regeneración lo borrara, el siguiente
     que lo abriera no tendría cómo saber que es generado ni con qué. */
  const _comment = [
    'Vectores dorados del hash de asiento de Clock_r. GENERADOS DESDE POSTGRES, no a mano:',
    'scripts/clock-hash-vectors.ts los regenera. Ver docs/features/clock-r-plan.md H4 y H5.',
    'Son la única prueba de que la función de TypeScript y la de Postgres calculan lo mismo,',
    'porque ningún test de este repo habla con la base de datos. Si cambias la función de',
    'Postgres, hay que regenerar este fichero o el test deja de significar nada.',
    `Regenerados el ${new Date().toISOString().slice(0, 10)}.`,
  ];

  const destino = new URL('../lib/clock/__tests__/fixtures/hash-vectors.json', import.meta.url);
  writeFileSync(destino, `${JSON.stringify({ _comment, _orden: HASH_FIELD_ORDER, vectors }, null, 2)}\n`);
  console.log(`Escritos ${vectors.length} vectores en ${destino.pathname}`);
}

const [modo, ruta] = process.argv.slice(2);
if (modo === 'sql') {
  console.log(sql());
} else if (modo === 'escribir' && ruta) {
  escribir(ruta);
} else {
  console.error('Uso: clock-hash-vectors.ts sql | clock-hash-vectors.ts escribir <resultado.json>');
  process.exit(1);
}
