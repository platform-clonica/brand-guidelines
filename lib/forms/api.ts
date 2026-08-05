'use client';
/* FormMaker — cliente de navegador. Calco de lib/decks/api.ts: fetch fino sobre /api/forms,
   con el mismo desempaquetado de errores para que el estudio pueda mostrarlos tal cual. */

import type { FormCreateInput, FormListItem, FormRecord, FormUpdateInput } from './types';
import { checkTranslation, type TranslateTarget } from './translate';

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

/* Traduce el markdown del formulario y NO devuelve nada que no haya pasado el verificador.

   El modelo puede equivocarse traduciendo un `name` (la clave con la que se guardan las
   respuestas) o rompiendo el YAML. Si eso pasa, se lanza y el documento del autor no se toca:
   más vale no traducir que traducir dejando las respuestas huérfanas. */
export async function translateForm(md: string, target: TranslateTarget): Promise<{ md: string }> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ md, target, kind: 'form' }),
  });
  if (!res.ok || !res.body) {
    // Los errores previos al streaming (clave mala, entrada inválida) vuelven como JSON.
    const msg = await res.json().catch(() => ({}));
    throw new Error((msg as { error?: string }).error ?? `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  if (!out.trim()) throw new Error('La traducción falló o se interrumpió. Inténtalo de nuevo.');

  const problems = checkTranslation(md, out);
  if (problems.length) {
    const detail = problems.slice(0, 3).map((p) => p.detail).join(' · ');
    const more = problems.length > 3 ? ` (y ${problems.length - 3} más)` : '';
    throw new Error(
      `La traducción alteró datos que deben quedarse igual y se ha descartado: ${detail}${more}. El formulario no se ha modificado.`,
    );
  }

  return { md: out };
}
