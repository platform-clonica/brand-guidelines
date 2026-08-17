import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import type { DeckCreateInput } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

// GET /api/decks — history list, newest first.
export async function GET() {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('decks')
    .select('id, commercial_id, client_id, tags, md, type, created_at, updated_at, clients(name)')
    .order('updated_at', { ascending: false });

  if (error) return dbFail('decks', error, 500);

  const list = (data ?? []).map((d: Record<string, unknown>) => ({
    id: d.id,
    commercial_id: d.commercial_id,
    client_id: d.client_id,
    client_name: (d.clients as { name?: string } | null)?.name ?? null,
    tags: (d.tags as string[] | null) ?? [],
    md: d.md ?? '',
    type: d.type ?? 'comercial',
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));
  return NextResponse.json(list, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/decks — create a new deck.
export async function POST(req: Request) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: DeckCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.commercial_id?.trim()) {
    return NextResponse.json({ error: 'commercial_id is required' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('decks')
    .insert({
      commercial_id: body.commercial_id.trim(),
      client_id: body.client_id ?? null,
      contact_emails: body.contact_emails ?? [],
      logo_path: body.logo_path ?? null,
      budget_url: body.budget_url ?? null,
      type: body.type ?? 'comercial',
      tags: body.tags ?? [],
      md: body.md ?? '',
    })
    .select()
    .single();

  if (error) return dbFail('decks', error, 500);
  return NextResponse.json(data, { status: 201 });
}
