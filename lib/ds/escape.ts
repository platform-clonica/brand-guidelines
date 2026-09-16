/* DSMak_r — saneado de lo que el diseñador escribe y acaba dentro de HTML o CSS.

   Nombres de sistema, notas, familias tipográficas, breakpoints y retículas son texto libre, y el
   styleguide es un HTML autocontenido que se abre en el navegador del cliente. El prototipo escapaba
   el HTML (`Gt`) pero metía la familia tipográfica tal cual dentro de `<style>`: una familia con
   `</style><script>` salía del bloque. */

const HTML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);

/* Contenido de un string CSS entre comillas dobles. */
export const cssString = (value: string) => String(value).replace(/["\\<>\r\n]/g, '').trim();

/* Texto dentro de un comentario CSS: ni cierre de comentario, ni llaves, ni etiquetas. */
export const cssComment = (value: string) => String(value).replace(/[*/{}<>]/g, '').replace(/\s+/g, ' ').trim();

/* Identificador para selectores, nombres de variable y claves: `Pantalla grande` → `pantalla-grande`. */
export const slug = (value: string) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'x';
