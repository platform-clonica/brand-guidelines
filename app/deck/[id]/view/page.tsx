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

  const sb = supabaseServer();
  const { data, error } = await sb
    .from('decks').select('md, type, logo_path, commercial_id').eq('id', id).single();
  if (error || !data) notFound();

  // If the deck was already signed, render the immutable signed state on the Acceptance page.
  const { data: sig } = await sb
    .from('signatures').select('*').eq('deck_id', id)
    .order('signed_at', { ascending: false }).limit(1).maybeSingle();

  const deck = data as Pick<DeckRecord, 'md' | 'type' | 'logo_path' | 'commercial_id'>;
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
