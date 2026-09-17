/* Clock_r — lo que deciden los Route Handlers, sin Next ni Supabase, para poder testearlo en node.
   Los handlers de app/api/clock solo hacen de fontanería: sesión, llamada y respuesta. Mismo reparto
   que lib/ds/server.ts, y la razón de que en este repo no haya tests de handler.

   LA REGLA QUE SOSTIENE ESTE FICHERO. El hash de un asiento prueba que nadie lo tocó DESPUÉS de
   escribirlo. No prueba que el dato fuera cierto al escribirlo. Así que la integridad de la cadena
   no sirve de nada si el cliente puede elegir lo que se encadena: un fichaje con hora a medida
   quedaría firmado con integridad impecable y seguiría siendo mentira. De ahí que la hora de un
   fichaje normal la ponga el servidor y que mandarla sea un rechazo, no un campo que se ignora. */

import { ENTRY_KINDS, ENTRY_OPS } from './schema.ts';
import { WEEKDAYS, type IntensivePeriod, type ScheduleTramo, type WeeklyMinutes } from './calendar.ts';

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

/* ─────────────────────────── La jornada teórica ───────────────────────────

   `schedules` es la ÚNICA fila de toda la herramienta que se reescribe: todo lo demás es un libro
   de asientos que solo admite inserciones. Y de ahí sale la consecuencia incómoda, que conviene
   tener presente al tocar esto: editar un tramo ya vencido cambia el saldo de meses cerrados sin
   dejar rastro, en la única tabla que no tiene un histórico detrás que lo explique.

   SOBRE LOS SOLAPES, que alguien echará de menos: no hay que validarlos porque no pueden existir.
   Un tramo va desde su `validFrom` hasta que empieza el siguiente, así que solaparse es imposible
   por construcción — es la ventaja real de guardar un array con `validFrom` en vez de rangos con
   inicio y fin. Lo único que rompe esa garantía son dos tramos con la MISMA fecha, y eso sí se
   rechaza: con dos vigentes el mismo día, el saldo de ese día deja de ser reproducible. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY = /^\d{2}-\d{2}$/;

/** Minutos de un día: entero, no negativo y que quepa en 24 horas. */
const isMinutes = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1440;

const isIsoDate = (v: unknown): v is string =>
  typeof v === 'string' && ISO_DATE.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));

function parseWeekly(raw: unknown): WeeklyMinutes | null {
  if (!isObject(raw)) return null;
  const weekly = {} as WeeklyMinutes;
  for (const day of WEEKDAYS) {
    if (!isMinutes(raw[day])) return null;
    weekly[day] = raw[day];
  }
  return weekly;
}

function parseIntensive(raw: unknown): IntensivePeriod | null {
  if (!isObject(raw)) return null;
  if (typeof raw.from !== 'string' || !MONTH_DAY.test(raw.from)) return null;
  if (typeof raw.to !== 'string' || !MONTH_DAY.test(raw.to)) return null;
  const weekly = parseWeekly(raw.weekly);
  return weekly === null ? null : { from: raw.from, to: raw.to, weekly };
}

export function buildSchedulesPatch(
  body: unknown,
): { ok: true; schedules: ScheduleTramo[] } | Fail {
  if (!isObject(body)) return fail('El cuerpo de la petición no es válido.');
  if (!Array.isArray(body.schedules)) return fail('La jornada tiene que ser una lista de tramos.');
  if (body.schedules.length === 0) {
    /* Sin tramos no hay jornada teórica y todos sus días pasarían a ser incidencia: es justo lo
       que la migración de la jornada por defecto vino a evitar. */
    return fail('La jornada no puede quedarse sin ningún tramo.');
  }

  const schedules: ScheduleTramo[] = [];
  for (const raw of body.schedules) {
    if (!isObject(raw)) return fail('Uno de los tramos de jornada no es válido.');
    if (!isIsoDate(raw.validFrom)) {
      return fail('Cada tramo necesita su fecha de inicio en formato AAAA-MM-DD.');
    }
    const weekly = parseWeekly(raw.weekly);
    if (weekly === null) {
      return fail('Las horas de cada día tienen que ir en minutos enteros, de 0 a 1440.');
    }

    const tramo: ScheduleTramo = { validFrom: raw.validFrom, weekly };

    if (raw.intensive !== undefined && raw.intensive !== null) {
      const intensive = parseIntensive(raw.intensive);
      if (intensive === null) {
        return fail('La jornada intensiva necesita sus fechas en formato MM-DD y sus minutos por día.');
      }
      tramo.intensive = intensive;
    }

    schedules.push(tramo);
  }

  const fechas = new Set(schedules.map((t) => t.validFrom));
  if (fechas.size !== schedules.length) {
    return fail('Hay dos tramos que empiezan el mismo día: no se sabría cuál manda.');
  }

  /* Se guardan ordenados. `scheduleAt` ya no presupone orden, pero lo que se guarda es lo que
     alguien leerá dentro de un año. */
  schedules.sort((a, b) => a.validFrom.localeCompare(b.validFrom));

  return { ok: true, schedules };
}

/* ─────────────────────────── El rango de consulta ───────────────────────────

   Mismo tope que `compileRange`: sin él, una sola petición barrería los cuatro años de
   conservación para pintar un mes. */
const MAX_RANGE_DAYS = 400;

