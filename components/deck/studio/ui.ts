import type { CSSProperties } from 'react';

/* Shared inline styles for the Deck Maker chrome (toolbar + modals).
   Values are taken verbatim from the existing DeckStudio styling and the brand UI Kit:
   dark #1C1A17, warm-light #F5F2ED, warm-dark border #E0DAD2, ash #75706B, IBM Plex Mono.
   No new brand tokens — only composition of what already exists. */

const MONO = 'var(--font-ibm-plex-mono, monospace)';

export const colors = {
  dark: '#1C1A17',
  warmLight: '#F5F2ED',
  warmDark: '#E0DAD2',
  ash: '#75706B',
  white: '#fff',
  brick: '#C24B36',
  /* Añadidos con IMG_r para no escribir hex a mano en los componentes. Mismos valores que
     lib/tokens.ts; lib/__tests__/studioColors.test.ts avisa si se separan. Burdeos, solo como alerta:
     es su `uiRole`. */
  grey: '#E8E6E3',
  ashDark: '#46433F',
  bordeaux: '#99335F',
} as const;

export const btn: CSSProperties = {
  appearance: 'none', border: `1px solid ${colors.dark}`, background: colors.dark, color: colors.warmLight,
  font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', padding: '10px 12px', cursor: 'pointer',
};
export const btnGhost: CSSProperties = { ...btn, background: 'transparent', color: colors.dark };
export const btnDanger: CSSProperties = { ...btn, border: `1px solid ${colors.bordeaux}`, background: 'transparent', color: colors.bordeaux };

export const toolbarBtn: CSSProperties = {
  appearance: 'none', border: `1px solid ${colors.warmDark}`, background: colors.white, color: colors.dark,
  font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', padding: '9px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
};

export const seg: CSSProperties = {
  flex: 1, padding: '7px 6px', border: `1px solid ${colors.warmDark}`, background: 'transparent', color: colors.ash,
  font: `500 10px/1 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
};
/* `border` completo, no `borderColor`: `seg` fija el shorthand, y pisarlo con la propiedad larga
   mezcla las dos formas. Al apagar el segmento React quita `borderColor` y deja el `border`
   original — de ahí el aviso "Removing a style property during rerender". Mismo píxel, sin mezcla. */
export const segOn: CSSProperties = {
  background: colors.dark,
  color: colors.warmLight,
  border: `1px solid ${colors.dark}`,
};

export const label: CSSProperties = {
  display: 'block', font: `500 10px/1.4 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase', color: colors.ash, marginBottom: 6,
};
export const input: CSSProperties = {
  width: '100%', padding: '10px 12px', border: `1px solid ${colors.warmDark}`, background: colors.white,
  font: `400 13px/1.4 ${MONO}`, color: colors.dark,
};
export const field: CSSProperties = { marginBottom: 14 };

export const overlay: CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(28,26,23,.28)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};
export const card: CSSProperties = {
  width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: colors.warmLight,
  border: `1px solid ${colors.dark}`, padding: 28,
};
export const cardTitle: CSSProperties = {
  font: `600 13px/1.3 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', color: colors.dark, marginBottom: 20,
};

export const menuPanel: CSSProperties = {
  position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 70, width: 360, maxHeight: 420, overflowY: 'auto',
  background: colors.white, border: `1px solid ${colors.dark}`,
};
export const menuRow: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${colors.warmDark}`,
};
export const menuRowMain: CSSProperties = {
  flex: 1, minWidth: 0, textAlign: 'left', appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
  font: `500 11px/1.4 ${MONO}`, color: colors.dark,
};
export const menuMeta: CSSProperties = { font: `400 10px/1.4 ${MONO}`, color: colors.ash, marginTop: 2 };
export const iconBtn: CSSProperties = {
  appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', color: colors.ash,
  font: `500 12px/1 ${MONO}`, padding: 4,
};

/* Enlace de acción: las CTA de página y de detalle de IMG_r («Quitar filtros», «Descargar original»…).
   El subrayado, la opacidad y el barrido al pasar los pone la clase canónica `.hover-wipe-underline` de
   app/globals.css, que se aplica junto a esto; aquí solo va la tipografía y el reseteo de botón. */
export const linkBtn: CSSProperties = {
  appearance: 'none', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
  font: `500 12px/1.2 ${MONO}`, color: colors.dark,
};
export const linkDanger: CSSProperties = { ...linkBtn, color: colors.bordeaux };

/* Se lee con lector de pantalla pero no se ve. */
export const srOnly: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
};
