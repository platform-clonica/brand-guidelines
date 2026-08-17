import { create } from 'zustand';

/* Estado del menú overlay. Solo eso: abierto o cerrado.
 *
 * Antes `open()` y `close()` escribían además `document.documentElement.style.overflow` desde el
 * store. Efecto secundario en un sitio del que nadie lo espera, y con un fallo real: si
 * `MenuOverlay` se desmontaba con el menú abierto — navegar a otro idioma desde dentro del propio
 * overlay — nadie restauraba el `overflow`, y la página se quedaba sin scroll vertical hasta
 * recargar.
 *
 * El bloqueo vive ahora en `useFocusTrap`, que lo pone al abrir y lo quita en su función de
 * limpieza. Un efecto con cleanup se deshace aunque el componente muera abierto; una acción de
 * store, no. */
type MenuState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useMenu = create<MenuState>((set, get) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => (get().isOpen ? get().close() : get().open()),
}));
