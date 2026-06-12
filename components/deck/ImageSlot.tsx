'use client';
import { useState } from 'react';
import type { ImageRef } from '@/lib/deck/types';
import { optimizeImage } from '@/lib/deck/optimizeImage';

/* Editable image slot: click → pick a file from disk → downscale/recompress → replace.
   Optimising on upload keeps the printed PDF light. */
export function ImageSlot({ image, className }: { image?: ImageRef; className?: string }) {
  const [src, setSrc] = useState<string | undefined>(image?.src);
  const pick = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      try {
        setSrc(await optimizeImage(f));
      } catch {
        setSrc(URL.createObjectURL(f));
      }
    };
    inp.click();
  };
  return (
    <div
      className={`imgslot ${className ?? ''}`}
      style={{ backgroundImage: src ? `url('${src}')` : undefined }}
      onClick={pick}
    >
      {!src && <div className="placeholder">{image?.prompt ?? 'Imagen · universo visual'}</div>}
      <div className="imghint">Clic para reemplazar imagen</div>
    </div>
  );
}
