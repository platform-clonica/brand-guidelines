/* IMG_r — «en uso», del lado del servidor.

   LA definición vive en SQL: `public.image_uses(uuid[])` (supabase/migrations/*_images_bank.sql) cruza
   cada imagen con el `md` de decks y formularios y devuelve una fila por documento. Esto la llama y
   agrupa su respuesta. La usan el listado (el recuento de cada tarjeta, en UNA llamada para la página),
   GET /api/images/[id], /usage y el DELETE que bloquea: el popup, IMG_r y cualquier cliente futuro
   dicen lo mismo.

   Solo tipos de supabase-js: el módulo carga en node para los tests. */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ImageUse } from '../decks/types.ts';

/* Las columnas que la API devuelve de una imagen. Todas menos `search_text`, que es solo para buscar. */
export const IMAGE_COLUMNS =
  'id, storage_path, url, alt, width, height, source, prompt, name, tags, original_path, original_bytes, ' +
  'original_width, original_height, thumb_path, parent_id, prior_original_path, created_by, created_at, updated_at';

type UseRow = { image_id: string; kind: string; doc_id: string; doc_name: string };

export function groupUses(rows: readonly UseRow[] | null): Map<string, ImageUse[]> {
  const out = new Map<string, ImageUse[]>();
  for (const r of rows ?? []) {
    if (r.kind !== 'deck' && r.kind !== 'form') continue;
    const list = out.get(r.image_id) ?? [];
    list.push({ kind: r.kind, id: r.doc_id, name: r.doc_name });
    out.set(r.image_id, list);
  }
  return out;
}

export async function imageUses(sb: SupabaseClient, ids: string[]): Promise<Map<string, ImageUse[]>> {
  if (!ids.length) return new Map();
  const { data, error } = await sb.rpc('image_uses', { p_ids: ids });
  if (error) throw error;
  return groupUses(data as UseRow[] | null);
}
