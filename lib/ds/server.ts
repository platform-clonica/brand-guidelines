/* DSMak_r — lo que deciden los Route Handlers, sin Next ni Supabase, para poder testearlo en node.
   Los handlers de app/api/design-systems solo hacen de fontanería: sesión, consulta y respuesta.

   Dos reglas que viven aquí:
   - Los tokens NUNCA vienen del cliente. Los calcula el servidor con su motor a partir de `brand` y
     `overrides`. Un tercero con sesión no puede guardar tokens que no salgan de su marca.
   - Un logo solo puede apuntar al prefijo de su propio sistema (`ds/<id>/`). Borrar un sistema borra
     sus logos, así que aceptar una ruta ajena permitiría borrar el logo de una propuesta. */

import { compileSystem } from './compile.ts';
import { composeTokens, ENGINE_VERSION } from './engine/index.ts';
import { mirrorFrom, paletteStrip } from './mirror.ts';
import { brandSchema, configsSchema, overridesSchema } from './schema.ts';
import type { DesignSystemListItem, DsStatus } from './types.ts';

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export type InsertRow = {
  name: string;
  client: string | null;
  status?: DsStatus;
  tags: string[];
  brand: unknown;
  overrides: unknown;
  configs: unknown;
  tokens: unknown;
  engine_version: string;
  logo_path: string | null;
  logo_dark_path: string | null;
};

type Fail = { ok: false; status: 400 | 409; error: string };
const fail = (error: string, status: 400 | 409 = 400): Fail => ({ ok: false, status, error });

/* Etiquetas recortadas, sin vacías ni repetidas. `null` si no es una lista de textos. */
export function cleanTags(raw: unknown): string[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((t) => typeof t !== 'string')) return null;
  return [...new Set((raw as string[]).map((t) => t.trim()).filter(Boolean))];
}

const isOwnedPath = (path: string, id: string) =>
  path.startsWith(`ds/${id}/`) && !path.includes('..') && /^[A-Za-z0-9._/-]+$/.test(path);

export function ownedLogoPaths(row: { logo_path?: unknown; logo_dark_path?: unknown }, id: string): string[] {
  return [row.logo_path, row.logo_dark_path].filter((p): p is string => typeof p === 'string' && isOwnedPath(p, id));
}

/* Marca + ajustes validados, con los errores de sistema de compileSystem (familias reservadas,
   breakpoints solapados) como motivo de rechazo. Devuelve los tokens del motor del servidor. */
function validateSystem(rawBrand: unknown, rawOverrides: unknown, rawConfigs: unknown) {
  const brand = brandSchema.safeParse(rawBrand);
  if (!brand.success) return fail(`La marca no es válida (${brand.error.issues[0]?.path.join('.') || 'raíz'}).`);
  const overrides = overridesSchema.safeParse(rawOverrides ?? {});
  if (!overrides.success) return fail('Los ajustes manuales no son válidos.');
  const configs = configsSchema.safeParse(rawConfigs ?? {});
  if (!configs.success) return fail('La configuración de componentes no es válida.');

  const tokens = composeTokens(brand.data, overrides.data).tokens;
  const errors = compileSystem({
    brand: brand.data,
    overrides: overrides.data,
    configs: configs.data,
    tokens,
    engine_version: ENGINE_VERSION,
  }).issues.filter((i) => i.level === 'error');
  if (errors.length) return fail(errors.map((e) => e.message).join(' '));

  return { ok: true as const, brand: brand.data, overrides: overrides.data, configs: configs.data, tokens };
}

export function buildInsert(body: unknown): { ok: true; row: InsertRow } | Fail {
  if (!isObject(body)) return fail('El cuerpo de la petición no es válido.');
  const tags = cleanTags(body.tags);
  if (!tags) return fail('Las etiquetas tienen que ser una lista de textos.');
  const system = validateSystem(body.brand, body.overrides, body.configs);
  if (!system.ok) return system;

  return {
    ok: true,
    row: {
      ...mirrorFrom(system.brand),
      tags,
      brand: system.brand,
      overrides: system.overrides,
      configs: system.configs,
      tokens: system.tokens,
      engine_version: ENGINE_VERSION,
      logo_path: null,
      logo_dark_path: null,
    },
  };
}

/* Copia de un sistema. Nace borrador y sin logos: los handlers copian los ficheros al prefijo nuevo
   después de insertar, cuando ya existe el id. Los tokens y la versión del motor se copian TAL CUAL:
   duplicar no es regenerar (plan, H4). `id` y `public_id` los pone la base de datos. */
