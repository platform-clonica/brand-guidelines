/* DSMak_r — variables CSS de la previsualización del editor.

   No hay iframe: el prefijo `--ds-` no colisiona con nada del workspace (definición, Interfaz), así
   que basta un contenedor con estas variables en su `style`. Los nombres son los de tokens.css
   (`tokenVariables`), más las superficies del modo que se está viendo (`--ds-canvas`, `--ds-text`…),
   que la hoja no declara porque dependen de en qué modo se pinte.

   Los escalones fuertes de los semánticos los declaraba aquí el editor por su cuenta; desde 5d
   entran en la hoja entregada y salen del mismo sitio. */

import { surfaces } from './engine/surfaces.ts';
import { tokenVariables } from './export/css.ts';
import type { Tokens } from './schema.ts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function previewVars(tokens: Tokens, mode: 'light' | 'dark'): Record<string, string> {
  const vars: Record<string, string> = {};
  const v = tokenVariables(tokens);
  const groups = [v.palette, v.semantic, v.semanticStrong, v.typography, v.spacing, v.radius, v.shadows];
  for (const [name, value] of groups.flat()) vars[name] = value;

  for (const [name, value] of Object.entries(surfaces(tokens, mode))) vars[`--ds-${kebab(name)}`] = value;
  return vars;
}
