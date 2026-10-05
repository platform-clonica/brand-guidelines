/* «Mantén pulsado para ver el original» (fase 2, F9): qué gesto lo tiene pulsado y qué evento lo suelta.

   Al pulsar, el botón pasa a decir «Original» y encoge, así que un puntero puede quedar fuera y el navegador
   lanza pointerleave aunque nadie se haya movido. Por eso cada gesto suelta solo con su propio final: un
   puntero, con sus propios eventos al levantar, salir o cancelarse (el botón lo captura para que encoger no
   cuente como salir, y el ratón que queda encima mientras se pulsa con el dedo no cuenta); el teclado, al
   levantar la tecla. Perder el foco suelta siempre. */

export type HoldSource = null | 'key' | { pointer: number };
export type HoldEvent =
  | { type: 'pointerdown' | 'pointerup' | 'pointerleave' | 'pointercancel'; pointerId: number }
  | { type: 'keydown' | 'keyup' | 'blur' };

export function nextHold(current: HoldSource, event: HoldEvent): HoldSource {
  switch (event.type) {
    case 'pointerdown':
      return current ?? { pointer: event.pointerId };
    case 'pointerup':
    case 'pointerleave':
    case 'pointercancel':
      return typeof current === 'object' && current?.pointer === event.pointerId ? null : current;
    case 'keydown':
      return current ?? 'key';
    case 'keyup':
      return current === 'key' ? null : current;
    case 'blur':
      return null;
  }
}
