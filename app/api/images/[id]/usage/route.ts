import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/images/:id/usage — which decks reference this image (by URL in their markdown).
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: img, error: findErr } = await sb
    .from('images')
    .select('url')
    .eq('id', id)
    .single();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 404 });

  if (!img?.url) return NextResponse.json({ count: 0, decks: [] });

  // Escape LIKE wildcards so a literal URL match can't be widened by `%`/`_`.
  const needle = img.url.replace(/[\\%_]/g, (c: string) => `\\${c}`);
  const { data, error } = await sb
    .from('decks')
    .select('id, clients(name)')
    .ilike('md', `%${needle}%`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const decks = (data ?? []).map(
    (d: Record<string, unknown>) => (d.clients as { name?: string } | null)?.name ?? 'Sin cliente',
  );
  return NextResponse.json({ count: decks.length, decks });
}
