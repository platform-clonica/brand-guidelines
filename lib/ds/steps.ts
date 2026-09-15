/* DSMak_r — los cuatro pasos del editor.

   El paso activo es un número sobre el mismo estado (definición, Interfaz): ningún paso importa a
   otro, y reordenarlos o pasar a un split es cambiar el contenedor. Lo único que sabe cada paso de
   los demás es esta tabla, que usa el panel de incidencias para llevar a donde está el campo. */

export const DS_STEPS = [
  { n: 1, label: 'Marca' },
  { n: 2, label: 'Fundamentos' },
  { n: 3, label: 'Componentes' },
  { n: 4, label: 'Entrega' },
] as const;

export type DsStep = (typeof DS_STEPS)[number]['n'];

const ROOTS: [root: string, step: DsStep][] = [
  ['brand', 1],
  ['overrides', 2],
  ['configs', 3],
];

/* A qué paso pertenece la ruta de una incidencia de compileSystem. `null` si no se edita en ninguno
   (tokens guardados, versión del motor). */
export function stepForPath(path: string): DsStep | null {
  for (const [root, step] of ROOTS) if (path === root || path.startsWith(`${root}.`)) return step;
  return null;
}
