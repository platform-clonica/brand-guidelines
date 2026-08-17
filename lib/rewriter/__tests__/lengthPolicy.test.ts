import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyLengthPolicy } from '../lengthPolicy.ts';
import { TEXT_TYPES } from '../options.ts';
import { evalText, hardFailFor, scoreFor, type EvalViolation } from '../../eval.ts';

/* Un mensaje de chat impecable son cinco frases de seis palabras. Con la regla de prosa (15-22)
   eso son cinco violaciones y un 50/100 — una nota que entrena al usuario a ignorar el
   indicador. La política corrige el número, no el aprobado. */

const CORTO = 'Frase corta. Otra frase corta. Y una tercera.';
const LARGO =
  'Esta frase se alarga a propósito mucho más de lo que la regla de longitud de la marca permite para cualquier texto, pasando con holgura del techo fijado.';

test('la forma corta deja de penalizar solo donde el tipo la admite', () => {
  const base = evalText(CORTO);
  const conUnderMin = base.violations.filter((v) => v.rule === 'length:under_min').length;
  assert.ok(conUnderMin > 0, 'el fixture debería disparar under_min');

  for (const t of TEXT_TYPES) {
    const out = applyLengthPolicy(base, t.id);
    const quedan = out.violations.filter((v) => v.rule === 'length:under_min').length;
    assert.equal(quedan, t.allowFragments ? 0 : conUnderMin, `${t.id}`);
  }
});

test('el techo de 22 palabras se mantiene en los cuatro tipos', () => {
  /* Deliberado: el ejemplo aprobado `deck-cover` de lib/tokens.ts se mueve en 21-22 palabras.
     Suprimir over_max en presentación contradiría material ya aprobado por marca. */
  const base = evalText(LARGO);
  assert.ok(base.violations.some((v) => v.rule === 'length:over_max'), 'el fixture debería pasarse');

  for (const t of TEXT_TYPES) {
    const out = applyLengthPolicy(base, t.id);
    assert.ok(
      out.violations.some((v) => v.rule === 'length:over_max'),
      `${t.id}: se ha perdonado una frase de 40 palabras`,
    );
  }
});

test('la puntuación se recalcula, no se hereda', () => {
  const base = evalText(CORTO);
  const mensaje = applyLengthPolicy(base, 'mensaje');
  assert.ok(mensaje.score > base.score, 'perdonar violaciones debería subir la nota');
  assert.equal(mensaje.score, scoreFor(mensaje.violations));
});

test('la política no toca el aprobado, solo el número', () => {
  // Las violaciones de longitud ya eran blandas: filtrarlas no puede cambiar hardFail.
  const conPalabraProhibida = evalText('Soluciones innovadoras. Muy disruptivo.');
  assert.equal(conPalabraProhibida.hardFail, true);
  assert.equal(applyLengthPolicy(conPalabraProhibida, 'mensaje').hardFail, true);

  const limpio = evalText(CORTO);
  assert.equal(limpio.hardFail, false);
  assert.equal(applyLengthPolicy(limpio, 'mensaje').hardFail, false);
});

test('un texto sin frases cortas sale intacto por identidad', () => {
  const base = evalText(LARGO);
  assert.equal(applyLengthPolicy(base, 'mensaje'), base, 'sin nada que filtrar, mismo objeto');
});

/* ─── La rúbrica compartida ───
   `scoreFor` y `hardFailFor` se extrajeron de lib/eval.ts porque /api/eval/manual las
   recalculaba a mano. Estos dos tests fijan la equivalencia con las fórmulas que había
   inline: si alguien cambia la rúbrica, tiene que cambiarla a propósito. */

test('scoreFor es 100 menos 10 por violación, con suelo en 0', () => {
  const v = (n: number): EvalViolation[] =>
    Array.from({ length: n }, (_, i) => ({ rule: 'punctuation:exclamation' as const, index: i }));
  for (const n of [0, 1, 5, 9, 10, 20]) {
    assert.equal(scoreFor(v(n)), Math.max(0, 100 - n * 10), `${n} violaciones`);
  }
});

test('hardFailFor solo se dispara con vocabulario prohibido o puntuación', () => {
  assert.equal(hardFailFor([]), false);
  assert.equal(
    hardFailFor([{ rule: 'length:under_min', sentence: 1, count: 3, limit: 15, excerpt: 'x' }]),
    false,
    'la longitud es blanda',
  );
  assert.equal(
    hardFailFor([{ rule: 'length:over_max', sentence: 1, count: 40, limit: 22, excerpt: 'x' }]),
    false,
  );
  assert.equal(hardFailFor([{ rule: 'punctuation:ellipsis', index: 0 }]), true);
  assert.equal(hardFailFor([{ rule: 'forbidden', match: 'sinergia', root: 'sinerg', index: 0 }]), true);
});
