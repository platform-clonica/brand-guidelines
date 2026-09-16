/* DSMak_r — colores semánticos.

   Portado de AC, zf, qu y nc del prototipo. Ojo con el nombre: "armonizar" NO acerca el tono al del
   primario, lo que hace es mezclar el croma con el suyo (u.C·0,6 + máx(C, 0,06)·0,7). Un primario
   apagado da semánticos apagados; uno saturado, semánticos más vivos. */

import { clamp, hexToOklch, oklchToHex, parseHex, toHex } from './color.ts';
import { buildRamp, type Ramp } from './ramp.ts';

export const SEMANTIC_KEYS = ['success', 'warning', 'error', 'info'] as const;
export type SemanticKey = (typeof SEMANTIC_KEYS)[number];

export const SEMANTIC_HUES: Record<SemanticKey, { h: number; C: number; lShift: number }> = {
  success: { h: 152, C: 0.17, lShift: 0.03 },
  warning: { h: 88, C: 0.17, lShift: 0.15 },
  error: { h: 27, C: 0.2, lShift: 0.02 },
  info: { h: 254, C: 0.18, lShift: 0 },
};

/* Color base de cada semántico, antes de construir su rampa. */
export function semanticBase(key: SemanticKey, primary: string, harmonize: boolean): string {
  const d = SEMANTIC_HUES[key];
  const C = harmonize ? d.C * 0.6 + Math.max(hexToOklch(primary).C, 0.06) * 0.7 : d.C;
  return oklchToHex(0.63 + d.lShift, C, d.h);
}

export function semanticRamp(key: SemanticKey, base: string, highContrast: boolean): Ramp {
  return buildRamp(base, { highContrast, lShift: SEMANTIC_HUES[key].lShift });
}

export function semanticRamps(primary: string, harmonize: boolean, highContrast: boolean): Record<SemanticKey, Ramp> {
  const out = {} as Record<SemanticKey, Ramp>;
  for (const key of SEMANTIC_KEYS) out[key] = semanticRamp(key, semanticBase(key, primary, harmonize), highContrast);
  return out;
}

export const SOFT_STEPS = ['50', '100', '200'] as const;
export type SoftStep = (typeof SOFT_STEPS)[number];
export type SoftScale = Record<SoftStep, string>;

/* Fondos suaves de avisos y estados: dos tintes muy claros y el color tal cual en 200. */
export function softScale(hex: string): SoftScale {
  const { L, C, h } = hexToOklch(hex);
  return {
    '50': oklchToHex(clamp(0.955 + (L - 0.63) * 0.05, 0, 0.99), C * 0.17, h),
    '100': oklchToHex(clamp(0.885 + (L - 0.63) * 0.12, 0, 0.99), C * 0.42, h),
    '200': toHex(parseHex(hex) ?? { r: 0, g: 0, b: 0 }),
  };
}
