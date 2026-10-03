import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { isUuid } from '@/lib/uuid';
import { loadTagFacets } from '@/lib/images/bankTags';
import { withName } from '@/lib/images/naming';
import { styleColumns } from '@/lib/images/analyze/result';
import { ANALYSIS_TYPES, AnalysisError, analyzeImage, type AnalysisImage } from '@/lib/images/analyze/server';
import { IMAGE_COLUMNS } from '@/lib/images/usage';
import type { ImageRecord } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
const notFound = () => fail('Esa imagen ya no está en el banco.', 404);

/* POST /api/images/:id/analyze — «Analizar estilo» de una imagen del banco (F27). Analiza su versión ligera
   y guarda el estilo en la fila: veredicto, criterios, motivo, personas y fecha. La propuesta de nombre y
   etiquetas no se usa: la imagen ya tiene los suyos.

   Solo escribe las columnas de estilo. Eso mueve `updated_at` (el disparador de la tabla), y la respuesta
   devuelve la fila entera para que el detalle se quede con el valor nuevo. */
export async function POST(_req: Request, { params }: Ctx) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const sb = await supabaseAuthServer();

  const { data: found, error: findErr } = await sb.from('images').select('storage_path').eq('id', id).maybeSingle();
  if (findErr) return dbFail('images/[id]/analyze', findErr, 500);
  if (!found) return notFound();

  const { data: blob, error: dlErr } = await sb.storage.from(IMAGE_BUCKET).download(found.storage_path as string);
  if (dlErr || !blob) return dbFail('images/[id]/analyze:storage', dlErr ?? { message: 'sin fichero' }, 502);
  const mediaType = (ANALYSIS_TYPES as readonly string[]).includes(blob.type) ? (blob.type as AnalysisImage['mediaType']) : 'image/jpeg';
  const data = Buffer.from(await blob.arrayBuffer()).toString('base64');

  const tags = await loadTagFacets(sb)
    .then((f) => f.tags.map((t) => t.tag))
    .catch(() => []);

  let style;
  try {
    style = (await analyzeImage({ data, mediaType }, tags)).style;
  } catch (e) {
    if (e instanceof AnalysisError) return fail(e.message, e.status);
    return fail('Error al analizar la imagen.', 500);
  }

  const { data: updated, error } = await sb.from('images').update(styleColumns(style)).eq('id', id).select(IMAGE_COLUMNS).maybeSingle();
  if (error) return dbFail('images/[id]/analyze', error, 500);
  if (!updated) return notFound();
  return NextResponse.json(withName(updated as unknown as ImageRecord), { headers: { 'Cache-Control': 'no-store' } });
}
