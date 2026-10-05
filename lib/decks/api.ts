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
  ImageDetail,
  ImageListItem,
  ImageRecord,
  ImageStyle,
  ImageUpdateInput,
  ImageUse,
  SignInput,
} from './types';
import type { ImageFilter, TagFacets } from '@/lib/images/filter';
import { leftAfterRemove } from '@/lib/images/upload';

/* Los constructores de URL pública, el desempaquetado de errores y la firma viven en
   ./publicApi.ts, que NO importa el SDK. El visor de propuestas tira de ahí directamente para no
   arrastrar supabase-js a una ruta pública; aquí se reexportan para que el editor siga
   importándolo todo de un único sitio. Ver la cabecera de publicApi.ts. */
import {
  IMAGE_BUCKET,
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
/* La subida vive en lib/storage/logos.ts desde DSMak_r, que la usa con su propio prefijo. Aquí se
   reexporta para que DeckMak_r siga importándolo todo de un único sitio. */
export { uploadLogo } from '@/lib/storage/logos';

// ---- Images (banco, IMG_r: docs/features/img-r.md) ----
/* Sube un fichero del banco a su ruta definitiva (`images/<id>/…`, lib/images/upload.ts). Esas rutas
   son únicas y no se sobrescriben nunca —la fase 2 sobrescribe con rutas nuevas—, así que la caché
   puede ser de un año (plan IMG_r, D11). */
export async function uploadImageObject(path: string, file: Blob, contentType: string): Promise<void> {
  const sb = supabaseBrowser();
  const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
}

/* Limpieza de una subida que no llegó a registrarse. `uploaded` son las rutas que se sabe que existen; las
   demás pueden no existir, y borrarlas no hace daño. Devuelve lo que queda por borrar (lib/images/upload.ts,
   `leftAfterRemove`) para reintentarlo; los que se sabe que existen y no se borraron quedan como huérfanos en
   la consola, igual que en el DELETE del servidor. */
export async function removeImageObjects(paths: string[], uploaded: string[] = paths): Promise<string[]> {
  if (!paths.length) return [];
  const { data, error } = await supabaseBrowser()
    .storage.from(IMAGE_BUCKET)
    .remove(paths)
    .catch((e: unknown) => ({ data: null, error: e instanceof Error ? e : new Error(String(e)) }));
  const left = leftAfterRemove(paths, uploaded, error ? null : (data ?? []).map((o) => o.name));
  const orphans = left.filter((p) => uploaded.includes(p));
  if (orphans.length) console.error('[storage:images] huérfano', orphans, error?.message ?? '');
  return left;
}

export type ImagePage = { items: ImageListItem[]; nextCursor: string | null };

/* Una página del banco, recientes primero. Búsqueda y filtro se resuelven en servidor. */
export function listImages(p: Partial<ImageFilter> & { cursor?: string | null } = {}): Promise<ImagePage> {
  const qs = new URLSearchParams();
  if (p.q?.trim()) qs.set('q', p.q.trim());
  if (p.untagged) qs.set('untagged', '1');
  else if (p.tags?.length) qs.set('tags', p.tags.join(','));
  if (p.style) qs.set('style', 'si');
  if (p.cursor) qs.set('cursor', p.cursor);
  const s = qs.toString();
  return fetch(`/api/images${s ? `?${s}` : ''}`, { cache: 'no-store' }).then((r) => json<ImagePage>(r));
}

/* Las etiquetas del banco entero, con su uso, y cuántas imágenes no tienen ninguna. */
export function listImageTags(): Promise<TagFacets> {
  return fetch('/api/images/tags', { cache: 'no-store' }).then((r) => json<TagFacets>(r));
}

/* Una imagen con dónde se usa y quién la subió; null si ya no existe. */
export async function getImage(id: string): Promise<ImageDetail | null> {
  const res = await fetch(`/api/images/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  return json<ImageDetail>(res);
}

/* Registra una imagen cuyos tres ficheros ya están subidos. */
export function registerImage(input: ImageCreateInput): Promise<ImageRecord> {
  return fetch('/api/images', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => json<ImageRecord>(r));
}

/* Nombre y etiquetas. Un 409 no es un error: otra pestaña guardó antes, y llega la fila actual para
   enseñar sus cambios. Un 404, que la imagen ya no existe. */
export type ImageUpdateResult =
  | { ok: true; row: ImageRecord }
  | { ok: false; conflict: ImageRecord }
  | { ok: false; gone: true };

export async function updateImage(id: string, input: ImageUpdateInput): Promise<ImageUpdateResult> {
  const res = await fetch(`/api/images/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.status === 409) return { ok: false, conflict: ((await res.json()) as { current: ImageRecord }).current };
  if (res.status === 404) return { ok: false, gone: true };
  return { ok: true, row: await json<ImageRecord>(res) };
}

/* Borra la imagen y todos sus ficheros. Si algún deck o formulario la usa, la API no borra nada y
   devuelve dónde: eso tampoco es un error, es la regla. */
export type ImageDeleteResult = { ok: true } | { ok: false; uses: ImageUse[] };

export async function deleteImage(id: string): Promise<ImageDeleteResult> {
  const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
  if (res.status === 409) return { ok: false, uses: ((await res.json()) as { uses?: ImageUse[] }).uses ?? [] };
  await json<{ ok: boolean }>(res);
  return { ok: true };
}

/* Qué documentos referencian esta imagen (por la URL de su versión ligera en el markdown). La definición
   de «en uso» es una sola, en servidor: la comparten esto, el listado y el DELETE. */
export type { ImageUse };

export function imageUsage(id: string): Promise<{ count: number; uses: ImageUse[] }> {
  return fetch(`/api/images/${id}/usage`, { cache: 'no-store' }).then((r) =>
    json<{ count: number; uses: ImageUse[] }>(r),
  );
}

// ---- Análisis de estilo (IMG_r, fase 2) ----

/* Propuesta de nombre y etiquetas de una imagen que aún no está en el banco, y su estilo. `name` es null
   si el propuesto no pasó evalText(). */
export type ImageAnalysis = { proposal: { name: string | null; tags: string[] }; style: ImageStyle };

export function analyzeUpload(image: { data: string; mediaType: string }): Promise<ImageAnalysis> {
  return fetch('/api/images/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: image.data, mediaType: image.mediaType }),
  }).then((r) => json<ImageAnalysis>(r));
}

