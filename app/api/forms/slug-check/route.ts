/* GET /api/forms/slug-check?slug=…&formId=… → { ok, available, error }

   Existe para que el modal de ajustes pueda decir "esa URL ya está cogida" ANTES de tocar el
   documento, en vez de dejar que el autoguardado choque contra el índice único y se quede
   reintentando un 409 que el indicador de la barra no sabe explicar.

   No es la garantía de unicidad —esa la da el índice único de la tabla— sino su antesala amable.
   Entre esta comprobación y el guardado hay una ventana de carrera de unos segundos; la pierde
   quien guarde segundo, con el 409 de /api/forms/[id] y su mensaje.

   Ruta estática dentro de /api/forms: cae en EDITOR_API (middleware.ts), así que exige sesión
   de equipo igual que el resto del editor. */

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { slugTaken } from '@/lib/forms/registry';
import { slugError } from '@/lib/forms/slug';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  const url = new URL(req.url);
  const slug = (url.searchParams.get('slug') ?? '').trim();
  const formId = url.searchParams.get('formId') ?? undefined;

  // Sin slug no hay nada que comprobar: quedarse sin alias siempre es válido.
  if (!slug) return NextResponse.json({ available: true, error: null });

  const grammar = slugError(slug);
  if (grammar) return NextResponse.json({ available: false, error: grammar });

  const taken = await slugTaken(slug, formId);
  return NextResponse.json({
    available: !taken,
    error: taken ? `"${slug}" ya la usa otro formulario. Elige otra URL.` : null,
  });
}
