/* DSMak_r — ediciones del paso 3 sobre `configs`.

   Mismas reglas que ./edit.ts para el paso 2:
   - Funciones puras que devuelven objetos nuevos. Si la edición no vale (un valor que el eje no
     tiene, una prop que no encaja) devuelven el MISMO objeto, sin tocar nada.
   - Lo que vuelve al valor por defecto desaparece: un componente sin cambios no tiene entrada, y una
     prop igual a la que sale de los tokens no se guarda. Así `configs` es de verdad disperso (plan,
     §2) y un sistema recién creado no arrastra 17 configuraciones idénticas a las del catálogo. */

import {
  axisValues,
  configFor,
  defaultConfig,
  isValidProp,
  resolveProps,
  type AxisKey,
  type ComponentSpec,
} from './components.ts';
import type { ResolvedTokens } from './engine/resolve.ts';
import type { ComponentConfig, Configs } from './schema.ts';

function isDefault(spec: ComponentSpec, c: ComponentConfig): boolean {
  const d = defaultConfig(spec);
  return (
    c.variant === d.variant &&
    c.intention === d.intention &&
    c.size === d.size &&
    c.state === d.state &&
    c.note === d.note &&
    Object.keys(c.props).length === 0 &&
    Object.keys(c.anatomy).length === Object.keys(d.anatomy).length &&
    Object.entries(d.anatomy).every(([k, v]) => c.anatomy[k] === v)
  );
}

function put(configs: Configs, spec: ComponentSpec, next: ComponentConfig): Configs {
  const out = { ...configs };
  if (isDefault(spec, next)) delete out[spec.key];
  else out[spec.key] = next;
  return out;
}

export function setAxis(configs: Configs, spec: ComponentSpec, axis: AxisKey, value: string): Configs {
  const current = configFor(configs, spec);
  if (!axisValues(spec, axis)?.includes(value) || current[axis] === value) return configs;
  return put(configs, spec, { ...current, [axis]: value });
}

export function setAnatomy(configs: Configs, spec: ComponentSpec, key: string, value: string | boolean): Configs {
  const option = spec.anatomy[key];
  if (!option) return configs;
  const valid = option.type === 'bool' ? typeof value === 'boolean' : typeof value === 'string' && option.options.includes(value);
  if (!valid) return configs;
  const current = configFor(configs, spec);
  return put(configs, spec, { ...current, anatomy: { ...current.anatomy, [key]: value } });
}

/* Guarda la prop solo si difiere de la calculada para la talla actual. Una vez guardada gana en
   cualquier talla (resolveProps): quien fija un padding a mano lo quiere fijo. */
export function setProp(configs: Configs, spec: ComponentSpec, resolved: ResolvedTokens, key: string, value: number | string): Configs {
  if (!Object.hasOwn(spec.propMeta, key) || !isValidProp(key, value)) return configs;
  const current = configFor(configs, spec);
  const computed = resolveProps(spec, resolved, { ...current, props: {} })[key];
  const props = { ...current.props };
  if (computed === value) delete props[key];
  else props[key] = value;
  return put(configs, spec, { ...current, props });
}

export function clearProp(configs: Configs, spec: ComponentSpec, key: string): Configs {
  const current = configFor(configs, spec);
  if (!Object.hasOwn(current.props, key)) return configs;
  const props = { ...current.props };
  delete props[key];
  return put(configs, spec, { ...current, props });
}

export const setNote = (configs: Configs, spec: ComponentSpec, note: string): Configs =>
  put(configs, spec, { ...configFor(configs, spec), note });

export function resetComponent(configs: Configs, key: string): Configs {
  if (!Object.hasOwn(configs, key)) return configs;
  const out = { ...configs };
  delete out[key];
  return out;
}
