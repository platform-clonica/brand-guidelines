'use client';

import dynamic from 'next/dynamic';
import { useMenu } from '@/lib/store/menu';

/* Carga diferida del overlay del menú, y con él de framer-motion.
 *
 * MenuOverlay es el único consumidor de framer-motion que cuelga del layout público, y su uso
 * completo de la librería es una animación: `initial={{x:'-100%'}} animate={{x:0}}`. Eso costaba
 * 37 kB gzip (chunk 7784, 112.987 B sin comprimir) descargados y parseados por TODO visitante del
 * manual, incluido el de escritorio, que nunca ve este panel — es `md:hidden`.
 *
 * Por qué diferir y no reescribir la animación en CSS. `AnimatePresence` retrasa el desmontaje
 * hasta que termina la transición de salida, y CSS puro no hace eso solo: haría falta estado
 * propio más un `transitionend`. Diferir el módulo entero da el mismo ahorro en la carga inicial
 * sin tocar una línea de la animación ni arriesgar una regresión visual.
 *
 * `ssr: false` es correcto aquí: el panel arranca cerrado y no aporta nada al HTML inicial. Y va
 * en un envoltorio de cliente porque `next/dynamic` con `ssr: false` no se puede invocar desde un
 * Server Component, que es lo que es `app/[locale]/layout.tsx`.
 *
 * Coste: la primera vez que alguien abre el menú en móvil, el chunk se descarga en ese momento.
 * Es una petición de 37 kB contra una interacción deliberada, no contra la primera pintura.
 */
const MenuOverlay = dynamic(
  () => import('./MenuOverlay').then((m) => m.MenuOverlay),
  { ssr: false },
);

export function MenuOverlayLazy() {
  /* Se suscribe solo a `isOpen` con selector, para no re-renderizar con cualquier cambio del
     store. Mientras está cerrado no se monta nada, así que el chunk ni se pide. */
  const isOpen = useMenu((s) => s.isOpen);
  if (!isOpen) return null;
  return <MenuOverlay />;
}
