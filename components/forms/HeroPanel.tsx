/* Hero column (60%). Background image (or dark brand fallback) with the client logo overlaid,
   plus the subordinate "by Interactius" signature next to it (per product decision).
   The client logo does NOT replace the Interactius signature. */

'use client';

import type { FormDraft } from '@/lib/forms/schema';

/* `onPickImage` solo lo pasa el editor de FormMaker: añade el botón para abrir la galería de
   imágenes sobre el hero, igual que el DeckMaker deja pulsar el hueco de imagen de una slide.
   La página pública no lo pasa, así que no cambia en nada. */
export function HeroPanel({ def, onPickImage }: { def: FormDraft; onPickImage?: () => void }) {
  const hasBg = Boolean(def.background);
  return (
    <div
      className={`ixf-hero${hasBg ? '' : ' ixf-hero--plain'}`}
      style={hasBg ? { backgroundImage: `url(${JSON.stringify(def.background).slice(1, -1)})` } : undefined}
    >
      <div className="ixf-hero__brandbar">
        {def.logo ? (
          // Client logo is an arbitrary repo/URL asset; plain <img> (not next/image) keeps it simple.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ixf-hero__logo" src={def.logo} alt={def.client ? `${def.client}` : 'Logo'} />
        ) : null}
        <span className="ixf-signature">
          by <strong>interactīus</strong>
        </span>
      </div>

      {onPickImage && (
        <button type="button" className="ixf-hero__pick" onClick={onPickImage}>
          {hasBg ? 'Cambiar imagen de fondo' : 'Elegir imagen de fondo'}
        </button>
      )}
    </div>
  );
}
