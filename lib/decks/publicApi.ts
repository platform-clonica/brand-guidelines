'use client';
/* Lo que necesita el VISOR PÚBLICO de propuestas, sin tocar el SDK de Supabase.

   Por qué existe este módulo. `lib/decks/api.ts` llama a `supabaseBrowser()`, así que importar
   de ahí una sola función arrastra `@supabase/ssr` + supabase-js enteros — auth, postgrest,
   realtime, storage y functions — al bundle de la ruta. Medido sobre el build: 65,4 kB gzip
   (chunks 6962 + 44530001) en `/deck/[id]/view`, que es la URL que se manda a clientes y que a
   menudo se abre una sola vez desde el móvil. El tree-shaking no puede quitarlo: el constructor
   de `SupabaseClient` instancia storage, realtime, postgrest y functions como efecto de
   construcción, así que ningún bundler los puede probar muertos.

   Y no hacía falta nada de eso: lo único que el visor usaba era `getPublicUrl()`, que en el
   fuente de storage-js es `encodeURI(\`${url}/object/public/${path}\`)` — concatenación pura, sin
   petición de red, sin firma y sin await. Aquí está escrita a mano, con el mismo formato.

   Regla para quien añada algo: en este fichero NO se importa `@/lib/supabase/client`. Si una
   función lo necesita, va en `api.ts`. */

import type { DeckSignature, SignInput } from './types';

export const LOGO_BUCKET = 'deck-assets';
export const IMAGE_BUCKET = 'deck-images';

export async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error((msg as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/* Formato público y estable de Supabase Storage. Idéntico byte a byte a lo que devolvía
   `sb.storage.from(bucket).getPublicUrl(path)` sin opciones de transformación. */
function publicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return encodeURI(`${base}/storage/v1/object/public/${bucket}/${path}`);
}

export function publicLogoUrl(path: string | null | undefined): string | null {
  return publicUrl(LOGO_BUCKET, path);
}

export function publicImageUrl(path: string | null | undefined): string | null {
  return publicUrl(IMAGE_BUCKET, path);
}

/* La firma del cliente va contra nuestro endpoint, no contra Supabase: es un `fetch` a secas y
   por eso vive aquí y no en api.ts. */
export function signDeck(deckId: string, input: SignInput): Promise<DeckSignature> {
  return fetch('/api/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deck_id: deckId, ...input }),
  }).then((r) => json<DeckSignature>(r));
}
