import type { DeckType } from '@/lib/deck';

/* Metadata stored alongside a presentation's Markdown. Matches the `decks` table. */
export interface DeckMeta {
  commercial_id: string;
  client_id: string | null;
  contact_emails: string[];
  logo_path: string | null;
  budget_url: string | null;
  type: DeckType;
  tags: string[];
}

/* A full deck row (metadata + content). */
export interface DeckRecord extends DeckMeta {
  id: string;
  md: string;
  created_at: string;
  updated_at: string;
}

/* Compact row for the "Abrir" history list and the gallery grid. Includes the joined
   client name plus `tags`, and `md`/`type` so the gallery can render a cover thumbnail. */
export interface DeckListItem {
  id: string;
  commercial_id: string;
  client_id: string | null;
  client_name: string | null;
  tags: string[];
  md: string;
  type: DeckType;
  created_at: string;
  updated_at: string;
}

/* A client row that feeds the "Cliente" dropdown. */
export interface ClientRecord {
  id: string;
  name: string;
  default_logo_path: string | null;
  default_emails: string[] | null;
  created_at: string;
}

export type DeckCreateInput = Partial<DeckMeta> & { commercial_id: string; md?: string };
export type DeckUpdateInput = Partial<DeckMeta & { md: string }>;
export type ClientCreateInput = { name: string; default_logo_path?: string | null; default_emails?: string[] | null };

/* A client's signature on a saved deck (Acceptance page). Matches the `signatures` table. */
export interface DeckSignature {
  id: string;
  deck_id: string;
  signer_name: string;
  signer_email: string;
  signature_png: string; // PNG data URL of the drawn signature
  ip: string | null;
  user_agent: string | null;
  signed_at: string;
}

export type SignInput = { signer_name: string; signer_email: string; signature_png: string };

/* Una imagen del banco (IMG_r, docs/features/img-r.md). `source` distingue lo subido de lo generado
   y, en la fase 2, de lo editado; `prompt` guarda la indicación usada.

   Tres ficheros por imagen: `storage_path`/`url` son la versión LIGERA (la que va en el `md` de decks y
   formularios), `original_path` el original y `thumb_path` la miniatura. Las imágenes subidas antes de
   IMG_r solo tienen la ligera: original y miniatura en null, `width`/`height` desconocidos. */
export type ImageSource = 'upload' | 'generated' | 'edited';

export interface ImageRecord {
  id: string;
  storage_path: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  source: ImageSource;
  prompt: string | null;
  name: string;
  tags: string[];
  original_path: string | null;
  original_bytes: number | null;
  original_width: number | null;
  original_height: number | null;
  thumb_path: string | null;
  /** Fase 2: la imagen de la que sale una copia editada. */
  parent_id: string | null;
  /** Fase 2: el original anterior a sobrescribir, para «Volver al original». */
  prior_original_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/* Lo que se edita de una imagen, y lo que se compara cuando otra pestaña guardó antes. */
export type ImageMeta = { name: string; tags: string[] };

/* Un documento que usa la imagen (por la URL de su versión ligera en el `md`). */
export type ImageUse = { kind: 'deck' | 'form'; id: string; name: string };

/* Tarjeta de la rejilla: la fila más cuántos documentos la usan. */
export type ImageListItem = ImageRecord & { use_count: number };

/* Detalle: la fila, dónde se usa y quién la subió. */
export type ImageDetail = ImageRecord & { uses: ImageUse[]; uploaded_by: string | null };

export type ImageUpdateInput = ImageMeta & { expectedUpdatedAt: string };

/* Lo que el navegador manda a POST /api/images después de subir los tres ficheros a `images/<id>/`.
   Las rutas y la URL las recalcula el servidor desde el id y el tipo (lib/images/upload.ts). */
export type ImageCreateInput = ImageMeta & {
  id: string;
  original_type: string;
  original_bytes: number;
  original_width: number;
  original_height: number;
  /** Medidas de la versión ligera. */
  width: number;
  height: number;
};
