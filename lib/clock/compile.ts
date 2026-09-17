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
import { entryRowSchema, type EntryRow } from './schema.ts';

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

export type RangeOptions = {
  /** `YYYY-MM-DD`, incluido. */
  from: string;
  /** `YYYY-MM-DD`, incluido. */
  to: string;
  schedules: ScheduleTramo[];
  absences: Absence[];
  holidays: string[];
};

/* Una incidencia del rango SABE DE QUÉ DÍA ES.

   El campo va aquí y no en `ClockIssue` a propósito: en `compileDay` el día es siempre el mismo y
   añadirlo allí sería repetir un dato constante en cada incidencia. Aquí, en cambio, es lo que
   convierte una lista aplanada en algo que se puede ordenar por antigüedad y sobre lo que se puede
   pulsar para ir al día que la provoca.

   `null` para lo que no pertenece a ningún día —unas fechas de periodo ilegibles, una fila que no
   dice a qué día va—: inventarles uno sería mentir sobre dónde está el problema.

   Sigue siendo compatible con components/studio/IssuesPanel, que es genérico sobre
   `{ level, path, message }`: un campo de más no lo rompe. */
export type RangeIssue = ClockIssue & { workDate: string | null };

export type RangeResult = {
  /** Un resultado por CADA día del rango, tenga fichajes o no. */
  days: CompileResult[];
  workedMinutes: number;
  theoreticalMinutes: number;
  balanceMinutes: number;
  /** En orden cronológico: los días se recorren en orden, así que salen ya ordenadas. */
  issues: RangeIssue[];
};

const MINUTE = 60_000;

/* Los asientos se ordenan por `seq`, que es el orden de escritura, y no por `occurred_at`: la hora
   la puede corregir una persona y el orden de escritura no lo toca nadie. */
const bySeq = (a: { seq: number }, b: { seq: number }) => a.seq - b.seq;

const minutesBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / MINUTE);

/* Empareja aperturas con cierres. Devuelve los intervalos y, aparte, el `seq` de la apertura que se
   quedó sin cerrar, para poder señalar el asiento exacto en la incidencia.

   Un intervalo abierto sale con `to` en null: un hueco declarado, nunca una hora inventada. */
type Paired = Interval & { openSeq: number };
type Pairing = { intervals: Paired[]; unclosedSeq: number | null };

const toInterval = ({ from, to }: Paired): Interval => ({ from, to });

/* Los dos mensajes van en un objeto y no como parámetros sueltos: dos `string` seguidos en una
   firma es un error de orden esperando a ocurrir, y aquí se traduciría en una incidencia que dice
   lo contrario de lo que pasó. */
type PairMessages = { duplicate: string; orphan: string };

function pair(
  entries: { seq: number; kind: string; occurred_at: string }[],
  open: string,
  close: string,
  issues: ClockIssue[],
  messages: PairMessages,
): Pairing {
  const intervals: Paired[] = [];
  let pending: { at: string; seq: number } | null = null;

  for (const entry of entries) {
    if (entry.kind === open) {
      if (pending !== null) {
        /* Dos aperturas seguidas: el doble clic, o dos pestañas. Se señala la SEGUNDA y se conserva
           la primera. Machacarla —que es lo que hacía antes— hacía desaparecer un fichaje sin que
           nadie se enterase, y el día salía cuadrado con una hora que nadie fichó. */
        issues.push({ level: 'error', path: `asiento.${entry.seq}`, message: messages.duplicate });
        continue;
      }
      pending = { at: entry.occurred_at, seq: entry.seq };
      continue;
    }

    if (entry.kind !== close) continue;

    if (pending === null) {
      /* Un cierre que no abre nada. Antes se descartaba en silencio: el fichaje desaparecía del
         cálculo sin dejar rastro y el día salía cuadrado, que en un libro de asientos es justo lo
         único que no puede pasar. */
      issues.push({ level: 'error', path: `asiento.${entry.seq}`, message: messages.orphan });
      continue;
    }

    if (Date.parse(entry.occurred_at) < Date.parse(pending.at)) {
      issues.push({
        level: 'error',
        path: `asiento.${entry.seq}`,
        message: 'Cierra antes de la hora a la que empezó.',
      });
    }

    intervals.push({ from: pending.at, to: entry.occurred_at, openSeq: pending.seq });
    pending = null;
  }

  if (pending === null) return { intervals, unclosedSeq: null };

  intervals.push({ from: pending.at, to: null, openSeq: pending.seq });
  return { intervals, unclosedSeq: pending.seq };
}

const spanOf = (intervals: Interval[]): number =>
  intervals.reduce((total, i) => {
    if (i.to === null) return total;
    const minutes = minutesBetween(i.from, i.to);
    /* Un intervalo imposible (cierra antes de abrir) ya salió como error; aquí cuenta como cero
       para que no reste horas del día. Se deja visible en `segments` a propósito: hay que poder
       ver qué se fichó mal, y borrarlo lo escondería. */
    return minutes > 0 ? total + minutes : total;
  }, 0);

