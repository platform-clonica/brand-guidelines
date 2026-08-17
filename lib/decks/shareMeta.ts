import { compileDeck } from '@/lib/deck';
import type { Slide } from '@/lib/deck/types';
import { supabaseServer } from '@/lib/supabase/server';

/* Everything the shared-link surfaces (social preview + PDF filename) need from a saved deck,
   read server-side straight from the deck's Markdown + specs. One source so `generateMetadata`
   and the `opengraph-image` route never drift apart.
   - title/subtitle/imageSrc come from the COVER slide (the presentation's own title/photo).
   - clientName comes from the deck's specs (`client_id` → `clients.name`), the value edited in the
     "Cliente" field; it falls back to the `> cliente:` line rendered on the cover itself. */
export type DeckShareMeta = {
  title: string | null;
  subtitle: string | null;
  imageSrc: string | null;
  clientName: string | null;
};

type CoverSlide = Extract<Slide, { kind: 'cover' }>;
const isCover = (s: Slide): s is CoverSlide => s.kind === 'cover';

/* Lee por RPC, no contra la tabla: `decks` dejó de ser legible por la clave anónima
   (supabase/migrations/20260817121000_tighten_rls.sql) y esta función corre en superficies
   públicas — el `generateMetadata` del visor y la imagen de previsualización social.
   `deck_public` devuelve un subconjunto acotado a partir de un id que hay que conocer. */
export async function getDeckShareMeta(id: string): Promise<DeckShareMeta | null> {
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('deck_public', { p_id: id }).maybeSingle();
  if (error || !data) return null;

  const row = data as {
    md: string;
    type: 'comercial' | 'informe' | 'generica';
    client_name: string | null;
  };
  const deck = compileDeck(row.md, row.type);
  const cover = deck.slides.find(isCover) ?? null;

  return {
    title: cover?.title ?? null,
    subtitle: cover?.subtitle ?? null,
    imageSrc: cover?.image?.src ?? null,
    // Only for the OG description text ("Propuesta de colaboración para {Cliente}"); the client is
    // NOT drawn on the preview image itself.
    clientName: row.client_name ?? cover?.client ?? null,
  };
}

/* The social/PDF title: the presentation's own cover title, or the generic fallback.
   Los saltos explícitos del titular (`\` en el markdown) se aplanan a espacio: esto acaba en el
   <title> del documento y en el nombre del PDF, donde un salto de línea no pinta nada. */
export function shareTitle(meta: DeckShareMeta | null): string {
  return meta?.title?.replace(/\s*\n\s*/g, ' ').trim() || 'Presentación · Interactius';
}

/* The social subtitle. Today every saved deck is a commercial proposal, so the copy is fixed
   ("Propuesta de colaboración para {Cliente}"). When non-commercial decks appear, branch on the
   deck type here. */
export function shareSubtitle(meta: DeckShareMeta | null): string {
  const client = meta?.clientName?.trim();
  return client ? `Propuesta de colaboración para ${client}` : 'Propuesta de colaboración';
}
