/* El lienzo social, contra las guidelines.
   ─────────────────────────────────────────────────────────────────────────
   Los layouts del Social Maker salen de medir carruseles ya publicados, y
   esos diseños pueden traer errores: la instrucción de Martina es que
   **manda siempre el manual, no el PNG**. Ya apareció uno (las tarjetas de
   Insights usan negro puro en vez del oscuro de marca) y aparecerá otro.

   Este test es el que convierte esa instrucción en algo que no depende de
   que nadie se acuerde. Lee `components/social/social.css` y lo contrasta
   con `lib/tokens.ts`:

     · todo color sale de la paleta
     · la serif solo en 300/400 y la mono solo en 400/500/600
     · cero cursiva, en las dos familias

   Mismo papel que `studioColors.test.ts` para el cromo del workspace. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { colorsAccent, colorsBase, typography } from '../tokens.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* Sin comentarios: dentro se citan valores a propósito —el negro inventado
   que se corrigió, por ejemplo— y un comentario no pinta nada. */
const css = readFileSync(join(RAIZ, 'components/social/social.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

const PALETA = [...colorsBase, ...colorsAccent];
const expandir = (h: string) =>
  (h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join('')}` : h).toUpperCase();

test('todo color de social.css sale de lib/tokens.ts', () => {
  const permitidos = new Set(PALETA.map((c) => expandir(c.hex)));
  const usados = [...new Set([...css.matchAll(/#([0-9a-fA-F]{3,8})/g)].map((m) => expandir(`#${m[1]}`)))];
  const fuera = usados.filter((h) => !permitidos.has(h));
  assert.deepEqual(fuera, [], `colores fuera de la paleta: ${fuera.join(', ')}`);
});

test('todo rgb()/rgba() de social.css sale de lib/tokens.ts', () => {
  /* Los velos son translúcidos, así que van en `rgba`. El canal alfa es
     libre; el color de debajo no. */
  const permitidos = new Set(PALETA.map((c) => c.rgb.replace(/\s/g, '')));
  const usados = [
    ...new Set(
      [...css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)].map(
        (m) => `${m[1]},${m[2]},${m[3]}`,
      ),
    ),
  ];
  const fuera = usados.filter((r) => !permitidos.has(r));
  assert.deepEqual(fuera, [], `rgb fuera de la paleta: ${fuera.join(' · ')}`);
});

test('los pesos de cada familia son los que permite lib/tokens.ts', () => {
  const serif = new Set<number>(typography.contrast.weights);
  const mono = new Set<number>(typography.brand.weights);
  const fuera: string[] = [];

  /* Una regla declara su familia y su peso en el mismo bloque, así que se
     recorre bloque a bloque. Una regla que solo pone el peso hereda la
     familia y no se puede juzgar aquí; esas se dejan pasar. */
  for (const bloque of css.split('}')) {
    const peso = bloque.match(/font-weight:\s*(\d{3})/);
    if (!peso) continue;
    const n = Number(peso[1]);
    const selector = (bloque.split('{')[0] ?? '').trim().split('\n').pop()?.trim() ?? '?';
    if (/var\(--serif\)/.test(bloque) && !serif.has(n)) fuera.push(`serif ${n} en ${selector}`);
    if (/var\(--mono\)/.test(bloque) && !mono.has(n)) fuera.push(`mono ${n} en ${selector}`);
  }
  assert.deepEqual(fuera, [], `pesos fuera de norma: ${fuera.join(' · ')}`);
});

test('no hay cursiva en el lienzo social', () => {
  /* Regla dura del manual, en las dos familias. El CSS la neutraliza
     además por si llega una `*cursiva*` de un copiar y pegar. */
  assert.equal(typography.contrast.italics, false);
  assert.equal(typography.brand.italics, false);
  assert.equal(/font-style:\s*italic/.test(css), false, 'social.css declara cursiva');
});