/** ¿La pausa cae dentro del tramo? Con `Date.parse` y no comparando texto: hoy todos los asientos
    llevan el mismo huso y comparar cadenas funcionaría, pero dejaría una trampa esperando al
    primer fichaje con otro desfase. */
function within(segment: Interval, brk: Interval): boolean {
  const start = Date.parse(brk.from);
  if (start < Date.parse(segment.from)) return false;
  if (segment.to === null) return true;
  const end = brk.to === null ? start : Date.parse(brk.to);
  return end <= Date.parse(segment.to);
}

type RawEntry = EntryRow;

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

const DAY_MS = 86_400_000;

/* Poco más de un año. Un rango mayor no es un caso de uso, es un error de quien llama, y sin tope
   una fecha disparatada convierte esto en una espera muy larga. */
const MAX_DAYS = 400;

/* Las fechas del rango, una por día, en UTC.

   En UTC A PROPÓSITO: sumar 24 horas en hora local se tuerce los dos días del año en que existe el
   cambio de hora —uno dura 23 y otro 25— y el recorrido se saltaría un día o repetiría otro. Aquí
   las fechas son días de calendario, no instantes, así que UTC es la aritmética correcta.

   Devuelve `null` si alguna fecha no se puede leer. Sin esa salida, `Date.parse` daría NaN, la
   comparación del bucle sería siempre falsa o siempre cierta y esto GIRARÍA PARA SIEMPRE. Es la
   misma lección que la cadena de correcciones: colgarse es peor que lanzar, porque un error se ve
   y una pantalla congelada no. */
