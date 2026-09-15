/* DSMak_r — ediciones del paso 2 sobre `overrides`, y de las familias de color sobre `brand`.

   Funciones puras que devuelven objetos nuevos: el editor las encadena sobre su estado y nunca muta
   lo que hay. Dos reglas:
   - Una sección que se queda vacía desaparece. Así "volver al valor del motor" deja `overrides`
     igual que si nunca se hubiera tocado, y el guardado no arrastra `{ swatches: {} }`.
   - Renombrar o quitar una familia se lleva sus ajustes (muestras, bloqueo, variación). Si no, se
     quedarían apuntando a una familia que ya no existe y compileSystem los contaría como huérfanos.
   Lo estructural (familias) va en `brand`; lo escalar, en `overrides` (plan, H1). */

import type { Ramp } from './engine/ramp.ts';
import type { SemanticKey } from './engine/semantic.ts';
import { RESERVED_FAMILIES, familyKeySchema, type Brand, type Overrides, type ShadowToken, type TypeToken } from './schema.ts';

type Obj = Record<string, unknown>;

/* Pone o quita (value === undefined) una entrada de una sección, y quita la sección si queda vacía. */
function withEntry(o: Overrides, section: keyof Overrides, key: string, value: unknown): Overrides {
  const map: Obj = { ...((o[section] as Obj | undefined) ?? {}) };
  if (value === undefined) delete map[key];
  else map[key] = value;
  const out: Obj = { ...o };
  if (Object.keys(map).length) out[section] = map;
  else delete out[section];
  return out as Overrides;
}

/* Quita una entrada suelta: un escalón de espaciado, un radio, el radio de un componente, una sombra. */
export const clearOverrideEntry = (o: Overrides, section: keyof Overrides, key: string) => withEntry(o, section, key, undefined);

export const clearOverrideSection = (o: Overrides, section: keyof Overrides): Overrides => {
  const out = { ...o };
  delete out[section];
  return out;
};

// ── Color ────────────────────────────────────────────────────────────────────

/** `path`: `palette.<familia>.<escalón>`, `semantic.<clave>.<escalón>` o `semanticScale.<clave>.<escalón>`. */
export const setSwatch = (o: Overrides, path: string, hex: string) => withEntry(o, 'swatches', path, hex);
export const clearSwatch = (o: Overrides, path: string) => withEntry(o, 'swatches', path, undefined);

/* Todos los retoques bajo un prefijo: `palette.primary.` quita los de la familia primaria. */
export function clearSwatchesUnder(o: Overrides, prefix: string): Overrides {
  let out = o;
  for (const path of Object.keys(o.swatches ?? {})) if (path.startsWith(prefix)) out = clearSwatch(out, path);
  return out;
}

/* Bloquear congela la rampa TAL COMO SE VE, retoques incluidos (plan, H2). */
export const lockFamily = (o: Overrides, family: string, ramp: Ramp) => withEntry(o, 'locks', family, { ...ramp });
export const unlockFamily = (o: Overrides, family: string) => withEntry(o, 'locks', family, undefined);

export type RampTweak = { chromaBoost: number; hueShift: number };
export const setRampTweak = (o: Overrides, family: string, tweak: RampTweak) => withEntry(o, 'rampTweaks', family, tweak);
export const clearRampTweak = (o: Overrides, family: string) => withEntry(o, 'rampTweaks', family, undefined);

/* "Variar rampa" (plan, H3). El azar vive AQUÍ, en la interfaz, y lo que sale se guarda: el motor
   sigue siendo puro y la variación se reproduce al reabrir. Mismos rangos que el prototipo
   (croma ×0,90–1,25, tono ±5°), redondeados para que el JSON guardado sea legible. */
export function randomRampTweak(rand: () => number = Math.random): RampTweak {
  return {
    chromaBoost: (90 + Math.round(rand() * 35)) / 100,
    hueShift: Math.round((rand() - 0.5) * 100) / 10,
  };
}

export const setSemanticBase = (o: Overrides, key: SemanticKey, hex: string) => withEntry(o, 'semanticBase', key, hex);
export const clearSemanticBase = (o: Overrides, key: SemanticKey) => withEntry(o, 'semanticBase', key, undefined);

// ── Escalas ──────────────────────────────────────────────────────────────────

