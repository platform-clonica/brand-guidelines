/* DSMak_r — tipos de la tabla `design_systems`. Espejo de
   supabase/migrations/20260915212500_create_design_systems.sql.

   Las columnas JSONB van como `unknown` A PROPÓSITO: lo que sale de la base de datos no está
   validado, y quien lo abre tiene que pasar por compileSystem (./compile.ts). Tiparlas como `Brand`
   sería afirmar algo que nadie ha comprobado. */

import type { Brand, Configs, Overrides } from './schema.ts';

export type DsStatus = 'draft' | 'published';

/* Campos que la fila copia de `brand` para listar y buscar. Se re-derivan en cada guardado. */
export type DsMirror = { name: string; client: string | null };

export type DesignSystemRecord = DsMirror & {
  id: string;
  public_id: string;
  status: DsStatus;
  tags: string[];
  brand: unknown;
  overrides: unknown;
  tokens: unknown;
  configs: unknown;
  engine_version: string;
  logo_path: string | null;
  logo_dark_path: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

/* Lo que devuelve el listado: sin los JSONB, que pesan decenas de KB por fila, y con la tira de color
   de la tarjeta ya calculada en el servidor (plan, R5). */
export type DesignSystemListItem = DsMirror & {
  id: string;
  public_id: string;
  status: DsStatus;
  tags: string[];
  engine_version: string;
  logo_path: string | null;
  created_at: string;
  updated_at: string;
  palette: string[];
};

export type DesignSystemCreateInput =
  | { brand: Brand; overrides?: Overrides; configs?: Configs; tags?: string[] }
  | { duplicateOf: string; name?: string; client?: string | null; tags?: string[] };

/* `expectedUpdatedAt` es obligatorio: sin él no hay forma de detectar que otra pestaña guardó antes
   (plan, H7). El servidor responde 409 si no coincide.

   No hay `tokens`: los calcula el servidor con su motor cuando llegan `brand` y `overrides`, que van
   siempre juntos y con `engineVersion`. Si el editor corre otra versión del motor (una pestaña abierta
   durante un despliegue), el servidor responde 409 en vez de guardar tokens de un motor distinto. */
export type DesignSystemUpdateInput = {
  expectedUpdatedAt: string;
  /* Renombrar sin la marca entera (galería): reescribe `brand.name`/`brand.client` y los espejos,
     sin recalcular tokens. No se pueden mandar junto a `brand`. */
  name?: string;
  client?: string | null;
  engineVersion?: string;
  brand?: Brand;
  overrides?: Overrides;
  configs?: Configs;
  status?: DsStatus;
  tags?: string[];
  logo_path?: string | null;
  logo_dark_path?: string | null;
};
