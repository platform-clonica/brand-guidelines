/* DSMak_r — catálogo de los 17 componentes base. SOLO DATOS.

   Portado de Tn, be, ot, N2, to, eo y lc del prototipo, sin los `render` (JSX): esos viven en
   components/ds/previews/. Así el catálogo se puede usar desde node y desde los tests.

   Cambio respecto al prototipo en `props`: allí se guardaban las props CALCULADAS, que se quedaban
   viejas al cambiar los tokens (por eso tenía un botón "regenerar componente"). Aquí la configuración
   guarda solo lo que el diseñador ha tocado, y el resto se calcula siempre desde los tokens y la talla.

   Idioma (decidido en 5c): los valores de los ejes (Primary, Hover, Solid) son vocabulario técnico
   de design system, el que usará quien implemente, y se quedan en inglés. Los nombres de los ejes y
   la anatomía van en castellano, opciones incluidas: el prototipo mezclaba "Derecha" con "Top". */

import type { ComponentConfig, Configs } from './schema.ts';
import type { ResolvedTokens } from './engine/resolve.ts';
import { RADIUS_NAMES, SHADOW_NAMES } from './engine/presets.ts';

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
      iconType: select('Tipo de icono', ['Flecha', 'Más / menos'], 'Flecha'),
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
      shape: select('Forma', ['Píldora', 'Recta'], 'Píldora'),
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
      width: select('Ancho', ['Ajustado', 'Ancho completo'], 'Ajustado'),
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
      labelLayout: select('Layout del label', ['Arriba', 'Izquierda', 'Flotante'], 'Arriba'),
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
      icon: select('Icono', ['Ninguno', 'Izquierda', 'Externo'], 'Ninguno'),
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
    anatomy: { shape: select('Forma del botón', ['Cuadrado', 'Redondeado', 'Círculo'], 'Redondeado') },
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
      shape: select('Forma', ['Redondeado', 'Píldora'], 'Píldora'),
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
      style: select('Estilo', ['Segmentado', 'Contorno'], 'Segmentado'),
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
      position: select('Posición', ['Arriba', 'Abajo', 'Izquierda', 'Derecha'], 'Arriba'),
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

const AXES: { key: AxisKey; label: string; field: 'variants' | 'intentions' | 'sizes' | 'states' }[] = [
  { key: 'variant', label: 'Variante', field: 'variants' },
  { key: 'intention', label: 'Intención', field: 'intentions' },
  { key: 'size', label: 'Tamaño', field: 'sizes' },
  { key: 'state', label: 'Estado', field: 'states' },
];

export const axisValues = (spec: ComponentSpec, axis: AxisKey): string[] | null => spec[AXES.find((a) => a.key === axis)!.field];

export function componentAxes(spec: ComponentSpec): ComponentAxis[] {
  return AXES.flatMap((a) => (spec[a.field] ? [{ key: a.key, label: a.label, values: spec[a.field]! }] : []));
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

/* Configuración efectiva. `configs` es disperso: un componente que nadie ha tocado no tiene entrada
   y se pinta, se exporta y entra en el styleguide con la suya por defecto. */
export const configFor = (configs: Configs, spec: ComponentSpec): ComponentConfig => configs[spec.key] ?? defaultConfig(spec);

/* Props efectivas: las calculadas para la talla, con lo editado a mano encima. Una prop editada que
   el componente ya no tiene se ignora. */
export function resolveProps(spec: ComponentSpec, resolved: ResolvedTokens, config: ComponentConfig): ComponentProps {
  const defaults = spec.props(resolved, SIZE_SCALE[config.size ?? ''] ?? 1);
  const out = { ...defaults };
  for (const [key, value] of Object.entries(config.props)) if (Object.hasOwn(defaults, key)) out[key] = value;
  return out;
}

/* Con qué control se edita cada prop. El prototipo lo deducía del nombre en la interfaz (línea 6171);
   aquí vive junto al catálogo para que la validación y el editor digan lo mismo. */
export type PropControl = { kind: 'radius' } | { kind: 'shadow' } | { kind: 'number'; min: number; max: number };

const FRACTION_PROPS = new Set(['dotRatio', 'backdropOpacity']);

export function propControl(key: string): PropControl {
  if (/radiustoken$/i.test(key)) return { kind: 'radius' };
  if (/^elevation$|shadow$/i.test(key)) return { kind: 'shadow' };
  return { kind: 'number', min: 0, max: FRACTION_PROPS.has(key) ? 1 : 999 };
}

export function isValidProp(key: string, value: unknown): boolean {
  const control = propControl(key);
  if (control.kind === 'radius') return (RADIUS_NAMES as readonly unknown[]).includes(value);
  if (control.kind === 'shadow') return (SHADOW_NAMES as readonly unknown[]).includes(value);
  return typeof value === 'number' && Number.isFinite(value) && value >= control.min && value <= control.max;
}

export type ConfigProblem = { field: string; message: string };

/* Repara una configuración ya con la forma del esquema contra el catálogo ACTUAL: valores de eje que
   no existen, opciones de anatomía retiradas (las inglesas del prototipo, por ejemplo) y props que
   no encajan. Cada arreglo se anota con su campo. Una opción de anatomía que el catálogo ganó después
   se rellena con su valor por defecto sin avisar: no es un fallo de nadie. */
export function repairConfig(spec: ComponentSpec, config: ComponentConfig): { config: ComponentConfig; problems: ConfigProblem[] } {
  const base = defaultConfig(spec);
  const problems: ConfigProblem[] = [];
  const out: ComponentConfig = { ...config, anatomy: {}, props: {} };

  for (const { key } of AXES) {
    const values = axisValues(spec, key);
    const stored = config[key];
    if (values ? stored !== null && values.includes(stored) : stored === null) continue;
    out[key] = base[key];
    problems.push({
      field: key,
      message: values ? 'Ese valor no existe en el catálogo. Se ha puesto el de por defecto.' : 'Este componente no tiene este eje. Se ha quitado el valor.',
    });
  }

  for (const [key, option] of Object.entries(spec.anatomy)) {
    const stored = config.anatomy[key];
    const valid = option.type === 'bool' ? typeof stored === 'boolean' : typeof stored === 'string' && option.options.includes(stored);
    out.anatomy[key] = valid ? stored : option.def;
    if (!valid && stored !== undefined) problems.push({ field: `anatomy.${key}`, message: 'Esa opción no existe en el catálogo. Se ha puesto la de por defecto.' });
  }
  for (const key of Object.keys(config.anatomy)) {
    if (!Object.hasOwn(spec.anatomy, key)) problems.push({ field: `anatomy.${key}`, message: 'Este componente no tiene esa parte. Se ignora.' });
  }

  for (const [key, value] of Object.entries(config.props)) {
    if (!Object.hasOwn(spec.propMeta, key)) problems.push({ field: `props.${key}`, message: 'Este componente no tiene esa propiedad. Se ignora.' });
    else if (!isValidProp(key, value)) problems.push({ field: `props.${key}`, message: 'Valor no válido. Se usa el que sale de los tokens.' });
    else out.props[key] = value;
  }

  return { config: out, problems };
}
