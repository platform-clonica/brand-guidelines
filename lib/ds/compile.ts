/* DSMak_r — compileSystem: valida una fila de `design_systems` SIN LANZAR NUNCA.

   Es el equivalente de compileForm, sin markdown (plan, §2): aquí nadie escribe texto, todo entra por
   controles, así que lo inválido solo llega de filas antiguas o tocadas a mano. Lo que no encaja se
   repone con el valor por defecto y se anota con su ruta, para que el editor abra igual y lo cuente.

   Niveles:
   - `error`: algo que el diseñador tiene que arreglar (breakpoints solapados, familia reservada,
     tokens dañados). `ok` es false si hay alguno.
   - `warning`: se ha reparado o ignorado algo y conviene saberlo.
   Solo hay `system: null` cuando no se puede reconstruir la marca: sin primario no hay rampas. */

import {
  RESERVED_FAMILIES,
  brandSchema,
  componentConfigSchema,
  familyKeySchema,
  hexSchema,
  overridesSchema,
  tokensSchema,
  type Brand,
  type Configs,
  type Overrides,
  type Tokens,
} from './schema.ts';
import { getComponent, repairConfig } from './components.ts';
import { composeTokens, ENGINE_VERSION } from './engine/index.ts';
import { defaultBrand } from './engine/presets.ts';

export type DsIssue = { level: 'error' | 'warning'; path: string; message: string };

export type DsSystem = { brand: Brand; overrides: Overrides; configs: Configs; tokens: Tokens | null };

export type CompileResult = {
  ok: boolean;
  system: DsSystem | null;
  issues: DsIssue[];
  /** La fila se generó con otra versión del motor: el editor abre en lectura (plan, H4). */
  engineMismatch: boolean;
};

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const pathOf = (base: string, rest: PropertyKey[]) => [base, ...rest.map(String)].join('.');

function repairColors(raw: unknown, issues: DsIssue[]): Record<string, string> | null {
  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(isObject(raw) ? raw : {})) {
    const path = `brand.colors.${key}`;
    if ((RESERVED_FAMILIES as readonly string[]).includes(key)) {
      issues.push({ level: 'error', path, message: `"${key}" es un nombre reservado: lo usa el propio motor. Cambia el nombre de esta familia.` });
    } else if (!familyKeySchema.safeParse(key).success) {
      issues.push({ level: 'warning', path, message: 'El nombre no sirve para una variable CSS (solo minúsculas, números y guiones). Se ha descartado la familia.' });
    } else if (!hexSchema.safeParse(value).success) {
      if (key !== 'primary') issues.push({ level: 'warning', path, message: 'No es un color hex válido. Se ha descartado la familia.' });
    } else {
      colors[key] = value as string;
    }
  }

  if (!colors.primary) {
    issues.push({ level: 'error', path: 'brand.colors.primary', message: 'Falta un color primario válido. Sin él no se puede generar el sistema.' });
    return null;
  }
  if (!colors.secondary) {
    colors.secondary = defaultBrand().colors.secondary;
    issues.push({ level: 'warning', path: 'brand.colors.secondary', message: 'Faltaba el color secundario. Se ha puesto el de por defecto.' });
  }
  return colors;
}

function repairBrand(raw: unknown, issues: DsIssue[]): Brand | null {
  const src = isObject(raw) ? raw : {};
  const colors = repairColors(src.colors, issues);
  if (!colors) return null;

  const brand = defaultBrand() as Record<string, unknown>;
  const shape = brandSchema.shape as Record<string, (typeof brandSchema.shape)[keyof typeof brandSchema.shape]>;
  for (const key of Object.keys(shape)) {
    if (key === 'colors') continue;
    const parsed = shape[key].safeParse(src[key]);
    if (parsed.success) {
      brand[key] = parsed.data;
      continue;
    }
    const seen = new Set<string>();
    for (const iss of parsed.error.issues) {
      const path = pathOf(`brand.${key}`, iss.path);
      if (seen.has(path)) continue;
      seen.add(path);
      issues.push({ level: 'warning', path, message: 'Valor no válido. Se ha repuesto el valor por defecto.' });
    }
  }
  brand.colors = colors;
  return brand as Brand;
}

