import { NextResponse } from 'next/server';
import { requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { loadTagFacets } from '@/lib/images/bankTags';
import { ANALYSIS_TYPES, AnalysisError, analyzeImage, type AnalysisImage } from '@/lib/images/analyze/server';

export const dynamic = 'force-dynamic';

/* La ligera de una subida pesa unos 300 KB; en base64, unos 400. Netlify admite 6 MB por petición. */
const MAX_BASE64 = 4_000_000;

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

/* POST /api/images/analyze — propuesta de nombre y etiquetas y análisis de estilo de una imagen que todavía
   no está en el banco (F21–F23). Recibe la ligera que el navegador genera para la fila de subida y no
   guarda nada: el estilo entra con la fila al registrarla, y la propuesta solo si la persona la usa. */
export async function POST(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Cuerpo de la petición inválido. Se espera JSON.', 400);
  }
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const data = typeof b.image === 'string' ? b.image : '';
  const mediaType = b.mediaType as AnalysisImage['mediaType'];
  if (!data || data.length > MAX_BASE64) return fail('Falta la imagen o pesa demasiado.', 400);
  if (!ANALYSIS_TYPES.includes(mediaType)) return fail('Tipo de imagen no admitido.', 400);

  const sb = await supabaseAuthServer();
  /* Sin las etiquetas del banco la propuesta sale igual, solo que sin elegir entre las existentes. */
  const tags = await loadTagFacets(sb)
    .then((f) => f.tags.map((t) => t.tag))
    .catch((e) => {
      console.error('[images/analyze:tags]', e);
      return [];
    });

  try {
    const result = await analyzeImage({ data, mediaType }, tags);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof AnalysisError) return fail(e.message, e.status);
    return fail('Error al analizar la imagen.', 500);
  }
}
