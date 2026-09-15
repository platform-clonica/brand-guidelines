/* DSMak_r — presets y parámetros por defecto.

   Portado de z2, M2, Vi, RC, Mf, NC, ju, kC, OC, DC, _C, BC y wf del prototipo. Los ids van en
   inglés y en minúscula; las etiquetas, en castellano, que es lo que ve el diseñador. El prototipo
   guardaba la etiqueta visible como valor ("Gris frío", "Subtle"), así que traducir la interfaz
   habría cambiado los datos. */

import type { Brand } from '../schema.ts';

export const RATIOS = [
  { value: 1.067, name: 'Minor Second', desc: 'Muy bajo contraste' },
  { value: 1.125, name: 'Major Second', desc: 'Bajo contraste' },
  { value: 1.2, name: 'Minor Third', desc: 'Equilibrado' },
  { value: 1.25, name: 'Major Third', desc: 'Estándar web' },
  { value: 1.333, name: 'Perfect Fourth', desc: 'Jerarquía marcada' },
  { value: 1.414, name: 'Augmented Fourth', desc: 'Editorial' },
  { value: 1.5, name: 'Perfect Fifth', desc: 'Dramático' },
] as const;

export const BASE_SIZES = [
  { value: 14, label: 'Pequeño' },
  { value: 16, label: 'Mediano' },
  { value: 18, label: 'Grande' },
] as const;

export const RADIUS_NAMES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] as const;
export type RadiusName = (typeof RADIUS_NAMES)[number];

/* 999 = "totalmente redondeado"; el CSS lo escribe como 999px. */
export const RADIUS_PRESETS = {
  sharp: { label: 'Recto', sample: 0, scale: { xs: 0, sm: 0, md: 0, lg: 0, xl: 0, '2xl': 0, full: 0 } },
  subtle: { label: 'Sutil', sample: 4, scale: { xs: 2, sm: 3, md: 4, lg: 6, xl: 8, '2xl': 12, full: 999 } },
  playful: { label: 'Suave', sample: 8, scale: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, '2xl': 24, full: 999 } },
  round: { label: 'Redondeado', sample: 16, scale: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, '2xl': 32, full: 999 } },
  full: { label: 'Píldora', sample: 999, scale: { xs: 8, sm: 12, md: 999, lg: 24, xl: 32, '2xl': 40, full: 999 } },
} as const satisfies Record<string, { label: string; sample: number; scale: Record<RadiusName, number> }>;
export type RadiusStyle = keyof typeof RADIUS_PRESETS;

/* Qué radio usa cada componente por defecto. */
export const RADIUS_MAP: Record<string, RadiusName> = {
  button: 'md', input: 'sm', card: 'lg', modal: 'xl', badge: 'full',
  tooltip: 'sm', checkbox: 'xs', dropdown: 'md', notification: 'md', tag: 'full',
};

export const SHADOW_PRESETS = {
  none: { label: 'Sin sombra', alpha: 0, blur: 0 },
  subtle: { label: 'Sutil', alpha: 0.55, blur: 0.75 },
  medium: { label: 'Media', alpha: 1, blur: 1 },
  pronounced: { label: 'Marcada', alpha: 1.6, blur: 1.4 },
} as const;
export type ShadowPreset = keyof typeof SHADOW_PRESETS;

export const SHADOW_NAMES = ['sm', 'md', 'lg', 'xl'] as const;
export type ShadowName = (typeof SHADOW_NAMES)[number];

export const SHADOW_LEVELS: { name: ShadowName; x: number; y: number; blur: number; spread: number; opacity: number }[] = [
  { name: 'sm', x: 0, y: 1, blur: 2, spread: 0, opacity: 0.05 },
  { name: 'md', x: 0, y: 4, blur: 8, spread: 0, opacity: 0.08 },
  { name: 'lg', x: 0, y: 8, blur: 16, spread: -2, opacity: 0.1 },
  { name: 'xl', x: 0, y: 12, blur: 24, spread: -4, opacity: 0.12 },
];

