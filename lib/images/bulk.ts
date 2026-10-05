/* IMG_r · entrega 3 — acciones en bloque (docs/features/img-r.md, G9–G13).

   Lo que validan y reparten PATCH /api/images/bulk y POST /api/images/bulk-delete antes y después de tocar la
   base de datos. Sin SDK: lo importan los Route Handlers y los tests en node. */

import type { ImageUse } from '../decks/types.ts';
import { isUuid } from '../uuid.ts';
import { TAGS_MAX, normalizeTags } from './naming.ts';

/* Como mucho 200 imágenes por petición: la lista de ids viaja en el cuerpo y `image_uses` las cruza todas
   con decks y formularios en una sola llamada. */
export const BULK_MAX = 200;

/* `.in('id', …)` viaja en la URL de PostgREST, y 200 uuid son unos 7,4 KB: cerca del límite de algunas
   pasarelas. Las consultas por id van en tandas de 100. */
export const IN_CHUNK = 100;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/* Los ids de una acción en bloque: uuid, sin repetir y en el orden en que llegan. */
export function parseBulkIds(v: unknown): Result<string[]> {
  if (!Array.isArray(v) || !v.every((x): x is string => typeof x === 'string' && isUuid(x))) {
    return { ok: false, error: 'Identificador no válido.' };
  }
  const ids = [...new Set(v)];
  if (!ids.length) return { ok: false, error: 'Elige al menos una imagen.' };
  if (ids.length > BULK_MAX) return { ok: false, error: `Como mucho ${BULK_MAX} imágenes a la vez.` };
  return { ok: true, value: ids };
}

/* Las etiquetas que se añaden: normalizadas como en la subida. Más de las que caben en una imagen no tiene
   sentido, así que se rechazan con el mismo texto que la subida. */
export function parseAddTags(v: unknown): Result<string[]> {
  const tags = normalizeTags(Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []);
  if (!tags.length) return { ok: false, error: 'Añade al menos una etiqueta.' };
  if (tags.length > TAGS_MAX) return { ok: false, error: 'Demasiadas etiquetas.' };
  return { ok: true, value: tags };
}

type Paths = {
  id: string;
  storage_path: string;
  original_path: string | null;
  thumb_path: string | null;
  prior_original_path: string | null;
};

/* Borrado en bloque (G12): las libres se borran; las que se usan en algún deck o formulario, no, y vuelven
   con su lista; las que ya no existen se devuelven aparte para que salgan de la selección. */
export function splitDeletable<R extends Paths>(
  ids: readonly string[],
  rows: readonly R[],
  uses: ReadonlyMap<string, ImageUse[]>,
): { free: R[]; blocked: { id: string; uses: ImageUse[] }[]; missing: string[] } {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const free: R[] = [];
  const blocked: { id: string; uses: ImageUse[] }[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) missing.push(id);
    else if (uses.get(id)?.length) blocked.push({ id, uses: uses.get(id)! });
    else free.push(row);
  }
  return { free, blocked, missing };
}

/* Añadir etiquetas (G10): con las filas de antes y las que la base de datos actualizó, cuáles ya no existen
   y cuáles se quedaron sin hueco para alguna de las nuevas (tope de TAGS_MAX). Las que ya las tenían todas
   no cuentan como llenas. */
export function tagsOutcome(
  ids: readonly string[],
  added: readonly string[],
  before: readonly { id: string; tags: string[] }[],
  updated: readonly { id: string; tags: string[] }[],
): { missing: string[]; full: string[] } {
  const now = new Map(before.map((r) => [r.id, r.tags]));
  for (const r of updated) now.set(r.id, r.tags);
  const missing: string[] = [];
  const full: string[] = [];
  for (const id of ids) {
    const tags = now.get(id);
    if (!tags) missing.push(id);
    else if (!added.every((t) => tags.includes(t))) full.push(id);
  }
  return { missing, full };
}
