import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import type { ClientCreateInput } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

// GET /api/clients — list for the "Cliente" dropdown.
export async function GET() {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  if (error) return dbFail('clients', error, 500);
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/clients — quick-add a client (used when the editor types a new one).
export async function POST(req: Request) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: ClientCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('clients')
    .insert({
      name: body.name.trim(),
      default_logo_path: body.default_logo_path ?? null,
      default_emails: body.default_emails ?? null,
    })
    .select()
    .single();
  if (error) return dbFail('clients', error, 500);
  return NextResponse.json(data, { status: 201 });
}
