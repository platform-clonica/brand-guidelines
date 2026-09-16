/* DSMak_r — los tres ficheros de la entrega: tokens.json, tokens.css y el styleguide.

   Lo usan el paso 4 del editor y el modal de la galería, así que el nombre y el tipo de cada fichero
   se deciden en un solo sitio y se pueden testear en node.

   El styleguide NO se arma aquí: sus componentes los pinta React (components/ds/styleguideHtml.ts) y
   llega ya hecho. Este módulo solo le pone nombre. Por eso `deliveryFile` devuelve `null` si se pide
   el styleguide sin HTML, en vez de entregar un archivo a medias. */

import { exportCss } from './export/css.ts';
import { exportJson } from './export/json.ts';
import { slug } from './escape.ts';
import type { Configs, Tokens } from './schema.ts';

export type DeliveryFormat = 'json' | 'css' | 'styleguide';
export type ExportedFile = { name: string; mime: string; content: string };

export type DeliveryInput = {
  name: string;
  tokens: Tokens;
  configs: Configs;
  generatedAt: string;
  styleguideHtml?: string;
};

/* Un nombre sin letras ni números ("***") dejaría el fichero sin nombre. */
export const fileBase = (name: string) => (/[a-z0-9]/i.test(name.normalize('NFD')) ? slug(name) : 'design-system');

export function deliveryFile(format: DeliveryFormat, input: DeliveryInput): ExportedFile | null {
  const base = fileBase(input.name);

  if (format === 'css') {
    return { name: `${base}-tokens.css`, mime: 'text/css', content: exportCss(input.tokens) };
  }
  if (format === 'styleguide') {
    return input.styleguideHtml ? { name: `${base}-styleguide.html`, mime: 'text/html', content: input.styleguideHtml } : null;
  }

  const json = exportJson(input.tokens, { name: input.name, generatedAt: input.generatedAt, configs: input.configs });
  return { name: `${base}-tokens.json`, mime: 'application/json', content: `${JSON.stringify(json, null, 2)}\n` };
}