function checkBrand(brand: Brand, issues: DsIssue[]) {
  const bps = brand.breakpoints;
  bps.forEach((bp, i) => {
    if (bp.max !== null && bp.max < bp.min) {
      issues.push({ level: 'error', path: `brand.breakpoints.${i}.max`, message: `${bp.name} acaba (${bp.max}px) antes de empezar (${bp.min}px).` });
    }
    if (i === 0) return;
    const prev = bps[i - 1];
    if (prev.max === null) {
      issues.push({ level: 'error', path: `brand.breakpoints.${i - 1}.max`, message: `${prev.name} no tiene máximo y no es el último breakpoint.` });
    } else if (bp.min <= prev.max) {
      issues.push({ level: 'error', path: `brand.breakpoints.${i}.min`, message: `${bp.name} empieza en ${bp.min}px y ${prev.name} acaba en ${prev.max}px: se pisan.` });
    }
  });

  /* El styleguide cruza breakpoints y retícula por nombre: renombrar uno sin el otro deja la tabla
     con huecos (plan, H8). */
  const bpNames = new Set(bps.map((b) => b.name));
  const gridNames = new Set(brand.grid.map((g) => g.name));
  brand.grid.forEach((g, i) => {
    if (!bpNames.has(g.name)) issues.push({ level: 'warning', path: `brand.grid.${i}.name`, message: `No hay ningún breakpoint llamado "${g.name}".` });
  });
  bps.forEach((b, i) => {
    if (!gridNames.has(b.name)) issues.push({ level: 'warning', path: `brand.breakpoints.${i}.name`, message: `"${b.name}" no tiene retícula con el mismo nombre.` });
  });
}

function repairOverrides(raw: unknown, issues: DsIssue[]): Overrides {
  if (raw === undefined || raw === null) return {};
  if (!isObject(raw)) {
    issues.push({ level: 'warning', path: 'overrides', message: 'Los ajustes manuales no tienen un formato válido. Se han descartado.' });
    return {};
  }
  const full = overridesSchema.safeParse(raw);
  if (full.success) return full.data;

  const out: Obj = {};
  const shape = overridesSchema.shape as Record<string, (typeof overridesSchema.shape)[keyof typeof overridesSchema.shape]>;
  for (const key of Object.keys(shape)) {
    if (raw[key] === undefined) continue;
    const parsed = shape[key].safeParse(raw[key]);
    if (parsed.success) out[key] = parsed.data;
    else issues.push({ level: 'warning', path: `overrides.${key}`, message: 'Esta sección de ajustes manuales no es válida. Se ha descartado.' });
  }
  return out as Overrides;
}

function repairConfigs(raw: unknown, issues: DsIssue[]): Configs {
  if (raw === undefined || raw === null) return {};
  if (!isObject(raw)) {
    issues.push({ level: 'warning', path: 'configs', message: 'La configuración de componentes no es válida. Se ha descartado.' });
    return {};
  }
  const out: Configs = {};
  for (const [key, value] of Object.entries(raw)) {
    const parsed = componentConfigSchema.safeParse(value);
    if (!parsed.success) {
      issues.push({ level: 'warning', path: `configs.${key}`, message: 'La configuración de este componente no es válida. Se ha descartado.' });
      continue;
    }
    const spec = getComponent(key);
    if (!spec) {
      issues.push({ level: 'warning', path: `configs.${key}`, message: 'No hay ningún componente con ese nombre en el catálogo. Se ignora.' });
      continue;
    }
    /* La forma es buena, pero los valores se miran contra el catálogo actual (ejes, anatomía, props). */
    const repaired = repairConfig(spec, parsed.data);
    for (const p of repaired.problems) issues.push({ level: 'warning', path: `configs.${key}.${p.field}`, message: p.message });
    out[key] = repaired.config;
  }
  return out;
}

export function compileSystem(row: unknown): CompileResult {
  const src = isObject(row) ? row : {};
  const issues: DsIssue[] = [];

  const engineMismatch = src.engine_version !== ENGINE_VERSION;
  if (engineMismatch) {
    issues.push({
      level: 'warning',
      path: 'engine_version',
      message: `Este sistema se generó con la versión ${String(src.engine_version ?? 'desconocida')} del motor y la actual es la ${ENGINE_VERSION}. Los tokens guardados no se han recalculado.`,
    });
  }

  const brand = repairBrand(src.brand, issues);
  if (!brand) return { ok: false, system: null, issues, engineMismatch };
  checkBrand(brand, issues);

  const overrides = repairOverrides(src.overrides, issues);
  const configs = repairConfigs(src.configs, issues);

  for (const orphan of composeTokens(brand, overrides).orphans) {
    issues.push({ level: 'warning', path: `overrides.${orphan}`, message: 'Este ajuste apunta a un token que ya no existe. Se ignora.' });
  }

  const storedTokens = tokensSchema.safeParse(src.tokens);
  if (!storedTokens.success) {
    issues.push({ level: 'error', path: 'tokens', message: 'Los tokens guardados están dañados. Hay que regenerarlos.' });
  }

  return {
    ok: !issues.some((i) => i.level === 'error'),
    system: { brand, overrides, configs, tokens: storedTokens.success ? storedTokens.data : null },
    issues,
    engineMismatch,
  };
}
