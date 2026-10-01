/* Client-side image optimisation for deck slots.
   Downscales to a sane max edge and re-encodes as JPEG so print/PDF stays light.
   Returns a data URL (embeds cleanly in print and in any HTML export). */
export async function optimizeImage(file: File, maxEdge = 1600, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = drawScaled(bitmap, maxEdge);
  bitmap.close();
  if (!canvas) return URL.createObjectURL(file);
  return canvas.toDataURL('image/jpeg', quality);
}

/* Una variante JPEG para el banco de imágenes (IMG_r): la ligera de 1600 px y la miniatura de 480 salen
   de aquí, de una imagen YA decodificada, para no decodificar dos veces un original de 25 MB.

   Dos diferencias con `optimizeImage`, que se queda como estaba:
   - Devuelve el fichero y sus medidas, que van a la fila de `images`.
   - Pinta un fondo antes de dibujar. El lienzo es transparente y el JPEG lo convierte en negro: un PNG
     con transparencia salía con el fondo negro.
   Sin lienzo 2D lanza error en vez de devolver el original: subirlo como «ligera» sería mentir. */
export async function renderJpeg(
  source: ImageBitmap,
  maxEdge: number,
  quality: number,
  background: string,
): Promise<{ blob: Blob; width: number; height: number }> {
  const canvas = drawScaled(source, maxEdge, background);
  if (!canvas) throw new Error('El navegador no ofrece un lienzo 2D.');
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('No se pudo codificar la imagen.');
  return { blob, width: canvas.width, height: canvas.height };
}

/* Escala para que el lado largo no pase de `maxEdge` (nunca amplía) y dibuja en un lienzo. */
function drawScaled(source: ImageBitmap, maxEdge: number, background?: string): HTMLCanvasElement | null {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}
