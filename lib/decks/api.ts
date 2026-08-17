'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import type {
  ClientCreateInput,
  ClientRecord,
  DeckCreateInput,
  DeckListItem,
  DeckRecord,
  DeckSignature,
  DeckUpdateInput,
  ImageCreateInput,
  ImageRecord,
  SignInput,
} from './types';

/* Los constructores de URL pública, el desempaquetado de errores y la firma viven en
   ./publicApi.ts, que NO importa el SDK. El visor de propuestas tira de ahí directamente para no
   arrastrar supabase-js a una ruta pública; aquí se reexportan para que el editor siga
   importándolo todo de un único sitio. Ver la cabecera de publicApi.ts. */
import {
  IMAGE_BUCKET,
  LOGO_BUCKET,
  json,
  publicImageUrl,
  publicLogoUrl,
  signDeck,
} from './publicApi';

export { publicImageUrl, publicLogoUrl, signDeck };

// ---- Decks ----
export function listDecks(): Promise<DeckListItem[]> {
  return fetch('/api/decks', { cache: 'no-store' }).then((r) => json<DeckListItem[]>(r));
}

export function getDeck(id: string): Promise<DeckRecord> {
  return fetch(`/api/decks/${id}`, { cache: 'no-store' }).then((r) => json<DeckRecord>(r));
}

export function createDeck(input: DeckCreateInput): Promise<DeckRecord> {
  return fetch('/api/decks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => json<DeckRecord>(r));
}

export function updateDeck(id: string, patch: DeckUpdateInput): Promise<DeckRecord> {
  return fetch(`/api/decks/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => json<DeckRecord>(r));
}

export function deleteDeck(id: string): Promise<{ ok: boolean }> {
  return fetch(`/api/decks/${id}`, { method: 'DELETE' }).then((r) => json<{ ok: boolean }>(r));
}

// ---- Translation ----
/* The endpoint streams the translated markdown as plain-text chunks (to avoid gateway
   timeouts on long decks); accumulate them and return the full result. */
export async function translateDeck(md: string, target: 'es' | 'ca' | 'en'): Promise<{ md: string }> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ md, target }),
  });
  if (!res.ok || !res.body) {
    // Errors before streaming (bad key, invalid input) come back as JSON.
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
  return { md: out };
}

// ---- Clients ----
export function listClients(): Promise<ClientRecord[]> {
  return fetch('/api/clients', { cache: 'no-store' }).then((r) => json<ClientRecord[]>(r));
}

export function addClient(input: ClientCreateInput): Promise<ClientRecord> {
  return fetch('/api/clients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => json<ClientRecord>(r));
}

// ---- Storage (logos) ----
/* Upload an SVG logo to the public bucket and return its storage path.
   Render it via publicLogoUrl() as an <img src> — never inline SVG (XSS). */
export async function uploadLogo(file: File): Promise<string> {
  const sb = supabaseBrowser();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `logos/${Date.now()}-${safe}`;
  const { error } = await sb.storage.from(LOGO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || 'image/svg+xml',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

// ---- Images (gallery) ----
/* Upload an (already optimised) image blob to the public bucket and return its
   storage path + public URL. The URL is what gets written into the deck markdown. */
export async function uploadImage(file: Blob, name: string): Promise<{ path: string; url: string }> {
  const sb = supabaseBrowser();
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `images/${Date.now()}-${safe}`;
  const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const url = sb.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, url };
}

/* Gallery index: list every uploaded/generated image, newest first. */
export function listImages(): Promise<ImageRecord[]> {
  return fetch('/api/images', { cache: 'no-store' }).then((r) => json<ImageRecord[]>(r));
}

/* Register an image in the gallery index after it has been uploaded to Storage. */
export function registerImage(input: ImageCreateInput): Promise<ImageRecord> {
  return fetch('/api/images', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => json<ImageRecord>(r));
}

/* Remove an image from the gallery index and delete its stored file. */
export function deleteImage(id: string): Promise<{ ok: boolean }> {
  return fetch(`/api/images/${id}`, { method: 'DELETE' }).then((r) => json<{ ok: boolean }>(r));
}

/* Qué documentos referencian esta imagen (por su URL en el markdown), para avisar antes de borrar.
   Incluye decks Y formularios: la galería es compartida por las dos herramientas. */
export type ImageUse = { kind: 'deck' | 'form'; name: string };

export function imageUsage(id: string): Promise<{ count: number; uses: ImageUse[] }> {
  return fetch(`/api/images/${id}/usage`, { cache: 'no-store' }).then((r) =>
    json<{ count: number; uses: ImageUse[] }>(r),
  );
}
