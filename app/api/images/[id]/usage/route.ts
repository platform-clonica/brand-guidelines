import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { isUuid } from '@/lib/uuid';
import { imageUses } from '@/lib/images/usage';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/* GET /api/images/:id/usage — qué decks y formularios llevan esta imagen en su `md`.

   Antes hacía aquí sus propias dos consultas `ilike`. Ahora delega en `image_uses` (lib/images/usage.ts),
   la misma definición que usan el listado y el DELETE que bloquea: si cambia qué significa «en uso»,
   cambia en un solo sitio. La respuesta es la de siempre, `{ count, uses }`. */
export async function GET(_req: Request, { params }: Ctx) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  const notFound = NextResponse.json({ error: 'Esa imagen ya no está en el banco.' }, { status: 404 });
  if (!isUuid(id)) return notFound;
  const sb = await supabaseAuthServer();

  const { data: img, error: findErr } = await sb.from('images').select('id').eq('id', id).maybeSingle();
  if (findErr) return dbFail('images/[id]/usage', findErr, 500);
  if (!img) return notFound;

  try {
    const uses = (await imageUses(sb, [id])).get(id) ?? [];
    return NextResponse.json({ count: uses.length, uses }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return dbFail('images/[id]/usage', e as { code?: string; message: string }, 500);
  }
}
