/* DSMak_r — tipografías de Google Fonts.

   Un enlace POR FAMILIA (plan, H10). Medido el 2026-09-15: pedir pesos que una familia no tiene no
   rompe nada (Google sirve los que hay), pero un nombre de familia que no existe devuelve 400 a TODA
   la petición. El prototipo pedía titular y cuerpo juntos, así que una errata en el campo libre dejaba
   sin fuentes a las dos.

   Los pesos se piden según lo que usa de verdad la escala tipográfica (overrides incluidos), no una
   lista fija: el prototipo pedía siempre 400–700 y la plantilla Interactius necesita Serif a 300. */

import type { Tokens } from './schema.ts';

export const CURATED_FONTS = [
  'IBM Plex Serif', 'IBM Plex Mono', 'IBM Plex Sans', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Poppins', 'Source Sans 3', 'Work Sans', 'DM Sans', 'Manrope', 'Nunito', 'Playfair Display', 'Lora',
  'Merriweather', 'Libre Baskerville', 'Space Grotesk', 'Space Mono', 'JetBrains Mono', 'Fira Code', 'Karla',
  'Rubik', 'Outfit', 'Figtree', 'Bricolage Grotesque',
] as const;

export function googleFontsUrl(family: string, weights: number[]): string {
  const name = encodeURIComponent(family.trim()).replace(/%20/g, '+');
  const wght = [...new Set(weights)].sort((a, b) => a - b).join(';');
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${wght}&display=swap`;
}

export function fontStylesheets(tokens: Pick<Tokens, 'fonts' | 'typography'>): { family: string; url: string }[] {
  const weightsByFamily = new Map<string, number[]>();
  for (const t of tokens.typography) {
    const family = (t.family === 'heading' ? tokens.fonts.heading : tokens.fonts.body).trim();
    if (!family) continue;
    weightsByFamily.set(family, [...(weightsByFamily.get(family) ?? []), t.weight]);
  }
  return [...weightsByFamily].map(([family, weights]) => ({ family, url: googleFontsUrl(family, weights) }));
}
