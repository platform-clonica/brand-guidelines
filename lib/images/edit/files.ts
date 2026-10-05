import { isUuid } from '../../uuid.ts';
import { NAME_MAX } from '../naming.ts';

/* IMG_r, fase 2 — los ficheros de una edición: dónde esperan los temporales, a dónde van al guardar y qué se
   borra al sobrescribir o al volver al original. Sin SDK: lo usan las rutas de la API y los tests.

   Las reglas que vienen de la fase 1 y no se rompen:
   - Ningún objeto que ya exista se mueve ni se renombra: sus URLs pueden estar en decks publicados.
   - Sobrescribir usa rutas NUEVAS, así que la URL cambia y no hay caché vieja.

   Y las que decide el plan de la fase 2 (§ 5):
   - «Original previo» es siempre el original de verdad: si se sobrescribe dos veces, la edición intermedia
     se borra y el original previo no cambia.
   - Una antigua no tiene original: su ligera pasa a ser su original previo, no se borra, y volver al
     original le devuelve su URL de siempre. */

const TMP_DIR = 'images/_tmp';
export const TMP_TTL_MS = 24 * 60 * 60 * 1000;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const extFor = (mime: string): string | null => EXT[mime] ?? null;
export const mimeFor = (ext: string): string | null => Object.keys(EXT).find((m) => EXT[m] === ext) ?? null;

/* El resultado de una edición y las dos variantes que fabrica el navegador al guardar. */
export function tmpPaths(id: string, ext: string) {
  return { result: `${TMP_DIR}/${id}.${ext}`, light: `${TMP_DIR}/${id}-light.jpg`, thumb: `${TMP_DIR}/${id}-thumb.jpg` };
}

/* Un temporal que llega del navegador: solo `images/_tmp/<uuid>.<jpg|png|webp>`. Nada de rutas de otra carpeta. */
export function parseTmp(path: string): { id: string; ext: string } | null {
  const m = /^images\/_tmp\/([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(path);
  return m && isUuid(m[1]) ? { id: m[1], ext: m[2] } : null;
}

/* Las rutas de una imagen sobrescrita o recuperada: las de siempre, con una marca para que la URL cambie. */
export function editedPaths(id: string, mime: string, tag: string) {
  const ext = extFor(mime);
  if (!isUuid(id) || !ext || !/^[0-9a-z]+$/.test(tag)) throw new Error('ruta de edición no válida');
  return { original: `images/${id}/original-${tag}.${ext}`, light: `images/${id}/light-${tag}.jpg`, thumb: `images/${id}/thumb-${tag}.jpg` };
}

type FileRow = {
  id: string;
  original_path: string | null;
  storage_path: string;
  thumb_path: string | null;
  prior_original_path: string | null;
};

const present = (paths: (string | null)[]) => paths.filter((p): p is string => !!p);

/* Sobrescribir: cuál es el original previo y qué ficheros de antes se borran. */
export function overwritePlan(row: FileRow): { prior: string; remove: string[] } {
  if (row.prior_original_path) {
    // Ya estaba sobrescrita: lo de ahora es una edición intermedia, y se va entera.
    return { prior: row.prior_original_path, remove: present([row.original_path, row.storage_path, row.thumb_path]) };
  }
  if (!row.original_path) {
    // Una antigua: su ligera es el original previo y se queda donde está.
    return { prior: row.storage_path, remove: present([row.thumb_path]) };
  }
  return { prior: row.original_path, remove: present([row.storage_path, row.thumb_path]) };
}

/* Volver al original: los ficheros editados se borran. `legacy` dice si el original previo es la ligera de
   una antigua (fuera de `images/<id>/`), que vuelve a ser su ligera tal cual. Null si no hay a qué volver. */
export function revertPlan(row: FileRow): { legacy: boolean; remove: string[] } | null {
  if (!row.prior_original_path) return null;
  return {
    legacy: !row.prior_original_path.startsWith(`images/${row.id}/`),
    remove: present([row.original_path, row.storage_path, row.thumb_path]),
  };
}

/* Los temporales de más de 24 horas, de un `list('images/_tmp')`. Cada petición de edición los purga antes. */
export function staleTmp(objects: readonly { name: string; created_at: string | null }[], now = new Date()): string[] {
  const limit = now.getTime() - TMP_TTL_MS;
  return objects
    .filter((o) => !o.name.startsWith('.') && o.created_at && Date.parse(o.created_at) < limit)
    .map((o) => `${TMP_DIR}/${o.name}`);
}

const COPY_SUFFIX = ' (editada)';

/* «<nombre> (editada)», sin pasar del máximo de un nombre. */
export function copyName(name: string): string {
  const room = NAME_MAX - COPY_SUFFIX.length;
  return `${name.length > room ? name.slice(0, room).trimEnd() : name}${COPY_SUFFIX}`;
}
