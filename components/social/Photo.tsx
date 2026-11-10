import type { ImageRef } from '@/lib/social/types';

/* Foto a sangre con su velo. El velo va SIEMPRE que haya texto encima: sin
   él, una foto clara deja el titular ilegible y nadie se entera hasta que
   la pieza está publicada.

   Son dos gradientes, no una capa plana, para oscurecer solo la banda donde
   cae el texto y dejar respirar el resto de la imagen. Mismo recurso que la
   portada del deck. */
export function Photo({
  image,
  scrim,
}: {
  image?: ImageRef;
  scrim?: 'top' | 'bottom' | 'none';
}) {
  if (!image?.src) return null;
  return (
    <div className="photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt ?? ''}
        style={image.alignY != null ? { objectPosition: `50% ${image.alignY}%` } : undefined}
      />
      {scrim && scrim !== 'none' && <div className={`scrim ${scrim}`} />}
    </div>
  );
}
