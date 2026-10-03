import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { loadTagFacets } from '@/lib/images/bankTags';

export const dynamic = 'force-dynamic';

/* GET /api/images/tags — las píldoras del banco y las sugerencias de etiquetas: cada etiqueta con
   cuántas imágenes la llevan (por uso y luego alfabético), y cuántas no tienen ninguna. Es del banco
   entero, no de la página cargada: un filtro que no ofrece todas las etiquetas no filtra, esconde. */
export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  try {
    return NextResponse.json(await loadTagFacets(sb), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return dbFail('images/tags', e as { code?: string; message: string }, 500);
  }
}
