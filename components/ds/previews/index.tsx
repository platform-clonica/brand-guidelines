import type { ReactElement } from 'react';
import { resolveProps, type ComponentSpec } from '@/lib/ds/components';
import type { ResolvedTokens } from '@/lib/ds/engine/resolve';
import type { ComponentConfig } from '@/lib/ds/schema';
import { Button, Link, Pagination, Tags, Toggle } from './actions';
import { Accordion, Modal } from './containers';
import { Badge, Notification, Tooltip } from './feedback';
import { Checkbox, Dropdown, Input, Radio, Search, Slider, Switch } from './forms';
import type { Render } from './shared';

/* Los 17 renders, por clave del catálogo (lib/ds/components.ts). */
export const RENDERS: Record<string, Render> = {
  accordion: Accordion,
  badge: Badge,
  button: Button,
  checkbox: Checkbox,
  dropdown: Dropdown,
  input: Input,
  link: Link,
  modal: Modal,
  notification: Notification,
  pagination: Pagination,
  radio: Radio,
  search: Search,
  slider: Slider,
  switch: Switch,
  tags: Tags,
  toggle: Toggle,
  tooltip: Tooltip,
};

/* Pinta un componente. Las props se resuelven aquí, así los renders reciben siempre las efectivas:
   las calculadas desde los tokens y la talla, con lo editado a mano encima. */
export function renderComponent(spec: ComponentSpec, resolved: ResolvedTokens, config: ComponentConfig): ReactElement | null {
  const render = RENDERS[spec.key];
  return render ? render(resolved, { ...config, props: resolveProps(spec, resolved, config) }) : null;
}
