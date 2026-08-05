import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { answerKeys, checkTranslation, formSystemPrompt, isTranslateTarget } from '../translate.ts';
import { compileForm } from '../compile.ts';

const real = () => readFileSync(join(process.cwd(), 'content', 'forms', 'massimo-dutti.md'), 'utf8');

const DOC = `---
id: fk_x
slug: mi-form
title: Título original
status: published
accent: opal
fields:
  - type: text
    name: nombre
    label: Nombre y apellidos
    required: true
  - type: radio
    name: canal
    label: Canal preferido
    options:
      - Email
      - Teléfono
---

Cuerpo original.
`;

/* ── El caso bueno: se traduce lo visible y nada más. */

test('una traducción correcta no genera ningún problema', () => {
  const ok = DOC
    .replace('title: Título original', 'title: Original title')
    .replace('label: Nombre y apellidos', 'label: Full name')
    .replace('label: Canal preferido', 'label: Preferred channel')
    .replace('Cuerpo original.', 'Original body.');
  assert.deepEqual(checkTranslation(DOC, ok), []);
});

test('traducir las opciones en forma corta es legítimo', () => {
  // En forma corta el string es a la vez valor y etiqueta: traducirlo es lo esperado.
  const ok = DOC.replace('      - Teléfono', '      - Phone');
  assert.deepEqual(checkTranslation(DOC, ok), []);
});

/* ── Lo que el verificador tiene que cazar. Cada uno de estos rompe datos reales. */

test('traducir un `name` se rechaza — es la clave de las respuestas guardadas', () => {
  const malo = DOC.replace('name: nombre', 'name: full_name');
  const problemas = checkTranslation(DOC, malo);
  assert.equal(problemas.length, 1);
  assert.equal(problemas[0].kind, 'name');
  assert.match(problemas[0].detail, /nombre.*full_name/);
});

test('traducir un `type` se rechaza — es el discriminante del esquema', () => {
  const malo = DOC.replace('- type: text', '- type: texto');
  const problemas = checkTranslation(DOC, malo);
  // Un type inválido ni siquiera compila: se caza igual, antes de comparar.
  assert.ok(problemas.length > 0);
});

test('cambiar el id o el slug se rechaza — son la URL pública', () => {
  assert.ok(checkTranslation(DOC, DOC.replace('id: fk_x', 'id: fk_y')).some((p) => p.kind === 'id'));
  assert.ok(checkTranslation(DOC, DOC.replace('slug: mi-form', 'slug: my-form')).some((p) => p.kind === 'slug'));
});

test('cambiar el status o el acento se rechaza', () => {
  assert.ok(checkTranslation(DOC, DOC.replace('status: published', 'status: draft')).some((p) => p.kind === 'status'));
  assert.ok(checkTranslation(DOC, DOC.replace('accent: opal', 'accent: emerald')).some((p) => p.kind === 'accent'));
});

test('perder o inventar un campo se rechaza', () => {
  const menos = DOC.replace(/  - type: radio[\s\S]*?      - Teléfono\n/, '');
  const problemas = checkTranslation(DOC, menos);
  assert.ok(problemas.some((p) => p.kind === 'campos'), JSON.stringify(problemas));
});

test('perder una opción se rechaza', () => {
  const menos = DOC.replace('      - Teléfono\n', '');
  assert.ok(checkTranslation(DOC, menos).some((p) => p.kind === 'opciones'));
});

test('cambiar `required` se rechaza', () => {
  const malo = DOC.replace('    required: true', '    required: false');
  assert.ok(checkTranslation(DOC, malo).some((p) => p.kind === 'required'));
});

test('el `value` de una opción en forma larga no puede traducirse', () => {
  const largo = DOC.replace(
    '      - Email\n      - Teléfono',
    '      - { value: email, label: Email }\n      - { value: phone, label: Teléfono }',
  );
  const traducido = largo.replace('{ value: phone, label: Teléfono }', '{ value: telefono, label: Phone }');
  const problemas = checkTranslation(largo, traducido);
  assert.ok(problemas.some((p) => p.kind === 'opciones'), JSON.stringify(problemas));
});

test('una traducción que rompe el YAML se rechaza entera', () => {
  const roto = DOC.replace('title: Título original', 'title: Prework: sin comillas');
  const problemas = checkTranslation(DOC, roto);
  assert.ok(problemas.length > 0);
  assert.equal(problemas[0].kind, 'yaml');
});

/* ── Sobre el formulario real, que es el que tiene respuestas. */

test('las claves de respuesta del formulario real son las esperadas', () => {
  const res = compileForm(real());
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.deepEqual(answerKeys(res.def), [
    'nombre',
    'posicionamiento_premium',
    'funnel',
    'canales',
    'iniciativas-no-contempladas',
    'cambio',
    'consentimiento',
  ]);
});

test('traducir el formulario real conservando los name no da problemas', () => {
  const raw = real();
  const traducido = raw
    .replace('title: Taller de Alineamiento estratégico', 'title: Strategic Alignment Workshop')
    .replace('intro_title: Antes de empezar', 'intro_title: Before we start')
    .replace('label: 1 - Nombre y apellidos', 'label: 1 - Full name');
  assert.deepEqual(checkTranslation(raw, traducido), []);
});

/* ── El prompt nombra explícitamente lo que no se toca. */

test('el prompt prohíbe tocar las claves de identidad', () => {
  const p = formSystemPrompt('English');
  for (const clave of ['name:', 'type:', 'id:', 'slug:', 'status:', 'accent:']) {
    assert.ok(p.includes(clave), `el prompt debería mencionar ${clave}`);
  }
  assert.match(p, /orphans/i);
});

test('isTranslateTarget solo acepta los tres idiomas', () => {
  assert.ok(isTranslateTarget('es') && isTranslateTarget('ca') && isTranslateTarget('en'));
  assert.ok(!isTranslateTarget('fr'));
  assert.ok(!isTranslateTarget(''));
  assert.ok(!isTranslateTarget(undefined));
});
