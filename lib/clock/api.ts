'use client';
/* Clock_r — cliente de navegador de /api/clock. Calco de lib/forms/api.ts y lib/ds/api.ts.

   Una diferencia propia: el 409 de colisión de cadena se lanza como `ChainBusyError`. No es un fallo
   de nadie —dos escrituras compitieron por el mismo eslabón— y se resuelve reintentando, así que
   quien ficha tiene que poder distinguirlo de un error de verdad. */

import type {
  ChainBreak,
  ClockAbsenceRow,
  ClockCalendarDayRow,
  ClockConsentRow,
  ClockEntryRow,
  ClockKind,
  ClockMode,
  ClockPersonRow,
  ClockSource,
} from './types';

export class ChainBusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainBusyError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (res.ok) return res.json() as Promise<T>;

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const message = body.error ?? `La petición falló (${res.status})`;
  if (res.status === 409) throw new ChainBusyError(message);
  throw new Error(message);
}

const send = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});

const rango = (from: string, to: string, personId?: string) =>
  `from=${from}&to=${to}${personId ? `&personId=${personId}` : ''}`;

/* ─── Fichar ───

   El fichaje NO lleva hora: la pone el servidor. Mandarla es un 400, y es deliberado — si el cliente
   pudiera elegirla, la cadena de hashes seguiría cuadrando y estaría firmando una hora que nadie
   fichó. Solo una corrección trae hora, y va con su motivo. */
export const recordEntry = (input: {
  kind: ClockKind;
  mode: ClockMode;
  source: ClockSource;
  personId?: string;
}) => request<ClockEntryRow>('/api/clock/entries', send('POST', input));

export const amendEntry = (input: {
  kind: ClockKind;
  mode: ClockMode;
  source: ClockSource;
  op: 'amend' | 'annul';
  corrects: string;
  reason: string;
  occurredAt: string;
  personId?: string;
}) => request<ClockEntryRow>('/api/clock/entries', send('POST', input));

export const listEntries = (from: string, to: string, personId?: string) =>
  request<ClockEntryRow[]>(`/api/clock/entries?${rango(from, to, personId)}`);

/* ─── Calendario y equipo ─── */

export const listAbsences = (from: string, to: string, personId?: string) =>
  request<ClockAbsenceRow[]>(`/api/clock/absences?${rango(from, to, personId)}`);

export const listCalendar = (year: number) =>
  request<ClockCalendarDayRow[]>(`/api/clock/calendar?year=${year}`);

export const listPeople = () => request<ClockPersonRow[]>('/api/clock/people');

export const patchPerson = (input: {
  personId: string;
  schedules?: unknown;
  role?: string;
  status?: string;
}) => request<ClockPersonRow>('/api/clock/people', send('PATCH', input));

export const createAbsence = (input: {
  personId: string;
  fromDate: string;
  toDate: string;
  kind: string;
  note?: string;
}) => request<ClockAbsenceRow>('/api/clock/absences', send('POST', input));

export const deleteAbsence = (id: string) =>
  request<{ ok: boolean }>(`/api/clock/absences?id=${id}`, { method: 'DELETE' });

export const createCalendarDay = (input: { day: string; name: string; scope: string }) =>
  request<ClockCalendarDayRow>('/api/clock/calendar', send('POST', input));

export const deleteCalendarDay = (id: string) =>
  request<{ ok: boolean }>(`/api/clock/calendar?id=${id}`, { method: 'DELETE' });

/* ─── Integridad y consentimiento ───

   `verifyChain` pregunta, no calcula: el hash lo rehace Postgres. Un hash que calcula el navegador
   no prueba nada, porque quien lo calcula es quien lo puede falsificar. */
export const verifyChain = (personId?: string) =>
  request<{ intact: boolean; break: ChainBreak | null }>(
    `/api/clock/verify${personId ? `?personId=${personId}` : ''}`,
  );

export const getConsent = () => request<ClockConsentRow | null>('/api/clock/consent');

export const acceptPolicy = (policyVersion: string, policyHash: string) =>
  request<ClockConsentRow>('/api/clock/consent', send('POST', { policyVersion, policyHash }));
