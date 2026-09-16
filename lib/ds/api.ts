'use client';
/* DSMak_r — cliente de navegador de /api/design-systems. Calco de lib/forms/api.ts, con una
   diferencia: un 409 se lanza como ConflictError, para que el autoguardado lo distinga de un fallo
   de red y no reintente (plan, H7). */

import { uploadLogo } from '@/lib/storage/logos';
import type { Brand, Configs, Overrides } from './schema';
import type { DesignSystemListItem, DesignSystemRecord, DesignSystemUpdateInput } from './types';

export class ConflictError extends Error {
  /** `updated_at` actual de la fila, cuando el conflicto es de concurrencia. */
  updatedAt: string | null;

  constructor(message: string, updatedAt: string | null) {
    super(message);
    this.name = 'ConflictError';
    this.updatedAt = updatedAt;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (res.ok) return res.json() as Promise<T>;
  const body = (await res.json().catch(() => ({}))) as { error?: string; updated_at?: string };
  const message = body.error ?? `Request failed (${res.status})`;
  if (res.status === 409) throw new ConflictError(message, body.updated_at ?? null);
  throw new Error(message);
}

const send = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});

export const listDesignSystems = () => request<DesignSystemListItem[]>('/api/design-systems');

export const getDesignSystem = (id: string) => request<DesignSystemRecord>(`/api/design-systems/${id}`);

export const createDesignSystem = (input: { brand: Brand; overrides?: Overrides; configs?: Configs; tags?: string[] }) =>
  request<DesignSystemRecord>('/api/design-systems', send('POST', input));

export const duplicateDesignSystem = (id: string, input: { name?: string; client?: string | null; tags?: string[] } = {}) =>
  request<DesignSystemRecord>('/api/design-systems', send('POST', { duplicateOf: id, ...input }));

export const updateDesignSystem = (id: string, patch: DesignSystemUpdateInput) =>
  request<DesignSystemRecord>(`/api/design-systems/${id}`, send('PATCH', patch));

export const deleteDesignSystem = (id: string) =>
  request<{ ok: boolean }>(`/api/design-systems/${id}`, { method: 'DELETE' });

/* El logo va a `ds/<id>/`: es el único prefijo que el servidor acepta para este sistema. */
export const uploadDsLogo = (id: string, file: File) => uploadLogo(file, `ds/${id}`);
