import { splitSourceBlocks } from '@/lib/deck/source';
import { LAYOUTS } from './catalog.ts';
import type { Background, SlideKind } from './types.ts';

/* Escribir en el markdown desde la interfaz.
   ─────────────────────────────────────────────────────────────────────────
   Quien edita hace clic en una foto o en un color y el texto de la
   izquierda cambia solo. El markdown sigue siendo la fuente de verdad: la
   interfaz no guarda un estado paralelo que pueda desincronizarse de lo que
   se lee en el editor.

   El troceado en bloques se importa del deck (`splitSourceBlocks`), que usa
   exactamente los mismos separadores que el parser. */

const IMG_RE = /!\[(.*?)\]\(([^)]*)\)/g;

/* Cambia la imagen número `pos` del bloque (0 = la primera).

   Hay layouts con dos imágenes: el cierre lleva el fondo y el retrato. Por
   eso no vale el `setBlockImage` del deck, que siempre toca la primera.

   Si la posición pedida todavía no existe, la imagen se añade al final del
   bloque: es lo que hace falta para poner un retrato en un cierre que aún
   no lo tiene. */
export function setBlockImageAt(md: string, blockIndex: number, pos: number, url: string): string {
  const blocks = splitSourceBlocks(md);
  const b = blocks[blockIndex];
  if (!b) return md;

  let n = 0;
  let encontrada = false;
  const texto = b.text.replace(IMG_RE, (whole, alt: string) => {
    if (n++ !== pos) return whole;
    encontrada = true;
    return `![${alt}](${url})`;
  });

  const nuevo = encontrada ? texto : `${b.text.replace(/\s*$/, '')}\n\n![](${url})`;
  return md.slice(0, b.start) + nuevo + md.slice(b.end);
}

/* Cuántas imágenes tiene ya un bloque. La necesita el editor para saber si
   un clic en el retrato cambia una imagen existente o añade la segunda. */
export function countBlockImages(md: string, blockIndex: number): number {
  const b = splitSourceBlocks(md)[blockIndex];
  if (!b) return 0;
  return (b.text.match(IMG_RE) ?? []).length;
}

const MARKERS = new Set(LAYOUTS.map((l) => l.marker));
/* `[ \t]*$` y no `\s*$`: con `\s*` la expresión se tragaba el salto de
   línea que cierra la línea, y al reescribir desaparecía una línea en
   blanco del texto de quien edita. Un cambio de color no puede ir
   reformateando el markdown por el camino. */
const LY_RE = /^\[ly:?[ \t]+([a-z0-9-]+)\][ \t]*(?:\{([a-z-]+)\})?[ \t]*$/im;
const H_BG_RE = /^(#{1,6}[ \t]+.*?)[ \t]*\{([a-z-]+)\}[ \t]*$/im;

/* Cambia el fondo de un bloque.

   El modificador puede estar en dos sitios —la línea `[ly:]` o el sufijo
   del titular— y los decks ya escritos usan los dos. Esta función escribe
   SIEMPRE en la línea `[ly:]`, y de paso limpia el sufijo del titular si lo
   había, para que no queden dos declaraciones peleándose. La línea `[ly:]`
   gana en el compilador, así que dejar la otra sería dejar una mentira.

   Si el bloque no tiene marcador, se le pone uno con el layout que el
   compilador ya había deducido. Eso hace explícito algo que estaba
   implícito, que es siempre mejor que sea un clic quien lo decida en vez
   de una heurística que puede cambiar mañana. */
export function setBlockBackground(
  md: string,
  blockIndex: number,
  kind: SlideKind,
  bg: Background | 'dark',
): string {
  const blocks = splitSourceBlocks(md);
  const b = blocks[blockIndex];
  if (!b) return md;

  // Fuera el sufijo del titular: a partir de ahora manda la línea [ly:].
  let texto = b.text.replace(H_BG_RE, (_m, head: string) => head);

  if (LY_RE.test(texto)) {
    texto = texto.replace(LY_RE, (_m, name: string) => `[ly: ${name}] {${bg}}`);
  } else {
    const marker = MARKERS.has(kind) ? kind : 'texto';
    texto = `[ly: ${marker}] {${bg}}\n\n${texto.replace(/^\s*/, '')}`;
  }

  return md.slice(0, b.start) + texto + md.slice(b.end);
}
