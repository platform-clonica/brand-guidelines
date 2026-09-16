/* DSMak_r — plantilla de partida con la marca Interactius (plan, H6).

   Es el único sitio de la herramienta donde las normas de la marca SÍ mandan sobre el resultado, así
   que los valores se LEEN de lib/tokens.ts, no se copian:
   - Tipografías y pesos: IBM Plex Serif (300/400) para titulares, IBM Plex Mono (400) para texto.
   - Colores: solo de la paleta base. Los tres acentos identifican servicios y no pueden hacer de
     secundario. La excepción es Burdeos en `error`, que es su rol de interfaz declarado (`uiRole`).
   - Radios rectos, como el propio chrome del workspace.
   - Semánticos sin armonizar: con un primario casi negro, armonizar los apagaría hasta no leerse.

   PENDIENTE DE ALBERTO: la escala tipográfica. Aquí sale la del motor (base × ratio), que NO es la de
   lib/typeScale.ts. Hasta que decida, es una desviación conocida. */

import { colorsAccent, colorsBase, typography } from '../tokens.ts';
import { defaultBrand } from './engine/presets.ts';
import type { Brand, Overrides } from './schema.ts';

function baseHex(name: string): string {
  const color = colorsBase.find((c) => c.name === name);
  if (!color) throw new Error(`lib/tokens.ts ya no tiene el color base "${name}": revisa lib/ds/template.ts`);
  return color.hex;
}

export function interactiusTemplate(): { brand: Brand; overrides: Overrides } {
  const serif = typography.contrast;
  const mono = typography.brand;
  const alert = colorsAccent.find((c) => c.uiRole);
  if (!alert) throw new Error('lib/tokens.ts ya no declara un color de alerta (uiRole): revisa lib/ds/template.ts');

  return {
    brand: {
      ...defaultBrand(),
      name: 'Interactius',
      client: 'Interactius',
      colors: { primary: baseHex('Dark'), secondary: baseHex('Ash Dark') },
      neutralPreset: 'warm',
      harmonize: false,
      fonts: { heading: serif.family, body: mono.family },
      weights: {
        display: serif.weights[0],
        heading: serif.weights[serif.weights.length - 1],
        body: mono.weights[0],
      },
      radiusStyle: 'sharp',
    },
    overrides: { semanticBase: { error: alert.hex } },
  };
}
