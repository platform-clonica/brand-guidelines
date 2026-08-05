'use client';
/* FormMaker — cliente de navegador. Calco de lib/decks/api.ts: fetch fino sobre /api/forms,
   con el mismo desempaquetado de errores para que el estudio pueda mostrarlos tal cual. */

import type { FormCreateInput, FormListItem, FormRecord, FormUpdateInput } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error((msg as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function listForms(): Promise<FormListItem[]> {
  return fetch('/api/forms', { cache: 'no-store' }).then((r) => json<FormListItem[]>(r));
}

/* Devuelve también el recuento de respuestas: el editor lo necesita para el botón de CSV. */
export function getForm(id: string): Promise<FormListItem> {
  return fetch(`/api/forms/${id}`, { cache: 'no-store' }).then((r) => json<FormListItem>(r));
}

export function createForm(input: FormCreateInput): Promise<FormRecord> {
  return fetch('/api/forms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => json<FormRecord>(r));
}

export function updateForm(id: string, patch: FormUpdateInput): Promise<FormRecord> {
  return fetch(`/api/forms/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => json<FormRecord>(r));
}

export function deleteForm(id: string): Promise<{ ok: boolean }> {
  return fetch(`/api/forms/${id}`, { method: 'DELETE' }).then((r) => json<{ ok: boolean }>(r));
}
