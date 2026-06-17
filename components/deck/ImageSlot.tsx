'use client';
import { useContext } from 'react';
import type { ImageRef } from '@/lib/deck/types';
import { ImageEditContext } from './viewer';

/* Editable image slot: in the editor, click → opens the image gallery for this slide
   (pick an existing image or upload a new one). The chosen URL is written back into the
   markdown by the gallery's onSelect, so the rendered src always comes from the deck.
   In viewer mode (shared presentation) it is a plain, non-editable image. */
export function ImageSlot({
  image,
  className,
  slideIndex,
}: {
  image?: ImageRef;
  className?: string;
  slideIndex?: number;
}) {
  const onPick = useContext(ImageEditContext);
  const editable = onPick != null && slideIndex != null;
  const src = image?.src;
  return (
    <div
      className={`imgslot ${className ?? ''}`}
      style={{ backgroundImage: src ? `url('${src}')` : undefined, cursor: editable ? 'pointer' : 'default' }}
      onClick={editable ? () => onPick(slideIndex) : undefined}
    >
      {!src && <div className="placeholder">{image?.prompt ?? 'Imagen · universo visual'}</div>}
      {editable && <div className="imghint">Clic para elegir imagen</div>}
    </div>
  );
}
