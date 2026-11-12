import type { CanvasId } from './types.ts';
import { templateById } from './templates.ts';

/* Qué se guarda de una pieza social y cómo se construye cada operación.
   ─────────────────────────────────────────────────────────────────────────
   Lógica pura, sin Supabase ni Next: las rutas de API la llaman y los tests
   la ejercitan en node. Mismo reparto que `lib/ds/server.ts`.

   SOLO SE GUARDA EL MARKDOWN. Las slides se compilan desde ahí en cada
   render, igual que en el editor. Guardar el resultado compilado sería una
   segunda copia del diseño destinada a quedarse vieja en cuanto cambie un
   layout, que es justo el problema que este repo ya tiene documentado con
   la portada del deck. */

export type SocialPostRow = {
  id: string;
  public_id: string;
  name: string;
  canvas: CanvasId;
  md: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

/* Lo que necesita la galería, y SÍ lleva el markdown.

   La tarjeta pinta la primera slide de verdad, con los mismos componentes
   que el editor, así que necesita el texto. La alternativa sería guardar
   una miniatura aparte, y eso es una segunda copia del diseño destinada a
   quedarse vieja en cuanto cambie un layout: justo el problema que este
   repo ya tiene documentado con la portada del deck.

   El coste es real pero pequeño: una pieza son un par de KB y la
   herramienta la usa un equipo, no un público. Si algún día la lista se
   hace larga, lo que toca es paginar, no dejar de pintar lo que hay. */
export type SocialListItem = SocialPostRow & { slides: number };

export const NOMBRE_POR_DEFECTO = 'Carrusel sin título';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

/* Cuántas slides tiene, para la tarjeta de la galería.

   Se cuenta sobre el texto y no compilando: la galería pide decenas de
   filas y compilar cada una traería el motor entero al servidor para un
   número. Los separadores son los mismos que usa el parser, y un bloque
   vacío no cuenta porque tampoco pinta una slide. */
export function contarSlides(md: string): number {
  return md
    .replace(/\r\n/g, '\n')
    .split(/\n-{3,}\n/)
    .filter((b) => b.trim().length > 0).length;
}

const limpiar = (v: unknown, porDefecto: string) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s.slice(0, 200) : porDefecto;
};

const canvasDe = (v: unknown): CanvasId => (v === 'post' ? 'post' : 'carrusel');

const etiquetas = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean))].slice(0, 12)
    : [];

/** Una pieza nueva. Sin markdown, arranca con la plantilla de Miradas. */
export function buildInsert(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    name: limpiar(b.name, NOMBRE_POR_DEFECTO),
    canvas: canvasDe(b.canvas),
    md: typeof b.md === 'string' && b.md.trim().length ? b.md : templateById('miradas').md,
    tags: etiquetas(b.tags),
  };
}

/** Una copia. El nombre lleva «(copia)» si no se da otro: dos filas con el
    mismo nombre en la galería son indistinguibles. */
export function buildDuplicate(source: SocialPostRow, body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    name: limpiar(b.name, `${source.name} (copia)`),
    canvas: canvasDe(b.canvas ?? source.canvas),
    md: source.md,
    tags: Array.isArray(b.tags) ? etiquetas(b.tags) : source.tags,
  };
}

/* Qué se deja modificar, y nada más. Un PATCH con campos desconocidos no es
   un error del que escribe: es un campo que el servidor no debe tocar.

   Devuelve `null` cuando no hay nada que cambiar, para que la ruta responda
   sin escribir en vez de disparar el trigger de `updated_at` en balde. */
export function buildPatch(body: unknown): Record<string, unknown> | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof b.name === 'string') patch.name = limpiar(b.name, NOMBRE_POR_DEFECTO);
  if (typeof b.md === 'string') patch.md = b.md;
  if (b.canvas !== undefined) patch.canvas = canvasDe(b.canvas);
  if (b.tags !== undefined) patch.tags = etiquetas(b.tags);
  return Object.keys(patch).length ? patch : null;
}

export function listItemFrom(row: SocialPostRow): SocialListItem {
  return { ...row, slides: contarSlides(row.md) };
}
