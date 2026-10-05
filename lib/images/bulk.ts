/* IMG_r · entrega 3 — acciones en bloque (docs/features/img-r.md, G9–G13).

   Lo que validan y reparten PATCH /api/images/bulk y POST /api/images/bulk-delete antes y después de tocar la
   base de datos. Sin SDK: lo importan los Route Handlers y los tests en node. */

import type { ImageUse } from '../decks/types.ts';
import { isUuid } from '../uuid.ts';
import { TAGS_MAX, downloadName, normalizeTags } from './naming.ts';
import { formatBytes } from './upload.ts';

/* Como mucho 200 imágenes por petición: la lista de ids viaja en el cuerpo y `image_uses` las cruza todas
   con decks y formularios en una sola llamada. */
export const BULK_MAX = 200;

/* `.in('id', …)` viaja en la URL de PostgREST, y 200 uuid son unos 7,4 KB: cerca del límite de algunas
   pasarelas. Las consultas por id van en tandas de 100. */
export const IN_CHUNK = 100;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/* Los ids de una acción en bloque: uuid, sin repetir y en el orden en que llegan. */
export function parseBulkIds(v: unknown): Result<string[]> {
  if (!Array.isArray(v) || !v.every((x): x is string => typeof x === 'string' && isUuid(x))) {
    return { ok: false, error: 'Identificador no válido.' };
  }
  const ids = [...new Set(v)];
  if (!ids.length) return { ok: false, error: 'Elige al menos una imagen.' };
  if (ids.length > BULK_MAX) return { ok: false, error: `Como mucho ${BULK_MAX} imágenes a la vez.` };
  return { ok: true, value: ids };
}

/* Las etiquetas que se añaden: normalizadas como en la subida. Más de las que caben en una imagen no tiene
   sentido, así que se rechazan con el mismo texto que la subida. */
export function parseAddTags(v: unknown): Result<string[]> {
  const tags = normalizeTags(Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []);
  if (!tags.length) return { ok: false, error: 'Añade al menos una etiqueta.' };
  if (tags.length > TAGS_MAX) return { ok: false, error: 'Demasiadas etiquetas.' };
  return { ok: true, value: tags };
}

type Paths = {
  id: string;
  storage_path: string;
  original_path: string | null;
  thumb_path: string | null;
  prior_original_path: string | null;
};

/* Borrado en bloque (G12): las libres se borran; las que se usan en algún deck o formulario, no, y vuelven
   con su lista; las que ya no existen se devuelven aparte para que salgan de la selección. */
export function splitDeletable<R extends Paths>(
  ids: readonly string[],
  rows: readonly R[],
  uses: ReadonlyMap<string, ImageUse[]>,
): { free: R[]; blocked: { id: string; uses: ImageUse[] }[]; missing: string[] } {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const free: R[] = [];
  const blocked: { id: string; uses: ImageUse[] }[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) missing.push(id);
    else if (uses.get(id)?.length) blocked.push({ id, uses: uses.get(id)! });
    else free.push(row);
  }
  return { free, blocked, missing };
}

/* Añadir etiquetas (G10): con las filas de antes y las que la base de datos actualizó, cuáles ya no existen
   y cuáles se quedaron sin hueco para alguna de las nuevas (tope de TAGS_MAX). Las que ya las tenían todas
   no cuentan como llenas. */
export function tagsOutcome(
  ids: readonly string[],
  added: readonly string[],
  before: readonly { id: string; tags: string[] }[],
  updated: readonly { id: string; tags: string[] }[],
): { missing: string[]; full: string[] } {
  const now = new Map(before.map((r) => [r.id, r.tags]));
  for (const r of updated) now.set(r.id, r.tags);
  const missing: string[] = [];
  const full: string[] = [];
  for (const id of ids) {
    const tags = now.get(id);
    if (!tags) missing.push(id);
    else if (!added.every((t) => tags.includes(t))) full.push(id);
  }
  return { missing, full };
}

/* ── Textos de la barra y de sus modales (G9 a G12) ──────────────────────────
   Los del prototipo, con el singular que el prototipo no tenía. La copia nueva está marcada en el plan. */

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const selectedLabel = (n: number) => `${n} ${plural(n, 'seleccionada', 'seleccionadas')}`;

/* «Visibles» son las cargadas en la rejilla con el filtro actual (con el scroll infinito, no todas las del banco). */
export const selectVisibleLabel = (n: number) => (n === 1 ? 'Seleccionar la visible' : `Seleccionar las ${n} visibles`);

export const tagsIntro = (n: number) =>
  n === 1
    ? 'Se añaden a la imagen seleccionada. Las etiquetas que ya tiene no cambian.'
    : `Se añaden a las ${n} imágenes seleccionadas. Las etiquetas que ya tienen no cambian.`;

/* `done`: las que ya tienen todas las etiquetas pedidas; `full`: las que se quedaron sin hueco para alguna;
   `missing`: las que ya no estaban en el banco. */
