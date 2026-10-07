import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IN_CHUNK, chunk, parseAddTags, parseBulkIds, tagsOutcome } from '@/lib/images/bulk';
import { TAGS_MAX, withName } from '@/lib/images/naming';
import { IMAGE_COLUMNS } from '@/lib/images/usage';
import type { ImageRecord } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

/* PATCH /api/images/bulk — «Añadir etiquetas» a varias imágenes (entrega 3, G10).

   `{ ids, addTags }`. La unión la hace `add_image_tags` en SQL, fila a fila: no pisa lo que otra pestaña haya
   guardado y no necesita control de versión. Solo cambian las filas que reciben alguna etiqueta, hasta
   TAGS_MAX por imagen.

   Responde `{ rows, missing, full }`: las filas que cambiaron, las que ya no existen (salen de la selección) y
   las que se quedaron sin hueco para alguna etiqueta. */
export async function PATCH(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: { ids?: unknown; addTags?: unknown };
  try {
    body = (await req.json()) as { ids?: unknown; addTags?: unknown };
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido. Se espera JSON.' }, { status: 400 });
  }
  const ids = parseBulkIds(body?.ids);
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: 400 });
  const tags = parseAddTags(body?.addTags);
  if (!tags.ok) return NextResponse.json({ error: tags.error }, { status: 400 });

  const sb = await supabaseAuthServer();
  const before: { id: string; tags: string[] }[] = [];
  for (const part of chunk(ids.value, IN_CHUNK)) {
    const { data, error } = await sb.from('images').select('id, tags').in('id', part);
    if (error) return dbFail('images/bulk', error, 500);
    before.push(...((data ?? []) as { id: string; tags: string[] }[]));
  }

  const { data, error } = await sb
    .rpc('add_image_tags', { p_ids: ids.value, p_tags: tags.value, p_max: TAGS_MAX })
    .select(IMAGE_COLUMNS);
  if (error) return dbFail('images/bulk', error, 500);
  const rows = ((data ?? []) as unknown as ImageRecord[]).map(withName);

  const { missing, full } = tagsOutcome(ids.value, tags.value, before, rows);
  return NextResponse.json({ rows, missing, full });
}
