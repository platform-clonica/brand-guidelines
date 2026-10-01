/* Los colores del cromo del workspace (components/deck/studio/ui.ts) están copiados a mano de
   lib/tokens.ts. CLAUDE.md ya documenta la duplicación de tokens como desviación conocida; lo que faltaba
   era que alguien se enterase si las dos copias se separan. Este test es ese aviso.

   `brick` no está: es el acento del cursor de los wordmarks, una desviación conocida que no sale de la
   paleta de marca. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors } from '../../components/deck/studio/ui.ts';
import { colorsAccent, colorsBase } from '../tokens.ts';

const hex = (name: string) => [...colorsBase, ...colorsAccent].find((c) => c.name === name)?.hex;
const full = (h: string) => (h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join('')}` : h).toUpperCase();

test('los colores del cromo del studio son los de lib/tokens.ts', () => {
  const pairs: [keyof typeof colors, string][] = [
    ['dark', 'Dark'],
    ['warmLight', 'Warm Light'],
    ['warmDark', 'Warm Dark'],
    ['ash', 'Ash'],
    ['white', 'Pure White'],
    ['grey', 'Grey'],
    ['ashDark', 'Ash Dark'],
    ['bordeaux', 'Bordeaux'],
  ];
  for (const [key, token] of pairs) {
    assert.ok(hex(token), `${token} no está en lib/tokens.ts`);
    assert.equal(full(colors[key]), full(hex(token)!), `colors.${key} no es ${token}`);
  }
});
