import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import type { DeckRecord, DeckSignature } from '@/lib/decks/types';
import { getDeckShareMeta, shareTitle, shareSubtitle } from '@/lib/decks/shareMeta';
import { DeckViewerClient } from './DeckViewerClient';

export const dynamic = 'force-dynamic';

/* The share link and the PDF both read their title from here:
   - social preview → openGraph.title / description (image = ./opengraph-image);
   - print-to-PDF → the browser names the file after document.title, i.e. this title.
   Title = the presentation's own cover title; subtitle = "Propuesta de colaboración para {Cliente}".
   Kept noindex: these are private client proposals — crawlers still read OG tags for link
   unfurling, so the preview works while the page stays out of search. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const meta = await getDeckShareMeta(id).catch(() => null);
  const title = shareTitle(meta);
  const description = shareSubtitle(meta);
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
};

/* Read-only viewer for a saved deck: the shared link and the print/render surface.
   Reads the deck by id from Supabase; the client compiles + renders the slides only. */
export default async function DeckViewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { print } = await searchParams;

  /* Las dos lecturas van por RPC y en PARALELO.
     - Por RPC porque `decks` y `signatures` dejaron de ser legibles con la clave anónima
       (supabase/migrations/20260817121000_tighten_rls.sql) y esta ruta es pública a propósito.
       `deck_public_signature` además no devuelve `ip` ni `user_agent`: no se pintan en ninguna
       parte y antes viajaban hasta el HTML que lee cualquiera con el enlace.
     - En paralelo porque la firma no depende del deck. Encadenadas costaban dos idas y vueltas
       de ~70 ms cada una en la superficie que ve el cliente. */
  const sb = supabaseServer();
  const [deckRes, sigRes] = await Promise.all([
    sb.rpc('deck_public', { p_id: id }).maybeSingle(),
    sb.rpc('deck_public_signature', { p_id: id }).maybeSingle(),
  ]);
  /* Distinguir "no existe" de "no se pudo leer". Antes las dos caían en el mismo `notFound()`, así
     que una incidencia de Supabase le decía al cliente que su propuesta NO EXISTE — falso, y de lo
     peor que se le puede decir a alguien que va a firmar. Ahora un fallo real sube al error
     boundary de esta carpeta, que ofrece reintentar.
     22P02 es `invalid text representation`: un id que no es un UUID. Eso sí es un 404. */
  if (deckRes.error && deckRes.error.code !== '22P02') {
    console.error('[deck/view] lectura fallida', deckRes.error.code, deckRes.error.message);
    throw new Error('No se pudo cargar la propuesta');
  }
  if (!deckRes.data) notFound();
  const sig = sigRes.data;

  const deck = deckRes.data as Pick<DeckRecord, 'md' | 'type' | 'logo_path' | 'commercial_id'>;
  return (
    <DeckViewerClient
      deckId={id}
      md={deck.md}
      type={deck.type}
      logoPath={deck.logo_path}
      print={print === '1'}
      pdfName={deck.commercial_id}
      signature={(sig as DeckSignature | null) ?? null}
    />
  );
}
