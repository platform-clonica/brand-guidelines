/* IMG_r — búsqueda, filtro por etiquetas y paginación del banco.

   La búsqueda y el filtro se hacen en servidor (60 por página). Lo que vive aquí es lo que hay que
   decidir igual en los dos lados: cómo se pliega un texto para buscar sin tildes, qué significa cada
   píldora y cómo se lee lo que llega por la URL. Sin SDK y sin 'use client': lo importan el navegador,
   los Route Handlers y los tests en node. */

import { isUuid } from '../uuid.ts';
import { normalizeTags } from './naming.ts';

/* Mapa de tildes. La migración pliega `search_text` con `translate(lower(…), FOLD_FROM, FOLD_TO)` y
   estos dos literales tienen que ser exactamente los mismos: lo vigila filter.test.ts. */
export const FOLD_FROM = 'áàâäãåéèêëíìîïóòôöõúùûüñçý';
export const FOLD_TO = 'aaaaaaeeeeiiiiooooouuuuncy';

const FOLD = new Map([...FOLD_FROM].map((c, i) => [c, FOLD_TO[i]]));

/* Desde el tercer carácter, como las galerías de DeckMak_r, FormMak_r y DSMak_r. */
export const SEARCH_MIN = 3;
export const PAGE_SIZE = 60;

export function foldSearch(text: string): string {
  return [...text.toLocaleLowerCase('es')].map((c) => FOLD.get(c) ?? c).join('');
}

/* El texto en el que se busca: el mismo que la columna generada `search_text`. */
export function searchText(name: string, tags: readonly string[]): string {
  return foldSearch(`${name} ${tags.join(' ')}`);
}

export type ImageFilter = { q: string; tags: string[]; untagged: boolean };

export const clearFilter = (): ImageFilter => ({ q: '', tags: [], untagged: false });

export const isFiltered = (f: ImageFilter) => f.q.trim() !== '' || f.tags.length > 0 || f.untagged;

/* La búsqueda efectiva: plegada, o vacía si no llega al mínimo. Si no cambia, no hay que volver a
   pedir la página: teclear «pa» después de «p» no busca nada nuevo. */
export const effectiveSearch = (q: string) => {
  const s = foldSearch(q.trim());
  return s.length >= SEARCH_MIN ? s : '';
};

/* Si el filtro acota de verdad la rejilla: «ab» todavía no busca. Decide qué vacío se enseña: el del
   banco vacío o el de «ninguna coincide». `isFiltered` decide otra cosa, si hay algo que quitar. */
export const narrows = (f: ImageFilter) => effectiveSearch(f.q) !== '' || f.tags.length > 0 || f.untagged;

/* Si una imagen pasa el filtro. Es la regla del servidor, para decidir en el navegador si una imagen
   recién subida o editada se queda en la rejilla filtrada. «Sin etiquetas» excluye a las demás. */
export function matchesFilter(img: { name: string; tags: readonly string[] }, f: ImageFilter): boolean {
  const s = effectiveSearch(f.q);
  if (s && !searchText(img.name, img.tags).includes(s)) return false;
  if (f.untagged) return img.tags.length === 0;
  return f.tags.every((t) => img.tags.includes(t));
}

export function toggleTag(f: ImageFilter, tag: string): ImageFilter {
  const tags = f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag];
  return { ...f, tags, untagged: false };
}

export function toggleUntagged(f: ImageFilter): ImageFilter {
  return { ...f, tags: [], untagged: !f.untagged };
}

/* Sugerencias del campo de etiquetas (detalle 20): las que ya existen y EMPIEZAN por lo escrito, sin
   distinguir tildes ni mayúsculas, sin las que ya están puestas, en el orden recibido (el de uso) y como
   mucho `max`. Las usa TagInput, que comparten todas las tools: la búsqueda sin tildes es una sola. */
export function suggestTags(draft: string, existing: readonly string[], selected: readonly string[], max = 6): string[] {
  const d = foldSearch(draft.trim());
  if (!d) return [];
  return existing.filter((t) => !selected.includes(t) && foldSearch(t).startsWith(d)).slice(0, max);
}

/* ── Paginación por cursor ──
   Orden `created_at desc, id desc`. Un desplazamiento repetiría tarjetas si alguien sube mientras otra
   persona baja por la rejilla; el cursor pide «lo anterior a la última que viste». */

export type Cursor = { createdAt: string; id: string };

export const encodeCursor = (c: Cursor) => `${c.createdAt}~${c.id}`;

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  const i = raw.lastIndexOf('~');
  if (i < 0) return null;
  const createdAt = raw.slice(0, i);
  const id = raw.slice(i + 1);
  if (!isUuid(id) || Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt, id };
}

/* Filtro de PostgREST para `.or()`. Las fechas llevan `.`, `:` y `+`, que en un árbol lógico de
   PostgREST tienen que ir entre comillas dobles. */
export function keysetFilter(c: Cursor): string {
  return `created_at.lt."${c.createdAt}",and(created_at.eq."${c.createdAt}",id.lt.${c.id})`;
}

/* Corta una página pedida con `limit + 1` filas: si sobra una, hay más, y el cursor es la última que se
   devuelve. */
export function pageOf<T extends { id: string; created_at: string }>(rows: readonly T[], limit: number) {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > limit && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null };
}

export type ListQuery = { search: string; tags: string[]; untagged: boolean; cursor: Cursor | null; limit: number };

export function parseListQuery(p: URLSearchParams): ListQuery {
  const untagged = p.get('untagged') === '1';
  const raw = Number.parseInt(p.get('limit') ?? '', 10);
  return {
    search: effectiveSearch(p.get('q') ?? ''),
    tags: untagged ? [] : normalizeTags((p.get('tags') ?? '').split(',')),
    untagged,
    cursor: decodeCursor(p.get('cursor')),
    limit: Number.isNaN(raw) ? PAGE_SIZE : Math.min(PAGE_SIZE, Math.max(1, raw)),
  };
}

/* Los comodines de LIKE, escapados: buscar «100%» no puede encontrarlo todo. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/* ── Píldoras ── */

export type TagFacets = { tags: { tag: string; count: number }[]; untagged: number };

export function tagFacets(rows: readonly { tags: readonly string[] }[]): TagFacets {
  const counts = new Map<string, number>();
  let untagged = 0;
  for (const r of rows) {
    if (!r.tags.length) untagged++;
    for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const tags = [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'es'));
  return { tags, untagged };
}
