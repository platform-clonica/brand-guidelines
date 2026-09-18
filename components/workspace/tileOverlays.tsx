/* Las tarjetas del lanzador que además HACEN algo.

   Mapa por la clave `overlay` del catálogo, no un campo de lib/workspace/catalog.ts: ese módulo es
   tabla de datos pura —lo importan los tests— y meterle JSX lo convertiría en otra cosa. Es
   exactamente el mismo reparto que AppIcon.tsx con los iconos, y por el mismo motivo.

   Gracias a esto, el dispatcher no necesita un `if` sobre un id concreto: una tarjeta con
   comportamiento se declara con un dato y se resuelve aquí. */

import type { ReactNode } from 'react';
import { FicharDesdeHome } from './FicharDesdeHome';
import type { ClockKind } from '@/lib/clock/types';

/* Lo que la home resuelve en servidor y le pasa a cada overlay. Hoy solo hay uno; si mañana hay
   otro, esto crece con su clave y el dispatcher sigue sin enterarse. */
export type OverlayData = {
  clock?: { accion: ClockKind | null };
};

export function overlayFor(clave: string | undefined, datos: OverlayData): ReactNode {
  if (clave === 'clock') return <FicharDesdeHome accion={datos.clock?.accion ?? null} />;
  return null;
}
