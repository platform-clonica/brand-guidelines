import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { isUuid } from '@/lib/uuid';
import { withName } from '@/lib/images/naming';
import { objectPaths, validateUpdateInput } from '@/lib/images/upload';
import { IMAGE_COLUMNS, imageUses } from '@/lib/images/usage';
import type { ImageDetail, ImageRecord } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/* Es también el aviso que da IMG_r al entrar por el enlace de una imagen borrada. */
const notFound = () => NextResponse.json({ error: 'Esa imagen ya no está en el banco.' }, { status: 404 });

/* GET /api/images/:id — una imagen con dónde se usa y quién la subió. Lo pide el detalle de IMG_r,
   que puede abrirse por su URL sin que la imagen esté en las páginas cargadas. */
export async function GET(_req: Request, { params }: Ctx) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const sb = await supabaseAuthServer();

  const { data, error } = await sb.from('images').select(IMAGE_COLUMNS).eq('id', id).maybeSingle();
  if (error) return dbFail('images/[id]', error, 500);
  if (!data) return notFound();
  const row = data as unknown as ImageRecord;

  let uses;
  try {
    uses = await imageUses(sb, [id]);
  } catch (e) {
    return dbFail('images/[id]:uses', e as { code?: string; message: string }, 500);
  }

  /* Quién la subió: `created_by` apunta a auth.users, que se lee por `team_member_names`. Si falla, el
     detalle sale sin nombre en vez de no salir. */
  let uploadedBy: string | null = null;
  if (row.created_by) {
    const { data: names, error: namesErr } = await sb.rpc('team_member_names', { p_ids: [row.created_by] });
    if (namesErr) console.error('[db:images/[id]:names]', namesErr.code ?? '-', namesErr.message);
    uploadedBy = (names as { name: string }[] | null)?.[0]?.name ?? null;
  }

  /* F18: de qué imagen sale una copia editada. Si la de origen se borró, `parent_id` ya es null. */
  let parent: ImageDetail['parent'] = null;
  if (row.parent_id) {
    const { data: p } = await sb.from('images').select('id, name, alt, storage_path, url').eq('id', row.parent_id).maybeSingle();
    if (p) {
      const named = withName(p as { id: string; name: string | null; alt: string | null; storage_path: string; url: string });
      parent = { id: named.id, name: named.name, url: named.url };
    }
  }

  const detail: ImageDetail = { ...withName(row), uses: uses.get(id) ?? [], uploaded_by: uploadedBy, parent };
  return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } });
}

/* PATCH /api/images/:id — nombre y etiquetas, con concurrencia optimista (el patrón de
   /api/design-systems/[id]). Solo escribe si `updated_at` sigue siendo el que se leyó al abrir. Si otra
   pestaña guardó entre medias, no toca nada y responde 409 con la fila ACTUAL, para que el detalle
   enseñe los cambios del otro y ofrezca «Guardar encima» (reenviar con ese `updated_at`) o «Recargar». */
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
  const parsed = validateUpdateInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { name, tags, expectedUpdatedAt } = parsed.value;

  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('images')
    .update({ name, tags })
    .eq('id', id)
    .eq('updated_at', expectedUpdatedAt)
    .select(IMAGE_COLUMNS)
    .maybeSingle();
  if (error) return dbFail('images/[id]', error, 500);
  if (data) return NextResponse.json(withName(data as unknown as ImageRecord));

  const { data: current, error: findErr } = await sb.from('images').select(IMAGE_COLUMNS).eq('id', id).maybeSingle();
  if (findErr) return dbFail('images/[id]', findErr, 500);
  if (!current) return notFound();
  return NextResponse.json(
    {
      error: 'Alguien ha cambiado esta imagen desde otra pestaña mientras la editabas.',
      current: withName(current as unknown as ImageRecord),
    },
    { status: 409 },
  );
}

/* DELETE /api/images/:id — borra la imagen y TODOS sus ficheros, salvo que algún deck o formulario la
   use: entonces 409 con la lista y no toca nada. La regla vive aquí, no en la pantalla, para que el
   popup, IMG_r y cualquier cliente futuro digan lo mismo.

   Primero la fila, después los ficheros. No hay transacción posible entre Postgres y Storage, así que
   hay que elegir qué inconsistencia se prefiere si falla el segundo paso: un fichero huérfano es
   invisible y barato de limpiar; una fila que apunta a un fichero borrado se ve rota. Se comprueba lo
   que Storage CONFIRMA haber borrado, como en /api/design-systems/[id]: sin política de lectura,
   `remove` respondía 200 y no borraba nada. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const sb = await supabaseAuthServer();

  const { data: row, error: findErr } = await sb
    .from('images')
    .select('storage_path, original_path, thumb_path, prior_original_path')
    .eq('id', id)
    .maybeSingle();
  if (findErr) return dbFail('images/[id]', findErr, 500);
  if (!row) return notFound();

  let uses;
  try {
    uses = (await imageUses(sb, [id])).get(id) ?? [];
  } catch (e) {
    return dbFail('images/[id]:uses', e as { code?: string; message: string }, 500);
  }
  if (uses.length) {
    return NextResponse.json(
      { error: `La imagen se usa en ${uses.length === 1 ? 'un documento' : `${uses.length} documentos`}.`, uses },
      { status: 409 },
    );
  }

  const { error } = await sb.from('images').delete().eq('id', id);
  if (error) return dbFail('images/[id]', error, 500);

  const paths = objectPaths(row);
  const { data: removed, error: storageErr } = await sb.storage.from(IMAGE_BUCKET).remove(paths);
  // No bloqueante: la fila ya no está y el banco es coherente. Solo hay que poder verlo.
  if (storageErr || (removed?.length ?? 0) < paths.length) {
    const gone = new Set((removed ?? []).map((o) => o.name));
    console.error(
      '[storage:images] huérfano',
      paths.filter((p) => !gone.has(p)),
      storageErr?.message ?? `Storage confirmó ${removed?.length ?? 0} de ${paths.length} borrados`,
    );
  }
  return NextResponse.json({ ok: true });
}
