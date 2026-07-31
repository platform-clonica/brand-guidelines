'use client';

/* The Deck Maker (DeckStudio) seeded with a "presentation" that contains one page per catalog
   layout — so every layout can be reviewed and retouched at the exact size it has while editing a
   real deck. Standalone (no deckId) means it runs locally and never writes to Supabase unless you
   explicitly save. Gated to dev-only by the server page (page.tsx) — see there for why. */

import { DeckStudio } from '@/components/deck/DeckStudio';
import { LAYOUT_CATALOG, layoutSnippet } from '@/lib/deck/catalog';

// A deck made of every layout, in catalog order.
const CATALOG_MD = LAYOUT_CATALOG.map(layoutSnippet).join('\n');

/* Además, cada layout otra vez en `{dark}`. El selector de fondo se añadió pensando solo en los
   tres tonos claros y nadie recorrió los layouts: en oscuro había textos que seguían en tinta
   oscura y desaparecían (reportado por el cliente el 2026-07-31). Tenerlos aquí abajo hace que el
   fallo se vea de un vistazo en vez de descubrirlo un cliente en su deck.
   Se saltan presupuesto y aceptación: van siempre en claro a propósito (lib/deck/classify.ts). */
const DARK_MD = LAYOUT_CATALOG
  .filter((e) => !['presupuesto', 'aceptacion'].includes(e.marker))
  .map((e) => layoutSnippet(e).replace(/\{[a-z-]+\}/i, '{dark}'))
  .join('\n');

const LAB_MD = `${CATALOG_MD}\n${DARK_MD}`;

export function LabClient() {
  // Escape the localized site chrome (sidebar + main padding) so the editor is full-screen, exactly
  // like /deck.
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* previewClientLogo: a real client mark so the cover shows the logo case (not the name chip),
          to review the client-logo sizing. Dev-only route, so it never ships. */}
      <DeckStudio initialMd={LAB_MD} previewClientLogo="/preview/client-logo.svg" />
    </div>
  );
}
