/* DSMak_r — superficies resueltas para claro y oscuro (Rl del prototipo). Todo sale de los neutros. */

import type { Tokens } from '../schema.ts';
import { clamp, hexToOklch, oklchToHex } from './color.ts';

export type Surfaces = {
  canvas: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  inverted: string;
};

export function surfaces(tokens: Tokens, mode: 'light' | 'dark'): Surfaces {
  const n = tokens.palette.neutral;
  if (mode === 'dark') {
    const deep = hexToOklch(n['900']);
    return {
      canvas: n['900'],
      surface: oklchToHex(clamp(deep.L + 0.05, 0, 1), deep.C, deep.h),
      surfaceAlt: n['800'],
      border: n['700'],
      text: n['50'],
      textMuted: n['300'],
      inverted: n['900'],
    };
  }
  return {
    canvas: n['50'],
    surface: '#FFFFFF',
    surfaceAlt: n['100'],
    border: n['200'],
    text: n['900'],
    textMuted: n['600'],
    inverted: '#FFFFFF',
  };
}
