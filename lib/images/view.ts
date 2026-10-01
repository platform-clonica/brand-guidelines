/* IMG_r — lo que la tarjeta y el detalle derivan de una fila de `images`.

   Las imágenes subidas antes de IMG_r solo tienen la versión ligera: ni original, ni miniatura, ni
   medidas guardadas. Todo lo que cambia por eso se decide aquí, con test, y no repartido por los
   componentes. Sin SDK: las URLs llegan por `urlFor`. */

import { downloadName } from './naming.ts';
import { formatBytes } from './upload.ts';

type Row = {
  name: string;
  url: string;
  width: number | null;
  height: number | null;
  original_path: string | null;
  original_bytes: number | null;
  original_width: number | null;
  original_height: number | null;
  thumb_path: string | null;
  created_at: string;
};

type Size = { width: number; height: number };

export const LEGACY_NOTE =
  'Esta imagen se subió desde un deck antes de que existiera IMG_r. Solo se guardó la versión ligera de 1600 px: no hay original que descargar.';

export const isLegacy = (row: Pick<Row, 'original_path'>) => !row.original_path;

/* La de 480 px; las antiguas, mientras no se rellenen, con la ligera. */
export const thumbSrc = (row: Pick<Row, 'thumb_path' | 'url'>, urlFor: (path: string) => string) =>
  row.thumb_path ? urlFor(row.thumb_path) : row.url;

const DATE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });

export const formatDate = (iso: string) => DATE.format(new Date(iso));

/* Medidas de la ligera: las guardadas o, en las antiguas, las que da la imagen ya cargada. */
const lightSize = (row: Row, natural?: Size): Size | null =>
  row.width && row.height ? { width: row.width, height: row.height } : natural ?? null;

/* Las tres líneas de datos del detalle (detalle 28). */
export function factLines(row: Row, uploadedBy: string | null, natural?: Size) {
  const light = lightSize(row, natural);
  return {
    original:
      isLegacy(row) || !row.original_width || !row.original_height
        ? 'No se guardó'
        : `${row.original_width} × ${row.original_height} px · ${formatBytes(row.original_bytes ?? 0)}`,
    light: light ? `${light.width} × ${light.height} px · JPEG` : 'JPEG',
    uploaded: uploadedBy ? `${formatDate(row.created_at)} · ${uploadedBy}` : formatDate(row.created_at),
  };
}

export type Download = { kind: 'original' | 'light'; label: string; href: string; toast: string };

const withDownload = (href: string, file: string) => `${href}?download=${encodeURIComponent(file)}`;

/* Las descargas del detalle (detalles 29 a 31). El parámetro `download` de Supabase sirve el fichero
   como adjunto con el nombre de la imagen. */
export function downloads(row: Row, urlFor: (path: string) => string, natural?: Size): Download[] {
  const out: Download[] = [];
  if (row.original_path) {
    const ext = row.original_path.split('.').pop() ?? 'jpg';
    out.push({
      kind: 'original',
      label: 'Descargar original',
      href: withDownload(urlFor(row.original_path), downloadName(row.name, ext)),
      toast: `Descargando el original · ${formatBytes(row.original_bytes ?? 0)}`,
    });
  }
  const light = lightSize(row, natural);
  out.push({
    kind: 'light',
    label: 'Descargar versión ligera',
    href: withDownload(row.url, downloadName(row.name, 'jpg')),
    toast: `Descargando la versión ligera · JPEG ${light ? Math.max(light.width, light.height) : 1600} px`,
  });
  return out;
}

/* El texto de un error para un aviso. Los de la API ya vienen en castellano y se enseñan; el fallo de red
   de `fetch` es un TypeError del navegador, en inglés («Failed to fetch»), y se cambia por `fallback`. */
export const errorText = (e: unknown, fallback: string) =>
  e instanceof Error && !(e instanceof TypeError) && e.message ? e.message : fallback;
