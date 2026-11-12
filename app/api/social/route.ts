/* GET  /api/social: la galería del Social Maker, más reciente primero.
        Lleva el markdown: la tarjeta pinta la primera slide de verdad y
        para eso necesita el texto. Ver `SocialListItem`.
   POST /api/social: crear una pieza, o duplicar con `{ duplicateOf }`.

   Sesión de equipo: el 401 lo impone el middleware (EDITOR_API) y
   `requireUser` es el cinturón. La lógica de qué se guarda vive en
   `lib/social/server.ts`, testeada en node. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import {
  buildDuplicate,
  buildInsert,
  isUuid,
  listItemFrom,
  type SocialPostRow,
} from '@/lib/social/server';

export const dynamic = 'force-dynamic';

const COLUMNAS = 'id, public_id, name, canvas, md, tags, created_at, updated_at';

export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('social_posts')
    .select(COLUMNAS)
    .order('updated_at', { ascending: false });
  if (error) return dbFail('social', error);

  return NextResponse.json(((data ?? []) as unknown as SocialPostRow[]).map(listItemFrom), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  const duplicateOf = (body as { duplicateOf?: unknown } | null)?.duplicateOf;

  if (typeof duplicateOf === 'string') {
    if (!isUuid(duplicateOf)) {
      return NextResponse.json({ error: 'No existe la pieza a duplicar' }, { status: 404 });
    }
    const { data: origen, error: findErr } = await sb
      .from('social_posts')
      .select(COLUMNAS)
      .eq('id', duplicateOf)
      .maybeSingle();
    if (findErr) return dbFail('social:duplicate', findErr);
    if (!origen) return NextResponse.json({ error: 'No existe la pieza a duplicar' }, { status: 404 });

    const { data: creada, error: insErr } = await sb
      .from('social_posts')
      .insert(buildDuplicate(origen as unknown as SocialPostRow, body))
      .select(COLUMNAS)
      .single();
    if (insErr) return dbFail('social:duplicate', insErr);
    return NextResponse.json(creada, { status: 201 });
  }

  const { data: creada, error } = await sb
    .from('social_posts')
    .insert(buildInsert(body))
    .select(COLUMNAS)
    .single();
  if (error) return dbFail('social:create', error);
  return NextResponse.json(creada, { status: 201 });
}
