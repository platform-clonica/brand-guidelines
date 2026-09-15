'use client';
/* Subida de logos al bucket público. Extraída de lib/decks/api.ts para que la usen DeckMak_r y
   DSMak_r con su propio prefijo (plan de DSMak_r, §5). DeckMak_r la sigue importando desde
   lib/decks/api.ts, que la reexporta, sin cambiar una sola llamada.

   Se pinta siempre con publicLogoUrl() como <img src>, nunca como SVG inline (XSS). */

import { supabaseBrowser } from '@/lib/supabase/client';
import { LOGO_BUCKET, logoObjectPath } from './paths';

export async function uploadLogo(file: File, prefix = 'logos'): Promise<string> {
  const sb = supabaseBrowser();
  const path = logoObjectPath(prefix, file.name, Date.now());
  const { error } = await sb.storage.from(LOGO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || 'image/svg+xml',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}
