import { randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { isUuid } from '@/lib/uuid';
import { withName } from '@/lib/images/naming';
import { publicObjectUrl, variantPaths } from '@/lib/images/upload';
import { IMAGE_COLUMNS, imageUses } from '@/lib/images/usage';
import { copyName, editedPaths, mimeFor, overwritePlan, parseTmp, tmpPaths } from '@/lib/images/edit/files';
import { editModel } from '@/lib/images/edit/models';
import { INSTRUCTION_MAX } from '@/lib/images/edit/prompt';
import { SAVE_FAILED, tmpObjects } from '@/lib/images/edit/server';
import { copyAll, removeLogged, styleOfLight } from '@/lib/images/edit/persist';
import type { ImageRecord } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const fail = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const isDim = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/* POST /api/images/:id/edit/commit — qué hacer con el resultado de una edición (F10, F11, F14, F15, F17).

   - `discard`: borra el temporal y sus variantes.
   - `copy`: una fila nueva, `source = 'edited'`, con `parent_id`, el prompt y el modelo, «<nombre> (editada)»,
     las mismas etiquetas y sus tres ficheros propios en images/<id nuevo>/.
   - `overwrite`: solo si nadie la usa (si no, 409 con la lista). El original pasa a `prior_original_path` y los
     tres ficheros van a rutas NUEVAS, así que la URL cambia (lib/images/edit/files.ts, overwritePlan).

   La ligera y la miniatura del resultado las fabrica el navegador y las sube a images/_tmp/ junto a él (plan,
   § 4): aquí se comprueba que están y se copian a su sitio. `copy` y `overwrite` analizan el estilo del
   resultado antes de responder. */
export async function POST(req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return fail({ error: 'Esa imagen ya no está en el banco.' }, 404);

  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail({ error: 'Cuerpo de la petición inválido. Se espera JSON.' }, 400);
  }
  const tmp = typeof b.tmp === 'string' ? parseTmp(b.tmp) : null;
  if (!tmp) return fail({ error: 'Temporal no válido.' }, 400);
  const paths = tmpPaths(tmp.id, tmp.ext);
  const sb = await supabaseAuthServer();

  if (b.mode === 'discard') {
    await removeLogged(sb, [paths.result, paths.light, paths.thumb], 'edit-discard');
    return NextResponse.json({ ok: true });
  }
  if (b.mode !== 'copy' && b.mode !== 'overwrite') return fail({ error: 'Modo no válido.' }, 400);

  const original = b.original as { width?: unknown; height?: unknown } | undefined;
  const light = b.light as { width?: unknown; height?: unknown } | undefined;
  if (!isDim(original?.width) || !isDim(original?.height) || !isDim(light?.width) || !isDim(light?.height)) {
    return fail({ error: 'Medidas no válidas.' }, 400);
  }
  const variant = b.variant === 'people' ? 'people' : 'standard';
  const model = editModel(b.model).id;
  const instruction = typeof b.instruction === 'string' ? b.instruction.trim().slice(0, INSTRUCTION_MAX) || null : null;
  const mime = mimeFor(tmp.ext) ?? 'image/jpeg';

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return fail({ error: 'Falta la configuración de Supabase.' }, 500);
  const urlFor = (path: string) => publicObjectUrl(base, IMAGE_BUCKET, path);

  const { data: found, error: findErr } = await sb.from('images').select(IMAGE_COLUMNS).eq('id', id).maybeSingle();
  if (findErr) return dbFail('images/[id]/edit/commit', findErr, 500);
  if (!found) return fail({ error: 'Esa imagen ya no está en el banco.' }, 404);
  const row = withName(found as unknown as ImageRecord);

  let sizes: Map<string, number>;
  try {
    sizes = await tmpObjects(sb, tmp.id);
  } catch (e) {
    return dbFail('images/[id]/edit/commit:tmp', e as { code?: string; message: string }, 500);
  }
  if (![paths.result, paths.light, paths.thumb].every((p) => sizes.has(p))) {
    return fail({ error: 'Faltan ficheros de la edición. Vuelve a aplicar el estilo.' }, 400);
  }

  if (b.mode === 'overwrite') {
    let uses;
    try {
      uses = (await imageUses(sb, [id])).get(id) ?? [];
    } catch (e) {
      return dbFail('images/[id]/edit/commit:uses', e as { code?: string; message: string }, 500);
    }
    if (uses.length) return fail({ error: 'No se puede sobrescribir: la imagen está en uso.', uses }, 409);
  }

  const style = await styleOfLight(sb, paths.light);
  const edited = {
    source: 'edited' as const,
    prompt: instruction,
    prompt_variant: variant,
    edit_model: model,
    original_bytes: sizes.get(paths.result) ?? null,
    original_width: original!.width as number,
    original_height: original!.height as number,
    width: light!.width as number,
    height: light!.height as number,
    ...style,
  };

  if (b.mode === 'copy') {
    const newId = randomUUID();
    const dest = variantPaths(newId, mime);
    try {
      await copyAll(sb, [[paths.result, dest.original], [paths.light, dest.light], [paths.thumb, dest.thumb]]);
    } catch (e) {
      console.error('[images/[id]/edit/commit:copy]', e);
      return fail({ error: SAVE_FAILED }, 500);
    }
    const name = copyName(row.name);
    const { data, error } = await sb
      .from('images')
      .insert({
        id: newId, name, alt: name, tags: row.tags, parent_id: id,
        storage_path: dest.light, url: urlFor(dest.light), thumb_path: dest.thumb, original_path: dest.original,
        ...edited,
      })
      .select(IMAGE_COLUMNS)
      .single();
    if (error) {
      await removeLogged(sb, [dest.original, dest.light, dest.thumb], 'edit-copy-rollback');
      return dbFail('images/[id]/edit/commit:insert', error, 500);
    }
    await removeLogged(sb, [paths.result, paths.light, paths.thumb], 'edit-tmp');
    return NextResponse.json(withName(data as unknown as ImageRecord), { status: 201 });
  }

  const plan = overwritePlan(row);
  const dest = editedPaths(id, mime, randomBytes(4).toString('hex'));
  try {
    await copyAll(sb, [[paths.result, dest.original], [paths.light, dest.light], [paths.thumb, dest.thumb]]);
  } catch (e) {
    console.error('[images/[id]/edit/commit:copy]', e);
    return fail({ error: SAVE_FAILED }, 500);
  }
  const { data, error } = await sb
    .from('images')
    .update({
      storage_path: dest.light, url: urlFor(dest.light), thumb_path: dest.thumb, original_path: dest.original,
      prior_original_path: plan.prior,
      ...edited,
    })
    .eq('id', id)
    .select(IMAGE_COLUMNS)
    .maybeSingle();
  if (error || !data) {
    await removeLogged(sb, [dest.original, dest.light, dest.thumb], 'edit-overwrite-rollback');
    return error ? dbFail('images/[id]/edit/commit:update', error, 500) : fail({ error: 'Esa imagen ya no está en el banco.' }, 404);
  }
  await removeLogged(sb, [...plan.remove, paths.result, paths.light, paths.thumb], 'edit-overwrite');
  return NextResponse.json(withName(data as unknown as ImageRecord));
}
