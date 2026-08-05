/* GET | PATCH | DELETE /api/forms/:id  (id = uuid interno, la URL del editor).
   Sesión de equipo, igual que /api/forms. */

import { NextResponse } from 'next/server';
import { requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { compileForm } from '@/lib/forms/compile';
import { mirrorFrom } from '@/lib/forms/mirror';
import type { FormUpdateInput } from '@/lib/forms/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.from('forms').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // El editor necesita el recuento para el botón de CSV y para avisar antes de borrar.
  const { count } = await sb
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', data.public_id);

  return NextResponse.json(
    { ...data, responses: count ?? 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PATCH(req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  let body: FormUpdateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ('tags' in body) patch.tags = body.tags ?? [];

  if (typeof body.md === 'string') {
    patch.md = body.md;

    /* El md se guarda SIEMPRE, compile o no: el autoguardado no puede negarse a persistir un
       documento a medio escribir, o el trabajo se pierde al recargar. Los campos espejo, en
       cambio, solo se refrescan cuando el documento es válido — así el listado nunca muestra el
       título a medias de un formulario roto, y conserva el último bueno. */
    const compiled = compileForm(body.md);
    if (compiled.ok) Object.assign(patch, mirrorFrom(compiled.def));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  const { data, error } = await sb.from('forms').update(patch).eq('id', id).select().single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ese `id` de frontmatter ya lo usa otro formulario. Cámbialo para poder guardar.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* Borra la definición. Las respuestas NO se tocan: son datos de terceros y valiosos.
   Quedan en `responses` ligadas al public_id; la UI avisa antes de llegar aquí. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  const sb = await supabaseAuthServer();
  const { error } = await sb.from('forms').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