export function buildDuplicate(source: unknown, input: { name?: unknown; client?: unknown; tags?: unknown }): InsertRow {
  const src = isObject(source) ? source : {};
  const baseName = typeof src.name === 'string' && src.name.trim() ? src.name.trim() : 'Sistema sin nombre';
  const name = (typeof input.name === 'string' && input.name.trim()) || `${baseName} (copia)`;
  const client =
    input.client !== undefined
      ? (typeof input.client === 'string' && input.client.trim()) || null
      : typeof src.client === 'string'
        ? src.client
        : null;
  const tags =
    input.tags !== undefined
      ? (cleanTags(input.tags) ?? [])
      : Array.isArray(src.tags)
        ? src.tags.filter((t): t is string => typeof t === 'string')
        : [];

  return {
    name,
    client,
    status: 'draft',
    tags,
    brand: isObject(src.brand) ? { ...src.brand, name, client } : src.brand,
    overrides: src.overrides ?? {},
    configs: src.configs ?? {},
    tokens: src.tokens,
    engine_version: typeof src.engine_version === 'string' ? src.engine_version : ENGINE_VERSION,
    logo_path: null,
    logo_dark_path: null,
  };
}

/* Renombrar desde la galería: nombre y cliente sueltos, sin la marca entera. */
export type Rename = { name?: string; client?: string | null };

export function buildPatch(
  body: unknown,
  id: string,
): { ok: true; patch: Obj; expectedUpdatedAt: string; rename: Rename | null } | Fail {
  if (!isObject(body)) return fail('El cuerpo de la petición no es válido.');
  const expectedUpdatedAt = body.expectedUpdatedAt;
  if (typeof expectedUpdatedAt !== 'string' || !expectedUpdatedAt) {
    return fail('Falta expectedUpdatedAt: sin él no se puede saber si otra pestaña guardó antes.');
  }

  const patch: Obj = {};
  const hasBrand = 'brand' in body;
  const hasOverrides = 'overrides' in body;

  let rename: Rename | null = null;
  if ('name' in body || 'client' in body) {
    if (hasBrand) return fail('Al guardar la marca, el nombre y el cliente van dentro de ella.');
    rename = {};
    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim()) return fail('El nombre no puede quedar vacío.');
      rename.name = body.name.trim();
    }
    if ('client' in body) {
      if (body.client !== null && typeof body.client !== 'string') return fail('El cliente tiene que ser un texto.');
      rename.client = (typeof body.client === 'string' && body.client.trim()) || null;
    }
  }

  if (hasBrand || hasOverrides) {
    if (!hasBrand || !hasOverrides) return fail('La marca y sus ajustes manuales se guardan siempre juntos.');
    if (body.engineVersion !== ENGINE_VERSION) {
      return fail('Este editor usa otra versión del motor que el servidor. Recarga la página antes de seguir.', 409);
    }
    const system = validateSystem(body.brand, body.overrides, body.configs);
    if (!system.ok) return system;
    Object.assign(patch, mirrorFrom(system.brand), {
      brand: system.brand,
      overrides: system.overrides,
      tokens: system.tokens,
      engine_version: ENGINE_VERSION,
    });
  }

  if ('configs' in body) {
    const configs = configsSchema.safeParse(body.configs);
    if (!configs.success) return fail('La configuración de componentes no es válida.');
    patch.configs = configs.data;
  }

  if ('status' in body) {
    if (body.status !== 'draft' && body.status !== 'published') return fail('El estado tiene que ser borrador o publicado.');
    patch.status = body.status;
  }

  if ('tags' in body) {
    const tags = cleanTags(body.tags);
    if (!tags) return fail('Las etiquetas tienen que ser una lista de textos.');
    patch.tags = tags;
  }

  for (const key of ['logo_path', 'logo_dark_path'] as const) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value !== null && (typeof value !== 'string' || !isOwnedPath(value, id))) {
      return fail('El logo tiene que estar guardado en la carpeta de este sistema.');
    }
    patch[key] = value;
  }

  if (Object.keys(patch).length === 0 && !rename) return fail('No hay ningún campo que guardar.');
  return { ok: true, patch, expectedUpdatedAt, rename };
}

/* Lo que escribe un renombrado sobre la marca guardada. El nombre y el cliente no entran en los
   tokens, así que aquí NO se recalcula nada ni se toca `engine_version`: pasar por la marca entera
   regeneraría en silencio un sistema de otro motor solo por cambiarle el nombre (plan, H4).
   Con la marca dañada se actualizan los espejos y la marca se deja como está: la repara el editor. */
export function renamePatch(currentBrand: unknown, rename: Rename): Obj {
  return isObject(currentBrand) ? { ...rename, brand: { ...currentBrand, ...rename } } : { ...rename };
}

export type ListRow = Omit<DesignSystemListItem, 'palette' | 'tags'> & { tags: string[] | null; palette: unknown };

export function listItemFrom(row: ListRow): DesignSystemListItem {
  return {
    id: row.id,
    public_id: row.public_id,
    name: row.name,
    client: row.client,
    status: row.status,
    tags: row.tags ?? [],
    engine_version: row.engine_version,
    logo_path: row.logo_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    palette: paletteStrip({ palette: row.palette }),
  };
}
