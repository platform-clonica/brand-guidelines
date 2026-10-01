import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { tagFacets } from '@/lib/images/filter';

export const dynamic = 'force-dynamic';

/* PostgREST no devuelve más de 1000 filas por petición: se leen las etiquetas de mil en mil. */
const CHUNK = 1000;

/* GET /api/images/tags — las píldoras del banco y las sugerencias de etiquetas: cada etiqueta con
   cuántas imágenes la llevan (por uso y luego alfabético), y cuántas no tienen ninguna. Es del banco
   entero, no de la página cargada: un filtro que no ofrece todas las etiquetas no filtra, esconde. */
export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  const rows: { tags: string[] }[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await sb.from('images').select('tags').order('id').range(from, from + CHUNK - 1);
    if (error) return dbFail('images/tags', error, 500);
    rows.push(...((data ?? []) as { tags: string[] }[]));
    if (!data || data.length < CHUNK) break;
  }

  return NextResponse.json(tagFacets(rows), { headers: { 'Cache-Control': 'no-store' } });
}
