/* IMG_r — subida al banco: qué se acepta, dónde va cada fichero y qué se valida en servidor.

   Sin SDK y sin 'use client': lo importan el navegador (el modal de subida), los Route Handlers
   (`POST` y `PATCH` de /api/images) y los tests en node. Lo que toca el lienzo vive aparte, en
   lib/images/client.ts, porque en node no hay lienzo. */

import { isUuid } from '../uuid.ts';
import { NAME_MAX, TAGS_MAX, normalizeTags } from './naming.ts';

/* También son el `allowed_mime_types` y el `file_size_limit` del bucket (migración *_images_bank):
   la pantalla avisa antes, pero quien manda es Storage. */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_BYTES = 25 * 1024 * 1024;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const isAccepted = (type: string) => (ACCEPTED_TYPES as readonly string[]).includes(type);

/* Peso legible: «300 KB» o «14,2 MB». MB de 1024 × 1024, como el límite. */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1).replace('.', ',')} MB`;
}

/* El rechazo de un fichero al añadirlo, o null si vale (detalle 22). */
export function validateFile(f: { name: string; type: string; size: number }): string | null {
  if (!isAccepted(f.type)) return `${f.name}: no es JPEG, PNG ni WebP.`;
  if (f.size > MAX_BYTES) return `${f.name}: pesa ${formatBytes(f.size)} y el límite es 25 MB.`;
  return null;
}

export const unreadableMessage = (name: string) => `${name}: no se ha podido leer la imagen. Prueba con otro archivo.`;

export type VariantPaths = { original: string; light: string; thumb: string };

/* Las tres variantes de una imagen nueva. Las antiguas siguen en `images/<marca>-<nombre>`: no se
   mueven, porque su URL está dentro de decks publicados. */
export function variantPaths(id: string, mime: string): VariantPaths {
  if (!isUuid(id)) throw new Error(`id no válido: ${id}`);
  const ext = EXT[mime];
  if (!ext) throw new Error(`tipo no admitido: ${mime}`);
  return { original: `images/${id}/original.${ext}`, light: `images/${id}/light.jpg`, thumb: `images/${id}/thumb.jpg` };
}

/* Formato público y estable de Supabase Storage, el mismo de lib/decks/publicApi.ts. Esa copia es
   'use client' y un Route Handler no puede importar valores de ahí; esta la usa el servidor. */
export function publicObjectUrl(base: string, bucket: string, path: string): string {
  return encodeURI(`${base}/storage/v1/object/public/${bucket}/${path}`);
}

/* ── El lote ── */

export const effectiveTags = (common: readonly string[], own: readonly string[]) => normalizeTags([...common, ...own]);

/* Qué le falta a una fila para poder subirse (detalle 23), o null. */
export function rowProblem(row: { name: string; tags: readonly string[] }, common: readonly string[]): string | null {
  if (!row.name.trim()) return 'Falta el nombre.';
  if (!effectiveTags(common, row.tags).length) return 'Falta al menos una etiqueta, propia o común.';
  return null;
}

export function uploadButtonLabel(pending: number, progress?: { current: number; total: number }): string {
  if (progress) return `Subiendo ${progress.current} de ${progress.total}`;
  return pending > 1 ? `Subir ${pending} imágenes` : 'Subir';
}

export function uploadSummary(done: number, failed: number): string {
  if (!failed) return done === 1 ? 'Imagen subida' : `${done} imágenes subidas`;
  if (!done) return `No se ha subido ninguna · ${failed} con error`;
  return `${done} ${done === 1 ? 'subida' : 'subidas'} · ${failed} con error`;
}

/* ── Validación en servidor ── */

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDim = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0;

function checkMeta(b: Obj): Result<{ name: string; tags: string[] }> {
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) return { ok: false, error: 'Falta el nombre.' };
  if (name.length > NAME_MAX) return { ok: false, error: 'El nombre es demasiado largo.' };
  const tags = normalizeTags(Array.isArray(b.tags) ? b.tags.filter((t): t is string => typeof t === 'string') : []);
  if (!tags.length) return { ok: false, error: 'Falta al menos una etiqueta.' };
  if (tags.length > TAGS_MAX) return { ok: false, error: 'Demasiadas etiquetas.' };
  return { ok: true, value: { name, tags } };
}

/* Lo que se inserta en `images` al registrar una subida. */
export type ImageInsert = {
  id: string;
  name: string;
  alt: string;
  tags: string[];
  source: 'upload';
  storage_path: string;
  url: string;
  thumb_path: string;
  original_path: string;
  original_bytes: number;
  original_width: number;
  original_height: number;
  width: number;
  height: number;
};

/* `POST /api/images`. No se fía de rutas ni URLs del navegador: las recalcula desde el id y el tipo.
   `alt` repite el nombre para que la columna no se quede vacía a partir de ahora. */
export function validateCreateInput(body: unknown, urlFor: (path: string) => string): Result<ImageInsert> {
  if (!isObject(body)) return { ok: false, error: 'Cuerpo no válido.' };
  if (typeof body.id !== 'string' || !isUuid(body.id)) return { ok: false, error: 'Id no válido.' };
  const meta = checkMeta(body);
  if (!meta.ok) return meta;
  const type = typeof body.original_type === 'string' ? body.original_type : '';
  if (!isAccepted(type)) return { ok: false, error: 'Tipo de imagen no admitido.' };
  const bytes = body.original_bytes;
  if (!(typeof bytes === 'number' && Number.isInteger(bytes) && bytes > 0 && bytes <= MAX_BYTES)) {
    return { ok: false, error: 'Peso no válido.' };
  }
  if (![body.original_width, body.original_height, body.width, body.height].every(isDim)) {
    return { ok: false, error: 'Medidas no válidas.' };
  }
  const paths = variantPaths(body.id, type);
  return {
    ok: true,
    value: {
      id: body.id,
      name: meta.value.name,
      alt: meta.value.name,
      tags: meta.value.tags,
      source: 'upload',
      storage_path: paths.light,
      url: urlFor(paths.light),
      thumb_path: paths.thumb,
      original_path: paths.original,
      original_bytes: bytes,
      original_width: body.original_width as number,
      original_height: body.original_height as number,
      width: body.width as number,
      height: body.height as number,
    },
  };
}

/* `PATCH /api/images/[id]`: nombre y etiquetas, más el `updated_at` que se leyó al abrir. */
export function validateUpdateInput(body: unknown): Result<{ name: string; tags: string[]; expectedUpdatedAt: string }> {
  if (!isObject(body)) return { ok: false, error: 'Cuerpo no válido.' };
  const meta = checkMeta(body);
  if (!meta.ok) return meta;
  const at = body.expectedUpdatedAt;
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) {
    return { ok: false, error: 'Falta la fecha de la versión que se editó.' };
  }
  return { ok: true, value: { ...meta.value, expectedUpdatedAt: at } };
}
