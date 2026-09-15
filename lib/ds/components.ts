/* DSMak_r — catálogo de los 17 componentes base. SOLO DATOS.

   Portado de Tn, be, ot, N2, to, eo y lc del prototipo, sin los `render` (JSX): esos van a
   components/ds/previews/ en el bloque 5c. Así el catálogo se puede usar desde node y desde los tests.

   Cambio respecto al prototipo en `props`: allí se guardaban las props CALCULADAS, que se quedaban
   viejas al cambiar los tokens (por eso tenía un botón "regenerar componente"). Aquí la configuración
   guarda solo lo que el diseñador ha tocado, y el resto se calcula siempre desde los tokens y la talla.

   Los valores de los ejes (Primary, Hover, Solid) son vocabulario técnico de design system y se
   conservan como en el prototipo. Las etiquetas de la anatomía ya estaban en castellano. */

import type { ComponentConfig } from './schema.ts';
import type { ResolvedTokens } from './engine/resolve.ts';

export type AnatomyOption =
  | { label: string; type: 'select'; options: string[]; def: string }
  | { label: string; type: 'bool'; def: boolean };

export type ComponentProps = Record<string, number | string>;

export type ComponentSpec = {
  key: string;
  name: string;
  variants: string[] | null;
  intentions: string[] | null;
  sizes: string[] | null;
  states: string[] | null;
  /** El modal no se previsualiza por ejes: su talla cambia el lienzo entero. */
  previewAxis?: 'none';
  anatomy: Record<string, AnatomyOption>;
  props: (t: ResolvedTokens, scale: number) => ComponentProps;
  propMeta: Record<string, string>;
};

const select = (label: string, options: string[], def: string): AnatomyOption => ({ label, type: 'select', options, def });
const bool = (label: string, def: boolean): AnatomyOption => ({ label, type: 'bool', def });
const r = Math.round;

/* Multiplicador de las props por talla. Las tallas del modal no están: su escala es 1. */
export const SIZE_SCALE: Record<string, number> = { SM: 0.86, MD: 1, LG: 1.14 };

const PAD = { padX: 'Padding X', padY: 'Padding Y', gap: 'Gap', fontSize: 'Font size' };

