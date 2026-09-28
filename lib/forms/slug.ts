/* FormMaker — la slug como URL pública.

   Hasta ahora `slug` era decorativa: solo daba nombre al CSV y se estampaba en cada respuesta.
   La URL era siempre el `id` opaco (`fk_Hjd81rX`), no enumerable a propósito (PRD §10).

   Desde ahora la slug es un ALIAS de esa URL: `/forms/f/mi-taller-acme` resuelve al mismo
   formulario que `/forms/f/fk_Hjd81rX`. El id opaco NO desaparece — los enlaces ya repartidos
   tienen que seguir funcionando para siempre, y un formulario sin slug sigue teniendo URL.

   Que la slug sea adivinable es una decisión de quien la escribe: por eso es opcional y nace
   vacía. Un formulario sensible se deja sin slug y conserva la URL no enumerable.

   Sin dependencias de Node: esto corre también en el navegador. */

/* Minúsculas, dígitos y guiones simples. Sin `_`: así una slug NUNCA puede parecerse a un id
   público (`fk_…`), y resolver una URL ambigua deja de ser un problema. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MAX = 80;

/* Segmentos que ya significan otra cosa bajo /forms, o que confundirían al leerlos en la URL. */
const RESERVED = new Set(['api', 'f', 'new', 'admin', 'login', 'preview', 'null', 'undefined']);

/* Lo que se teclea → lo que vale como slug. Acentos fuera, espacios a guiones.
   Se usa al escribir en el modal, para que nadie tenga que adivinar la gramática. */
export function normalizeSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // diacríticos
    .replace(/[ªº]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');               // el recorte puede dejar un guion suelto al final
}

/* Mensaje de error, o null si vale. Una slug vacía es válida: significa "sin alias". */
export function slugError(slug: string): string | null {
  if (!slug) return null;
  if (slug.length > SLUG_MAX) return `La URL no puede pasar de ${SLUG_MAX} caracteres.`;
  if (!SLUG_RE.test(slug)) {
    return 'La URL solo admite minúsculas, números y guiones simples (sin acentos, espacios ni guiones bajos).';
  }
  if (RESERVED.has(slug)) return `"${slug}" está reservado. Elige otra URL.`;
  return null;
}

/* ── Resolución de una URL pública.

   El segmento `[id]` de /forms/f/[id] es un id opaco O una slug. Antes de llevarlo a PostgREST
   hay que comprobar que solo tiene caracteres nuestros: el filtro `.or()` se construye
   concatenando texto, así que una coma o un paréntesis del visitante cambiaría la consulta.
   Todo lo que no encaje aquí es, por definición, un 404. */
const ROUTE_KEY_RE = /^[A-Za-z0-9_-]{1,120}$/;

export function isRouteKey(v: string): boolean {
  return ROUTE_KEY_RE.test(v);
}

/* Una slug nunca lleva `_` ni mayúsculas; un id público sí. Sirve para no ir a buscar
   por slug lo que evidentemente no lo es. */
export function looksLikeSlug(v: string): boolean {
  return SLUG_RE.test(v);
}
