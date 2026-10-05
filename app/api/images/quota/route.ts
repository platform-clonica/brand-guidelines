import { NextResponse } from 'next/server';
import { getUser, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { quota } from '@/lib/images/edit/server';

export const dynamic = 'force-dynamic';

/* GET /api/images/quota — las ediciones que le quedan este mes a quien pregunta (F4, F5). Lee el contador con
   peek_rate_limit, que no suma: check_rate_limit suma al leer. */
export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Sesión caducada.' }, { status: 401 });

  const q = quota(await supabaseAuthServer(), user.id);
  try {
    return NextResponse.json(q.state(await q.remaining()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[images/quota]', e);
    return NextResponse.json({ error: 'No se ha podido leer tu límite de ediciones.' }, { status: 500 });
  }
}
