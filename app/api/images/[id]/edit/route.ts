import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { dbFail, getUser, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { isUuid } from '@/lib/uuid';
import { publicObjectUrl } from '@/lib/images/upload';
import { EditError, editImage } from '@/lib/images/edit/adapter';
import { extFor, mimeFor, tmpPaths } from '@/lib/images/edit/files';
import { editModel, outputSize } from '@/lib/images/edit/models';
import { buildEditPrompt } from '@/lib/images/edit/prompt';
import { EDIT_FAILED, limitReached, purgeStaleTmp, quota } from '@/lib/images/edit/server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/* El original se manda al modelo si pesa hasta 12 MB; si no, la ligera. El límite de una petición a Gemini con
   la imagen dentro es de 20 MB, y el base64 la engorda un tercio. El modelo trocea la foto en un número fijo
   de tokens: una más grande apenas le aporta (plan de la fase 2, § 4). */
const SOURCE_MAX_BYTES = 12 * 1024 * 1024;

const fail = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/* POST /api/images/:id/edit — «Aplica el estilo» (F6 a F8, F16). Edita la imagen con el prompt de la guía y la
   indicación, y deja el resultado en images/_tmp/ para que el modal lo enseñe. No toca la fila: guardar o
   descartar es /edit/commit.

   La cuota va primero: cada intento cuenta. Si el proveedor falla, o el resultado no llega a guardarse, el
   intento se devuelve con refund_rate_limit. Cada petición purga antes los temporales de más de 24 horas. */
export async function POST(req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;
  const user = await getUser();
  if (!user) return fail({ error: 'Sesión caducada.' }, 401);

  const { id } = await params;
  if (!isUuid(id)) return fail({ error: 'Esa imagen ya no está en el banco.' }, 404);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail({ error: 'Cuerpo de la petición inválido. Se espera JSON.' }, 400);
  }
  const variant = body.variant === 'people' ? 'people' : body.variant === 'standard' ? 'standard' : null;
  if (!variant) return fail({ error: 'Falta el prompt de la guía.' }, 400);
  const instruction = typeof body.instruction === 'string' ? body.instruction : '';
  const model = editModel(body.model).id;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return fail({ error: 'Falta la configuración de Supabase.' }, 500);

  const sb = await supabaseAuthServer();
  const { data: row, error: rowErr } = await sb
    .from('images')
    .select('storage_path, original_path, original_bytes, original_width, original_height, width, height')
    .eq('id', id)
    .maybeSingle();
  if (rowErr) return dbFail('images/[id]/edit', rowErr, 500);
  if (!row) return fail({ error: 'Esa imagen ya no está en el banco.' }, 404);

  const q = quota(sb, user.id);
  let allowed: boolean;
  try {
    allowed = await q.take();
  } catch (e) {
    return dbFail('images/[id]/edit:quota', e as { code?: string; message: string }, 500);
  }
  if (!allowed) {
    // check_rate_limit suma también al rechazar: se devuelve para que el contador no pase de 25.
    await q.refund();
    return fail({ error: limitReached(), exhausted: true, ...q.state(0) }, 429);
  }

  await purgeStaleTmp(sb);

  const useOriginal = !!row.original_path && (row.original_bytes ?? Infinity) <= SOURCE_MAX_BYTES;
  const sourcePath = (useOriginal ? row.original_path : row.storage_path) as string;
  const longEdge = useOriginal
    ? Math.max(row.original_width ?? 0, row.original_height ?? 0)
    : Math.max(row.width ?? 0, row.height ?? 0) || 1600;

  let result;
  try {
    const { data: blob, error: dlErr } = await sb.storage.from(IMAGE_BUCKET).download(sourcePath);
    if (dlErr || !blob) throw new EditError(`Storage: ${dlErr?.message ?? 'sin fichero'}`, 'provider');
    const mime = blob.type && extFor(blob.type) ? blob.type : (mimeFor(sourcePath.split('.').pop() ?? '') ?? 'image/jpeg');
    result = await editImage(
      { bytes: Buffer.from(await blob.arrayBuffer()), mime },
      buildEditPrompt(variant, instruction),
      { model, size: outputSize(model, longEdge) },
    );
  } catch (e) {
    await q.refund();
    const kind = e instanceof EditError ? e.kind : 'provider';
    console.error('[images/[id]/edit]', kind, e instanceof Error ? e.message : e);
    return fail({ error: EDIT_FAILED, blocked: kind === 'blocked', model, ...q.state(await q.remaining().catch(() => 0)) }, 502);
  }

  const paths = tmpPaths(randomUUID(), extFor(result.mime) ?? 'jpg');
  // Rutas únicas que no se sobrescriben: la caché de un año vale también al moverlas a su sitio al guardar.
  const { error: upErr } = await sb.storage
    .from(IMAGE_BUCKET)
    .upload(paths.result, result.bytes, { contentType: result.mime, cacheControl: '31536000', upsert: false });
  if (upErr) {
    await q.refund();
    console.error('[images/[id]/edit:tmp]', upErr.message);
    return fail({ error: EDIT_FAILED, blocked: false, model, ...q.state(await q.remaining().catch(() => 0)) }, 502);
  }

  const remaining = await q.remaining().catch(() => 0);
  return NextResponse.json(
    {
      tmp: paths.result,
      previewUrl: publicObjectUrl(base, IMAGE_BUCKET, paths.result),
      width: result.width,
      height: result.height,
      mime: result.mime,
      model,
      variant,
      ...q.state(remaining),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
