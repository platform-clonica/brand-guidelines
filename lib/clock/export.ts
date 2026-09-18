/* Clock_r — el registro en CSV.

   Es el fichero que acaba en manos de la asesoría laboral o de un inspector, así que lleva LOS
   ASIENTOS y no el resultado: una corrección sale con su motivo y su autor, y el asiento que
   sustituyó sale también, marcado como no vigente. Si solo llevara el total, el registro no podría
   explicarse — que es justo para lo que existe.

   CONVENCIÓN DEL REPO (app/forms/api/export): coma como separador, saltos `\r\n`, y comillas solo
   cuando el valor las necesita, doblando las de dentro. Se sigue para no tener dos formatos de CSV
   en el mismo proyecto.

   CON UNA COSA MÁS, que allí no hay: protección contra inyección de fórmulas. Un valor que empieza
   por `=`, `+`, `-` o `@` lo ejecuta Excel al abrir el fichero, y aquí el motivo de una corrección
   lo teclea una persona. Sin esto, escribir `=HYPERLINK(...)` como motivo convertiría el registro
   horario en un vector de ataque contra quien lo abra, y eso incluye al inspector.

   [supuesto] EL ORDEN DE LAS COLUMNAS ES PROVISIONAL. La definición deja abierto si el formato es
   el nuestro o el que espera la asesoría, y la recomendación era preguntárselo antes de escribir el
   exportador. Los DATOS están todos; reordenar columnas después es barato. */

export const COLUMNAS = [
  'persona',
  'dia_jornada',
  'tipo',
  'hora_fichada',
  'hora_registrada',
  'modalidad',
  'origen',
  'operacion',
  'corrige_a',
  'motivo',
  'autor',
  'vigente',
  'hash',
] as const;

export type CsvOptions = {
  /** Nombres por id, para que el autor de una corrección salga con nombre y no con un uuid. */
  nombres: Record<string, string>;
  /** Los que ya no cuentan. Salen igual, marcados: es lo que permite explicar un cambio de hora. */
  supersededIds: Set<string>;
};

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/* La hora en la zona del registro. Es un registro horario español y el servidor deriva el día con
   esta misma zona: dar el instante en UTC obligaría a quien lo lea a convertirlo de cabeza. */
const RELOJ = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Madrid',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});

const hora = (iso: unknown): string => {
  if (typeof iso !== 'string') return '';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? RELOJ.format(new Date(ms)) : '';
};

const PELIGROSOS = /^[=+\-@]/;

const celda = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/* El apóstrofo antifórmula va DENTRO del valor, antes de decidir si hace falta entrecomillar: al
   revés quedaría fuera de las comillas y partiría el campo. */
function escapar(valor: string): string {
  const seguro = PELIGROSOS.test(valor) ? `'${valor}` : valor;
  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function toCSV(rows: unknown[], options: CsvOptions): string {
  const filas: string[] = [COLUMNAS.join(',')];

  for (const row of rows) {
    /* Comprobación mínima de forma: lo que no tenga id y día no es un asiento. No se usa el esquema
       de compileDay porque este fichero necesita campos que aquel no declara —persona, autor,
       hash—, que son precisamente los que hacen auditable la exportación. */
    if (!isObject(row) || typeof row.id !== 'string' || typeof row.work_date !== 'string') continue;

    const autor = celda(row.author_person_id);

    filas.push(
      [
        celda(row.person_name),
        celda(row.work_date),
        celda(row.kind),
        hora(row.occurred_at),
        hora(row.recorded_at),
        celda(row.mode),
        celda(row.source),
        celda(row.op),
        celda(row.corrects),
        celda(row.reason),
        options.nombres[autor] ?? autor,
        options.supersededIds.has(row.id) ? 'no' : 'sí',
        celda(row.hash),
      ]
        .map(escapar)
        .join(','),
    );
  }

  return filas.join('\r\n');
}
