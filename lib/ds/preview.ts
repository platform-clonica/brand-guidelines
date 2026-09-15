/* DSMak_r — variables CSS de la previsualización del editor.

   No hay iframe: el prefijo `--ds-` no colisiona con nada del workspace (definición, Interfaz), así
   que basta un contenedor con estas variables en su `style`. Los nombres son los de tokens.css
   (`tokenVariables`), más dos grupos que la hoja no declara y la previsualización necesita:
   - Superficies del modo que se está viendo (`--ds-canvas`, `--ds-text`…).
   - Los escalones fuertes de los semánticos (300–900). La hoja solo entrega sus fondos suaves
     (50/100/200), y un aviso de error sin su color de texto no se puede pintar. */

import { SOFT_STEPS, type SemanticKey } from './engine/semantic.ts';
import { surfaces } from './engine/surfaces.ts';
import { tokenVariables } from './export/css.ts';
import type { Tokens } from './schema.ts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function previewVars(tokens: Tokens, mode: 'light' | 'dark'): Record<string, string> {
  const vars: Record<string, string> = {};
  const v = tokenVariables(tokens);
  for (const [name, value] of [...v.palette, ...v.semantic, ...v.typography, ...v.spacing, ...v.radius, ...v.shadows]) {
    vars[name] = value;
  }

  for (const [key, ramp] of Object.entries(tokens.semantic) as [SemanticKey, Record<string, string>][]) {
    for (const [step, hex] of Object.entries(ramp)) {
      if (!(SOFT_STEPS as readonly string[]).includes(step)) vars[`--ds-${key}-${step}`] = hex;
    }
  }

  for (const [name, value] of Object.entries(surfaces(tokens, mode))) vars[`--ds-${kebab(name)}`] = value;
  return vars;
}