function eachDate(from: string, to: string): string[] | null {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const dates: string[] = [];
  for (let t = start; t <= end && dates.length < MAX_DAYS; t += DAY_MS) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

/* El día, la semana o el mes. Suma varios días y su saldo.

   EL RANGO SE ENUMERA POR FECHAS, NO POR LOS DATOS QUE HAY. Un día laborable sin ningún fichaje
   aparece igual y cuenta como defecto: si solo se recorrieran los días con asientos, un mes con una
   semana sin fichar saldría con saldo cero en vez de con cuarenta horas de menos, y el error caería
   a favor de quien no fichó y en contra de la fiabilidad del registro. */
export function compileRange(rows: unknown[], options: RangeOptions): RangeResult {
  /* Las del propio periodo: no son de ningún día concreto. */
  const issues: RangeIssue[] = [];
  const dates = eachDate(options.from, options.to);

  if (dates === null) {
    issues.push({
      level: 'error',
      path: 'rango',
      workDate: null,
      message: 'Las fechas del periodo no se pueden leer.',
    });
    return { days: [], workedMinutes: 0, theoreticalMinutes: 0, balanceMinutes: 0, issues };
  }

  const byDate = new Map<string, unknown[]>();
  rows.forEach((row, index) => {
    const date = (row as { work_date?: unknown } | null)?.work_date;
    if (typeof date !== 'string') {
      /* Sin día no se puede asignar a ninguno, pero tampoco se calla: descartar filas en silencio
         es el hueco que ya ha habido que tapar dos veces en este módulo. */
      issues.push({
        level: 'error',
        path: `fila.${index}`,
        /* Sin día que asignarle, y ese es literalmente el problema que denuncia. */
        workDate: null,
        message: 'La fila no dice a qué día de jornada pertenece y se ha quedado fuera del periodo.',
      });
      return;
    }
    const delDia = byDate.get(date) ?? [];
    delDia.push(row);
    byDate.set(date, delDia);
  });

  const days = dates.map((date) =>
    compileDay(byDate.get(date) ?? [], {
      workDate: date,
      schedules: options.schedules,
      absences: options.absences,
      holidays: options.holidays,
    }),
  );

  const sum = (pick: (day: ClockDay) => number) => days.reduce((total, d) => total + pick(d.day), 0);

  return {
    days,
    workedMinutes: sum((d) => d.workedMinutes),
    theoreticalMinutes: sum((d) => d.theoreticalMinutes),
    balanceMinutes: sum((d) => d.balanceMinutes),
    /* Cada incidencia se lleva la fecha del día que la produjo. Los días se recorren en orden, así
       que la lista sale ya cronológica: eso es lo que el panel de equipo llama antigüedad. */
    issues: [
      ...issues,
      ...days.flatMap((d) => d.issues.map((i) => ({ ...i, workDate: d.day.workDate }))),
    ],
  };
}

export function compileDay(rows: unknown[], options: CompileOptions): CompileResult {
  const issues: ClockIssue[] = [];

  /* Nada entra al cálculo sin pasar por el esquema. Antes esto era un cast, o sea una promesa: una
     fila `null` tumbaba el comparador de orden con un TypeError y la invariante de este módulo
     —que no lanza nunca— era falsa. Una hora ilegible se descarta AQUÍ y no se convierte en un NaN
     que viaja callado hasta el saldo del mes. */
  const all: RawEntry[] = [];
  rows.forEach((row, index) => {
    const parsed = entryRowSchema.safeParse(row);
    if (parsed.success) {
      const entry = parsed.data;

      /* compileDay resuelve UN día. Un asiento de otro significa que la consulta trajo de más o que
         se escribió mal, y en los dos casos el total de este día saldría inflado sin que nadie lo
         supiera. Se excluye: no es de aquí. */
      if (entry.work_date !== options.workDate) {
        issues.push({
          level: 'error',
          path: `asiento.${entry.seq}`,
          message: 'Pertenece a otro día de jornada y no cuenta en este.',
        });
        return;
      }

      /* El servidor escribe `recorded_at` con now(), así que una hora fichada posterior solo sale
         de un reloj desajustado o de alguien apuntando algo que aún no ha pasado. El asiento se
         deja VISIBLE —hay que poder verlo para corregirlo— pero el día queda marcado como no
         fiable, igual que con un intervalo imposible. */
      if (Date.parse(entry.occurred_at) > Date.parse(entry.recorded_at)) {
        issues.push({
          level: 'error',
          path: `asiento.${entry.seq}`,
          message: 'La hora fichada es posterior al momento en que se escribió el asiento.',
        });
      }

      all.push(entry);
      return;
    }
    /* Se señala por `seq` cuando se puede leer, porque es lo que identifica al asiento para quien
       lo va a corregir. Si la fila no es ni un objeto, queda su posición en la lista. */
    const seq = (row as { seq?: unknown } | null)?.seq;
    issues.push({
      level: 'error',
      path: typeof seq === 'number' && Number.isFinite(seq) ? `asiento.${seq}` : `fila.${index}`,
      message: 'La fila no se puede leer como un asiento y se ha descartado del cálculo.',
    });
  });
  all.sort(bySeq);
  const superseded = resolveCorrections(all, issues);
  const entries = all.filter((e) => !superseded.has(e.id));

  const jornada = pair(entries, 'in', 'out', issues, {
    duplicate: 'Hay otra entrada sin haber fichado la salida de la anterior.',
    orphan: 'Hay una salida sin ninguna entrada que cerrar.',
  });
  const pausas = pair(entries, 'break_start', 'break_end', issues, {
    duplicate: 'Hay otra pausa sin haber cerrado la anterior.',
    orphan: 'Hay un fin de pausa sin ninguna pausa empezada.',
  });
  const segments = jornada.intervals;
  const breaks = pausas.intervals;

  /* Una pausa fuera de todo tramo de trabajo restaría horas que no se estaban trabajando, así que
     el total mentiría hacia abajo. Es error y no aviso por lo mismo que los otros dos: el número
     del día deja de ser fiable. */
  for (const brk of breaks) {
    if (segments.some((segment) => within(segment, brk))) continue;
    issues.push({
      level: 'error',
      path: `asiento.${brk.openSeq}`,
      message: 'La pausa cae fuera de todo tramo de trabajo.',
    });
  }

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

  if (tramo === null) {
    /* Sin tramo vigente no hay contra qué comparar. Dejarlo en 0 en silencio daría un saldo
       calculado sobre una jornada que nadie decidió, que es la misma razón por la que `scheduleAt`
       devuelve null y no 0: un hueco declarado vale más que un número inventado. */
    issues.push({
      level: 'error',
      path: 'jornada',
      message: 'No hay ninguna jornada teórica vigente ese día: el saldo no se puede calcular.',
    });
  }

  const teoricos =
    tramo === null
      ? 0
      : theoreticalMinutes(tramo, options.workDate, {
          holidays: options.holidays,
          absences: options.absences,
        });

  /* Fichajes en un día que constaba como ausencia. Es AVISO y no error: las horas trabajadas son
     reales y el total no es ambiguo. Lo que hay que mirar es si sobra la ausencia o sobran los
     fichajes, y eso lo decide una persona, no el compilador. */
  if (entries.length > 0 && options.absences.some((a) => a.fromDate <= options.workDate && options.workDate <= a.toDate)) {
    issues.push({
      level: 'warning',
      path: 'ausencia',
      message: 'Ese día constaba como ausencia y tiene fichajes.',
    });
  }

  const breakMinutes = spanOf(breaks);
  const workedMinutes = spanOf(segments) - breakMinutes;
  const open = [...segments, ...breaks].some((i) => i.to === null);

  return {
    /* `ok` es «no hay errores», no «no hay incidencias»: misma regla que compileSystem. Un día sin
       terminar tiene aviso y sigue siendo un día válido. */
    ok: !issues.some((i) => i.level === 'error'),
    day: {
      workDate: options.workDate,
      segments: segments.map(toInterval),
      breaks: breaks.map(toInterval),
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
