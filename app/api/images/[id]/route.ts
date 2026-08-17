import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const IMAGE_BUCKET = 'deck-images';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/images/:id — remove the gallery record and its stored file.
export async function DELETE(_req: Request, { params }: Ctx) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const { id } = await params;
  const sb = await supabaseAuthServer();

  const { data: img, error: findErr } = await sb
    .from('images')
    .select('storage_path')
    .eq('id', id)
    .single();
  if (findErr) return dbFail('images/[id]', findErr, 404);

  /* Primero la fila, después el fichero. No hay transacción posible entre Postgres y Storage, así
     que hay que elegir qué inconsistencia se prefiere cuando falle el segundo paso. Antes era al
     revés: si el borrado del fichero salía bien y el de la fila fallaba, quedaba una fila de la
     galería apuntando a una imagen que ya no existe, y esa sí se ve. En este orden, lo peor que
     queda es un fichero huérfano en Storage: invisible y barato de limpiar. */
  const { error } = await sb.from('images').delete().eq('id', id);
  if (error) return dbFail('images/[id]', error, 500);

  if (img?.storage_path) {
    const { error: storageErr } = await sb.storage.from(IMAGE_BUCKET).remove([img.storage_path]);
    // No bloqueante: la fila ya no está y la galería es coherente. Solo hay que poder verlo.
    if (storageErr) console.error('[storage:images] huérfano', img.storage_path, storageErr.message);
  }
  return NextResponse.json({ ok: true });
}
