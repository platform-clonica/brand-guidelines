/* DSMak_r — tokens resueltos para pintar (ja del prototipo): lo mismo que los tokens, pero indexado
   por nombre y con los valores ya en forma CSS. Es lo que consumen las props de los componentes y
   sus renders de previsualización. */

import type { ShadowToken, Tokens, TypeToken } from '../schema.ts';
import { cssString } from '../escape.ts';
import { rgba } from './color.ts';
import type { Ramp } from './ramp.ts';
import { surfaces, type Surfaces } from './surfaces.ts';

export type ResolvedTokens = {
  s: Surfaces;
  ty: Record<string, TypeToken>;
  sp: Record<string, number>;
  sh: Record<string, string>;
  rad: Record<string, string>;
  dark: boolean;
  heading: string;
  body: string;
  P: Ramp;
  N: Ramp;
  SEC: Ramp;
  ACC: Ramp;
  sem: Tokens['semantic'];
  raw: Tokens;
};

export const shadowCss = (s: ShadowToken) =>
  s.opacity <= 0 ? 'none' : `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${rgba(s.color, s.opacity)}`;

export const radiusCss = (value: number) => (value >= 999 ? '999px' : `${value}px`);

export function resolveTokens(tokens: Tokens, mode: 'light' | 'dark'): ResolvedTokens {
  const P = tokens.palette.primary;
  const SEC = tokens.palette.secondary ?? P;
  return {
    s: surfaces(tokens, mode),
    ty: Object.fromEntries(tokens.typography.map((t) => [t.key, t])),
    sp: Object.fromEntries(tokens.spacing.map((s) => [s.name, s.value])),
    sh: Object.fromEntries(tokens.shadows.map((s) => [s.name, shadowCss(s)])),
    rad: Object.fromEntries(Object.entries(tokens.radius).map(([name, v]) => [name, radiusCss(v)])),
    dark: mode === 'dark',
    heading: `"${cssString(tokens.fonts.heading)}", Georgia, serif`,
    body: `"${cssString(tokens.fonts.body)}", ui-sans-serif, system-ui, sans-serif`,
    P,
    N: tokens.palette.neutral,
    SEC,
    ACC: tokens.palette.accent ?? SEC,
    sem: tokens.semantic,
    raw: tokens,
  };
}
