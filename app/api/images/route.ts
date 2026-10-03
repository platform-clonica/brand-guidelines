import { NextResponse } from 'next/server';
import { dbFail, requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { escapeLike, keysetFilter, pageOf, parseListQuery } from '@/lib/images/filter';
import { withName } from '@/lib/images/naming';
import { missingVariants, publicObjectUrl, validateCreateInput } from '@/lib/images/upload';
import { IMAGE_COLUMNS, imageUses } from '@/lib/images/usage';
import { storedStyleSchema } from '@/lib/images/analyze/schema';
import { styleColumns } from '@/lib/images/analyze/result';
import type { ImageListItem, ImageRecord } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

/* GET /api/images — el banco, recientes primero, 60 por página.

   `q` busca en nombre y etiquetas sin tildes (columna generada `search_text`), `tags` filtra en Y,
   `untagged=1` deja solo las que no tienen ninguna, `style=si` solo las que encajan con el estilo
   Interactius (fase 2), y `cursor` pide la página siguiente: cursor y no
   desplazamiento, para que una subida mientras alguien baja por la rejilla no repita tarjetas. Cada
   tarjeta lleva `use_count`, calculado en UNA llamada a `image_uses` para toda la página. */
export async function GET(req: Request) {
  /* Cinturón además de los tirantes: el middleware ya exige sesión, pero su matcher excluye
     toda ruta con un punto. El patrón es el que /api/forms ya usaba. */
  const unauth = await requireUser();
  if (unauth) return unauth;

  const q = parseListQuery(new URL(req.url).searchParams);
  const sb = await supabaseAuthServer();

  let query = sb
    .from('images')
    .select(IMAGE_COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(q.limit + 1);
  if (q.search) query = query.ilike('search_text', `%${escapeLike(q.search)}%`);
  if (q.untagged) query = query.eq('tags', '{}');
  else if (q.tags.length) query = query.contains('tags', q.tags);
  if (q.style) query = query.eq('style_verdict', 'si');
  if (q.cursor) query = query.or(keysetFilter(q.cursor));

  const { data, error } = await query;
  if (error) return dbFail('images', error, 500);

  const page = pageOf((data ?? []) as unknown as ImageRecord[], q.limit);
  let uses;
  try {
    uses = await imageUses(sb, page.items.map((i) => i.id));
  } catch (e) {
    return dbFail('images:uses', e as { code?: string; message: string }, 500);
  }

  const items: ImageListItem[] = page.items.map((row) => ({ ...withName(row), use_count: uses.get(row.id)?.length ?? 0 }));
  return NextResponse.json({ items, nextCursor: page.nextCursor }, { headers: { 'Cache-Control': 'no-store' } });
}

/* POST /api/images — registra una imagen cuyos tres ficheros ya están en `images/<id>/`.

   No se fía del navegador: recalcula rutas y URL desde el id y el tipo, normaliza nombre y etiquetas,
   y comprueba en Storage que los tres ficheros existen. Sin ellos no hay fila.

   Fase 2: si el análisis de la fila de subida llegó a tiempo, viene en `style`. El veredicto se recalcula
   desde los criterios y el motivo se vuelve a auditar (styleColumns). Sin `style`, queda sin analizar. */
export async function POST(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return NextResponse.json({ error: 'Falta la configuración de Supabase.' }, { status: 500 });

  const parsed = validateCreateInput(body, (path) => publicObjectUrl(base, IMAGE_BUCKET, path));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const raw = (body as { style?: unknown }).style;
  const style = raw === undefined || raw === null ? null : storedStyleSchema.safeParse(raw);
  if (style && !style.success) return NextResponse.json({ error: 'Estilo no válido.' }, { status: 400 });
  const row = style ? { ...parsed.value, ...styleColumns(style.data) } : parsed.value;

  const sb = await supabaseAuthServer();

  const { data: listed, error: listErr } = await sb.storage.from(IMAGE_BUCKET).list(`images/${row.id}`);
  if (listErr) return dbFail('images:storage', listErr, 500);
  const missing = missingVariants(
    { original: row.original_path, light: row.storage_path, thumb: row.thumb_path },
    (listed ?? []).map((o) => o.name),
  );
  if (missing.length) {
    return NextResponse.json({ error: `Faltan ficheros de la imagen en Storage: ${missing.join(', ')}.` }, { status: 400 });
  }

  const { data, error } = await sb.from('images').insert(row).select(IMAGE_COLUMNS).single();
  if (error) return dbFail('images', error, 500);
  return NextResponse.json(data, { status: 201 });
}
