import type { ImageRecord, ImageUse } from '@/lib/decks/types';

/* Puente entre el Social Maker y «Editar con IA» de IMG_r.
   ─────────────────────────────────────────────────────────────────────────
   LA DIRECTIVA DE IMAGEN NO SE DUPLICA AQUÍ. Vive en `lib/prompts.ts`
   (`getImagePrompt`), la aplica IMG_r con Gemini desde hace semanas, su
   salida está congelada en `lib/__tests__/prompts.test.ts` y el equipo y un
   cliente la usan a diario. Escribir una segunda copia en esta herramienta
   sería crear una norma de marca con dos versiones destinadas a separarse.

   Lo que faltaba era llegar hasta ahí sin salir del editor, y eso es lo
   único que hace este archivo.

   EL PUENTE ES LA URL. En el markdown una foto es una URL; «Editar con IA»
   necesita la fila del banco. Se busca por URL exacta, que para eso se
   añadió el filtro `url` a `GET /api/images`.

   Una foto que no esté en el banco (las de `/universo`, que son archivos
   estáticos del repo) no se puede editar: hay que subirla primero. */

export type FotoDelBanco = { image: ImageRecord; uses: ImageUse[] | undefined };

export class FotoNoEstaEnElBanco extends Error {
  constructor() {
    super('Esta foto no está en el banco de imágenes, así que no se le puede aplicar el estilo. Súbela desde la galería y vuelve a ponerla.');
    this.name = 'FotoNoEstaEnElBanco';
  }
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`La petición ha fallado (${r.status}).`);
  return (await r.json()) as T;
}

export async function buscarFoto(url: string): Promise<FotoDelBanco> {
  const lista = await json<{ items?: ImageRecord[] }>(
    `/api/images?limit=1&url=${encodeURIComponent(url)}`,
  );
  const image = lista.items?.[0];
  if (!image) throw new FotoNoEstaEnElBanco();

  /* Dónde se usa decide si se puede sobrescribir o hay que guardar copia.
     Si la consulta falla no se bloquea la edición: el propio servidor
     devuelve los usos al terminar y el modal se corrige solo. */
  let uses: ImageUse[] | undefined;
  try {
    uses = await json<ImageUse[]>(`/api/images/${image.id}/usage`);
  } catch {
    uses = undefined;
  }
  return { image, uses };
}
