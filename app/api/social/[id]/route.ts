/* GET    /api/social/[id]: la pieza entera, con su markdown.
   PATCH  /api/social/[id]: nombre, markdown, lienzo o etiquetas.
   DELETE /api/social/[id]: borrarla.

   Qué se deja tocar lo decide `buildPatch` en lib/social/server.ts: un
   cuerpo con campos desconocidos no es un error de quien escribe, es un
   campo que el servidor no debe tocar. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { buildPatch, isUuid } from '@/lib/social/server';

export const dynamic = 'force-dynamic';

const COLUMNAS = 'id, public_id, name, canvas, md, tags, created_at, updated_at';
type Ctx = { params: Promise<{ id: string }> };

const noExiste = () => NextResponse.json({ error: 'No existe la pieza' }, { status: 404 });

export async function GET(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;
  const { id } = await params;
  if (!isUuid(id)) return noExiste();

  const sb = await supabaseAuthServer();
  const { data, error } = await sb.from('social_posts').select(COLUMNAS).eq('id', id).maybeSingle();
  if (error) return dbFail('social:get', error);
  if (!data) return noExiste();
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;
  const { id } = await params;
  if (!isUuid(id)) return noExiste();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch = buildPatch(body);
  /* Nada que cambiar: se responde la fila tal cual en vez de escribir y
     disparar el trigger de `updated_at` en balde, que movería la pieza al
     principio de la galería sin que nadie la haya tocado. */
  const sb = await supabaseAuthServer();
  if (!patch) {
    const { data, error } = await sb.from('social_posts').select(COLUMNAS).eq('id', id).maybeSingle();
    if (error) return dbFail('social:patch', error);
    return data ? NextResponse.json(data) : noExiste();
  }

  const { data, error } = await sb
    .from('social_posts')
    .update(patch)
    .eq('id', id)
    .select(COLUMNAS)
    .maybeSingle();
  if (error) return dbFail('social:patch', error);
  if (!data) return noExiste();
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;
  const { id } = await params;
  if (!isUuid(id)) return noExiste();

  const sb = await supabaseAuthServer();
  const { error } = await sb.from('social_posts').delete().eq('id', id);
  if (error) return dbFail('social:delete', error);
  return NextResponse.json({ ok: true });
}