export function tagsDone({ done, full, missing }: { done: number; full: number; missing: number }): string {
  let out = `Etiquetas añadidas a ${done} ${plural(done, 'imagen', 'imágenes')}`;
  if (full) out += ` · ${full} ${plural(full, 'ya tenía', 'ya tenían')} ${TAGS_MAX} etiquetas`;
  if (missing) out += ` · ${missing} ${plural(missing, 'ya no está', 'ya no están')} en el banco`;
  return out;
}

/* Si todas las que se borran son antiguas, no tienen original: se quita la coletilla, como en el borrado de una. */
export function deleteMessage(n: number, allLegacy: boolean): string {
  const what = n === 1 ? 'Se borrará 1 imagen' : `Se borrarán ${n} imágenes`;
  const files = allLegacy ? '' : n === 1 ? ', con su original y su versión ligera' : ', con sus originales y sus versiones ligeras';
  return `${what}${files}. Esta acción no se puede deshacer.`;
}

export function blockedMessage(blocked: number, total: number): string {
  const lead =
    blocked === total
      ? total === 1
        ? 'Se usa en documentos.'
        : 'Ninguna se puede eliminar porque se usan en documentos.'
      : `${blocked} no se ${plural(blocked, 'puede', 'pueden')} eliminar porque se ${plural(blocked, 'usa', 'usan')} en documentos.`;
  return `${lead} Cambia la imagen en ellos y vuelve a intentarlo.`;
}

export function deleteDone({ deleted, blocked, failed }: { deleted: number; blocked: number; failed: number }): string {
  let out = deleted === 1 ? '1 imagen eliminada' : `${deleted} imágenes eliminadas`;
  if (blocked) out += ` · ${blocked} en uso no se ${plural(blocked, 'ha', 'han')} tocado`;
  if (failed) out += ` · ${failed} no se ${plural(failed, 'ha', 'han')} podido eliminar`;
  return out;
}

/* ── Descarga en ZIP (G11) ───────────────────────────────────────────────────
   En el navegador, con los originales de sus URL públicas (las antiguas, en versión ligera). Dos topes,
   decididos por Carlos: 50 imágenes y 100 MB, porque el ZIP se monta en la memoria de la pestaña. */

export const ZIP_MAX_FILES = 50;
export const ZIP_MAX_BYTES = 100 * 1024 * 1024;

type ZipRow = { name: string; url: string; original_path: string | null; original_bytes: number | null };

/* Qué entra en el ZIP: cada fichero con el nombre de su imagen, como la descarga de una, sin repetir nombres
   (tampoco cambiando mayúsculas, que en Windows y macOS son el mismo fichero). `bytes` suma los originales;
   de las ligeras de las antiguas no se sabe el peso y no cuentan. */
export function zipEntries(
  rows: readonly ZipRow[],
  urlFor: (path: string) => string,
): { files: { url: string; name: string }[]; legacy: number; bytes: number } {
  const taken = new Set<string>();
  const files: { url: string; name: string }[] = [];
  let legacy = 0;
  let bytes = 0;
  for (const r of rows) {
    const ext = r.original_path ? (r.original_path.split('.').pop() ?? 'jpg') : 'jpg';
    if (r.original_path) bytes += r.original_bytes ?? 0;
    else legacy++;
    let name = downloadName(r.name, ext);
    if (taken.has(name.toLowerCase())) {
      const base = name.slice(0, -(ext.length + 1));
      let k = 2;
      while (taken.has(`${base} (${k}).${ext}`.toLowerCase())) k++;
      name = `${base} (${k}).${ext}`;
    }
    taken.add(name.toLowerCase());
    files.push({ url: r.original_path ? urlFor(r.original_path) : r.url, name });
  }
  return { files, legacy, bytes };
}

/* Por qué no se puede descargar la selección, o null si se puede. */
export function zipBlocked(count: number, bytes: number): string | null {
  if (count > ZIP_MAX_FILES) return `Puedes descargar hasta ${ZIP_MAX_FILES} imágenes a la vez.`;
  if (bytes > ZIP_MAX_BYTES) return `La selección pesa ${formatBytes(bytes)}. Puedes descargar hasta 100 MB a la vez.`;
  return null;
}

export function downloadStart(n: number, legacy: number): string {
  const base = `Descargando ${n} ${plural(n, 'imagen', 'imágenes')} en un ZIP`;
  return legacy ? `${base} · ${legacy} solo en versión ligera` : base;
}

/* El aviso al terminar, solo si falló alguna bajada. */
export function downloadDone(total: number, failed: number): string | null {
  if (!failed) return null;
  if (failed >= total) return 'No se ha podido preparar el ZIP. Vuelve a intentarlo.';
  const ok = total - failed;
  return `ZIP descargado con ${ok} ${plural(ok, 'imagen', 'imágenes')} · ${failed} no se ${plural(failed, 'ha', 'han')} podido descargar`;
}

export function zipName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `imagenes-interactius-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.zip`;
}
