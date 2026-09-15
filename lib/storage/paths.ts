/* Storage — nombres de bucket y rutas de objeto. Sin SDK y sin 'use client', a propósito: lo importan
   el navegador (subida), los Route Handlers (borrado y copia) y los tests en node. Una constante
   importada desde un módulo 'use client' no llega como valor a un Route Handler. */

export const LOGO_BUCKET = 'deck-assets';
export const IMAGE_BUCKET = 'deck-images';

/* `logos/1700000000000-Mi_logo.svg`. La marca de tiempo evita sobrescribir: un `upsert` pediría
   permisos de lectura y actualización sobre `storage.objects` que el equipo no tiene. */
export function logoObjectPath(prefix: string, fileName: string, now: number): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${prefix}/${now}-${safe}`;
}
