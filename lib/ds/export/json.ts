/* DSMak_r — tokens.json (A2 y F6 del prototipo).

   Diferencias con el prototipo:
   - `generatedAt` entra como parámetro: la salida es determinista y se puede testear.
   - `meta.engineVersion`, para saber con qué motor se generó un archivo que ya está en manos de un
     cliente.
   - `meta.fonts` es una lista de hojas, una por familia (plan, H10), en vez de una sola URL.
   - `radiusMap` va al mismo nivel que `radius`. El prototipo lo metía dentro como `componentMap`,
     mezclando la escala con el mapa por componente. */

import { COMPONENTS, resolveProps } from '../components.ts';
import { ENGINE_VERSION } from '../engine/version.ts';
import { rateContrast, type ContrastLevel } from '../engine/contrast.ts';
import { radiusCss, resolveTokens, shadowCss } from '../engine/resolve.ts';
import { slug } from '../escape.ts';
import { fontStylesheets } from '../fonts.ts';
import type { Configs, Mode, ShadowToken, Tokens } from '../schema.ts';

export type ColorEntry = { value: string; contrast: number; level: ContrastLevel; on: string };

export type DsJson = {
  meta: {
    name: string;
    generatedAt: string;
    engineVersion: string;
    modes: Mode;
    highContrast: boolean;
    fonts: { family: string; url: string }[];
  };
  color: Record<string, Record<string, ColorEntry>>;
  typography: Record<string, { fontFamily: string; fontSize: string; fontWeight: number; lineHeight: string; letterSpacing: string }>;
  spacing: Record<string, { value: string; rem: string }>;
  radius: Record<string, { value: string }>;
  radiusMap: Record<string, string>;
  shadow: Record<string, ShadowToken & { value: string }>;
  breakpoint: Record<string, { min: string; max: string | null }>;
  grid: Record<string, { columns: number; margin: string; gutter: string }>;
  components: Record<
    string,
    {
      name: string;
      variants: string[] | null;
      intentions: string[] | null;
      sizes: string[] | null;
      states: string[] | null;
      selected: { variant: string | null; intention: string | null; size: string | null; state: string | null };
      anatomy: Record<string, string | boolean>;
      tokens: Record<string, number | string>;
      note: string | null;
    }
  >;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

const rated = (ramp: Record<string, string>): Record<string, ColorEntry> =>
  Object.fromEntries(
    Object.entries(ramp).map(([step, value]) => {
      const { ratio, level, on } = rateContrast(value);
      return [step, { value, contrast: ratio, level, on }];
    }),
  );

export function exportJson(tokens: Tokens, opts: { name: string; generatedAt: string; configs: Configs }): DsJson {
  const resolved = resolveTokens(tokens, 'light');
  const components: DsJson['components'] = {};
  for (const spec of COMPONENTS) {
    const config = opts.configs[spec.key];
    if (!config) continue;
    components[spec.key] = {
      name: spec.name,
      variants: spec.variants,
      intentions: spec.intentions,
      sizes: spec.sizes,
      states: spec.states,
      selected: { variant: config.variant, intention: config.intention, size: config.size, state: config.state },
      anatomy: config.anatomy,
      tokens: resolveProps(spec, resolved, config),
      note: config.note || null,
    };
  }

  return {
    meta: {
      name: opts.name.trim() || 'Design system',
      generatedAt: opts.generatedAt,
      engineVersion: ENGINE_VERSION,
      modes: tokens.modes,
      highContrast: tokens.highContrast,
      fonts: fontStylesheets(tokens),
    },
    color: {
      ...Object.fromEntries(Object.entries(tokens.palette).map(([family, ramp]) => [family, rated(ramp)])),
      ...Object.fromEntries(Object.entries(tokens.semanticScale).map(([key, scale]) => [key, rated(scale)])),
    },
    typography: Object.fromEntries(
      tokens.typography.map((t) => [
        t.key,
        {
          fontFamily: t.family === 'heading' ? tokens.fonts.heading : tokens.fonts.body,
          fontSize: `${t.size}px`,
          fontWeight: t.weight,
          lineHeight: `${t.lineHeight}px`,
          letterSpacing: `${t.letterSpacing}px`,
        },
      ]),
    ),
    spacing: Object.fromEntries(tokens.spacing.map((s) => [s.name, { value: `${s.value}px`, rem: `${round2(s.value / 16)}rem` }])),
    radius: Object.fromEntries(Object.entries(tokens.radius).map(([name, v]) => [name, { value: radiusCss(v) }])),
    radiusMap: { ...tokens.radiusMap },
    shadow: Object.fromEntries(tokens.shadows.map((s) => [s.name, { value: shadowCss(s), ...s }])),
    breakpoint: Object.fromEntries(
      tokens.breakpoints.map((b) => [slug(b.name), { min: `${b.min}px`, max: b.max === null ? null : `${b.max}px` }]),
    ),
    grid: Object.fromEntries(
      tokens.grid.map((g) => [slug(g.name), { columns: g.columns, margin: `${g.margin}px`, gutter: `${g.gutter}px` }]),
    ),
    components,
  };
}
