import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, rateContrast, textOn } from '../engine/contrast.ts';

test('el ratio WCAG de blanco sobre negro es 21 y es simétrico', () => {
  assert.ok(Math.abs(contrastRatio('#FFFFFF', '#000000') - 21) < 1e-9);
  assert.equal(contrastRatio('#99335F', '#F5F2ED'), contrastRatio('#F5F2ED', '#99335F'));
});

test('#777777 sobre blanco se queda justo por debajo de 4,5', () => {
  const r = contrastRatio('#777777', '#FFFFFF');
  assert.ok(r > 4.47 && r < 4.49, `ratio ${r}`);
});

test('textOn elige el color de texto con más contraste', () => {
  assert.equal(textOn('#000000'), '#FFFFFF');
  assert.equal(textOn('#FFFFFF'), '#111111');
});

test('los niveles cortan en 7, 4,5 y 3', () => {
  assert.equal(rateContrast('#1C1A17').level, 'AAA');
  assert.equal(rateContrast('#0E9F8C').level, 'AA');
  assert.equal(rateContrast('#777777').level, 'AA-large');
});

test('el ratio mostrado nunca exagera: se trunca, no se redondea', () => {
  // 4,4781 redondeado daría "4.5", que junto a "no llega a AA" se contradice. El prototipo lo hacía.
  const r = rateContrast('#777777');
  assert.equal(r.ratio, 4.4);
  assert.equal(r.on, '#FFFFFF');
  assert.equal(rateContrast('#E5117F').ratio, 4.4);
});
