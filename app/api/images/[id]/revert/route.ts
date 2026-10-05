import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { isUuid } from '@/lib/uuid';
import { withName } from '@/lib/images/naming';
import { publicObjectUrl } from '@/lib/images/upload';
import { IMAGE_COLUMNS, imageUses } from '@/lib/images/usage';
import { editedPaths, mimeFor, revertPlan, tmpPaths } from '@/lib/images/edit/files';
import { tmpObjects } from '@/lib/images/edit/server';
import { copyAll, removeLogged, styleOfLight } from '@/lib/images/edit/persist';
import type { ImageRecord } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const fail = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const isDim = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/* POST /api/images/:id/revert — «Volver al original» (F19, F20). Recupera `prior_original_path`, borra los
   ficheros editados y vuelve a analizar el estilo.

   Solo si nadie la usa (plan, § 6): volver al original borra los ficheros editados, y un deck que los use se
   quedaría con la imagen rota. Si está en uso, 409 con la lista.

   - Una antigua vuelve a su ligera de siempre, con su URL de siempre: no hay nada que fabricar.
   - Una nueva recupera su original, y el navegador fabrica antes su ligera y su miniatura y las sube a
     images/_tmp/ (`variants`, con las medidas). Van a rutas nuevas: la URL cambia otra vez. */
export async function POST(req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return fail({ error: 'Esa imagen ya no está en el banco.' }, 404);
  const b = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return fail({ error: 'Falta la configuración de Supabase.' }, 500);
  const urlFor = (path: string) => publicObjectUrl(base, IMAGE_BUCKET, path);

  const sb = await supabaseAuthServer();
  const { data: found, error: findErr } = await sb.from('images').select(IMAGE_COLUMNS).eq('id', id).maybeSingle();
  if (findErr) return dbFail('images/[id]/revert', findErr, 500);
  if (!found) return fail({ error: 'Esa imagen ya no está en el banco.' }, 404);
  const row = found as unknown as ImageRecord;
  const plan = revertPlan(row);
  if (!plan || !row.prior_original_path) return fail({ error: 'Esta imagen no tiene un original al que volver.' }, 400);
  const prior = row.prior_original_path;

  let uses;
  try {
    uses = (await imageUses(sb, [id])).get(id) ?? [];
  } catch (e) {
    return dbFail('images/[id]/revert:uses', e as { code?: string; message: string }, 500);
  }
  if (uses.length) return fail({ error: 'No se puede volver al original: la imagen está en uso.', uses }, 409);

  const cleared = {
    source: row.parent_id ? ('edited' as const) : ('upload' as const),
    prompt: null,
    prompt_variant: null,
    edit_model: null,
    prior_original_path: null,
  };

  let update: Record<string, unknown>;
  let toRemove = plan.remove;
  let copied: string[] = [];
  if (plan.legacy) {
    update = {
      ...cleared,
      storage_path: prior, url: urlFor(prior), thumb_path: null,
      original_path: null, original_bytes: null, original_width: null, original_height: null, width: null, height: null,
      ...(await styleOfLight(sb, prior)),
    };
  } else {
    const tmpId = typeof b.variants === 'string' && isUuid(b.variants) ? b.variants : null;
    const original = b.original as { width?: unknown; height?: unknown } | undefined;
    const light = b.light as { width?: unknown; height?: unknown } | undefined;
    if (!tmpId || !isDim(original?.width) || !isDim(original?.height) || !isDim(light?.width) || !isDim(light?.height)) {
      return fail({ error: 'Faltan la ligera y la miniatura del original.' }, 400);
    }
    const t = tmpPaths(tmpId, 'jpg');
    let sizes: Map<string, number>;
    try {
      sizes = await tmpObjects(sb, tmpId);
    } catch (e) {
      return dbFail('images/[id]/revert:tmp', e as { code?: string; message: string }, 500);
    }
    if (!sizes.has(t.light) || !sizes.has(t.thumb)) return fail({ error: 'Faltan la ligera y la miniatura del original.' }, 400);

    const { data: listed } = await sb.storage.from(IMAGE_BUCKET).list(`images/${id}`, { search: prior.split('/').pop() });
    const priorBytes = Number((listed?.[0]?.metadata as { size?: number } | null)?.size ?? 0) || null;
    const dest = editedPaths(id, mimeFor(prior.split('.').pop() ?? '') ?? 'image/jpeg', randomBytes(4).toString('hex'));
    try {
      await copyAll(sb, [[t.light, dest.light], [t.thumb, dest.thumb]]);
      copied = [dest.light, dest.thumb];
    } catch (e) {
      console.error('[images/[id]/revert:copy]', e);
      return fail({ error: 'No se ha podido recuperar el original. Vuelve a intentarlo.' }, 500);
    }
    update = {
      ...cleared,
      storage_path: dest.light, url: urlFor(dest.light), thumb_path: dest.thumb,
      original_path: prior, original_bytes: priorBytes,
      original_width: original!.width, original_height: original!.height, width: light!.width, height: light!.height,
      ...(await styleOfLight(sb, t.light)),
    };
    toRemove = [...toRemove, t.light, t.thumb];
  }

  const { data, error } = await sb.from('images').update(update).eq('id', id).select(IMAGE_COLUMNS).maybeSingle();
  if (error || !data) {
    await removeLogged(sb, copied, 'revert-rollback');
    return error ? dbFail('images/[id]/revert:update', error, 500) : fail({ error: 'Esa imagen ya no está en el banco.' }, 404);
  }
  await removeLogged(sb, toRemove, 'revert');
  return NextResponse.json(withName(data as unknown as ImageRecord));
}
