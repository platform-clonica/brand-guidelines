import { CANVASES, type CanvasId } from './types.ts';

/* Geometría del lienzo, en números.
   ─────────────────────────────────────────────────────────────────────────
   Espeja los valores de `components/social/social.css` (`--m`, `--foot-h`).
   Si cambias uno, cambia el otro. Existe porque FitText necesita el alto de
   la caja como número y el CSS solo lo sabe después de pintar: calcularlo
   aquí es lo que permite que el ajuste sea determinista, el mismo texto
   resuelva siempre igual y la exportación coincida con la vista previa. */

/** `--m` en social.css. */
export const MARGIN = 56;
/** `--foot-h` en social.css. */
export const FOOT_H = 34;
/** Aire entre el final de la caja de contenido y el pie. */
export const FOOT_GAP = 24;

export function boxWidth(canvas: CanvasId): number {
  return CANVASES[canvas].w - MARGIN * 2;
}

export function boxHeight(canvas: CanvasId): number {
  return CANVASES[canvas].h - MARGIN * 2 - FOOT_H - FOOT_GAP;
}
