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
  exposicion,
}: {
  image?: ImageRef;
  scrim?: 'top' | 'bottom' | 'full' | 'none';
  /** 0 a 100. 100 es la foto tal cual; por debajo se oscurece. */
  exposicion?: number;
}) {
  if (!image?.src) return null;
  /* Capa aparte y no una modificación del velo: así el oscurecido se suma
     a cualquiera de los tres velos sin tener que recalcular sus
     degradados, y la garantía de contraste del velo base se mantiene
     intacta pase lo que pase con este control. */
  const oscurecido = exposicion == null ? 0 : Math.max(0, 1 - exposicion / 100);
  return (
    <div className="photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt ?? ''}
        style={image.alignY != null ? { objectPosition: `50% ${image.alignY}%` } : undefined}
      />
      {scrim && scrim !== 'none' && <div className={`scrim ${scrim}`} />}
      {oscurecido > 0 && <div className="expo" style={{ opacity: oscurecido }} />}
    </div>
  );
}
