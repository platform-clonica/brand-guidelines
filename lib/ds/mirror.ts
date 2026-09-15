/* DSMak_r — campos que la fila copia de la marca, y la tira de color de la tarjeta de galería.
   Equivalente de lib/forms/mirror.ts: se re-derivan en cada guardado y nunca se editan a mano. */

import type { Brand } from './schema.ts';
import type { DsMirror } from './types.ts';

export function mirrorFrom(brand: Brand): DsMirror {
  return {
    name: brand.name.trim() || 'Sistema sin nombre',
    client: brand.client?.trim() || null,
  };
}

const STRIP: [family: string, step: string][] = [
  ['primary', '600'],
  ['secondary', '600'],
  ['neutral', '400'],
];

/* Recibe los tokens tal como vienen de la base de datos, sin validar: la galería no puede caerse
   por una fila dañada, así que lo que no esté se omite. */
export function paletteStrip(tokens: unknown): string[] {
  const palette = (tokens as { palette?: unknown } | null)?.palette;
  if (!palette || typeof palette !== 'object') return [];
  const out: string[] = [];
  for (const [family, step] of STRIP) {
    const hex = (palette as Record<string, Record<string, unknown> | undefined>)[family]?.[step];
    if (typeof hex === 'string') out.push(hex);
  }
  return out;
}
