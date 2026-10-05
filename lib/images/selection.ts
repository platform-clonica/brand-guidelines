/* IMG_r · entrega 3 — la selección de la galería (G13).

   Vive fuera del listado (`useImageList`), así que sobrevive a filtros, búsqueda y páginas. Guarda cada imagen
   entera y no solo su id: las acciones en bloque necesitan el nombre, los usos y las rutas también de las que
   el filtro actual esconde. No va en la URL. Funciones puras, sin React: las prueba node. */

export type Selection<T extends { id: string }> = ReadonlyMap<string, T>;

export function toggleSelected<T extends { id: string }>(sel: Selection<T>, item: T): Map<string, T> {
  const next = new Map(sel);
  if (next.has(item.id)) next.delete(item.id);
  else next.set(item.id, item);
  return next;
}

/* «Seleccionar las N visibles»: añade las de la rejilla y conserva las que el filtro esconde. */
export function selectAll<T extends { id: string }>(sel: Selection<T>, items: readonly T[]): Map<string, T> {
  const next = new Map(sel);
  for (const item of items) next.set(item.id, item);
  return next;
}

/* Si ya están todas las visibles: entonces la barra no ofrece seleccionarlas. */
export function allSelected<T extends { id: string }>(sel: Selection<T>, items: readonly T[]): boolean {
  return items.length > 0 && items.every((i) => sel.has(i.id));
}

/* Las que desaparecen del banco salen de la selección. Si no había ninguna, devuelve la misma, para no
   repintar. */
export function dropFromSelection<T extends { id: string }>(sel: Selection<T>, ids: Iterable<string>): Selection<T> {
  let next: Map<string, T> | null = null;
  for (const id of ids) {
    if (!sel.has(id)) continue;
    next ??= new Map(sel);
    next.delete(id);
  }
  return next ?? sel;
}

/* Una imagen que cambia (detalle, etiquetas en bloque) se actualiza en la selección. Se mezcla con la copia
   que había porque la fila nueva puede no traer todo (el recuento de usos viene del listado). */
export function refreshSelection<T extends { id: string }>(
  sel: Selection<T>,
  rows: readonly (Partial<T> & { id: string })[],
): Selection<T> {
  let next: Map<string, T> | null = null;
  for (const row of rows) {
    const old = sel.get(row.id);
    if (!old) continue;
    next ??= new Map(sel);
    next.set(row.id, { ...old, ...row });
  }
  return next ?? sel;
}