export const COMPONENTS: ComponentSpec[] = [
  {
    key: 'accordion', name: 'Accordion',
    variants: ['Bordered', 'Separated Cards', 'Flush'], intentions: null, sizes: null,
    states: ['Collapsed', 'Expanded', 'Hover', 'Disabled'],
    anatomy: {
      iconSide: select('Posición del icono', ['Derecha', 'Izquierda'], 'Derecha'),
      iconType: select('Tipo de icono', ['Chevron', 'Plus / Minus'], 'Chevron'),
    },
    props: (t) => ({ padX: t.sp.md, padY: t.sp.sm, gap: t.sp.xs, iconSize: 14 }),
    propMeta: { padX: PAD.padX, padY: PAD.padY, gap: PAD.gap, iconSize: 'Tamaño icono' },
  },
  {
    key: 'badge', name: 'Badge',
    variants: ['Solid', 'Soft / Subtle', 'Outline'],
    intentions: ['Neutral', 'Primary', 'Success', 'Warning', 'Error', 'Info'],
    sizes: ['SM', 'MD'], states: null,
    anatomy: {
      anatomy: select('Anatomía', ['Solo texto', 'Punto + texto', 'Solo punto', 'Con cierre (X)'], 'Solo texto'),
      shape: select('Forma', ['Full', 'Sharp'], 'Full'),
    },
    props: (t, e) => ({
      padX: r(t.sp.xs * e * 1.4), padY: r(t.sp['3xs'] * e), gap: r(t.sp['3xs'] * e * 1.2), fontSize: r(t.ty.caption.size * e),
    }),
    propMeta: PAD,
  },
  {
    key: 'button', name: 'Button',
    variants: ['Primary', 'Secondary', 'Tertiary', 'Destructive'], intentions: null,
    sizes: ['SM', 'MD', 'LG'], states: ['Default', 'Hover', 'Focus', 'Active', 'Disabled', 'Loading'],
    anatomy: {
      icon: select('Icono', ['Ninguno', 'Izquierda', 'Derecha', 'Solo icono'], 'Ninguno'),
      width: select('Ancho', ['Hug', 'Full width'], 'Hug'),
    },
    props: (t, e) => ({
      padX: r(t.sp.sm * e * 1.6), padY: r(t.sp.xs * e), gap: r(t.sp.xs * e * 0.75),
      fontSize: r(t.ty['body-s'].size * e), iconSize: r(t.ty['body-s'].size * e), radiusToken: 'md',
    }),
    propMeta: { ...PAD, iconSize: 'Tamaño icono', radiusToken: 'Radio (token)' },
  },
  {
    key: 'checkbox', name: 'Checkbox',
    variants: null, intentions: null, sizes: ['SM', 'MD'],
    states: ['Unchecked', 'Checked', 'Indeterminate', 'Hover', 'Focus', 'Disabled', 'Error'],
    anatomy: {
      layout: select('Layout', ['Control izquierda', 'Control derecha'], 'Control izquierda'),
      helper: bool('Texto de ayuda', false),
      check: select('Estilo del check', ['Grueso', 'Fino'], 'Grueso'),
    },
    props: (t, e) => ({ size: r(18 * e), radius: 3, borderWidth: 1.5, gap: r(t.sp.xs * e), fontSize: r(t.ty['body-s'].size * e) }),
    propMeta: { size: 'Tamaño', radius: 'Border radius', borderWidth: 'Border width', gap: PAD.gap, fontSize: PAD.fontSize },
  },
  {
    key: 'dropdown', name: 'Dropdown',
    variants: null, intentions: null, sizes: ['SM', 'MD', 'LG'],
    states: ['Default', 'Hover', 'Focus', 'Open', 'Disabled', 'Error'],
    anatomy: {
      search: bool('Buscador interno', false),
      checkmark: bool('Check en seleccionado', true),
      categories: bool('Categorías / divisores', false),
      itemIcon: bool('Icono en el item', false),
      itemDesc: bool('Descripción en el item', false),
      itemBadge: bool('Badge indicador', false),
    },
    props: (t, e) => ({
      height: r(38 * e), padX: r(t.sp.sm * e), fontSize: r(t.ty['body-s'].size * e), itemPadX: r(t.sp.sm * e),
      itemPadY: r(t.sp.xs * e), maxHeight: 220, elevation: 'lg', menuRadiusToken: 'md',
    }),
    propMeta: {
      height: 'Altura', padX: PAD.padX, fontSize: PAD.fontSize, itemPadX: 'Item padding X', itemPadY: 'Item padding Y',
      maxHeight: 'Max-height menú', elevation: 'Elevación menú', menuRadiusToken: 'Radio menú',
    },
  },
  {
    key: 'input', name: 'Input',
    variants: null, intentions: null, sizes: ['SM', 'MD', 'LG'],
    states: ['Default', 'Hover', 'Focus', 'Typing', 'Disabled', 'Read-only', 'Error', 'Success'],
    anatomy: {
      label: bool('Label', true),
      labelLayout: select('Layout del label', ['Arriba', 'Izquierda', 'Floating'], 'Arriba'),
      helper: bool('Texto de ayuda', true),
      leadingIcon: bool('Icono inicial', false),
      trailingIcon: bool('Icono final', false),
      counter: bool('Contador', false),
    },
    props: (t, e) => ({ height: r(38 * e), padX: r(t.sp.sm * e), fontSize: r(t.ty['body-s'].size * e), borderWidth: 1, radiusToken: 'sm' }),
    propMeta: { height: 'Altura', padX: PAD.padX, fontSize: PAD.fontSize, borderWidth: 'Border width', radiusToken: 'Radio (token)' },
  },
  {
    key: 'link', name: 'Link',
    variants: ['Primary', 'Neutral', 'Inline', 'Standalone'], intentions: null,
    sizes: ['SM', 'MD', 'LG'], states: ['Default', 'Hover', 'Focus', 'Active', 'Visited'],
    anatomy: {
      underline: select('Subrayado', ['Siempre', 'En hover', 'Nunca'], 'En hover'),
      icon: select('Icono', ['Ninguno', 'Izquierda', 'External'], 'Ninguno'),
    },
    props: (t, e) => ({ fontSize: r(t.ty['body-m'].size * e), gap: 5, underlineOffset: 3 }),
    propMeta: { fontSize: PAD.fontSize, gap: PAD.gap, underlineOffset: 'Underline offset' },
  },
  {
    key: 'modal', name: 'Modal', previewAxis: 'none',
    variants: null, intentions: null, sizes: ['Small', 'Medium', 'Large', 'Full screen'], states: null,
    anatomy: {
      header: bool('Título de cabecera', true),
      close: bool('Botón de cierre', true),
      scroll: bool('Scroll en el body', false),
      footer: bool('Footer fijo', true),
    },
    props: (t) => ({ padX: t.sp.lg, padY: t.sp.md, radiusToken: 'xl', elevation: 'xl', backdropOpacity: 0.45, backdropBlur: 0 }),
    propMeta: {
      padX: PAD.padX, padY: PAD.padY, radiusToken: 'Radio (token)', elevation: 'Elevación',
      backdropOpacity: 'Opacidad backdrop', backdropBlur: 'Blur backdrop',
    },
  },
  {
    key: 'notification', name: 'Notification',
    variants: ['Solid', 'Soft / Subtle', 'Left-border accent'],
    intentions: ['Info', 'Success', 'Warning', 'Error / Critical'], sizes: null, states: null,
    anatomy: {
      icon: bool('Icono de estado', true),
      title: bool('Título', true),
      desc: bool('Descripción', true),
      action: bool('Acción', false),
      close: bool('Icono de cierre', true),
    },
    props: (t) => ({ padX: t.sp.md, padY: t.sp.sm, gap: t.sp.xs, radiusToken: 'md', elevation: 'sm' }),
    propMeta: { padX: PAD.padX, padY: PAD.padY, gap: PAD.gap, radiusToken: 'Radio (token)', elevation: 'Elevación' },
  },
  {
    key: 'pagination', name: 'Pagination',
    variants: ['Full', 'Simple', 'Compact'], intentions: null, sizes: ['SM', 'MD'], states: ['Default', 'Hover'],
    anatomy: { shape: select('Forma del botón', ['Square', 'Rounded', 'Circle'], 'Rounded') },
    props: (t, e) => ({ size: r(32 * e), gap: r(t.sp['3xs'] * e * 1.5), fontSize: r(t.ty['body-s'].size * e) }),
    propMeta: { size: 'Tamaño', gap: PAD.gap, fontSize: PAD.fontSize },
  },
  {
    key: 'radio', name: 'Radio',
    variants: null, intentions: null, sizes: ['SM', 'MD'],
    states: ['Unchecked', 'Checked', 'Hover', 'Focus', 'Disabled', 'Error'],
    anatomy: {
      layout: select('Layout', ['Control izquierda', 'Control derecha'], 'Control izquierda'),
      helper: bool('Texto de ayuda', false),
    },
    props: (t, e) => ({ size: r(18 * e), dotRatio: 0.45, borderWidth: 1.5, gap: r(t.sp.xs * e), fontSize: r(t.ty['body-s'].size * e) }),
    propMeta: { size: 'Tamaño', dotRatio: 'Ratio del punto', borderWidth: 'Border width', gap: PAD.gap, fontSize: PAD.fontSize },
  },
  {
    key: 'search', name: 'Search',
    variants: null, intentions: null, sizes: ['SM', 'MD', 'LG'],
    states: ['Default', 'Focus', 'Typing', 'Loading', 'Clearable'],
    anatomy: {
      icon: bool('Icono de búsqueda', true),
      shortcut: bool('Badge de atajo', true),
      clear: bool('Botón de limpiar', true),
      autocomplete: bool('Autocompletado', true),
    },
    props: (t, e) => ({ height: r(38 * e), padX: r(t.sp.sm * e), fontSize: r(t.ty['body-s'].size * e), radiusToken: 'md' }),
    propMeta: { height: 'Altura', padX: PAD.padX, fontSize: PAD.fontSize, radiusToken: 'Radio (token)' },
  },
  {
    key: 'slider', name: 'Slider',
    variants: ['Continuous', 'Discrete', 'Dual thumb'], intentions: null, sizes: null,
    states: ['Default', 'Hover', 'Active / Dragging', 'Disabled'],
    anatomy: { label: bool('Label', true), value: bool('Valor actual', true), ticks: bool('Marcas / ticks', false) },
    props: () => ({ trackHeight: 4, thumbSize: 18, thumbShadow: 'sm' }),
    propMeta: { trackHeight: 'Alto del track', thumbSize: 'Tamaño del thumb', thumbShadow: 'Sombra del thumb' },
  },
  {
    key: 'switch', name: 'Switch',
    variants: null, intentions: null, sizes: ['SM', 'MD'], states: ['Off', 'On', 'Hover', 'Focus', 'Disabled'],
    anatomy: { label: bool('Label', true), icons: bool('Iconos dentro del track', false) },
    props: (t, e) => ({
      trackW: r(40 * e), trackH: r(22 * e), thumb: r(16 * e), trackPad: 3, gap: r(t.sp.xs * e), fontSize: r(t.ty['body-s'].size * e),
    }),
    propMeta: {
      trackW: 'Ancho del track', trackH: 'Alto del track', thumb: 'Tamaño del thumb', trackPad: 'Padding del track',
      gap: PAD.gap, fontSize: PAD.fontSize,
    },
  },
  {
    key: 'tags', name: 'Tags',
    variants: ['Input tag', 'Filter tag', 'Read-only tag'], intentions: null, sizes: ['SM', 'MD'],
    states: ['Default', 'Hover', 'Selected / Active', 'Focus', 'Disabled'],
    anatomy: {
      avatar: bool('Avatar / icono inicial', false),
      close: bool('Botón de cierre', true),
      shape: select('Forma', ['Rounded', 'Pill'], 'Pill'),
    },
    props: (t, e) => ({
      padX: r(t.sp.xs * e * 1.5), padY: r(t.sp['3xs'] * e * 1.2), gap: r(t.sp['3xs'] * e * 1.5), fontSize: r(t.ty['body-s'].size * e),
    }),
    propMeta: PAD,
  },
  {
    key: 'toggle', name: 'Toggle',
    variants: ['Single select', 'Multi-select'], intentions: null, sizes: ['SM', 'MD', 'LG'],
    states: ['Default', 'Hover', 'Selected', 'Disabled'],
    anatomy: {
      content: select('Contenido', ['Solo texto', 'Solo icono', 'Icono + texto'], 'Solo texto'),
      style: select('Estilo', ['Segmented', 'Outlined'], 'Segmented'),
    },
    props: (t, e) => ({
      padX: r(t.sp.sm * e * 1.3), padY: r(t.sp.xs * e * 0.85), gap: r(t.sp['3xs'] * e * 2), trackPad: 3,
      fontSize: r(t.ty['body-s'].size * e),
    }),
    propMeta: { padX: PAD.padX, padY: PAD.padY, gap: PAD.gap, trackPad: 'Padding del track', fontSize: PAD.fontSize },
  },
  {
    key: 'tooltip', name: 'Tooltip',
    variants: ['Light', 'Dark', 'Accent'], intentions: null, sizes: null, states: null,
    anatomy: {
      position: select('Posición', ['Top', 'Bottom', 'Left', 'Right'], 'Top'),
      icon: bool('Con icono', false),
      arrow: bool('Flecha', true),
    },
    props: (t) => ({ maxWidth: 240, padX: t.sp.xs, padY: t.sp['2xs'], radiusToken: 'sm', fontSize: t.ty.caption.size, arrowSize: 8 }),
    propMeta: {
      maxWidth: 'Max-width', padX: PAD.padX, padY: PAD.padY, radiusToken: 'Radio (token)', fontSize: PAD.fontSize,
      arrowSize: 'Tamaño flecha',
    },
  },
];

