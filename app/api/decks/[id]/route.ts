import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import type { DeckUpdateInput } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/decks/:id — full deck (md + metadata).
export async function GET(_req: Request, { params }: Ctx) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.from('decks').select('*').eq('id', id).single();
  if (error) return dbFail('decks/[id]', error, 404);
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

// PATCH /api/decks/:id — save md and/or metadata.
export async function PATCH(req: Request, { params }: Ctx) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  let body: DeckUpdateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Only forward known, present fields.
  const allowed: (keyof DeckUpdateInput)[] = ['commercial_id', 'client_id', 'contact_emails', 'logo_path', 'budget_url', 'type', 'tags', 'md'];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  const { data, error } = await sb.from('decks').update(patch).eq('id', id).select().single();
  if (error) return dbFail('decks/[id]', error, 500);
  return NextResponse.json(data);
}

// DELETE /api/decks/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  const sb = await supabaseAuthServer();
  const { error } = await sb.from('decks').delete().eq('id', id);
  if (error) return dbFail('decks/[id]', error, 500);
  return NextResponse.json({ ok: true });
}