type TypeField = keyof Pick<TypeToken, 'size' | 'weight' | 'lineHeight' | 'letterSpacing'>;
export const setTypeOverride = (o: Overrides, key: string, field: TypeField, value: number) =>
  withEntry(o, 'typography', key, { ...o.typography?.[key], [field]: value });
export const clearTypeOverride = (o: Overrides, key: string) => withEntry(o, 'typography', key, undefined);

export const setSpacingOverride = (o: Overrides, name: string, value: number) => withEntry(o, 'spacing', name, value);
export const setRadiusOverride = (o: Overrides, name: string, value: number) => withEntry(o, 'radius', name, value);
export const setRadiusMapOverride = (o: Overrides, component: string, radiusName: string) =>
  withEntry(o, 'radiusMap', component, radiusName);

type ShadowField = keyof Pick<ShadowToken, 'x' | 'y' | 'blur' | 'spread' | 'opacity'>;
export const setShadowOverride = (o: Overrides, name: string, field: ShadowField, value: number) =>
  withEntry(o, 'shadows', name, { ...o.shadows?.[name], [field]: value });

// ── Familias de color ────────────────────────────────────────────────────────

/* Primario y secundario los necesita el motor (derivar, neutros con tinte, semánticos armonizados). */
export const FIXED_FAMILIES = ['primary', 'secondary'] as const;
const isFixed = (family: string) => (FIXED_FAMILIES as readonly string[]).includes(family);

export function addFamily(brand: Brand, hex: string): { brand: Brand; family: string } {
  let n = 1;
  while (Object.hasOwn(brand.colors, `custom${n}`)) n += 1;
  const family = `custom${n}`;
  return { brand: { ...brand, colors: { ...brand.colors, [family]: hex } }, family };
}

/* Mueve las claves de una familia en las tres secciones que la nombran. `to === null` las borra. */
function moveFamilyOverrides(o: Overrides, from: string, to: string | null): Overrides {
  let out = o;
  for (const section of ['locks', 'rampTweaks'] as const) {
    const value = out[section]?.[from];
    if (value === undefined) continue;
    out = withEntry(out, section, from, undefined);
    if (to) out = withEntry(out, section, to, value);
  }
  const prefix = `palette.${from}.`;
  for (const [path, hex] of Object.entries(out.swatches ?? {})) {
    if (!path.startsWith(prefix)) continue;
    out = clearSwatch(out, path);
    if (to) out = setSwatch(out, `palette.${to}.${path.slice(prefix.length)}`, hex);
  }
  return out;
}

export function renameFamily(
  brand: Brand,
  o: Overrides,
  from: string,
  to: string,
): { ok: true; brand: Brand; overrides: Overrides } | { ok: false; error: string } {
  if (from === to) return { ok: true, brand, overrides: o };
  if (isFixed(from)) return { ok: false, error: 'El primario y el secundario no se pueden renombrar.' };
  if (!Object.hasOwn(brand.colors, from)) return { ok: false, error: `No existe la familia "${from}".` };
  if (!familyKeySchema.safeParse(to).success) {
    return { ok: false, error: 'Solo minúsculas, números y guiones, empezando por letra: el nombre acaba en una variable CSS.' };
  }
  if ((RESERVED_FAMILIES as readonly string[]).includes(to)) return { ok: false, error: `"${to}" es un nombre reservado: lo usa el propio motor.` };
  if (Object.hasOwn(brand.colors, to)) return { ok: false, error: `Ya hay una familia llamada "${to}".` };

  /* Se conserva el orden de las familias: renombrar no debería mover la fila en la pantalla. */
  const colors = Object.fromEntries(Object.entries(brand.colors).map(([k, v]) => [k === from ? to : k, v]));
  return { ok: true, brand: { ...brand, colors }, overrides: moveFamilyOverrides(o, from, to) };
}

export function removeFamily(brand: Brand, o: Overrides, family: string): { brand: Brand; overrides: Overrides } {
  if (isFixed(family) || !Object.hasOwn(brand.colors, family)) return { brand, overrides: o };
  const colors = { ...brand.colors };
  delete colors[family];
  return { brand: { ...brand, colors }, overrides: moveFamilyOverrides(o, family, null) };
}
