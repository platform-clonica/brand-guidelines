/* Las etiquetas del banco entero, con su uso. Las piden las píldoras y las sugerencias (/api/images/tags)
   y el análisis, que las pone en el prompt para que la propuesta elija primero entre ellas.

   Solo tipos de supabase-js: lo que hace es una consulta, sin estado. */

import type { SupabaseClient } from '@supabase/supabase-js';
import { tagFacets, type TagFacets } from './filter.ts';

/* PostgREST no devuelve más de 1000 filas por petición: se leen las etiquetas de mil en mil. */
const CHUNK = 1000;

export async function loadTagFacets(sb: SupabaseClient): Promise<TagFacets> {
  const rows: { tags: string[] }[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await sb.from('images').select('tags').order('id').range(from, from + CHUNK - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as { tags: string[] }[]));
    if (!data || data.length < CHUNK) break;
  }
  return tagFacets(rows);
}
