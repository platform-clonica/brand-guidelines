import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IN_CHUNK, chunk, parseBulkIds, splitDeletable } from '@/lib/images/bulk';
import { REMOVABLE_COLUMNS, removeImages, type RemovableImage } from '@/lib/images/remove';
import { imageUses } from '@/lib/images/usage';

export const dynamic = 'force-dynamic';

/* POST /api/images/bulk-delete — «Eliminar» de la barra de selección (entrega 3, G12).

   `{ ids }`. El uso se vuelve a comprobar aquí con `image_uses`, en una sola llamada: la pantalla solo
   avisa, y lo que vale es lo que dice el servidor en el momento de borrar. Las libres se borran con todos sus
   ficheros (lib/images/remove.ts, lo mismo que el DELETE de una); las que se usan no se tocan.

   Responde `{ deleted, blocked: [{ id, uses }], missing, failed }`. `missing` son las que ya no existían, o las
   que otra pestaña borró entre la lectura y el borrado; `failed`, las que no se pudieron borrar por un error a
   mitad (siguen en el banco). */
export async function POST(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: { ids?: unknown };
  try {
    body = (await req.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido. Se espera JSON.' }, { status: 400 });
  }
  const ids = parseBulkIds(body?.ids);
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: 400 });

  const sb = await supabaseAuthServer();
  const rows: RemovableImage[] = [];
  for (const part of chunk(ids.value, IN_CHUNK)) {
    const { data, error } = await sb.from('images').select(REMOVABLE_COLUMNS).in('id', part);
    if (error) return dbFail('images/bulk-delete', error, 500);
    rows.push(...((data ?? []) as unknown as RemovableImage[]));
  }

  let uses;
  try {
    uses = await imageUses(
      sb,
      rows.map((r) => r.id),
    );
  } catch (e) {
    return dbFail('images/bulk-delete:uses', e as { code?: string; message: string }, 500);
  }

  const { free, blocked, missing } = splitDeletable(ids.value, rows, uses);
  const { deleted, error } = await removeImages(sb, free);
  if (error && !deleted.length) return dbFail('images/bulk-delete', error, 500);
  const gone = new Set(deleted);
  const notDeleted = free.filter((r) => !gone.has(r.id)).map((r) => r.id);
  // Con un error a medias, las que quedan siguen en el banco: `failed`. Sin error, otra pestaña las borró.
  if (error) console.error('[db:images/bulk-delete]', error.code ?? '-', error.message);
  return NextResponse.json({
    deleted,
    blocked,
    missing: error ? missing : [...missing, ...notDeleted],
    failed: error ? notDeleted : [],
  });
}
