import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdictFrom, type StyleChecks } from '../analyze/verdict.ts';

/* La regla de docs/features/img-r.md: «si» si cumple todos los que aplican; «no» si falla la mayoría;
   «parcial» en el resto. La aplica el código y no el modelo: en la prueba del plan, el modelo dio
   «parcial» a un andén de metro con 4 de 6 criterios fallidos. */

const all = (v: boolean | null): StyleChecks => ({ film: v, dof: v, light: v, motion: v, not_stock: v, subject: v });

test('si se cumplen todos los criterios que aplican, encaja', () => {
  assert.equal(verdictFrom(all(true)), 'si');
  assert.equal(verdictFrom({ ...all(true), motion: null }), 'si');
});

test('si falla más de la mitad de los que aplican, no encaja', () => {
  assert.equal(verdictFrom(all(false)), 'no');
  // El andén de la prueba: 4 de 6 fallidos.
  assert.equal(verdictFrom({ film: false, dof: false, light: false, motion: true, not_stock: false, subject: true }), 'no');
});

test('con la mitad o menos de fallos, encaja en parte', () => {
  // La foto de equipo de la prueba: 2 de 6 fallidos.
  assert.equal(verdictFrom({ film: true, dof: false, light: true, motion: true, not_stock: false, subject: true }), 'parcial');
  // Justo la mitad no es mayoría.
  assert.equal(verdictFrom({ film: false, dof: false, light: false, motion: true, not_stock: true, subject: true }), 'parcial');
});

test('los criterios que no aplican no cuentan', () => {
  // 2 fallos de 3 que aplican: mayoría.
  assert.equal(verdictFrom({ film: false, dof: false, light: true, motion: null, not_stock: null, subject: null }), 'no');
});

test('si no aplica ninguno, no se afirma que encaje', () => {
  assert.equal(verdictFrom(all(null)), 'parcial');
});
