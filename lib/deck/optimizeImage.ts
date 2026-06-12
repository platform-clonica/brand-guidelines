/* Client-side image optimisation for deck slots.
   Downscales to a sane max edge and re-encodes as JPEG so print/PDF stays light.
   Returns a data URL (embeds cleanly in print and in any HTML export). */
export async function optimizeImage(file: File, maxEdge = 1600, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return URL.createObjectURL(file);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
