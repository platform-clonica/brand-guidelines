/* Clock_r — tipos de las cinco tablas `clock_*`. Espejo de
   supabase/migrations/20260917140000_create_clock.sql.

   `schedules` va como `unknown` A PROPÓSITO, igual que los JSONB de lib/ds/types.ts: lo que sale de
   la base de datos no está validado, y quien lo abre tiene que pasar por `buildSchedulesPatch` al
   escribir o por `scheduleAt` al leer. Tiparlo como `ScheduleTramo[]` sería afirmar algo que nadie
   ha comprobado.

   Los nombres de columna se quedan en snake_case, como en el resto del repo; el camelCase es para
   lo que vive DENTRO de un JSONB. */

export type ClockRole = 'member' | 'admin';
export type ClockStatus = 'active' | 'inactive';
export type ClockKind = 'in' | 'out' | 'break_start' | 'break_end';
export type ClockOp = 'record' | 'amend' | 'annul';
export type ClockMode = 'onsite' | 'remote';
export type ClockSource = 'home_card' | 'app';

export type ClockPersonRow = {
  id: string;
  /** `null` si se dio de baja la cuenta de Google: el registro sobrevive a la cuenta. */
  user_id: string | null;
  email: string;
  display_name: string;
  role: ClockRole;
  status: ClockStatus;
  /** Array de tramos con `validFrom`. Sin validar: ver la cabecera. */
  schedules: unknown;
  started_on: string | null;
  ended_on: string | null;
  created_at: string;
  updated_at: string;
};

/* Una fila del libro de asientos. NO tiene `updated_at` ni lo tendrá: no se reescribe.
   `hash` y `prev_hash` los pone el servidor dentro de `clock_record`; aquí solo se leen. */
export type ClockEntryRow = {
  id: string;
  seq: number;
  person_id: string;
  /** Copia del momento del fichaje: el asiento no depende de que la persona siga existiendo. */
  person_email: string;
  person_name: string;
  op: ClockOp;
  corrects: string | null;
  reason: string | null;
  kind: ClockKind;
  occurred_at: string;
  recorded_at: string;
  work_date: string;
  mode: ClockMode;
  source: ClockSource;
  author_person_id: string;
  prev_hash: string | null;
  hash: string;
};

export type ClockAbsenceRow = {
  id: string;
  person_id: string;
  from_date: string;
  to_date: string;
  kind: 'vacaciones' | 'ausencia_justificada' | 'ausencia';
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ClockCalendarDayRow = {
  id: string;
  day: string;
  name: string;
  scope: 'nacional' | 'cataluna' | 'barcelona';
  created_at: string;
  updated_at: string;
};

export type ClockConsentRow = {
  id: string;
  person_id: string;
  policy_version: string;
  policy_hash: string;
  accepted_at: string;
};

/* Lo que devuelve `clock_verify_chain`. CERO FILAS significa que la cadena está intacta; una fila
   es el primer asiento que no cuadra, y a partir de ahí lo de después no dice nada. */
export type ChainBreak = {
  broken_seq: number;
  broken_id: string;
  expected_hash: string;
  found_hash: string;
};
