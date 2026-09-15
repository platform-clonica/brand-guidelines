/* DSMak_r — el motor: parámetros de marca → tokens completos.

   Portado de L0 del prototipo. Diferencias deliberadas:
   - Los pesos tipográficos salen de `brand.weights` (plan, H6).
   - No hay `locks` en los tokens: los bloqueos son overrides y los aplica ./overrides.ts (plan, H2).
   - Los tokens de texto no llevan etiqueta ni frase de muestra: eso es interfaz y vive en
     TYPE_ROLES (./presets.ts).
   Función pura: sin fecha, sin azar, sin mutar la entrada. */

import type { Brand, Tokens } from '../schema.ts';
import { buildRamp, neutralRamp, type Ramp } from './ramp.ts';
import { SEMANTIC_KEYS, semanticRamps, softScale, type SemanticKey, type SoftScale } from './semantic.ts';
import {
  DENSITY,
  RADIUS_MAP,
  RADIUS_PRESETS,
  SHADOW_LEVELS,
  SHADOW_PRESETS,
  SPACING_MULTIPLIERS,
  SPACING_NAMES,
  TYPE_ROLES,
} from './presets.ts';

const round2 = (v: number) => Math.round(v * 100) / 100;

/* Exponente efectivo de la escala modular: los pasos negativos se suavizan y los altos se comprimen,
   para que un ratio grande no dispare el display a tamaños inusables. */
const compressStep = (step: number) => (step <= 0 ? step * 0.6 : step <= 3 ? step : 3 + (step - 3) * 0.72);

export function generateTokens(brand: Brand): Tokens {
  const highContrast = !!brand.highContrast;
  const primary = brand.colors.primary;

  const palette: Record<string, Ramp> = {};
  for (const [family, hex] of Object.entries(brand.colors)) palette[family] = buildRamp(hex, { highContrast });
  palette.neutral = neutralRamp(brand.neutralPreset, primary, highContrast);

  const semantic = semanticRamps(primary, brand.harmonize, highContrast);
  const semanticScale = {} as Record<SemanticKey, SoftScale>;
  for (const key of SEMANTIC_KEYS) semanticScale[key] = softScale(semantic[key]['500']);

  const typography = TYPE_ROLES.map((role) => {
    const size = Math.max(10, Math.round(brand.baseSize * Math.pow(brand.ratio, compressStep(role.step))));
    return {
      key: role.key,
      family: role.family,
      size,
      weight: brand.weights[role.weightRole],
      lineHeight: Math.round(size * role.lh),
      letterSpacing: size >= 32 ? -1 : size >= 24 ? -0.5 : 0,
    };
  });

  const density = (DENSITY[brand.density] ?? DENSITY.regular).factor;
  const spacing = SPACING_MULTIPLIERS.map((m, i) => ({
    name: SPACING_NAMES[i],
    value: Math.max(2, Math.round((brand.spacingUnit * m * density) / 2) * 2),
  }));

  const shadow = SHADOW_PRESETS[brand.shadow] ?? SHADOW_PRESETS.medium;
  const shadowColor = palette.neutral['900'];
  const shadows = SHADOW_LEVELS.map((level) => ({
    name: level.name,
    x: level.x,
    y: Math.round(level.y * (shadow.blur || 0.001)),
    blur: Math.round(level.blur * (shadow.blur || 0.001)),
    spread: level.spread,
    color: shadowColor,
    opacity: round2(level.opacity * shadow.alpha),
  }));

  return {
    palette,
    semantic,
    semanticScale,
    typography,
    spacing,
    radius: { ...(RADIUS_PRESETS[brand.radiusStyle] ?? RADIUS_PRESETS.subtle).scale },
    radiusMap: { ...RADIUS_MAP },
    shadows,
    breakpoints: brand.breakpoints.map((b) => ({ ...b })),
    grid: brand.grid.map((g) => ({ ...g })),
    fonts: { ...brand.fonts },
    modes: brand.mode,
    highContrast,
  };
}
