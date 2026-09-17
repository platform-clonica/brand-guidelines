/* Clock_r — qué día es hoy, qué semana y qué mes.

   No es azúcar de presentación: de aquí sale QUÉ DÍA SE FICHA y QUÉ SEMANA se suma. Un error de un
   día en el inicio de semana desplaza el saldo semanal entero, y un día mal resuelto hace que el
   navegador crea que estás fichando el martes mientras el servidor escribe el asiento en el lunes.

   DOS ARITMÉTICAS DISTINTAS, Y CADA UNA EN SU SITIO:

   · El día de HOY sale de `Intl`, con la zona puesta. Calcularlo sumando una o dos horas a mano
     exigiría saber cuándo empieza el horario de verano, y eso ya lo sabe el navegador. Tiene que
     coincidir con lo que deriva `clock_record`, que resuelve `work_date` en Europe/Madrid.

   · La semana y el mes se calculan en UTC, porque ahí ya no hay horas: son días de calendario.
     Sumar veinticuatro horas en hora local se tuerce los dos días del año en que existe el cambio
     —uno dura 23 y otro 25— y el recorrido se saltaría un día o repetiría otro. Es la misma razón
     por la que `compileRange` enumera su rango en UTC. */

/** La zona del registro. Es un registro horario español y el servidor deriva el día con esta misma. */
export const TIME_ZONE = 'Europe/Madrid';

const DAY_MS = 86_400_000;

/* `sv-SE` da exactamente `YYYY-MM-DD`, que es el formato que usan las columnas `date` y con el que
   se comparan los rangos. No es un truco: es el formato de fecha de ese locale, y evita tener que
   recomponer la cadena a mano a partir de las partes. */
const ISO_EN_ZONA = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** El día de calendario que es «hoy» en esa zona, en `YYYY-MM-DD`. */
export function todayIn(timeZone: string = TIME_ZONE, now: Date = new Date()): string {
  const fmt =
    timeZone === TIME_ZONE
      ? ISO_EN_ZONA
      : new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(now);
}

export type DateRange = { from: string; to: string };

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/* La semana laboral empieza en LUNES.

   `getUTCDay()` cuenta desde el domingo, así que el domingo es el caso que hay que tratar y es el
   error clásico: con la convención de otros países, el domingo abriría una semana nueva y el saldo
   semanal cambiaría de golpe el último día. Aquí el domingo cierra la suya. */
export function weekRange(date: string): DateRange {
  const ms = toUtc(date).getTime();
  const dow = new Date(ms).getUTCDay();
  const desdeElLunes = dow === 0 ? 6 : dow - 1;

  const lunes = ms - desdeElLunes * DAY_MS;
  return { from: toIso(lunes), to: toIso(lunes + 6 * DAY_MS) };
}

/* El mes natural. El último día sale del «día cero» del mes siguiente, que es como se pregunta por
   el último de un mes sin tener que saberse cuáles tienen treinta ni cuándo febrero tiene veintinueve
   — el bisiesto lo resuelve el propio calendario. */
export function monthRange(date: string): DateRange {
  const d = toUtc(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();

  const primero = Date.UTC(year, month, 1);
  const ultimo = Date.UTC(year, month + 1, 0);

  return { from: toIso(primero), to: toIso(ultimo) };
}
