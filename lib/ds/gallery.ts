/* DSMak_r — lo que decide la galería sin React, para poder testearlo en node: qué tarjetas pasan el
   filtro y qué fichero descarga "Exportar". */

import { compileSystem } from './compile.ts';
import { deliveryFile, type DeliveryFormat, type ExportedFile } from './delivery.ts';
import { tokensSchema } from './schema.ts';
import type { DesignSystemListItem, DsStatus } from './types.ts';

/* Filtro predictivo desde el tercer carácter, como las galerías de DeckMak_r y FormMak_r. */
export const SEARCH_MIN = 3;

export type GalleryFilter = { search: string; client: string | null; tags: string[]; status: DsStatus | null };

export function filterSystems(items: DesignSystemListItem[], f: GalleryFilter): DesignSystemListItem[] {
  const q = f.search.trim().toLowerCase();
  const applyQuery = q.length >= SEARCH_MIN;
  return items.filter((it) => {
    if (applyQuery && !`${it.name} ${it.client ?? ''} ${it.tags.join(' ')}`.toLowerCase().includes(q)) return false;
    if (f.status && it.status !== f.status) return false;
    if (f.client && it.client !== f.client) return false;
    if (f.tags.length && !f.tags.every((t) => it.tags.includes(t))) return false;
    return true;
  });
}

/* Las opciones de los filtros salen de los sistemas que hay: un filtro que ofrece valores sin
   resultados no filtra, engaña. */
export function galleryFacets(items: DesignSystemListItem[]): { tags: string[]; clients: string[] } {
  const tags = new Set<string>();
  const clients = new Set<string>();
  for (const it of items) {
    it.tags.forEach((t) => tags.add(t));
    if (it.client) clients.add(it.client);
  }
  return { tags: [...tags].sort(), clients: [...clients].sort((a, b) => a.localeCompare(b, 'es')) };
}

export type ExportFormat = DeliveryFormat;
export type { ExportedFile };

/* Descarga desde la galería. Sale de los tokens GUARDADOS, nunca recalculados: un sistema entregado
   con otro motor se exporta tal como se entregó (plan, H4). Por eso no se exige que la marca compile,
   solo que los tokens estén sanos.

   El styleguide llega ya pintado desde el modal, que es quien tiene React a mano. */
export function exportFile(
  row: unknown,
  format: ExportFormat,
  generatedAt: string,
  styleguideHtml?: string,
): { ok: true; file: ExportedFile } | { ok: false; error: string } {
  const src = (typeof row === 'object' && row !== null ? row : {}) as { name?: unknown; tokens?: unknown };
  const tokens = tokensSchema.safeParse(src.tokens);
  if (!tokens.success) {
    return { ok: false, error: 'Los tokens guardados están dañados y no se pueden exportar. Ábrelo en el editor para regenerarlos.' };
  }

  const name = typeof src.name === 'string' ? src.name : '';
  const configs = compileSystem(row).system?.configs ?? {};
  const file = deliveryFile(format, { name, tokens: tokens.data, configs, generatedAt, styleguideHtml });
  if (!file) return { ok: false, error: 'No se ha podido preparar el styleguide.' };
  return { ok: true, file };
}
