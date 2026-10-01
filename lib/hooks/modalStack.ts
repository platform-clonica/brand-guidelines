/* La pila de modales abiertos, para que solo el de arriba atienda el teclado.

   Cada `useFocusTrap` activo escucha `keydown` en `document`. Con dos modales a la vez, los dos
   recibían el Escape —se cerraban los dos— y el Tab del de abajo podía sacar el foco del de arriba. Con
   la pila, cada trampa pregunta si es la de arriba antes de hacer nada. Pura y sin React, para poder
   testearla en node. */

export type ModalStack = {
  push(entry: object): void;
  remove(entry: object): void;
  isTop(entry: object): boolean;
};

export function createModalStack(): ModalStack {
  const entries: object[] = [];
  return {
    push(entry) {
      if (!entries.includes(entry)) entries.push(entry);
    },
    remove(entry) {
      const i = entries.indexOf(entry);
      if (i >= 0) entries.splice(i, 1);
    },
    isTop(entry) {
      return entries.length > 0 && entries[entries.length - 1] === entry;
    },
  };
}

/* La de la aplicación: una sola para todos los modales. */
export const modalStack = createModalStack();
