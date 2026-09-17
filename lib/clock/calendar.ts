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

/* Un tramo de jornada, vigente desde `validFrom` (incluido) hasta que empiece el siguiente.
   Las claves van en camelCase porque esto vive dentro de una columna JSONB, y es lo que hace el
   repo ahí (lib/ds/schema.ts); el snake_case se queda para los nombres de columna. */
export type ScheduleTramo = {
  /** `YYYY-MM-DD`. El propio día ya cuenta como vigente. */
  validFrom: string;
  weekly: WeeklyMinutes;
};

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
