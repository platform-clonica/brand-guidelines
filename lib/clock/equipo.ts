/* Clock_r — el resumen del equipo, que es lo que alimenta el panel de administración.

   LA DECISIÓN QUE LO DEFINE: la lista se construye desde LAS PERSONAS, no desde los asientos. Si se
   construyera desde los asientos, quien no ha fichado en toda la semana desaparecería del panel — y
   esa es exactamente la persona que hay que ver. Es el mismo principio por el que `compileRange`
   enumera fechas en vez de datos: lo que falta es lo que hay que enseñar.

   Cada persona se compila con SU jornada, leída de su propio `schedules`. Usar una común haría que
   el saldo de quien tiene jornada reducida saliera mal, y saldría mal en silencio. */

import type { Absence, ScheduleTramo } from './calendar.ts';
import { compileRange, type RangeIssue } from './compile.ts';

export type PersonaResumen = {
  personId: string;
  nombre: string;
  /** ¿Hay algún fichaje suyo hoy? */
  fichadoHoy: boolean;
  /** ¿Se ha dejado hoy algún tramo sin cerrar? */
  abiertaHoy: boolean;
  workedTodayMinutes: number;
  /** Del periodo completo, no solo de hoy. */
  balanceMinutes: number;
  /** Ya en orden cronológico: las más viejas primero, que es lo que el panel llama antigüedad. */
  incidencias: RangeIssue[];
};

export type TeamOptions = {
  from: string;
  to: string;
  today: string;
  absences: Absence[];
  holidays: string[];
};

type PersonaEntrada = { id: string; display_name: string; schedules: unknown };

/* Se agrupa por `person_id` y se descarta lo que no lo tenga legible. Repartir una fila sin dueño
   entre personas sería peor que perderla: pondría las horas de alguien en las cuentas de otro.

   La columna es `not null` en la tabla, así que esto solo puede llegar de una fila corrupta. Si
   algún día conviene contarlas en vez de descartarlas, eso pide su propio test. */
function porPersona(rows: unknown[]): Map<string, unknown[]> {
  const mapa = new Map<string, unknown[]>();
  for (const fila of rows) {
    const id = (fila as { person_id?: unknown } | null)?.person_id;
    if (typeof id !== 'string') continue;
    mapa.set(id, [...(mapa.get(id) ?? []), fila]);
  }
  return mapa;
}

export function teamSummary(
  personas: PersonaEntrada[],
  rows: unknown[],
  options: TeamOptions,
): PersonaResumen[] {
  const asientos = porPersona(rows);

  return personas.map((p) => {
    /* `schedules` viene de un JSONB sin validar: si no es una lista se trata como vacía, y el
       propio compilador lo dice con «no hay jornada teórica vigente». No se inventa una. */
    const schedules = Array.isArray(p.schedules) ? (p.schedules as ScheduleTramo[]) : [];

    const rango = compileRange(asientos.get(p.id) ?? [], {
      from: options.from,
      to: options.to,
      schedules,
      absences: options.absences,
      holidays: options.holidays,
    });

    const hoy = rango.days.find((d) => d.day.workDate === options.today) ?? null;
    const tramosHoy = (hoy?.day.segments.length ?? 0) + (hoy?.day.breaks.length ?? 0);

    return {
      personId: p.id,
      nombre: p.display_name,
      fichadoHoy: tramosHoy > 0,
      abiertaHoy: hoy?.day.open ?? false,
      workedTodayMinutes: hoy?.day.workedMinutes ?? 0,
      balanceMinutes: rango.balanceMinutes,
      incidencias: rango.issues,
    };
  });
}
