/* GET | PATCH | DELETE /api/design-systems/:id  (id = uuid, la URL del editor).
   Sesión de equipo, igual que /api/design-systems. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { buildPatch, isUuid, ownedLogoPaths, renamePatch } from '@/lib/ds/server';
import { LOGO_BUCKET } from '@/lib/storage/paths';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: 'No existe este sistema' }, { status: 404 });

export async function GET(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.from('design_systems').select('*').eq('id', id).maybeSingle();
  if (error) return dbFail('design-systems/[id]', error);
  if (!data) return notFound();
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

/* Concurrencia optimista (plan, H7). Se actualiza solo si `updated_at` sigue siendo el que el editor
   cargó; si otra pestaña guardó entre medias, no se toca ninguna fila y se responde 409 con el
   `updated_at` actual, para que el editor ofrezca recargar o guardar encima. */
export async function PATCH(req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = buildPatch(body, id);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const sb = await supabaseAuthServer();

  /* Renombrar necesita la marca guardada para reescribir su nombre sin recalcular tokens. Leerla antes
     no abre carrera: la escritura sigue condicionada a `updated_at`, así que si la fila cambió entre
     medias responde 409 igual. */
  if (parsed.rename) {
    const { data: current, error: brandErr } = await sb.from('design_systems').select('brand').eq('id', id).maybeSingle();
    if (brandErr) return dbFail('design-systems/[id]', brandErr);
    if (!current) return notFound();
    Object.assign(parsed.patch, renamePatch(current.brand, parsed.rename));
  }

  const { data, error } = await sb
    .from('design_systems')
    .update(parsed.patch)
    .eq('id', id)
    .eq('updated_at', parsed.expectedUpdatedAt)
    .select()
    .maybeSingle();
  if (error) return dbFail('design-systems/[id]', error);
  if (data) return NextResponse.json(data);

  const { data: current, error: findErr } = await sb.from('design_systems').select('updated_at').eq('id', id).maybeSingle();
  if (findErr) return dbFail('design-systems/[id]', findErr);
  if (!current) return notFound();
  return NextResponse.json(
    { error: 'Este sistema se ha guardado desde otra pestaña después de que lo abrieras.', updated_at: current.updated_at },
    { status: 409 },
  );
}

/* Primero la fila, después los ficheros: el mismo orden que app/api/images/[id]. Lo peor que queda si
   falla Storage es un logo huérfano, invisible. Se comprueba lo que Storage CONFIRMA haber borrado:
   sin política de lectura sobre storage.objects, `remove` no da error pero no borra nada. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const sb = await supabaseAuthServer();

  const { data: row, error: findErr } = await sb
    .from('design_systems')
    .select('logo_path, logo_dark_path')
    .eq('id', id)
    .maybeSingle();
  if (findErr) return dbFail('design-systems/[id]', findErr);
  if (!row) return notFound();

  const { error } = await sb.from('design_systems').delete().eq('id', id);
  if (error) return dbFail('design-systems/[id]', error);

  const paths = ownedLogoPaths(row, id);
  if (paths.length) {
    const { data: removed, error: storageErr } = await sb.storage.from(LOGO_BUCKET).remove(paths);
    if (storageErr || (removed?.length ?? 0) < paths.length) {
      console.error(
        '[storage:design-systems] huérfano',
        paths,
        storageErr?.message ?? `Storage confirmó ${removed?.length ?? 0} de ${paths.length} borrados`,
      );
    }
  }
  return NextResponse.json({ ok: true });
}
