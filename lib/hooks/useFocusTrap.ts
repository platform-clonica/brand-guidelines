'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { modalStack } from './modalStack';

/* Trampa de foco para diálogos modales.
 *
 * `role="dialog" aria-modal` es una PROMESA a las tecnologías de apoyo: nada fuera del diálogo es
 * alcanzable. El overlay del menú móvil la hacía sin cumplirla — verificado con un navegador real
 * a 390×844: al abrir, el foco se quedaba en el botón hamburguesa, y en el Tab 24 saltaba a un
 * botón del manual que estaba detrás del panel opaco, a 3.082 px de scroll. Los seis Tabs
 * siguientes también, arrastrando la página. Para un lector de pantalla eso no es solo incómodo:
 * es información falsa.
 *
 * El patrón correcto ya existía en el repo, en components/studio/GalleryFilters.tsx:133 — cierra
 * con Escape y devuelve el foco al disparador, con un comentario que lo razona. Esto lo extrae
 * para no mantener tres copias y para que el arreglo llegue también a los sitios que no lo tenían.
 *
 * Qué hace, en orden:
 *  1. Recuerda quién tenía el foco y se lo devuelve al cerrar.
 *  2. Mueve el foco al primer elemento enfocable del panel.
 *  3. Cicla Tab y Shift+Tab dentro del panel.
 *  4. Pone `inert` en los hermanos, para que ni el foco ni el lector de pantalla salgan.
 *  5. Bloquea el scroll del documento mientras está abierto, y lo restaura siempre — incluso si el
 *     componente se desmonta abierto, que es como `lib/store/menu.ts` dejaba la página sin scroll
 *     de forma irrecuperable al navegar entre idiomas con el menú abierto.
 *  6. Con varios modales abiertos, solo el de arriba atiende Escape y Tab (./modalStack.ts). Antes
 *     cada trampa escuchaba por su cuenta: Escape cerraba todos a la vez.
 *
 * `onEscape` se lee de una ref y no es dependencia del efecto. Si lo fuera, un modal que recibe un
 * `onClose` nuevo en cada render (una función en línea) reiniciaría la trampa a cada tecla: devolvería
 * el foco, lo llevaría al primer campo y desharía lo que se estaba escribiendo.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const panel = ref.current;
    if (!panel) return;

    // 6 · esta trampa pasa a ser la de arriba
    const entry = {};
    modalStack.push(entry);

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // 2 · foco inicial dentro del panel
    focusables()[0]?.focus();

    // 4 · el resto del documento queda inerte
    const siblings: HTMLElement[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el instanceof HTMLElement && !el.contains(panel)) {
        if (!el.hasAttribute('inert')) {
          el.setAttribute('inert', '');
          siblings.push(el);
        }
      }
    }

    // 5 · scroll bloqueado
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (!modalStack.isTop(entry)) return;
      if (e.key === 'Escape') {
        escapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      // 3 · ciclado
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    /* En window y no en document: React (Next lo monta sobre document) atiende sus eventos en
       document, así que un campo que se queda el Escape con stopPropagation —la lista de TagInput—
       solo puede pararlo antes de window. En document la trampa lo recibía igual y cerraba el modal. */
    window.addEventListener('keydown', onKey);

    return () => {
      modalStack.remove(entry);
      window.removeEventListener('keydown', onKey);
      for (const el of siblings) el.removeAttribute('inert');
      document.documentElement.style.overflow = prevOverflow;
      // 1 · devolver el foco a quien lo tenía
      previouslyFocused?.focus?.();
    };
  }, [ref, active]);
}
