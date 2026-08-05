/* GET  /api/forms — listado del dispatcher, más reciente primero.
   POST /api/forms — crear.

   Se lee y escribe con la sesión del equipo (supabaseAuthServer), no con la anon key: la RLS de
   `forms` solo deja ver a `anon` lo publicado, así que los borradores necesitan sesión.
   El 401 lo impone el middleware (estas rutas están en EDITOR_API); requireUser es el cinturón. */

import { NextResponse } from 'next/server';
import { requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { compileForm } from '@/lib/forms/compile';
import type { FormCreateInput } from '@/lib/forms/types';
import { mirrorFrom } from '@/lib/forms/mirror';

export const dynamic = 'force-dynamic';

export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('forms')
    .select('id, public_id, title, client, status, slug, tags, md, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /* Recuento de respuestas por formulario. Dos consultas y el conteo en JS a propósito:
     PostgREST no agrupa, y a esta escala una tabla de ids es más barata que un RPC nuevo.
     Si `responses` crece hasta que esto moleste, la solución es una vista, no un join aquí. */
  const { data: rows } = await sb.from('responses').select('form_id');
  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    const key = (r as { form_id: string }).form_id;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const list = (data ?? []).map((f) => ({
    ...f,
    tags: f.tags ?? [],
    responses: counts.get(f.public_id) ?? 0,
  }));

  return NextResponse.json(list, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: FormCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const md = typeof body?.md === 'string' ? body.md : '';
  const compiled = compileForm(md);
  if (!compiled.ok) {
    // Crear siempre parte de una plantilla válida; si esto salta, es un bug nuestro, no del autor.
    const detail = compiled.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    return NextResponse.json({ error: `El formulario no compila — ${detail}` }, { status: 400 });
  }

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('forms')
    .insert({ ...mirrorFrom(compiled.def), tags: body.tags ?? [], md })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Ya existe un formulario con el id "${compiled.def.id}". Cambia el campo \`id\` del frontmatter.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
