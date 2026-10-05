/* IMG_r — lo que la tarjeta y el detalle derivan de una fila de `images`.

   Las imágenes subidas antes de IMG_r solo tienen la versión ligera: ni original, ni miniatura, ni
   medidas guardadas. Todo lo que cambia por eso se decide aquí, con test, y no repartido por los
   componentes. Sin SDK: las URLs llegan por `urlFor`. */

import { IMAGE_STYLE_CRITERIA, IMAGE_SUBJECT_CRITERION } from '../prompts.ts';
import type { StoredStyle } from './analyze/schema.ts';
import type { StyleChecks, StyleVerdict } from './analyze/verdict.ts';
import type { ImageUse } from '../decks/types.ts';
import { editModel } from './edit/models.ts';
import { downloadName, legacyName } from './naming.ts';
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
  /** Fase 2: de dónde sale y cómo se editó. Opcionales: la tarjeta de la fase 1 no los necesita. */
  source?: string;
  prior_original_path?: string | null;
  prompt?: string | null;
  prompt_variant?: 'standard' | 'people' | null;
  edit_model?: string | null;
};

const isEdited = (row: Pick<Row, 'source'>) => row.source === 'edited';

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
    /* F18: en una editada, el dato del original es el de la versión editada. */
    originalLabel: isEdited(row) ? 'Editada' : 'Original',
    original:
      isLegacy(row) || !row.original_width || !row.original_height
        ? 'No se guardó'
        : `${row.original_width} × ${row.original_height} px · ${formatBytes(row.original_bytes ?? 0)}`,
    light: light ? `${light.width} × ${light.height} px · JPEG` : 'JPEG',
    uploaded: uploadedBy ? `${formatDate(row.created_at)} · ${uploadedBy}` : formatDate(row.created_at),
  };
}

export type Download = { kind: 'original' | 'light' | 'prior'; label: string; href: string; toast: string };

const withDownload = (href: string, file: string) => `${href}?download=${encodeURIComponent(file)}`;

/* Las descargas del detalle (detalles 29 a 31). El parámetro `download` de Supabase sirve el fichero
   como adjunto con el nombre de la imagen. */
export function downloads(row: Row, urlFor: (path: string) => string, natural?: Size): Download[] {
  const out: Download[] = [];
  if (row.original_path) {
    const ext = row.original_path.split('.').pop() ?? 'jpg';
    const edited = isEdited(row);
    out.push({
      kind: 'original',
      label: edited ? 'Descargar editada' : 'Descargar original',
      href: withDownload(urlFor(row.original_path), downloadName(row.name, ext)),
      toast: `${edited ? 'Descargando la versión editada' : 'Descargando el original'} · ${formatBytes(row.original_bytes ?? 0)}`,
    });
  }
  const light = lightSize(row, natural);
  out.push({
    kind: 'light',
    label: 'Descargar versión ligera',
    href: withDownload(row.url, downloadName(row.name, 'jpg')),
    toast: `Descargando la versión ligera · JPEG ${light ? Math.max(light.width, light.height) : 1600} px`,
  });
  // F19: una sobrescrita guarda su original de antes.
  if (row.prior_original_path) {
    const ext = row.prior_original_path.split('.').pop() ?? 'jpg';
    out.push({
      kind: 'prior',
      label: 'Descargar original previo',
      href: withDownload(urlFor(row.prior_original_path), downloadName(`${row.name} (original previo)`, ext)),
      toast: 'Descargando el original previo',
    });
  }
  return out;
}

/* F18: los datos de una editada, o null si no lo es. */
export function editFacts(row: Row): { prompt: string | null; model: string | null; instruction: string | null } | null {
  if (!isEdited(row)) return null;
  return {
    prompt: row.prompt_variant === 'people' ? 'Personas' : row.prompt_variant === 'standard' ? 'Estándar' : null,
    model: row.edit_model ? editModel(row.edit_model).label : null,
    instruction: row.prompt?.trim() || null,
  };
}

/* F18: la nota del detalle de una editada. El modelo devuelve 2K o 4K, aunque el original fuera más grande. */
export function editedNote(row: Row): string | null {
  if (!isEdited(row) || !row.original_width || !row.original_height) return null;
  return `La versión editada sale a ${Math.max(row.original_width, row.original_height)} px de lado como máximo, aunque el original fuera más grande.`;
}

const KIND_LABEL: Record<ImageUse['kind'], string> = { deck: 'deck', form: 'formulario' };

/* «la usa deck «X»», «la usan deck «X» y formulario «Y»»: para «No se puede sobrescribir» (F12) y «No se
   puede volver al original». */
export function usedByText(uses: readonly ImageUse[]): string {
  const parts = uses.map((u) => `${KIND_LABEL[u.kind]} «${u.name}»`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : (parts[0] ?? '');
  return `${parts.length > 1 ? 'la usan' : 'la usa'} ${list}`;
}

/* Entrega 3, G5: el aviso del número de usos de la tarjeta, que es también su descripción accesible. */
export const usesLabel = (n: number) => `En uso en ${n} documento${n === 1 ? '' : 's'}`;

/* El texto de un error para un aviso. Los de la API ya vienen en castellano y se enseñan; el fallo de red
   de `fetch` es un TypeError del navegador, en inglés («Failed to fetch»), y se cambia por `fallback`. */
export const errorText = (e: unknown, fallback: string) =>
  e instanceof Error && !(e instanceof TypeError) && e.message ? e.message : fallback;

/* El nombre con el que se abre «Editar» (detalle 32). Una antigua empieza vacía, con el actual de pista,
   mientras conserve el nombre del fichero; una vez renombrada en IMG_r se edita su nombre como cualquiera. */
export const editableName = (row: { name: string; alt: string | null; storage_path: string; original_path: string | null }) =>
  isLegacy(row) && row.name === legacyName(row.alt, row.storage_path) ? '' : row.name;

/* ── Estilo Interactius (fase 2) ── */

type StyleCols = {
  style_verdict: StyleVerdict | null;
  style_checks: StyleChecks | null;
  style_reason: string | null;
  people_present: boolean | null;
};

/* El estilo de una fila, o null si está sin analizar. */
export function styleOf(row: StyleCols): StoredStyle | null {
  if (!row.style_verdict || !row.style_checks) return null;
  return { verdict: row.style_verdict, checks: row.style_checks, reason: row.style_reason, people_present: !!row.people_present };
}

export type StyleRow = { label: string; value: 'Sí' | 'No' | 'No aplica' };

/* Las seis filas del banner desplegado (F25): los cinco criterios comunes y el sexto según haya personas.
   Las etiquetas son las de lib/prompts.ts, junto a las líneas del prompt de las que salen. */
export function styleRows(style: StoredStyle): StyleRow[] {
  const subject = style.people_present ? IMAGE_SUBJECT_CRITERION.people : IMAGE_SUBJECT_CRITERION.standard;
  const rows: { label: string; v: boolean | null }[] = [
    ...IMAGE_STYLE_CRITERIA.map((c) => ({ label: c.label as string, v: style.checks[c.key] })),
    { label: subject.label, v: style.checks.subject },
  ];
  return rows.map(({ label, v }) => ({ label, value: v === null ? 'No aplica' : v ? 'Sí' : 'No' }));
}
