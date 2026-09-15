/* DSMak_r — tokens.css (F0 y Af del prototipo), por bloques para copiarlos uno a uno en el paso 4.

   Diferencias con el prototipo:
   - Un `@import` por familia tipográfica (plan, H10).
   - Todo el texto libre se sanea antes de entrar en la hoja: familias tipográficas (dentro de un
     string CSS), nombres de breakpoint y retícula (en comentarios y selectores), y claves de
     componentes, radios y roles de texto (en nombres de variable). Ver ../escape.ts. */

import { radiusCss, shadowCss } from '../engine/resolve.ts';
import { cssComment, cssString, slug } from '../escape.ts';
import { fontStylesheets } from '../fonts.ts';
import type { Tokens } from '../schema.ts';

export type CssBlock = { id: string; title: string; css: string };

const block = (id: string, title: string, lines: string[]): CssBlock => ({ id, title, css: `/* ${title} */\n${lines.join('\n')}` });
const root = (decls: string[]) => [':root {', ...decls, '}'];

export function cssBlocks(tokens: Tokens): CssBlock[] {
  const rampVars = (ramps: Record<string, Record<string, string>>) =>
    Object.entries(ramps).flatMap(([family, ramp]) =>
      Object.entries(ramp).map(([step, hex]) => `  --ds-${slug(family)}-${step}: ${hex};`),
    );

  return [
    block('palette', 'Paleta', root(rampVars(tokens.palette))),
    block('semantic', 'Semánticos', root(rampVars(tokens.semanticScale))),
    block('typography', 'Tipografía', [
      ...fontStylesheets(tokens).map((s) => `@import url("${s.url}");`),
      ...root([
        `  --ds-font-heading: "${cssString(tokens.fonts.heading)}", Georgia, serif;`,
        `  --ds-font-body: "${cssString(tokens.fonts.body)}", system-ui, sans-serif;`,
        ...tokens.typography.flatMap((t) => [
          `  --ds-font-size-${slug(t.key)}: ${t.size}px;`,
          `  --ds-line-height-${slug(t.key)}: ${t.lineHeight}px;`,
          `  --ds-font-weight-${slug(t.key)}: ${t.weight};`,
        ]),
      ]),
      ...tokens.typography.map((t) => {
        const k = slug(t.key);
        return `.ds-${k} { font-family: var(--ds-font-${t.family}); font-size: var(--ds-font-size-${k}); line-height: var(--ds-line-height-${k}); font-weight: var(--ds-font-weight-${k}); letter-spacing: ${t.letterSpacing}px; }`;
      }),
    ]),
    block('spacing', 'Espaciado', root(tokens.spacing.map((s) => `  --ds-space-${slug(s.name)}: ${s.value}px;`))),
    block('radius', 'Radios', [
      ...root(Object.entries(tokens.radius).map(([name, v]) => `  --ds-radius-${slug(name)}: ${radiusCss(v)};`)),
      ...Object.entries(tokens.radiusMap).map(
        ([component, name]) => `.ds-${slug(component)} { border-radius: var(--ds-radius-${slug(name)}); }`,
      ),
    ]),
    block('shadows', 'Sombras', root(tokens.shadows.map((s) => `  --ds-shadow-${slug(s.name)}: ${shadowCss(s)};`))),
    block(
      'breakpoints',
      'Breakpoints',
      tokens.breakpoints.map((b) => `@media (min-width: ${b.min}px) { /* ${cssComment(b.name)} */ }`),
    ),
    block(
      'grid',
      'Retícula',
      tokens.grid.map(
        (g) =>
          `/* ${cssComment(g.name)} */ .ds-grid-${slug(g.name)} { display: grid; grid-template-columns: repeat(${g.columns}, 1fr); gap: ${g.gutter}px; padding-inline: ${g.margin}px; }`,
      ),
    ),
  ];
}

export const exportCss = (tokens: Tokens) => cssBlocks(tokens).map((b) => b.css).join('\n\n');
