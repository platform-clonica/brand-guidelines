/* DSMak_r — avisos de contraste (plan, H5). No existían en el prototipo: `Ka` solo medía cada
   muestra contra su mejor color de texto, nunca contra el fondo.

   Dos comprobaciones, las dos por debajo de 4,5:1 (AA para texto normal):
   - `color-on-canvas`: el primario TAL COMO LO DA EL CLIENTE sobre el lienzo de cada modo activo.
     Se mide el color de entrada y no el escalón 500 porque el 500 de cualquier rampa cae en L≈0,63 y
     sobre un fondo casi blanco no llega nunca: avisaría siempre y no diría nada.
   - `text-on-swatch`: el mejor texto posible sobre los escalones de acción del primario
     (500/600/700, los que usan botones y enlaces).
   El ratio va truncado, igual que en `rateContrast`: un aviso nunca puede mostrar "4.5". */

import type { Brand, Mode, Tokens } from '../schema.ts';
import { contrastRatio, rateContrast } from './contrast.ts';
import { surfaces } from './surfaces.ts';

export type ContrastWarning = {
  kind: 'color-on-canvas' | 'text-on-swatch';
  /** Qué se está midiendo: `colors.primary` o `palette.primary.600`. */
  path: string;
  mode: Mode;
  ratio: number;
  color: string;
  against: string;
};

const AA = 4.5;
const ACTION_STEPS = ['500', '600', '700'] as const;
const truncate = (ratio: number) => Math.floor(ratio * 10) / 10;

export function contrastWarnings(tokens: Tokens, brand: Brand): ContrastWarning[] {
  const out: ContrastWarning[] = [];
  const modes: ('light' | 'dark')[] = tokens.modes === 'both' ? ['light', 'dark'] : [tokens.modes];
  const primary = brand.colors.primary;

  for (const mode of modes) {
    const canvas = surfaces(tokens, mode).canvas;
    const ratio = contrastRatio(primary, canvas);
    if (ratio < AA) out.push({ kind: 'color-on-canvas', path: 'colors.primary', mode, ratio: truncate(ratio), color: primary, against: canvas });
  }

  for (const step of ACTION_STEPS) {
    const hex = tokens.palette.primary?.[step];
    if (!hex) continue;
    const rating = rateContrast(hex);
    if (rating.level !== 'AA' && rating.level !== 'AAA') {
      out.push({ kind: 'text-on-swatch', path: `palette.primary.${step}`, mode: tokens.modes, ratio: rating.ratio, color: hex, against: rating.on });
    }
  }

  return out;
}