export function parseRange(query: unknown): { ok: true; from: string; to: string } | Fail {
  if (!isObject(query)) return fail('El periodo pedido no es válido.');
  if (!isIsoDate(query.from) || !isIsoDate(query.to)) {
    return fail('El periodo necesita fecha de inicio y de fin en formato AAAA-MM-DD.');
  }
  if (query.from > query.to) return fail('El periodo empieza después de acabar.');

  const dias = (Date.parse(`${query.to}T00:00:00Z`) - Date.parse(`${query.from}T00:00:00Z`)) / 86_400_000;
  if (dias >= MAX_RANGE_DAYS) return fail('El periodo pedido es demasiado largo.');

  return { ok: true, from: query.from, to: query.to };
}

/* ─────────────────────────── Las escrituras de administración ───────────────────────────

   La RLS ya impide que las toque quien no es administrador. Lo que la RLS no mira es si lo que se
   escribe tiene sentido, y de eso va esto. Las claves de las filas van en snake_case porque se
   insertan tal cual, igual que hace `mirrorFrom` en lib/ds. */

/* Lista corta a propósito: NO hay tipo médico. El motivo de una baja es dato de salud y no tiene
   por qué vivir en una herramienta que administración consulta a diario; que conste el día no
   trabajado basta para el registro. */
export const ABSENCE_KINDS = ['vacaciones', 'ausencia_justificada', 'ausencia'] as const;

/* Identificadores en ASCII y minúscula, etiqueta bonita en la interfaz: `cataluna` es lo que
   declara el `check` de la migración. */
export const CALENDAR_SCOPES = ['nacional', 'cataluna', 'barcelona'] as const;

export const ROLES = ['member', 'admin'] as const;

export type AbsenceRow = {
  person_id: string;
  from_date: string;
  to_date: string;
  kind: (typeof ABSENCE_KINDS)[number];
  note: string | null;
};

export function buildAbsence(body: unknown): { ok: true; row: AbsenceRow } | Fail {
  if (!isObject(body)) return fail('El cuerpo de la petición no es válido.');
  if (typeof body.personId !== 'string' || !isUuid(body.personId)) {
    return fail('Falta la persona a la que corresponde la ausencia.');
  }
  if (!isIsoDate(body.fromDate) || !isIsoDate(body.toDate)) {
    return fail('La ausencia necesita fecha de inicio y de fin en formato AAAA-MM-DD.');
  }
  // Los dos extremos entran dentro, así que un día suelto es una ausencia con las dos fechas iguales.
  if (body.fromDate > body.toDate) return fail('La ausencia acaba antes de empezar.');
  if (!oneOf(ABSENCE_KINDS, body.kind)) return fail('Ese tipo de ausencia no existe.');

  const note = typeof body.note === 'string' ? body.note.trim() : '';

  return {
    ok: true,
    row: {
      person_id: body.personId,
      from_date: body.fromDate,
      to_date: body.toDate,
      kind: body.kind,
      // Vacía se guarda como nula: una cadena vacía es un dato que dice que hay nota y no la hay.
      note: note || null,
    },
  };
}

export type CalendarDayRow = {
  day: string;
  name: string;
  scope: (typeof CALENDAR_SCOPES)[number];
};

export function buildCalendarDay(body: unknown): { ok: true; row: CalendarDayRow } | Fail {
  if (!isObject(body)) return fail('El cuerpo de la petición no es válido.');
  if (!isIsoDate(body.day)) return fail('El festivo necesita su fecha en formato AAAA-MM-DD.');

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return fail('El festivo necesita un nombre.');

  if (!oneOf(CALENDAR_SCOPES, body.scope)) return fail('Ese ámbito de festivo no existe.');

  return { ok: true, row: { day: body.day, name, scope: body.scope } };
}

/* Cuántos administradores activos hay AHORA y si la persona que se edita es uno de ellos. Entra
   como dato y no se consulta aquí dentro para que la decisión sea pura y se pueda probar sin base
   de datos; quien llama lo cuenta y lo pasa. */
export type RoleContext = { adminsActivos: number; eraAdmin: boolean };

export function buildRolePatch(
  body: unknown,
  context: RoleContext,
): { ok: true; role: (typeof ROLES)[number] } | Fail {
  if (!isObject(body)) return fail('El cuerpo de la petición no es válido.');
  if (!oneOf(ROLES, body.role)) return fail('Ese rol no existe.');

  /* Sin ningún administrador, NADIE puede volver a nombrar uno desde la aplicación: la política de
     escritura sobre `clock_people` exige ser admin, así que haría falta entrar a mano en el SQL
     Editor. Es un choque con el estado actual y no una petición malformada, de ahí el 409. */
  if (context.eraAdmin && body.role === 'member' && context.adminsActivos <= 1) {
    return fail('No se puede quitar el último administrador: el equipo se quedaría sin ninguno.', 409);
  }

  return { ok: true, role: body.role };
}

/* Solo se valida la FORMA. Quién puede escribir sobre otra persona lo decide `clock_record`
   comprobando `clock_is_admin()` en servidor: repetir aquí esa decisión crearía dos sitios donde se
   define quién es administrador, y el día que discrepen ganaría el más flojo. */
function personIdOf(body: Obj): string | null {
  return typeof body.personId === 'string' && isUuid(body.personId) ? body.personId : null;
}
