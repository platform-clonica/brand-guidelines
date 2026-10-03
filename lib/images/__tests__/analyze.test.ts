import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analysisSchema, ANALYSIS_JSON_SCHEMA, CHECK_KEYS, storedStyleSchema } from '../analyze/schema.ts';

/* La salida del análisis (propuesta de nombre y etiquetas, personas y estilo). El modelo la devuelve con
   structured outputs; el esquema Zod la vuelve a validar en el servidor antes de usarla. */

const valid = {
  name: 'Oficina vacía con mamparas de vidrio',
  tags: ['oficina', 'espacio'],
  people_present: false,
  style: {
    reason: 'Interior muy nítido y con luz artificial homogénea.',
    checks: { film: false, dof: false, light: false, motion: false, not_stock: false, subject: true },
  },
};

test('el esquema acepta una salida válida, con criterios que no aplican', () => {
  assert.ok(analysisSchema.safeParse(valid).success);
  assert.ok(analysisSchema.safeParse({ ...valid, style: { ...valid.style, checks: { ...valid.style.checks, motion: null } } }).success);
});

test('el esquema rechaza claves desconocidas, criterios de más o de menos y valores que no son sí, no o nulo', () => {
  assert.equal(analysisSchema.safeParse({ ...valid, extra: 1 }).success, false);
  assert.equal(analysisSchema.safeParse({ ...valid, style: { ...valid.style, checks: { ...valid.style.checks, people: true } } }).success, false);
  const sinSujeto: Partial<typeof valid.style.checks> = { ...valid.style.checks };
  delete sinSujeto.subject;
  assert.equal(analysisSchema.safeParse({ ...valid, style: { ...valid.style, checks: sinSujeto } }).success, false);
  assert.equal(analysisSchema.safeParse({ ...valid, style: { ...valid.style, checks: { ...valid.style.checks, film: 'sí' } } }).success, false);
});

test('el veredicto no lo da el modelo: la salida no lo admite', () => {
  assert.equal(analysisSchema.safeParse({ ...valid, style: { ...valid.style, verdict: 'si' } }).success, false);
});

test('el JSON Schema que se manda a la API pide exactamente las mismas claves que valida Zod', () => {
  assert.deepEqual(Object.keys(ANALYSIS_JSON_SCHEMA.properties).sort(), ['name', 'people_present', 'style', 'tags']);
  assert.deepEqual(Object.keys(ANALYSIS_JSON_SCHEMA.properties.style.properties).sort(), ['checks', 'reason']);
  assert.deepEqual(Object.keys(ANALYSIS_JSON_SCHEMA.properties.style.properties.checks.properties), [...CHECK_KEYS]);
  assert.deepEqual(ANALYSIS_JSON_SCHEMA.properties.style.properties.checks.required, [...CHECK_KEYS]);
});

test('el estilo que se guarda con la imagen solo admite los tres veredictos', () => {
  const ok = { verdict: 'parcial', checks: valid.style.checks, reason: null, people_present: true };
  assert.ok(storedStyleSchema.safeParse(ok).success);
  assert.equal(storedStyleSchema.safeParse({ ...ok, verdict: 'quizá' }).success, false);
  assert.equal(storedStyleSchema.safeParse({ ...ok, verdict: 'yes' }).success, false);
});
