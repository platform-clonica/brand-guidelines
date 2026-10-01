'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listImageTags, listImages } from '@/lib/decks/api';
import type { ImageListItem, ImageRecord } from '@/lib/decks/types';
import { clearFilter, effectiveSearch, matchesFilter, type ImageFilter, type TagFacets } from '@/lib/images/filter';

/* Espera al teclear antes de pedir la búsqueda al servidor. */
const DEBOUNCE_MS = 250;

/* El banco tal como lo ven la galería de IMG_r y el popup de los editores: el filtro, las páginas
   cargadas, las píldoras y lo que cambia al subir, editar o borrar. La búsqueda y el filtro los resuelve
   el servidor, 60 por página; esto solo decide cuándo pedir y qué conservar.

   `items` es null mientras carga la primera página; `error` dice si falló alguna carga. Las respuestas
   que llegan tarde (una búsqueda ya superada por otra) se descartan. */
export function useImageList() {
  const [filter, setFilter] = useState<ImageFilter>(clearFilter);
  const [items, setItems] = useState<ImageListItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [facets, setFacets] = useState<TagFacets>({ tags: [], untagged: 0 });

  /* Lo que de verdad cambia la consulta: la búsqueda efectiva (plegada, desde el tercer carácter) y las
     píldoras. Teclear «pa» detrás de «p» no vuelve a pedir nada. */
  const search = effectiveSearch(filter.q);
  const query = useMemo(
    () => ({ q: search, tags: filter.tags, untagged: filter.untagged }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, filter.tags.join('\u0000'), filter.untagged],
  );

  const request = useRef(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const loadFirst = useCallback(async (q: typeof query) => {
    const n = ++request.current;
    setError(false);
    try {
      const page = await listImages(q);
      if (n !== request.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch {
      if (n !== request.current) return;
      setItems((prev) => prev ?? []);
      setNextCursor(null);
      setError(true);
    }
  }, []);

  // La búsqueda espera a que se deje de teclear; las píldoras piden al momento.
  const lastSearch = useRef(search);
  useEffect(() => {
    const typed = lastSearch.current !== query.q;
    lastSearch.current = query.q;
    const t = setTimeout(() => void loadFirst(query), typed ? DEBOUNCE_MS : 0);
    return () => clearTimeout(t);
  }, [query, loadFirst]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const n = request.current;
    setLoadingMore(true);
    try {
      const page = await listImages({ ...query, cursor: nextCursor });
      if (n !== request.current) return;
      setItems((prev) => {
        const seen = new Set((prev ?? []).map((i) => i.id));
        return [...(prev ?? []), ...page.items.filter((i) => !seen.has(i.id))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      if (n === request.current) setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, query]);

  const refreshFacets = useCallback(() => {
    listImageTags()
      .then(setFacets)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshFacets();
  }, [refreshFacets]);

  /* Recién subidas: van primero, si cumplen el filtro activo (detalle 27). */
  const prepend = useCallback((records: ImageRecord[]) => {
    const f = filterRef.current;
    const fresh = records.filter((r) => matchesFilter(r, f)).map((r) => ({ ...r, use_count: 0 }));
    setItems((prev) => {
      const ids = new Set(fresh.map((r) => r.id));
      return [...fresh, ...(prev ?? []).filter((i) => !ids.has(i.id))];
    });
  }, []);

  /* Editada: se actualiza en su sitio, o sale de la rejilla si ya no cumple el filtro. */
  const replace = useCallback((row: ImageRecord) => {
    const f = filterRef.current;
    setItems((prev) =>
      (prev ?? []).flatMap((i) => (i.id !== row.id ? [i] : matchesFilter(row, f) ? [{ ...row, use_count: i.use_count }] : [])),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
  }, []);

  return {
    filter,
    setFilter,
    items,
    error,
    hasMore: nextCursor !== null,
    loadingMore,
    loadMore,
    facets,
    refreshFacets,
    prepend,
    replace,
    remove,
  };
}
