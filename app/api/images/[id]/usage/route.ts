import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/* GET /api/images/:id/usage — qué documentos referencian esta imagen (por su URL en el markdown).

   Mira decks Y formularios. Antes solo miraba decks, lo que era correcto mientras la galería
   fuera exclusiva del DeckMaker; desde que FormMaker elige la imagen de fondo desde la misma
   galería, borrar una imagen usada por un formulario habría dicho "no se usa" y habría dejado
   el formulario con la imagen rota. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: img, error: findErr } = await sb
    .from('images')
    .select('url')
    .eq('id', id)
    .single();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 404 });

  if (!img?.url) return NextResponse.json({ count: 0, uses: [] });

  // Escape LIKE wildcards so a literal URL match can't be widened by `%`/`_`.
  const needle = img.url.replace(/[\\%_]/g, (c: string) => `\\${c}`);

  const [deckRes, formRes] = await Promise.all([
    sb.from('decks').select('id, commercial_id, clients(name)').ilike('md', `%${needle}%`),
    sb.from('forms').select('id, title').ilike('md', `%${needle}%`),
  ]);
  if (deckRes.error) return NextResponse.json({ error: deckRes.error.message }, { status: 500 });
  if (formRes.error) return NextResponse.json({ error: formRes.error.message }, { status: 500 });

  const uses = [
    ...(deckRes.data ?? []).map((d: Record<string, unknown>) => ({
      kind: 'deck' as const,
      name:
        (d.commercial_id as string | null) ||
        (d.clients as { name?: string } | null)?.name ||
        'Sin nombre',
    })),
    ...(formRes.data ?? []).map((f: Record<string, unknown>) => ({
      kind: 'form' as const,
      name: (f.title as string | null) || 'Sin título',
    })),
  ];

  return NextResponse.json({ count: uses.length, uses });
}
