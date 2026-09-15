/* DSMak_r — contraste WCAG 2.x.

   Portado de T2, H0, wl y Ka del prototipo, con dos cambios deliberados (ver
   docs/features/ds-mak-r-plan.md, H5):
   - El nivel entre 3 y 4,5 se llama `AA-large`, que es lo que es en WCAG: AA solo para texto grande.
     El prototipo lo llamaba "AA+", que sugiere justo lo contrario.
   - El ratio se TRUNCA a un decimal. Redondeado, 4,4781 se mostraba como "4.5" con nivel AA+: un
     número que parece aprobar al lado de un nivel que suspende. */

import { parseHex, toLinear } from './color.ts';

export type ContrastLevel = 'AAA' | 'AA' | 'AA-large' | 'fail';

export const TEXT_LIGHT = '#FFFFFF';
export const TEXT_DARK = '#111111';

export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex) ?? { r: 0, g: 0, b: 0 };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const levelFor = (ratio: number): ContrastLevel =>
  ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA-large' : 'fail';

/* Color de texto recomendado sobre una muestra: el que más contraste da de los dos. */
export const textOn = (hex: string) =>
  contrastRatio(hex, TEXT_LIGHT) >= contrastRatio(hex, TEXT_DARK) ? TEXT_LIGHT : TEXT_DARK;

export function rateContrast(hex: string): { ratio: number; level: ContrastLevel; on: string } {
  const on = textOn(hex);
  const raw = contrastRatio(hex, on);
  return { ratio: Math.floor(raw * 10) / 10, level: levelFor(raw), on };
}
