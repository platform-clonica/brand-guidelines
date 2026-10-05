import type { SupabaseClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { loadTagFacets } from '@/lib/images/bankTags';
import { analyzeImage } from '@/lib/images/analyze/server';
import { styleColumns } from '@/lib/images/analyze/result';

/* Lo que comparten /edit/commit y /revert al escribir: copiar ficheros a su sitio, borrar los de antes y
   analizar el estilo del resultado.

   Se COPIA y no se mueve: si algo falla a mitad, los temporales siguen ahí y se puede volver a intentar, y
   lo copiado se borra. Los temporales se borran solo cuando la fila ya está guardada; si no, los recoge la
   purga de 24 horas. */

const NULL_STYLE = {
  style_verdict: null,
  style_checks: null,
  style_reason: null,
  style_analyzed_at: null,
  people_present: null,
};

export async function copyAll(sb: SupabaseClient, pairs: [from: string, to: string][]): Promise<void> {
  const done: string[] = [];
  for (const [from, to] of pairs) {
    const { error } = await sb.storage.from(IMAGE_BUCKET).copy(from, to);
    if (error) {
      await removeLogged(sb, done, 'copy-rollback');
      throw error;
    }
    done.push(to);
  }
}

/* Borra y deja constancia de lo que no se pudo borrar, como el DELETE de la fase 1. */
export async function removeLogged(sb: SupabaseClient, paths: string[], scope: string): Promise<void> {
  if (!paths.length) return;
  const { error } = await sb.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.error(`[storage:images:${scope}] huérfano`, paths, error.message);
}

/* El estilo de una ligera ya subida, como columnas de la fila. Si el análisis falla, la imagen queda «sin
   analizar»: se puede pedir después con «Analizar estilo», y guardar la edición no depende de él. */
export async function styleOfLight(sb: SupabaseClient, lightPath: string) {
  try {
    const { data: blob, error } = await sb.storage.from(IMAGE_BUCKET).download(lightPath);
    if (error || !blob) throw error ?? new Error('sin fichero');
    const tags = await loadTagFacets(sb).then((f) => f.tags.map((t) => t.tag)).catch(() => []);
    const { style } = await analyzeImage({ data: Buffer.from(await blob.arrayBuffer()).toString('base64'), mediaType: 'image/jpeg' }, tags);
    return styleColumns(style);
  } catch (e) {
    console.error('[images/edit:style]', e instanceof Error ? e.message : e);
    return NULL_STYLE;
  }
}
