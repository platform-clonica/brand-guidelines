/* Clock_r — jornada teórica, festivos y saldo.

   Aquí no se calcula nada del registro: los asientos son hechos con hora y viven en la base de
   datos. Esto es lo otro, lo que dice CONTRA QUÉ se comparan esas horas. La separación importa
   porque el saldo es derivado y la jornada teórica es configuración editable: si alguien corrige un
   horario, cambia el saldo de los días afectados, pero no cambia ni un asiento.

   Sin React y sin alias `@/`, con imports relativos y extensión `.ts`, como lib/ds y lib/forms:
   así `node --test` lo ejecuta tal cual. */

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Minutos teóricos por día de la semana. Minutos y no horas: un saldo legal no lleva decimales. */
export type WeeklyMinutes = Record<Weekday, number>;

/* Jornada intensiva: un periodo del año con su propia semana. Las fechas van en `MM-DD` y no en
   `YYYY-MM-DD` porque el verano se repite todos los años y nadie debería tener que añadir un tramo
   nuevo cada junio. Los dos extremos entran dentro. */
export type IntensivePeriod = {
  /** `MM-DD`, incluido. */
  from: string;
  /** `MM-DD`, incluido. */
  to: string;
  weekly: WeeklyMinutes;
};

/* Un tramo de jornada, vigente desde `validFrom` (incluido) hasta que empiece el siguiente.
   Las claves van en camelCase porque esto vive dentro de una columna JSONB, y es lo que hace el
   repo ahí (lib/ds/schema.ts); el snake_case se queda para los nombres de columna. */
export type ScheduleTramo = {
  /** `YYYY-MM-DD`. El propio día ya cuenta como vigente. */
  validFrom: string;
  weekly: WeeklyMinutes;
  intensive?: IntensivePeriod;
};

/** Un periodo de ausencia, con los dos extremos incluidos. */
export type Absence = { fromDate: string; toDate: string };

/** Lo que puede vaciar un día además del calendario semanal. */
export type DayContext = { holidays: string[]; absences: Absence[] };

/* El tramo vigente en una fecha, o `null` si no hay ninguno.

   `null` es deliberado: devolver 0, o el tramo más antiguo, daría un saldo calculado sobre una
   jornada que nadie decidió, y un saldo inventado dentro de un registro legal vale menos que un
   hueco declarado. Quien llama lo convierte en incidencia.

   Las fechas se comparan como texto porque en `YYYY-MM-DD` el orden lexicográfico ES el
   cronológico. Sin `new Date`, que aquí solo podría introducir zonas horarias donde no hacen falta.

   No se presupone el orden del array: lo edita una persona desde un panel y vive en un JSONB, así
   que ordenarlo no lo garantiza nadie. */
export function scheduleAt(schedules: ScheduleTramo[], date: string): ScheduleTramo | null {
  let vigente: ScheduleTramo | null = null;
  for (const tramo of schedules) {
    if (tramo.validFrom > date) continue;
    if (vigente === null || tramo.validFrom > vigente.validFrom) vigente = tramo;
  }
  return vigente;
}

const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/* El día de la semana de una fecha, leída SIEMPRE en UTC. No porque el calendario laboral sea UTC
   —no lo es, es Europe/Madrid— sino porque aquí solo entran fechas sin hora: `2026-07-10` no es un
   instante, es un día. Construirlo en la zona local haría que el resultado dependiera de dónde
   corre el proceso, y un registro horario no puede cambiar de día según el servidor. */
function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

const covers = (a: Absence, date: string) => a.fromDate <= date && date <= a.toDate;

/* ¿Cae la fecha dentro del periodo intensivo? Comparación de `MM-DD` como texto, que en ese formato
   también ordena bien.

   Dos formas, según el periodo cruce o no el fin de año, y la distinción no es un adorno: con un
   periodo de Navidad (`12-15` → `01-15`), `from` es MAYOR que `to`, así que preguntar por los dos
   extremos a la vez da falso para todos los días del año y el periodo entero se evapora sin avisar.
   Cuando el rango viene invertido, el año es un círculo: se está dentro si el día cae después del
   inicio O antes del final. */
function inIntensive(period: IntensivePeriod, date: string): boolean {
  const md = date.slice(5);
  if (period.from <= period.to) return period.from <= md && md <= period.to;
  return md >= period.from || md <= period.to;
}

/* Los minutos que se deben un día concreto.

   Un festivo y una ausencia dan los dos 0, y por motivos distintos que importan fuera de aquí —en
   el registro que se exporta no es lo mismo— pero el saldo del día es el mismo: no se debe nada.
   Que den 0 es lo que evita que un día sin fichajes se cuente como incidencia. */
export function theoreticalMinutes(
  tramo: ScheduleTramo,
  date: string,
  context: DayContext,
): number {
  if (context.holidays.includes(date)) return 0;
  if (context.absences.some((a) => covers(a, date))) return 0;

  const weekly =
    tramo.intensive && inIntensive(tramo.intensive, date) ? tramo.intensive.weekly : tramo.weekly;

  return weekly[weekdayOf(date)];
}
