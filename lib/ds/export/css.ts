/* DSMak_r — tokens.css (F0 y Af del prototipo), por bloques para copiarlos uno a uno en el paso 4.

   Diferencias con el prototipo:
   - Un `@import` por familia tipográfica (plan, H10).
   - Todo el texto libre se sanea antes de entrar en la hoja: familias tipográficas (dentro de un
     string CSS), nombres de breakpoint y retícula (en comentarios y selectores), y claves de
     componentes, radios y roles de texto (en nombres de variable). Ver ../escape.ts.

   Las variables salen de `tokenVariables`, que también usa la previsualización del editor
   (../preview.ts): lo que se ve en pantalla y lo que se entrega declaran los mismos nombres. */

import { radiusCss, shadowCss } from '../engine/resolve.ts';
import { cssComment, cssString, slug } from '../escape.ts';
import { fontStylesheets } from '../fonts.ts';
import type { Tokens } from '../schema.ts';

export type CssBlock = { id: string; title: string; css: string };
export type CssDecl = [name: string, value: string];

const block = (id: string, title: string, lines: string[]): CssBlock => ({ id, title, css: `/* ${title} */\n${lines.join('\n')}` });
const root = (decls: CssDecl[]) => [':root {', ...decls.map(([name, value]) => `  ${name}: ${value};`), '}'];

const rampVars = (ramps: Record<string, Record<string, string>>): CssDecl[] =>
  Object.entries(ramps).flatMap(([family, ramp]) =>
    Object.entries(ramp).map(([step, hex]): CssDecl => [`--ds-${slug(family)}-${step}`, hex]),
  );

/* Las variables `:root` de la hoja, agrupadas por bloque. */
export function tokenVariables(tokens: Tokens) {
  return {
    palette: rampVars(tokens.palette),
    semantic: rampVars(tokens.semanticScale),
    typography: [
      ['--ds-font-heading', `"${cssString(tokens.fonts.heading)}", Georgia, serif`],
      ['--ds-font-body', `"${cssString(tokens.fonts.body)}", system-ui, sans-serif`],
      ...tokens.typography.flatMap((t): CssDecl[] => [
        [`--ds-font-size-${slug(t.key)}`, `${t.size}px`],
        [`--ds-line-height-${slug(t.key)}`, `${t.lineHeight}px`],
        [`--ds-font-weight-${slug(t.key)}`, `${t.weight}`],
      ]),
    ] as CssDecl[],
    spacing: tokens.spacing.map((s): CssDecl => [`--ds-space-${slug(s.name)}`, `${s.value}px`]),
    radius: Object.entries(tokens.radius).map(([name, v]): CssDecl => [`--ds-radius-${slug(name)}`, radiusCss(v)]),
    shadows: tokens.shadows.map((s): CssDecl => [`--ds-shadow-${slug(s.name)}`, shadowCss(s)]),
  };
}

export function cssBlocks(tokens: Tokens): CssBlock[] {
  const vars = tokenVariables(tokens);

  return [
    block('palette', 'Paleta', root(vars.palette)),
    block('semantic', 'Semánticos', root(vars.semantic)),
    block('typography', 'Tipografía', [
      ...fontStylesheets(tokens).map((s) => `@import url("${s.url}");`),
      ...root(vars.typography),
      ...tokens.typography.map((t) => {
        const k = slug(t.key);
        return `.ds-${k} { font-family: var(--ds-font-${t.family}); font-size: var(--ds-font-size-${k}); line-height: var(--ds-line-height-${k}); font-weight: var(--ds-font-weight-${k}); letter-spacing: ${t.letterSpacing}px; }`;
      }),
    ]),
    block('spacing', 'Espaciado', root(vars.spacing)),
    block('radius', 'Radios', [
      ...root(vars.radius),
      ...Object.entries(tokens.radiusMap).map(
        ([component, name]) => `.ds-${slug(component)} { border-radius: var(--ds-radius-${slug(name)}); }`,
      ),
    ]),
    block('shadows', 'Sombras', root(vars.shadows)),
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