/* «Analizar estilo» de una imagen del banco: devuelve la fila con el estilo guardado. */
export function analyzeBankImage(id: string): Promise<ImageRecord> {
  return fetch(`/api/images/${id}/analyze`, { method: 'POST' }).then((r) => json<ImageRecord>(r));
}

// ---- Editar con IA (IMG_r, fase 2) ----

export type EditQuota = { limit: number; remaining: number; resetsOn: string; resetLabel: string };

/* Las ediciones que le quedan este mes a quien pregunta. */
export function getEditQuota(): Promise<EditQuota> {
  return fetch('/api/images/quota', { cache: 'no-store' }).then((r) => json<EditQuota>(r));
}

export type EditStart = EditQuota & {
  tmp: string;
  previewUrl: string;
  width: number | null;
  height: number | null;
  mime: string;
};

/* Lo que puede salir de «Aplica el estilo»: el resultado, o un fallo con el mensaje que enseña el modal.
   `exhausted`: no quedan ediciones (429). `blocked`: el modelo respondió sin imagen. Si el fallo trae la
   cuota, el intento ya se ha devuelto y el contador dice la verdad. */
export type EditAttempt =
  | { ok: true; result: EditStart }
  | { ok: false; error: string; exhausted?: boolean; blocked?: boolean; quota?: EditQuota };

export async function startEdit(
  id: string,
  body: { variant: 'standard' | 'people'; instruction: string; model: string },
  signal?: AbortSignal,
): Promise<EditAttempt> {
  const res = await fetch(`/api/images/${id}/edit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json().catch(() => null)) as (Partial<EditStart> & { error?: string; exhausted?: boolean; blocked?: boolean }) | null;
  if (res.ok && data?.tmp) return { ok: true, result: data as EditStart };
  const quota = typeof data?.remaining === 'number' ? (data as EditQuota) : undefined;
  return { ok: false, error: data?.error ?? `Request failed (${res.status})`, exhausted: !!data?.exhausted, blocked: !!data?.blocked, quota };
}

type Size = { width: number; height: number };
export type CommitInput = {
  tmp: string;
  mode: 'copy' | 'overwrite';
  variant: 'standard' | 'people';
  model: string;
  instruction: string;
  original: Size;
  light: Size;
};

/* Guardar la edición como copia o encima. Un 409 no es un error: alguien colocó la imagen entretanto. */
export async function commitEdit(id: string, input: CommitInput): Promise<{ ok: true; row: ImageRecord } | { ok: false; uses: ImageUse[] }> {
  const res = await fetch(`/api/images/${id}/edit/commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.status === 409) return { ok: false, uses: ((await res.json()) as { uses?: ImageUse[] }).uses ?? [] };
  return { ok: true, row: await json<ImageRecord>(res) };
}

/* Descartar un resultado: sin esperar ni avisar. Si falla, lo recoge la purga de 24 horas. */
export function discardEdit(id: string, tmp: string): void {
  void fetch(`/api/images/${id}/edit/commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tmp, mode: 'discard' }),
    keepalive: true,
  }).catch(() => {});
}

/* Volver al original. `variants` son la ligera y la miniatura del original ya subidas a images/_tmp/ (no
   hacen falta en una antigua). Un 409 trae dónde se usa. */
export async function revertImage(
  id: string,
  variants?: { tmpId: string; original: Size; light: Size },
): Promise<{ ok: true; row: ImageRecord } | { ok: false; uses: ImageUse[] }> {
  const res = await fetch(`/api/images/${id}/revert`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(variants ? { variants: variants.tmpId, original: variants.original, light: variants.light } : {}),
  });
  if (res.status === 409) return { ok: false, uses: ((await res.json()) as { uses?: ImageUse[] }).uses ?? [] };
  return { ok: true, row: await json<ImageRecord>(res) };
}
