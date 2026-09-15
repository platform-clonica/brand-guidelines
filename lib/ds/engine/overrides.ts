/* DSMak_r — overrides: el parche disperso sobre la salida del motor (plan, H1–H3).

   No existe en el prototipo: allí el paso 2 editaba los tokens a pelo y "Generar" los pisaba
   enteros, bloqueos incluidos. Aquí los tokens son SIEMPRE `applyOverrides(generateTokens(brand))`,
   así que volver al paso 1 no borra lo editado a mano.

   Orden de aplicación, y por qué:
   1. rampTweaks y semanticBase — rehacen rampas enteras, así que van antes que cualquier retoque.
   2. swatches de paleta y semánticos — retoques de una muestra.
   3. locks — congelan la familia entera: ganan a los retoques de esa misma familia.
   4. escalas suaves — se rehacen desde el 500 semántico final, y luego sus propios swatches.
   5. tipografía, espaciado, radios, mapa de radios, sombras. El color de las sombras sigue al
      neutro 900 FINAL, esté bloqueado o editado.

   Lo que apunta a algo que no existe NO lanza y NO se borra: se ignora y se devuelve en `orphans`,
   para que compileSystem lo cuente como incidencia. */

import type { Brand, Overrides, Tokens } from '../schema.ts';
import { buildRamp } from './ramp.ts';
import { SEMANTIC_KEYS, semanticRamp, softScale, type SemanticKey } from './semantic.ts';

const has = (obj: object | undefined, key: string) => !!obj && Object.hasOwn(obj, key);
const isSemantic = (key: string): key is SemanticKey => (SEMANTIC_KEYS as readonly string[]).includes(key);

/* Copia solo las claves definidas: un parche `{ size: undefined }` no puede borrar un valor. */
function assignDefined<T extends object>(target: T, patch: Partial<T>) {
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) (target as Record<string, unknown>)[k] = v;
}

export function applyOverrides(base: Tokens, brand: Brand, overrides: Overrides): { tokens: Tokens; orphans: string[] } {
  const t = structuredClone(base);
  const orphans: string[] = [];
  const highContrast = t.highContrast;

  for (const [family, tweak] of Object.entries(overrides.rampTweaks ?? {})) {
    const hex = has(brand.colors, family) ? brand.colors[family] : undefined;
    if (!hex || !has(t.palette, family)) orphans.push(`rampTweaks.${family}`);
    else t.palette[family] = buildRamp(hex, { highContrast, ...tweak });
  }

  for (const [key, hex] of Object.entries(overrides.semanticBase ?? {})) {
    if (!isSemantic(key) || !hex) orphans.push(`semanticBase.${key}`);
    else t.semantic[key] = semanticRamp(key, hex, highContrast);
  }

  const scaleSwatches: [string, string][] = [];
  for (const [path, hex] of Object.entries(overrides.swatches ?? {})) {
    const parts = path.split('.');
    const [group, name, step] = parts;
    if (parts.length === 3 && group === 'semanticScale') {
      scaleSwatches.push([path, hex]);
      continue;
    }
    const ramp =
      parts.length !== 3 ? undefined
      : group === 'palette' && has(t.palette, name) ? t.palette[name]
      : group === 'semantic' && isSemantic(name) ? t.semantic[name]
      : undefined;
    if (!ramp || !has(ramp, step)) orphans.push(`swatches.${path}`);
    else (ramp as Record<string, string>)[step] = hex;
  }

  for (const [family, ramp] of Object.entries(overrides.locks ?? {})) {
    if (!has(t.palette, family)) orphans.push(`locks.${family}`);
    else t.palette[family] = { ...ramp };
  }

  for (const key of SEMANTIC_KEYS) t.semanticScale[key] = softScale(t.semantic[key]['500']);
  for (const [path, hex] of scaleSwatches) {
    const [, name, step] = path.split('.');
    const scale = isSemantic(name) ? t.semanticScale[name] : undefined;
    if (!scale || !has(scale, step)) orphans.push(`swatches.${path}`);
    else (scale as Record<string, string>)[step] = hex;
  }

  for (const [key, patch] of Object.entries(overrides.typography ?? {})) {
    const token = t.typography.find((x) => x.key === key);
    if (!token) orphans.push(`typography.${key}`);
    else assignDefined(token, patch);
  }

  for (const [name, value] of Object.entries(overrides.spacing ?? {})) {
    const token = t.spacing.find((x) => x.name === name);
    if (!token) orphans.push(`spacing.${name}`);
    else token.value = value;
  }

  for (const [name, value] of Object.entries(overrides.radius ?? {})) {
    if (!has(t.radius, name)) orphans.push(`radius.${name}`);
    else t.radius[name] = value;
  }

  for (const [component, radiusName] of Object.entries(overrides.radiusMap ?? {})) {
    if (!has(t.radius, radiusName)) orphans.push(`radiusMap.${component}`);
    else t.radiusMap[component] = radiusName;
  }

  const shadowColor = t.palette.neutral?.['900'];
  if (shadowColor) for (const s of t.shadows) s.color = shadowColor;
  for (const [name, patch] of Object.entries(overrides.shadows ?? {})) {
    const token = t.shadows.find((x) => x.name === name);
    if (!token) orphans.push(`shadows.${name}`);
    else assignDefined(token, patch);
  }

  return { tokens: t, orphans };
}
