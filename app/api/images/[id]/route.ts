import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const IMAGE_BUCKET = 'deck-images';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/images/:id — remove the gallery record and its stored file.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: img, error: findErr } = await sb
    .from('images')
    .select('storage_path')
    .eq('id', id)
    .single();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 404 });

  if (img?.storage_path) {
    const { error: storageErr } = await sb.storage.from(IMAGE_BUCKET).remove([img.storage_path]);
    if (storageErr) return NextResponse.json({ error: storageErr.message }, { status: 500 });
  }

  const { error } = await sb.from('images').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
