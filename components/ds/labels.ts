/* DSMak_r — etiquetas en castellano de los ids del motor. Los ids se guardan en inglés (plan, §2);
   lo que ve el diseñador sale de aquí. */

import type { NeutralPreset } from '@/lib/ds/engine/ramp';
import type { SemanticKey } from '@/lib/ds/engine/semantic';
import type { Mode } from '@/lib/ds/schema';

export const MODE_LABELS: Record<Mode, string> = { light: 'Claro', dark: 'Oscuro', both: 'Ambos' };

export const NEUTRAL_LABELS: Record<NeutralPreset, string> = {
  pure: 'Gris puro',
  warm: 'Gris cálido',
  cool: 'Gris frío',
  'primary-tint': 'Tinte del primario',
};

export const SEMANTIC_LABELS: Record<SemanticKey, string> = {
  success: 'Éxito',
  warning: 'Aviso',
  error: 'Error',
  info: 'Información',
};

const FAMILY_LABELS: Record<string, string> = { primary: 'Primario', secondary: 'Secundario', neutral: 'Neutros', accent: 'Acento' };
export const familyLabel = (family: string) => FAMILY_LABELS[family] ?? family;

export const RADIUS_COMPONENT_LABELS: Record<string, string> = {
  button: 'Botón',
  input: 'Campo',
  card: 'Tarjeta',
  modal: 'Modal',
  badge: 'Insignia',
  tooltip: 'Tooltip',
  checkbox: 'Casilla',
  dropdown: 'Desplegable',
  notification: 'Notificación',
  tag: 'Etiqueta',
};

/* Pesos que admite el esquema (100–900 de cien en cien). Son los del CLIENTE: las normas de peso de
   lib/tokens.ts mandan sobre el chrome, no sobre lo que genera la herramienta. */
export const WEIGHT_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => ({ value: w, label: String(w) }));
