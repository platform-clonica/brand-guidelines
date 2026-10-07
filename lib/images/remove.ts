/* IMG_r — borrar imágenes del banco: primero las filas, después TODOS sus ficheros. Lo usan el DELETE de una
   imagen y el borrado en bloque (entrega 3, G12), para que la regla viva en un solo sitio. Quien llama ya ha
   comprobado que nadie las usa.

   No hay transacción posible entre Postgres y Storage, así que hay que elegir qué inconsistencia se prefiere
   si falla el segundo paso: un fichero huérfano es invisible y barato de limpiar; una fila que apunta a un
   fichero borrado se ve rota. Solo se borran los ficheros de las filas que Postgres CONFIRMA haber borrado, y
   se comprueba lo que Storage confirma, como en /api/design-systems/[id]: sin política de lectura, `remove`
   respondía 200 y no borraba nada.

   Solo tipos de supabase-js: no carga el SDK. */

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET } from '../storage/paths.ts';
import { IN_CHUNK, chunk } from './bulk.ts';
import { objectPaths } from './upload.ts';

export type RemovableImage = {
  id: string;
  storage_path: string;
  original_path: string | null;
  thumb_path: string | null;
  prior_original_path: string | null;
};

/* Las columnas que hacen falta para borrar una imagen con todos sus ficheros. */
export const REMOVABLE_COLUMNS = 'id, storage_path, original_path, thumb_path, prior_original_path';

/* Devuelve los ids que se han borrado de verdad, o el error de Postgres si falló alguna tanda. Las tandas que
   ya se borraron no se deshacen: sus ficheros se borran igual, para no dejar huérfanos. */
export async function removeImages(
  sb: SupabaseClient,
  rows: readonly RemovableImage[],
): Promise<{ deleted: string[]; error: PostgrestError | null }> {
  const deleted = new Set<string>();
  let error: PostgrestError | null = null;
  for (const part of chunk(rows, IN_CHUNK)) {
    const { data, error: e } = await sb
      .from('images')
      .delete()
      .in(
        'id',
        part.map((r) => r.id),
      )
      .select('id');
    if (e) {
      error = e;
      break;
    }
    for (const r of (data ?? []) as { id: string }[]) deleted.add(r.id);
  }

  const paths = rows.filter((r) => deleted.has(r.id)).flatMap((r) => objectPaths(r));
  if (paths.length) {
    const { data: removed, error: storageErr } = await sb.storage.from(IMAGE_BUCKET).remove(paths);
    // No bloqueante: las filas ya no están y el banco es coherente. Solo hay que poder verlo.
    if (storageErr || (removed?.length ?? 0) < paths.length) {
      const gone = new Set((removed ?? []).map((o) => o.name));
      console.error(
        '[storage:images] huérfano',
        paths.filter((p) => !gone.has(p)),
        storageErr?.message ?? `Storage confirmó ${removed?.length ?? 0} de ${paths.length} borrados`,
      );
    }
  }
  return { deleted: rows.map((r) => r.id).filter((id) => deleted.has(id)), error };
}