const BY_KEY = new Map(COMPONENTS.map((c) => [c.key, c]));
export const getComponent = (key: string) => BY_KEY.get(key);

export type AxisKey = 'variant' | 'intention' | 'size' | 'state';
export type ComponentAxis = { key: AxisKey; label: string; values: string[] };

export function componentAxes(spec: ComponentSpec): ComponentAxis[] {
  const axes: ComponentAxis[] = [];
  if (spec.variants) axes.push({ key: 'variant', label: 'Variante', values: spec.variants });
  if (spec.intentions) axes.push({ key: 'intention', label: 'Intención', values: spec.intentions });
  if (spec.sizes) axes.push({ key: 'size', label: 'Tamaño', values: spec.sizes });
  if (spec.states) axes.push({ key: 'state', label: 'Estado', values: spec.states });
  return axes;
}

export function componentSummary(spec: ComponentSpec): string {
  const parts: string[] = [];
  const variants = (spec.variants?.length ?? 0) * (spec.intentions?.length ?? 1);
  if (variants) parts.push(`${variants} variante${variants > 1 ? 's' : ''}`);
  if (spec.sizes) parts.push(`${spec.sizes.length} tamaño${spec.sizes.length > 1 ? 's' : ''}`);
  if (spec.states) parts.push(`${spec.states.length} estados`);
  return parts.join(' · ');
}

export function defaultConfig(spec: ComponentSpec): ComponentConfig {
  const size = spec.sizes ? (spec.sizes.includes('MD') ? 'MD' : (spec.sizes[1] ?? spec.sizes[0])) : null;
  return {
    variant: spec.variants?.[0] ?? null,
    intention: spec.intentions ? (spec.intentions[1] ?? spec.intentions[0]) : null,
    size,
    state: spec.states?.[0] ?? null,
    anatomy: Object.fromEntries(Object.entries(spec.anatomy).map(([k, a]) => [k, a.def])),
    props: {},
    note: '',
  };
}

/* Props efectivas: las calculadas para la talla, con lo editado a mano encima. Una prop editada que
   el componente ya no tiene se ignora. */
export function resolveProps(spec: ComponentSpec, resolved: ResolvedTokens, config: ComponentConfig): ComponentProps {
  const defaults = spec.props(resolved, SIZE_SCALE[config.size ?? ''] ?? 1);
  const out = { ...defaults };
  for (const [key, value] of Object.entries(config.props)) if (Object.hasOwn(defaults, key)) out[key] = value;
  return out;
}
