/* IMG_r — nombres y etiquetas de las imágenes del banco.

   Sin SDK y sin 'use client': lo importan el navegador, los Route Handlers y los tests en node. */

import type { ImageMeta } from '../decks/types.ts';

export const NAME_MAX = 140;
export const TAG_MAX = 40;
export const TAGS_MAX = 20;

/* El nombre de una imagen subida antes de IMG_r. Primero el `alt`, que el popup rellenaba con el
   nombre original del fichero sin extensión y sin sanear («hub (1)»); si no hay, la ruta sin carpeta,
   sin marca de tiempo y sin extensión («images/1789503530988-BLANC_MAD_02-215.jpg» →
   «BLANC_MAD_02-215»). Es la misma regla que `public.image_legacy_name()` en la migración. */
export function legacyName(alt: string | null, storagePath: string): string {
  const fromAlt = (alt ?? '').trim();
  if (fromAlt) return fromAlt;
  const fromPath = storagePath
    .replace(/^.*\//, '')
    .replace(/^[0-9]+-/, '')
    .replace(/\.[^.]*$/, '');
  return fromPath || storagePath;
}

/* Una etiqueta: minúsculas, espacios a un solo guion, sin guiones en los bordes. Conserva las tildes:
   la búsqueda ya las ignora (lib/images/filter.ts), y «presentación» se lee mejor que «presentacion».
   Quita llaves, comillas y barras invertidas: el filtro `contains` de PostgREST escribe las etiquetas
   como un array literal (`{a,b}`) y ahí romperían la consulta. */
export function normalizeTag(raw: string): string {
  const clean = (s: string) => s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  const t = clean(raw.toLocaleLowerCase('es').replace(/[{}"\\]/g, '').trim().replace(/\s+/g, '-'));
  return clean(t.slice(0, TAG_MAX));
}

/* Una lista de etiquetas tal como llega del campo o de la API: se parte por comas (pegar «a, b» da dos),
   se normaliza cada una y se quitan las vacías y las repetidas, en el orden en que llegaron. */
export function normalizeTags(raw: readonly string[]): string[] {
  const out: string[] = [];
  for (const piece of raw.flatMap((r) => r.split(','))) {
    const t = normalizeTag(piece);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/* Una fila con nombre. Entre la migración y su `not null` (20261001100100), la versión anterior del
   popup puede insertar filas sin `name`; la API se las pone con la misma regla de las antiguas. */
export function withName<T extends { name: string | null; alt: string | null; storage_path: string }>(row: T): Omit<T, 'name'> & { name: string } {
  return { ...row, name: row.name?.trim() ? row.name : legacyName(row.alt, row.storage_path) };
}

/* Nombre del fichero que se descarga: el de la imagen, sin lo que un sistema de ficheros no admite. */
export function downloadName(name: string, ext: string): string {
  const base = name
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '');
  return `${base || 'imagen'}.${ext}`;
}

/* Lo que cambió otra pestaña, para el aviso de choque al guardar (detalle 35). Vacío si nada. */
export function describeChanges(opened: ImageMeta, current: ImageMeta): string {
  const parts: string[] = [];
  if (current.name !== opened.name) parts.push(`nombre «${current.name}»`);
  const added = current.tags.filter((t) => !opened.tags.includes(t));
  const removed = opened.tags.filter((t) => !current.tags.includes(t));
  if (added.length) parts.push(`${added.length === 1 ? 'etiqueta añadida' : 'etiquetas añadidas'}: ${added.join(', ')}`);
  if (removed.length) parts.push(`${removed.length === 1 ? 'etiqueta quitada' : 'etiquetas quitadas'}: ${removed.join(', ')}`);
  return parts.length ? `Sus cambios: ${parts.join('; ')}.` : '';
}
