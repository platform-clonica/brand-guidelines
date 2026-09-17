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
  /* Asientos que ya no cuentan porque otro los corrigió o los anuló. No se borran de la lista: el
     registro tiene que poder explicar por qué cambió una hora, y para eso el original sigue ahí. */
  supersededIds: string[];
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

/* Empareja aperturas con cierres. Devuelve los intervalos y, aparte, el `seq` de la apertura que se
   quedó sin cerrar, para poder señalar el asiento exacto en la incidencia.

   Un intervalo abierto sale con `to` en null: un hueco declarado, nunca una hora inventada. */
type Pairing = { intervals: Interval[]; unclosedSeq: number | null };

function pair(
  entries: { seq: number; kind: string; occurred_at: string }[],
  open: string,
  close: string,
): Pairing {
  const intervals: Interval[] = [];
  let pending: { at: string; seq: number } | null = null;

  for (const entry of entries) {
    if (entry.kind === open) pending = { at: entry.occurred_at, seq: entry.seq };
    else if (entry.kind === close && pending !== null) {
      intervals.push({ from: pending.at, to: entry.occurred_at });
      pending = null;
    }
  }

  if (pending === null) return { intervals, unclosedSeq: null };

  intervals.push({ from: pending.at, to: null });
  return { intervals, unclosedSeq: pending.seq };
}

const spanOf = (intervals: Interval[]): number =>
  intervals.reduce((total, i) => (i.to === null ? total : total + minutesBetween(i.from, i.to)), 0);

type RawEntry = {
  id: string;
  seq: number;
  op: string;
  corrects: string | null;
  kind: string;
  occurred_at: string;
};

/* Qué asientos quedan fuera del cálculo, y por qué.

   Una corrección (`amend`) sustituye al que corrige; una anulación (`annul`) lo saca y se saca a sí
   misma. Se puede corregir una corrección, así que esto es una cadena, y una cadena que sale de
   datos es una cadena que puede venir mal: un asiento que se apunta a sí mismo, o dos que se
   apuntan en círculo.

   POR ESO EL RECORRIDO VA ACOTADO POR CONSTRUCCIÓN y no con una guarda añadida después. Cada
   asiento se visita una vez: no se sigue la cadena paso a paso, se marca de golpe a quién tumba
   cada corrección. Un ciclo no puede dar vueltas porque no hay vueltas que dar. La invariante de
   esta herramienta es que la compilación no lanza, pero colgarse sería peor que lanzar: un error
   se ve y una pantalla congelada no. */
function resolveCorrections(entries: RawEntry[], issues: ClockIssue[]): Set<string> {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const superseded = new Set<string>();

  for (const entry of entries) {
    if (entry.op === 'record') continue;

    if (entry.corrects === null) {
      issues.push({
        level: 'error',
        path: `asiento.${entry.seq}`,
        message: 'Es una corrección pero no dice a qué asiento corrige.',
      });
      continue;
    }

    if (entry.corrects === entry.id) {
      issues.push({
        level: 'error',
        path: `asiento.${entry.seq}`,
        message: 'La corrección se apunta a sí misma.',
      });
      continue;
    }

    if (!byId.has(entry.corrects)) {
      /* Puede ser de otro día, o de otra persona, o haberse escrito mal. Sea lo que sea, aquí no
         hay nada que corregir y el asiento nuevo tampoco se puede dar por bueno. */
      issues.push({
        level: 'error',
        path: `asiento.${entry.seq}`,
        message: 'Corrige un asiento que no está en este día.',
      });
      continue;
    }

    superseded.add(entry.corrects);
    // Una anulación no aporta hora: se retira ella también del cálculo.
    if (entry.op === 'annul') superseded.add(entry.id);
  }

  return superseded;
}

export function compileDay(rows: unknown[], options: CompileOptions): CompileResult {
  const issues: ClockIssue[] = [];

  const all = (rows as RawEntry[]).slice().sort(bySeq);
  const superseded = resolveCorrections(all, issues);
  const entries = all.filter((e) => !superseded.has(e.id));

  const jornada = pair(entries, 'in', 'out');
  const pausas = pair(entries, 'break_start', 'break_end');
  const segments = jornada.intervals;
  const breaks = pausas.intervals;

  /* Un tramo sin cerrar es AVISO, no error: a media tarde todo el mundo tiene la jornada abierta.
     Se señala el asiento que la abrió, que es el que hay que corregir. */
  if (jornada.unclosedSeq !== null) {
    issues.push({
      level: 'warning',
      path: `asiento.${jornada.unclosedSeq}`,
      message: 'La jornada quedó abierta: falta fichar la salida.',
    });
  }
  if (pausas.unclosedSeq !== null) {
    issues.push({
      level: 'warning',
      path: `asiento.${pausas.unclosedSeq}`,
      message: 'La pausa quedó abierta: falta fichar la vuelta.',
    });
  }

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
    /* `ok` es «no hay errores», no «no hay incidencias»: misma regla que compileSystem. Un día sin
       terminar tiene aviso y sigue siendo un día válido. */
    ok: !issues.some((i) => i.level === 'error'),
    day: {
      workDate: options.workDate,
      segments,
      breaks,
      supersededIds: [...superseded],
      workedMinutes,
      breakMinutes,
      theoreticalMinutes: teoricos,
      balanceMinutes: workedMinutes - teoricos,
      open,
    },
    issues,
  };
}