export const DENSITY = {
  compact: { label: 'Compacta', factor: 0.75 },
  regular: { label: 'Normal', factor: 1 },
  relaxed: { label: 'Holgada', factor: 1.35 },
} as const;
export type Density = keyof typeof DENSITY;

export const SPACING_NAMES = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
export type SpaceName = (typeof SPACING_NAMES)[number];
export const SPACING_MULTIPLIERS = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];

/* Roles de texto. `step` es el exponente de la escala modular; `weightRole` dice de qué peso de
   `brand.weights` sale el grosor. En el prototipo el peso estaba fijo (700/600/400), lo que con la
   plantilla Interactius daba IBM Plex Serif a 700: fuera de la norma (plan, H6). */
export const TYPE_ROLES = [
  { key: 'display-xl', label: 'Display XL', preview: 'Display extra grande', step: 7, weightRole: 'display', lh: 1.1, family: 'heading' },
  { key: 'display-l', label: 'Display L', preview: 'Display grande', step: 6, weightRole: 'display', lh: 1.1, family: 'heading' },
  { key: 'h1', label: 'H1', preview: 'Titular grande', step: 5, weightRole: 'display', lh: 1.2, family: 'heading' },
  { key: 'h2', label: 'H2', preview: 'Titular medio', step: 4, weightRole: 'display', lh: 1.25, family: 'heading' },
  { key: 'h3', label: 'H3', preview: 'Titular pequeño', step: 3, weightRole: 'heading', lh: 1.3, family: 'heading' },
  { key: 'h4', label: 'H4', preview: 'Subtítulo grande', step: 2, weightRole: 'heading', lh: 1.35, family: 'heading' },
  { key: 'h5', label: 'H5', preview: 'Subtítulo medio', step: 1, weightRole: 'heading', lh: 1.4, family: 'heading' },
  { key: 'h6', label: 'H6', preview: 'Subtítulo pequeño', step: 0.5, weightRole: 'heading', lh: 1.4, family: 'heading' },
  { key: 'body-m', label: 'Body M', preview: 'Texto', step: 0, weightRole: 'body', lh: 1.55, family: 'body' },
  { key: 'body-s', label: 'Body S', preview: 'Texto pequeño', step: -1, weightRole: 'body', lh: 1.5, family: 'body' },
  { key: 'caption', label: 'Caption', preview: 'Leyenda', step: -2, weightRole: 'body', lh: 1.4, family: 'body' },
] as const;
export type TypeKey = (typeof TYPE_ROLES)[number]['key'];

export const DEFAULT_BREAKPOINTS = [
  { name: 'Mobile', min: 0, max: 767 },
  { name: 'Tablet', min: 768, max: 1023 },
  { name: 'Desktop', min: 1024, max: 1439 },
  { name: 'Wide', min: 1440, max: null },
];

export const DEFAULT_GRID = [
  { name: 'Mobile', columns: 4, margin: 16, gutter: 16 },
  { name: 'Tablet', columns: 8, margin: 24, gutter: 20 },
  { name: 'Desktop', columns: 12, margin: 40, gutter: 24 },
  { name: 'Wide', columns: 12, margin: 80, gutter: 24 },
];

/* Los valores de partida del prototipo (wf). No son la marca Interactius: esa es lib/ds/template.ts. */
export function defaultBrand(): Brand {
  return {
    name: '',
    client: null,
    mode: 'both',
    highContrast: false,
    colors: { primary: '#0E9F8C', secondary: '#E5117F' },
    neutralPreset: 'cool',
    harmonize: true,
    fonts: { heading: 'IBM Plex Serif', body: 'IBM Plex Mono' },
    weights: { display: 700, heading: 600, body: 400 },
    baseSize: 16,
    ratio: 1.25,
    shadow: 'medium',
    radiusStyle: 'subtle',
    spacingUnit: 8,
    density: 'regular',
    breakpoints: DEFAULT_BREAKPOINTS.map((b) => ({ ...b })),
    grid: DEFAULT_GRID.map((g) => ({ ...g })),
  };
}
