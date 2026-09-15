/* GET  /api/design-systems — galería de DSMak_r, más reciente primero. Sin los JSONB, que pesan
        decenas de KB por fila: la tarjeta recibe la tira de color ya calculada.
   POST /api/design-systems — crear desde una marca, o duplicar con `{ duplicateOf }`.

   Sesión de equipo: el 401 lo impone el middleware (EDITOR_API) y requireUser es el cinturón.
   La lógica de qué se guarda vive en lib/ds/server.ts, testeada en node. */

import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { buildDuplicate, buildInsert, isUuid, listItemFrom, ownedLogoPaths, type ListRow } from '@/lib/ds/server';
import { LOGO_BUCKET } from '@/lib/storage/paths';

export const dynamic = 'force-dynamic';

const LIST_COLUMNS = 'id, public_id, name, client, status, tags, engine_version, logo_path, created_at, updated_at, palette:tokens->palette';

export async function GET() {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const sb = await supabaseAuthServer();
  const { data, error } = await sb.from('design_systems').select(LIST_COLUMNS).order('updated_at', { ascending: false });
  if (error) return dbFail('design-systems', error);

  return NextResponse.json(((data ?? []) as unknown as ListRow[]).map(listItemFrom), {
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
    if (!isUuid(duplicateOf)) return NextResponse.json({ error: 'No existe el sistema a duplicar' }, { status: 404 });
    const { data: source, error: findErr } = await sb.from('design_systems').select('*').eq('id', duplicateOf).maybeSingle();
    if (findErr) return dbFail('design-systems:duplicate', findErr);
    if (!source) return NextResponse.json({ error: 'No existe el sistema a duplicar' }, { status: 404 });

    const input = body as { name?: unknown; client?: unknown; tags?: unknown };
    const { data: created, error: insertErr } = await sb
      .from('design_systems')
      .insert(buildDuplicate(source, input))
      .select()
      .single();
    if (insertErr) return dbFail('design-systems:duplicate', insertErr);

    /* Los logos se COPIAN al prefijo del sistema nuevo: si se compartiera la ruta, borrar uno de los
       dos dejaría al otro sin logo (comprobación manual 10). Una copia fallida no tumba el duplicado:
       nace sin ese logo y queda en el log. */
    const logoUpdates: Record<string, string> = {};
    for (const [column, path] of [
      ['logo_path', source.logo_path],
      ['logo_dark_path', source.logo_dark_path],
    ] as const) {
      if (!ownedLogoPaths({ logo_path: path }, source.id).length) continue;
      const target = (path as string).replace(`ds/${source.id}/`, `ds/${created.id}/`);
      const { error: copyErr } = await sb.storage.from(LOGO_BUCKET).copy(path as string, target);
      if (copyErr) console.error('[storage:design-systems] logo sin copiar', path, copyErr.message);
      else logoUpdates[column] = target;
    }

    if (Object.keys(logoUpdates).length === 0) return NextResponse.json(created, { status: 201 });
    const { data: withLogos, error: logoErr } = await sb
      .from('design_systems')
      .update(logoUpdates)
      .eq('id', created.id)
      .select()
      .single();
    if (logoErr) return dbFail('design-systems:duplicate', logoErr);
    return NextResponse.json(withLogos, { status: 201 });
  }

  const insert = buildInsert(body);
  if (!insert.ok) return NextResponse.json({ error: insert.error }, { status: insert.status });

  const { data, error } = await sb.from('design_systems').insert(insert.row).select().single();
  if (error) return dbFail('design-systems', error);
  return NextResponse.json(data, { status: 201 });
}
