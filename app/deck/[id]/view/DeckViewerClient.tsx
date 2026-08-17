'use client';
import { useEffect, useMemo } from 'react';
import { compileDeck } from '@/lib/deck';
import type { DeckType } from '@/lib/deck';
import type { DeckSignature } from '@/lib/decks/types';
/* Desde publicApi, NO desde api: `lib/decks/api.ts` importa el SDK de Supabase y esta es una ruta
   pública. Ver la cabecera de lib/decks/publicApi.ts. */
import { publicLogoUrl } from '@/lib/decks/publicApi';
import { DeckRenderer } from '@/components/deck/DeckRenderer';

/* Read-only render surface: just the slides, no editor or site chrome.
   Shared link + print/render target. `?print=1` auto-fires the print dialog.
   `deckId` enables client signing on the Acceptance page; `signature` is the existing one. */
export function DeckViewerClient({
  deckId, md, type, logoPath = null, print, pdfName = null, signature = null,
}: {
  deckId: string;
  md: string;
  type: DeckType;
  logoPath?: string | null;
  print?: boolean;
  /** ID comercial del deck — nombre del PDF. Ver el efecto de impresión. */
  pdfName?: string | null;
  signature?: DeckSignature | null;
}) {
  const deck = useMemo(() => compileDeck(md, type), [md, type]);
  const clientLogo = useMemo(() => publicLogoUrl(logoPath), [logoPath]);

  useEffect(() => {
    document.body.classList.add('ix-viewer');
    return () => document.body.classList.remove('ix-viewer');
  }, []);

  /* El navegador nombra el PDF con `document.title`, y ese título lo pone generateMetadata() con
     el TITULAR DE LA PORTADA, porque es también lo que ve el cliente en la pestaña y en la vista
     previa del enlace compartido. Para el PDF queremos el ID comercial (nº de propuesta + título),
     así que se cambia solo aquí — en la ruta de impresión, `?print=1` — y se restaura al terminar.
     Cambiarlo en generateMetadata() habría metido el identificador interno en el enlace del
     cliente. Las barras se sustituyen: rompen el nombre de archivo. */
  useEffect(() => {
    if (!print) return;
    const previous = document.title;
    const name = pdfName?.trim().replace(/[\\/]+/g, '-');
    if (name) document.title = name;

    // Wait for fonts + layout to settle so the PDF captures the real render.
    const fire = () => window.print();
    const restore = () => { document.title = previous; };
    window.addEventListener('afterprint', restore);

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const ready = fonts?.ready ?? Promise.resolve();
    let t: ReturnType<typeof setTimeout>;
    ready.then(() => { t = setTimeout(fire, 250); });
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', restore);
      document.title = previous;
    };
  }, [print, pdfName]);

  return (
    <div style={{ height: '100vh' }}>
      <DeckRenderer deck={deck} viewer sign={{ deckId, initial: signature }} clientLogo={clientLogo} />
    </div>
  );
}
