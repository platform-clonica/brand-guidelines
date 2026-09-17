/* Clock_r — compileDay: la jornada resuelta a partir de sus asientos.

   El estado de un día no se guarda: se calcula. Los asientos son los hechos y todo lo demás
   —tramos, pausas, horas efectivas, saldo— se deriva de ellos cada vez. Eso es lo que permite que
   una corrección sea un asiento nuevo en vez de una reescritura: no hay ningún total guardado que
   quedara desactualizado.

   LA INVARIANTE PRINCIPAL NO ES «CALCULA BIEN», ES «NO LANZA NUNCA». Lo que entra aquí puede venir
   de una fila antigua, de una serie incoherente o de un día que alguien dejó a medias, y un
   registro horario que revienta al abrirlo es peor que uno que dice lo que no cuadra. Por eso la
   salida lleva `issues` y por eso nada de aquí dentro tira una excepción.

   Sin React y sin alias `@/`, con imports relativos y extensión `.ts`, como el resto de lib/clock. */

import { scheduleAt, theoreticalMinutes, type Absence, type ScheduleTramo } from './calendar.ts';

/** Misma forma que consume components/studio/IssuesPanel, para poder reutilizarlo tal cual. */
export type ClockIssue = { level: 'error' | 'warning'; path: string; message: string };

/** Un intervalo resuelto. `to` en `null` significa que sigue abierto, no que dure cero. */
export type Interval = { from: string; to: string | null };

export type ClockDay = {
  workDate: string;
  segments: Interval[];
  breaks: Interval[];
  workedMinutes: number;
  breakMinutes: number;
  theoreticalMinutes: number;
  /** Efectivos menos teóricos. Negativo es defecto y positivo es exceso. */
  balanceMinutes: number;
  /** Quedó algún tramo sin cerrar. */
  open: boolean;
};

export type CompileOptions = {
  workDate: string;
  schedules: ScheduleTramo[];
  absences: Absence[];
  holidays: string[];
};

export type CompileResult = { ok: boolean; day: ClockDay; issues: ClockIssue[] };

const MINUTE = 60_000;

/* Los asientos se ordenan por `seq`, que es el orden de escritura, y no por `occurred_at`: la hora
   la puede corregir una persona y el orden de escritura no lo toca nadie. */
const bySeq = (a: { seq: number }, b: { seq: number }) => a.seq - b.seq;

const minutesBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / MINUTE);

/* Empareja aperturas con cierres. Devuelve los intervalos cerrados y, si quedó una apertura
   suelta, un último intervalo con `to` en null: un hueco declarado, nunca una hora inventada. */
function pair(
  entries: { kind: string; occurred_at: string }[],
  open: string,
  close: string,
): Interval[] {
  const out: Interval[] = [];
  let pending: string | null = null;

  for (const entry of entries) {
    if (entry.kind === open) pending = entry.occurred_at;
    else if (entry.kind === close && pending !== null) {
      out.push({ from: pending, to: entry.occurred_at });
      pending = null;
    }
  }

  if (pending !== null) out.push({ from: pending, to: null });
  return out;
}

const spanOf = (intervals: Interval[]): number =>
  intervals.reduce((total, i) => (i.to === null ? total : total + minutesBetween(i.from, i.to)), 0);

export function compileDay(rows: unknown[], options: CompileOptions): CompileResult {
  const issues: ClockIssue[] = [];

  const entries = (rows as { seq: number; kind: string; occurred_at: string }[])
    .slice()
    .sort(bySeq);

  const segments = pair(entries, 'in', 'out');
  const breaks = pair(entries, 'break_start', 'break_end');

  const tramo = scheduleAt(options.schedules, options.workDate);
  const teoricos =
    tramo === null
      ? 0
      : theoreticalMinutes(tramo, options.workDate, {
          holidays: options.holidays,
          absences: options.absences,
        });

  const breakMinutes = spanOf(breaks);
  const workedMinutes = spanOf(segments) - breakMinutes;
  const open = [...segments, ...breaks].some((i) => i.to === null);

  return {
    ok: issues.length === 0,
    day: {
      workDate: options.workDate,
      segments,
      breaks,
      workedMinutes,
      breakMinutes,
      theoreticalMinutes: teoricos,
      balanceMinutes: workedMinutes - teoricos,
      open,
    },
    issues,
  };
}
