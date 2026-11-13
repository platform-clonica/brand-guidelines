'use client';

import type { SocialListItem, SocialPostRow } from './server.ts';
import type { CanvasId } from './types.ts';

/* Las llamadas del navegador a /api/social.
   ─────────────────────────────────────────────────────────────────────────
   Un sitio solo para que nadie escriba una URL a mano y para que el error
   que sale sea siempre legible: el que devuelve el servidor cuando lo hay,
   y el código si no. */

export class SocialApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SocialApiError';
  }
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!r.ok) {
    let mensaje = `La petición ha fallado (${r.status}).`;
    try {
      const cuerpo = (await r.json()) as { error?: string };
      if (cuerpo?.error) mensaje = cuerpo.error;
    } catch {
      /* Respuesta sin JSON: se queda el mensaje con el código. */
    }
    throw new SocialApiError(mensaje, r.status);
  }
  return (await r.json()) as T;
}

export const listarPiezas = () => pedir<SocialListItem[]>('/api/social');

export const crearPieza = (body: { name?: string; canvas?: CanvasId; md?: string }) =>
  pedir<SocialPostRow>('/api/social', { method: 'POST', body: JSON.stringify(body) });

export const duplicarPieza = (id: string) =>
  pedir<SocialPostRow>('/api/social', { method: 'POST', body: JSON.stringify({ duplicateOf: id }) });

export const leerPieza = (id: string) => pedir<SocialPostRow>(`/api/social/${id}`);

export const guardarPieza = (
  id: string,
  body: { name?: string; md?: string; canvas?: CanvasId },
) => pedir<SocialPostRow>(`/api/social/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

export const borrarPieza = (id: string) =>
  pedir<{ ok: true }>(`/api/social/${id}`, { method: 'DELETE' });
