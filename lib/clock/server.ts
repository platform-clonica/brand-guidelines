/* Clock_r — lo que deciden los Route Handlers, sin Next ni Supabase, para poder testearlo en node.
   Los handlers de app/api/clock solo hacen de fontanería: sesión, llamada y respuesta. Mismo reparto
   que lib/ds/server.ts, y la razón de que en este repo no haya tests de handler.

   LA REGLA QUE SOSTIENE ESTE FICHERO. El hash de un asiento prueba que nadie lo tocó DESPUÉS de
   escribirlo. No prueba que el dato fuera cierto al escribirlo. Así que la integridad de la cadena
   no sirve de nada si el cliente puede elegir lo que se encadena: un fichaje con hora a medida
   quedaría firmado con integridad impecable y seguiría siendo mentira. De ahí que la hora de un
   fichaje normal la ponga el servidor y que mandarla sea un rechazo, no un campo que se ignora. */

import { ENTRY_KINDS, ENTRY_OPS } from './schema.ts';

export type Fail = { ok: false; status: 400 | 403 | 404 | 409; error: string };

const fail = (error: string, status: Fail['status'] = 400): Fail => ({ ok: false, status, error });

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Los parámetros de `clock_record`, tal cual los espera la RPC. */
export type RecordParams = {
  p_kind: string;
  p_mode: string;
  p_source: string;
  p_op: string;
  p_corrects: string | null;
  p_reason: string | null;
  /** `null` significa «ponla tú»: la resuelve `now()` dentro de la función de Postgres. */
  p_occurred_at: string | null;
  /** Solo administración puede escribir sobre otra persona, y eso lo comprueba `clock_record`. */
  p_person_id: string | null;
};

const MODES = ['onsite', 'remote'] as const;
const SOURCES = ['home_card', 'app'] as const;

const oneOf = <T extends readonly string[]>(list: T, value: unknown): value is T[number] =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

export function buildRecordCall(body: unknown): { ok: true; params: RecordParams } | Fail {
  if (!isObject(body)) return fail('El cuerpo de la petición no es válido.');

  if (!oneOf(ENTRY_KINDS, body.kind)) return fail('Ese tipo de fichaje no existe.');
  if (!oneOf(MODES, body.mode)) return fail('La modalidad tiene que ser presencial o a distancia.');
  if (!oneOf(SOURCES, body.source)) return fail('El origen del fichaje no es válido.');

  const op = body.op === undefined ? 'record' : body.op;
  if (!oneOf(ENTRY_OPS, op)) return fail('Esa operación no existe.');

  /* Un fichaje normal: la hora la pone el servidor. Mandarla se rechaza en vez de ignorarse, porque
     un campo que se ignora en silencio parece aceptado y el siguiente que lo lea creerá que
     funciona. */
  if (op === 'record') {
    if (body.occurredAt !== undefined) {
      return fail('Un fichaje no lleva hora: la pone el servidor en el momento de ficharlo.');
    }
    if (body.corrects !== undefined || body.reason !== undefined) {
      return fail('Un fichaje normal no corrige ningún asiento ni lleva motivo.');
    }
    return {
      ok: true,
      params: {
        p_kind: body.kind,
        p_mode: body.mode,
        p_source: body.source,
        p_op: 'record',
        p_corrects: null,
        p_reason: null,
        p_occurred_at: null,
        p_person_id: personIdOf(body),
      },
    };
  }

  /* Una corrección sí trae su hora, porque corregir es exactamente decir otra hora. Lo que la hace
     admisible no es que sea de fiar, es que queda con su autor y su motivo y el asiento original
     sigue a la vista. */
  if (typeof body.corrects !== 'string' || !isUuid(body.corrects)) {
    return fail('Una corrección tiene que decir qué asiento corrige.');
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) return fail('Una corrección necesita un motivo.');

  if (typeof body.occurredAt !== 'string' || !Number.isFinite(Date.parse(body.occurredAt))) {
    return fail('Una corrección necesita la hora corregida.');
  }

  return {
    ok: true,
    params: {
      p_kind: body.kind,
      p_mode: body.mode,
      p_source: body.source,
      p_op: op,
      p_corrects: body.corrects,
      p_reason: reason,
      p_occurred_at: body.occurredAt,
      p_person_id: personIdOf(body),
    },
  };
}

/* Solo se valida la FORMA. Quién puede escribir sobre otra persona lo decide `clock_record`
   comprobando `clock_is_admin()` en servidor: repetir aquí esa decisión crearía dos sitios donde se
   define quién es administrador, y el día que discrepen ganaría el más flojo. */
function personIdOf(body: Obj): string | null {
  return typeof body.personId === 'string' && isUuid(body.personId) ? body.personId : null;
}
