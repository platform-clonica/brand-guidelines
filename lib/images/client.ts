'use client';
/* IMG_r — subir una imagen al banco desde el navegador: generar las variantes y subirlas con su limpieza.

   Plan docs/features/img-r-fase-1-plan.md, § 2. Por imagen, en este orden:
     1. original, tal cual (el más pesado: si falla, falla antes de que exista nada)
     2. ligera, 1600 px, JPEG 0,82
     3. miniatura, 480 px, JPEG 0,82
     4. registro en POST /api/images
   Si algo falla, se borran las tres rutas de ESTE intento, salvo que el registro llegara a enviarse y no se
   pueda saber si la fila existe (lib/images/upload.ts, `afterFailure`). Lo que Storage no confirma haber
   borrado vuelve en el error (`leftovers`) para que la subida lo reintente en la siguiente pasada o al
   cerrar. El reintento usa un id nuevo, así que un resto del intento anterior nunca choca con `upsert: false`. */

import { colors } from '@/components/deck/studio/ui';
import { renderJpeg } from '@/lib/deck/optimizeImage';
import { getImage, registerImage, removeImageObjects, uploadImageObject } from '@/lib/decks/api';
import type { ImageMeta, ImageRecord, ImageStyle } from '@/lib/decks/types';
import { afterFailure, failureReason, variantPaths, type RegisterCheck } from './upload';
import { tmpPaths } from './edit/files';

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

/* Un intento que falló: el motivo para la fila, si la API dijo cuál, y las rutas que pueden haber quedado en
   Storage, para borrarlas en el siguiente intento o al cerrar la subida. */
export class UploadFailedError extends Error {
  constructor(
    readonly reason: string | null,
    readonly leftovers: string[],
  ) {
    super(reason ?? 'No se pudo subir.');
    this.name = 'UploadFailedError';
  }
}

/* La imagen que se manda a analizar (fase 2, F21): la misma ligera de 1600 px que se subirá, en base64. Se
   genera al añadir la fila, antes de subir nada; la subida vuelve a generar la suya. Pintarla dos veces es
   más barato que repartir la ligera entre dos momentos que no tienen por qué coincidir. */
export async function analysisImage(file: File): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UnreadableImageError();
  }
  let light: Awaited<ReturnType<typeof renderJpeg>>;
  try {
    light = await renderJpeg(bitmap, LIGHT_EDGE, QUALITY, colors.white);
  } catch {
    throw new UnreadableImageError();
  } finally {
    bitmap.close();
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(light.blob);
  });
  return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' };
}

/* `style`: el análisis de la fila, si llegó a tiempo (fase 2). */
export async function uploadToBank(file: File, meta: ImageMeta, style?: ImageStyle): Promise<ImageRecord> {
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
      style,
    });
  } catch (e) {
    /* Si lo que falló fue la respuesta del registro y no el registro, la fila existe: borrar sus ficheros
       la dejaría rota. Se comprueba antes de limpiar, y si la comprobación también falla no se toca nada. */
    let existing: ImageRecord | null = null;
    let check: RegisterCheck | null = null;
    if (registering) {
      try {
        existing = await getImage(id);
        check = existing ? 'exists' : 'missing';
      } catch {
        check = 'unknown';
      }
    }
    const action = afterFailure(registering, check);
    if (action === 'keep-row' && existing) return existing;
    let leftovers: string[] = [];
    if (action === 'remove') {
      // Las tres rutas: un objeto puede haberse creado aunque su respuesta no llegara.
      leftovers = await removeImageObjects([paths.original, paths.light, paths.thumb], uploaded);
    } else {
      console.error('[storage:images] no se pudo comprobar el registro; ficheros sin tocar', uploaded);
    }
    throw new UploadFailedError(failureReason(e, registering), leftovers);
  }
}

/* Fase 2: la ligera y la miniatura de una edición —o del original previo, al volver a él—, fabricadas aquí con
   las mismas funciones que la subida y subidas a images/_tmp/ junto al resultado. El servidor las copia a su
   sitio al guardar (plan de la fase 2, § 4: así no hace falta `sharp` en Netlify). Devuelve las medidas del
   fichero de partida y de la ligera. */
export async function uploadEditVariants(sourceUrl: string, tmpId: string) {
  const res = await fetch(sourceUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se ha podido leer la imagen (${res.status}).`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(await res.blob(), { imageOrientation: 'from-image' });
  } catch {
    throw new UnreadableImageError();
  }
  const original = { width: bitmap.width, height: bitmap.height };
  let light: Awaited<ReturnType<typeof renderJpeg>>;
  let thumb: Awaited<ReturnType<typeof renderJpeg>>;
  try {
    light = await renderJpeg(bitmap, LIGHT_EDGE, QUALITY, colors.white);
    thumb = await renderJpeg(bitmap, THUMB_EDGE, QUALITY, colors.white);
  } finally {
    bitmap.close();
  }
  const paths = tmpPaths(tmpId, 'jpg');
  await uploadImageObject(paths.light, light.blob, 'image/jpeg');
  await uploadImageObject(paths.thumb, thumb.blob, 'image/jpeg');
  return { original, light: { width: light.width, height: light.height } };
}
