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

/* ─── De hora de reloj a instante ───

   Lo que necesita el modo corrección: alguien teclea «17:00» y eso tiene que convertirse en el
   instante que se guarda en el registro.

   LA VÍA OBVIA ESTÁ MAL, y es la que sale sola: `new Date('2026-07-10T17:00')` se interpreta en el
   huso DEL NAVEGADOR. En un portátil configurado en otra zona escribiría una hora distinta de la
   que la persona tecleó, en un registro legal y sin que nada avisara. Aquí no se consulta nunca la
   zona ambiente: el desfase se le pregunta a `Intl` para la zona de destino.

   POR QUÉ SE SONDEA A AMBOS LADOS DEL DÍA. Resolver el desfase en el propio instante y aplicarlo
   converge siempre en UNA respuesta, y el día en que el reloj se atrasa hay DOS: las 02:30 ocurren
   una vez con +02:00 y otra con +01:00. Sondeando doce horas antes y después salen las dos
   candidatas; se descartan las que no rinden la hora pedida y se elige la MENOR, es decir la
   primera vez que el reloj marcó esa hora.

   Y el día en que el reloj se adelanta hay horas que NO EXISTEN —el 29 de marzo no hay 02:30—. Ahí
   ninguna candidata rinde la hora pedida y se devuelve la menor de todos modos: un instante válido
   y determinista. No lanza, porque esto alimenta una compilación que no lanza nunca. */

const HALF_DAY_MS = 12 * 3_600_000;

const PARTES = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const partesEn = (timeZone: string) =>
  timeZone === TIME_ZONE
    ? PARTES
    : new Intl.DateTimeFormat('sv-SE', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });

/** La hora de pared de un instante en esa zona, como `YYYY-MM-DDTHH:MM`. */
function wallOf(ms: number, timeZone: string): string {
  return partesEn(timeZone).format(new Date(ms)).replace(' ', 'T').slice(0, 16);
}

/* El desfase de la zona en ese instante, en milisegundos: se lee la hora de pared y se vuelve a
   interpretar como si fuera UTC. La diferencia con el instante original ES el desfase. */
function offsetAt(ms: number, timeZone: string): number {
  const pared = partesEn(timeZone).format(new Date(ms)).replace(' ', 'T');
  return Date.parse(`${pared}Z`) - ms;
}

/** `workDate` + `HH:MM` en la zona dada → el instante, en ISO. */
export function instantAt(workDate: string, hhmm: string, timeZone: string = TIME_ZONE): string {
  const paredComoUtc = Date.parse(`${workDate}T${hhmm}:00Z`);

  const candidatas = new Set<number>();
  for (const sonda of [paredComoUtc - HALF_DAY_MS, paredComoUtc, paredComoUtc + HALF_DAY_MS]) {
    candidatas.add(paredComoUtc - offsetAt(sonda, timeZone));
  }

  const pedida = `${workDate}T${hhmm}`;
  const validas = [...candidatas].filter((ms) => wallOf(ms, timeZone) === pedida);

  // La menor: la primera vez que el reloj marcó esa hora. Sin válidas, la hora no existe ese día.
  return new Date(Math.min(...(validas.length > 0 ? validas : [...candidatas]))).toISOString();
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
