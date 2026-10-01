'use client';
/* IMG_r — subir una imagen al banco desde el navegador: generar las variantes y subirlas con su limpieza.

   Plan docs/superpowers/plans/2026-10-01-img-r-fase-1.md, § 2. Por imagen, en este orden:
     1. original, tal cual (el más pesado: si falla, falla antes de que exista nada)
     2. ligera, 1600 px, JPEG 0,82
     3. miniatura, 480 px, JPEG 0,82
     4. registro en POST /api/images
   Si algo falla, se borran los objetos que ESTE intento llegó a subir. El reintento usa un id nuevo, así
   que un resto del intento anterior nunca choca con `upsert: false`. */

import { colors } from '@/components/deck/studio/ui';
import { renderJpeg } from '@/lib/deck/optimizeImage';
import { getImage, registerImage, removeImageObjects, uploadImageObject } from '@/lib/decks/api';
import type { ImageMeta, ImageRecord } from '@/lib/decks/types';
import { variantPaths } from './upload';

const LIGHT_EDGE = 1600;
const THUMB_EDGE = 480;
const QUALITY = 0.82;

/* El fichero no se puede decodificar: no es un problema de conexión y no tiene sentido reintentarlo. */
export class UnreadableImageError extends Error {
  constructor() {
    super('No se ha podido leer la imagen.');
    this.name = 'UnreadableImageError';
  }
}

export async function uploadToBank(file: File, meta: ImageMeta): Promise<ImageRecord> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UnreadableImageError();
  }

  let light: Awaited<ReturnType<typeof renderJpeg>>;
  let thumb: Awaited<ReturnType<typeof renderJpeg>>;
  const original = { width: bitmap.width, height: bitmap.height };
  try {
    // Fondo blanco: el JPEG pinta de negro la transparencia de un PNG.
    light = await renderJpeg(bitmap, LIGHT_EDGE, QUALITY, colors.white);
    thumb = await renderJpeg(bitmap, THUMB_EDGE, QUALITY, colors.white);
  } catch {
    throw new UnreadableImageError();
  } finally {
    bitmap.close();
  }

  const id = crypto.randomUUID();
  const paths = variantPaths(id, file.type);
  const uploaded: string[] = [];
  let registering = false;
  try {
    await uploadImageObject(paths.original, file, file.type);
    uploaded.push(paths.original);
    await uploadImageObject(paths.light, light.blob, 'image/jpeg');
    uploaded.push(paths.light);
    await uploadImageObject(paths.thumb, thumb.blob, 'image/jpeg');
    uploaded.push(paths.thumb);
    registering = true;
    return await registerImage({
      id,
      name: meta.name,
      tags: meta.tags,
      original_type: file.type,
      original_bytes: file.size,
      original_width: original.width,
      original_height: original.height,
      width: light.width,
      height: light.height,
    });
  } catch (e) {
    /* Si lo que falló fue la respuesta del registro y no el registro, la fila existe: borrar sus ficheros
       la dejaría rota. Se comprueba antes de limpiar. */
    if (registering) {
      const existing = await getImage(id).catch(() => null);
      if (existing) return existing;
    }
    await removeImageObjects(uploaded);
    throw e;
  }
}
