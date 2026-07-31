import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../parse.ts';

/* Salto de línea explícito en titulares (feedback del cliente, 2026-07-31).
   Se marca con `\` al final de la línea — el salto duro nativo de markdown — y NO con un Enter
   a secas. El motivo está en el segundo test: en los decks reales un titular va pegado a su
   cuerpo sin línea en blanco, así que un Enter normal tiene que seguir significando
   "aquí acaba el titular". */

const headings = (md: string) => parse(md).flatMap((s) => s.tokens).filter((t) => t.t === 'h');

test('la barra al final continúa el titular en la línea siguiente', () => {
  const [h] = headings('## Primera línea \\\nSegunda línea\n');
  assert.equal(h.text, 'Primera línea\nSegunda línea');
});

test('SIN barra, la línea siguiente NO se absorbe: sigue siendo cuerpo', () => {
  // Este es el caso que hay 19 veces en lib/deck/templates.ts. Si se rompiera, todos los decks
  // existentes se tragarían su párrafo dentro del titular.
  const tokens = parse('## Objetivos\nEstimamos que la duración será de 6 semanas.\n')[0].tokens;
  const h = tokens.find((t) => t.t === 'h');
  assert.equal(h?.text, 'Objetivos');
  assert.ok(tokens.some((t) => t.t === 'p' && t.text.startsWith('Estimamos')), 'el cuerpo debe seguir siendo un párrafo');
});

test('encadena más de dos líneas', () => {
  const [h] = headings('# Una \\\nDos \\\nTres\n');
  assert.equal(h.text, 'Una\nDos\nTres');
});

test('una barra colgando al final no deja un <br> fantasma', () => {
  const [h] = headings('## Cierre \\\n');
  assert.equal(h.text, 'Cierre');
});

test('el titular de una sola línea no cambia', () => {
  const [h] = headings('## Título normal\n');
  assert.equal(h.text, 'Título normal');
  assert.ok(!h.text.includes('\n'));
});
