import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileForm, splitFrontmatter } from '../compile.ts';

const FIXTURE = join(process.cwd(), 'content', 'forms', 'massimo-dutti.md');

const wrap = (yaml: string, body = '') => `---\n${yaml}\n---\n${body}`;

/* Frontmatter mínimo válido, para no repetirlo en cada caso. */
const BASE = `id: fk_test
title: Test
fields:
  - type: text
    name: nombre
    label: Nombre`;

/* ── El caso que importa de verdad: el formulario que está en producción. */

test('compila el formulario real de Massimo Dutti', () => {
  const raw = readFileSync(FIXTURE, 'utf8');
  const res = compileForm(raw);

  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues, null, 2));
  if (!res.ok) return;

  assert.equal(res.def.id, 'fk_Hjd81rX');
  assert.equal(res.def.slug, 'dutti-taller-estrategia');
  assert.equal(res.def.status, 'published');
  assert.equal(res.def.accent, 'opal');
  assert.equal(res.def.fields.length, 7);
  assert.deepEqual(
    res.def.fields.map((f) => f.type),
    ['text', 'scale', 'textarea', 'ranking', 'textarea', 'textarea', 'boolean'],
  );
  // La intro es el cuerpo Markdown, recortado.
  assert.match(res.def.intro, /^Como parte de la preparación/);
  assert.ok(!res.def.intro.endsWith('\n'));
  // Los defaults del esquema se aplican.
  assert.equal(res.def.allow_multiple, true);
  assert.equal(res.def.submit_label, 'Enviar respuestas');
});

test('parseForm y compileForm coinciden salvo en `version`', async () => {
  const { parseForm } = await import('../parse.ts');
  const raw = readFileSync(FIXTURE, 'utf8');

  const compiled = compileForm(raw);
  assert.equal(compiled.ok, true);
  if (!compiled.ok) return;

  const parsed = parseForm(raw, 'massimo-dutti.md');
  const { version, ...withoutVersion } = parsed;

  assert.equal(typeof version, 'string');
  assert.equal(version.length, 12);
  assert.deepEqual(withoutVersion, compiled.def);
});

/* ── Tolerancia: el editor nunca debe recibir una excepción. */

test('sin frontmatter → error, no excepción', () => {
  const res = compileForm('Solo texto suelto, sin guiones.');
  assert.equal(res.ok, false);
  assert.equal(res.def, null);
  assert.match(res.issues[0].message, /frontmatter/i);
  assert.equal(res.issues[0].line, 1);
});

test('frontmatter sin cerrar → error, no excepción', () => {
  const res = compileForm('---\nid: fk_x\ntitle: A medias');
  assert.equal(res.ok, false);
  assert.match(res.issues[0].message, /frontmatter/i);
});

test('YAML roto → error con línea', () => {
  const res = compileForm(wrap('id: fk_x\ntitle: "sin cerrar\nfields: []'));
  assert.equal(res.ok, false);
  assert.match(res.issues[0].message, /YAML inválido/);
  assert.ok(typeof res.issues[0].line === 'number');
});

test('indentación mala en fields → error, no excepción', () => {
  const res = compileForm(wrap('id: fk_x\ntitle: T\nfields:\n- type: text\n   name: mal\n  label: X'));
  assert.equal(res.ok, false);
  assert.ok(res.issues.length > 0);
});

test('fields vacío → error del esquema', () => {
  const res = compileForm(wrap('id: fk_x\ntitle: T\nfields: []'));
  assert.equal(res.ok, false);
  assert.ok(res.issues.some((i) => i.path.startsWith('fields')));
});

test('falta el title → error del esquema, apuntando a la clave', () => {
  const res = compileForm(wrap('id: fk_x\nfields:\n  - type: text\n    name: n\n    label: L'));
  assert.equal(res.ok, false);
  assert.ok(res.issues.some((i) => i.path === 'title'));
});

test('un tipo de campo inexistente no revienta el compilador', () => {
  const res = compileForm(wrap('id: fk_x\ntitle: T\nfields:\n  - type: teletransporte\n    name: n\n    label: L'));
  assert.equal(res.ok, false);
  assert.ok(res.issues.length > 0);
});

/* ── Comprobaciones entre campos. */

test('name duplicado → error que señala el segundo campo', () => {
  const res = compileForm(
    wrap(`id: fk_x
title: T
fields:
  - type: text
    name: repetido
    label: Uno
  - type: text
    name: repetido
    label: Dos`),
  );
  assert.equal(res.ok, false);
  const dup = res.issues.find((i) => /duplicado/.test(i.message));
  assert.ok(dup);
  assert.equal(dup.path, 'fields.1.name');
});

test('scale con min >= max → error', () => {
  const res = compileForm(
    wrap(`id: fk_x
title: T
fields:
  - type: scale
    name: s
    label: L
    min: 10
    max: 5`),
  );
  assert.equal(res.ok, false);
  assert.ok(res.issues.some((i) => i.path === 'fields.0.min'));
});

test('min_select mayor que el número de opciones → error', () => {
  const res = compileForm(
    wrap(`id: fk_x
title: T
fields:
  - type: checkbox
    name: c
    label: L
    options: [A, B]
    min_select: 5`),
  );
  assert.equal(res.ok, false);
  assert.ok(res.issues.some((i) => i.path === 'fields.0.min_select'));
});

/* ── Avisos: compila igual, pero se señalan. */

test('solo bloques presentacionales → compila con aviso', () => {
  const res = compileForm(
    wrap(`id: fk_x
title: T
fields:
  - type: section
    title: Solo texto`),
  );
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.ok(res.issues.some((i) => i.level === 'warning' && /responder/.test(i.message)));
});

test('opciones con el mismo valor → compila con aviso', () => {
  const res = compileForm(
    wrap(`id: fk_x
title: T
fields:
  - type: radio
    name: r
    label: L
    options: [Sí, Sí, No]`),
  );
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.ok(res.issues.some((i) => i.level === 'warning' && i.path === 'fields.0.options'));
});

test('un formulario correcto no genera ningún aviso', () => {
  const res = compileForm(wrap(BASE));
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.deepEqual(res.issues, []);
});

/* ── Localización de líneas: el panel lleva el cursor al sitio. */

test('la línea del error apunta a la clave dentro del campo', () => {
  //  1: ---
  //  2: id: fk_x
  //  3: title: T
  //  4: fields:
  //  5:   - type: text
  //  6:     name: a
  //  7:     label: A
  //  8:   - type: scale
  //  9:     name: b
  // 10:     label: B
  // 11:     min: 9
  // 12:     max: 2
  const res = compileForm(
    wrap(`id: fk_x
title: T
fields:
  - type: text
    name: a
    label: A
  - type: scale
    name: b
    label: B
    min: 9
    max: 2`),
  );
  assert.equal(res.ok, false);
  const issue = res.issues.find((i) => i.path === 'fields.1.min');
  assert.ok(issue);
  assert.equal(issue.line, 11);
});

test('la línea de un error de clave raíz apunta a esa clave', () => {
  const res = compileForm(wrap('id: fk_x\ntitle: 42\nfields:\n  - type: text\n    name: n\n    label: L'));
  assert.equal(res.ok, false);
  const issue = res.issues.find((i) => i.path === 'title');
  assert.ok(issue);
  assert.equal(issue.line, 3);
});

/* ── splitFrontmatter, que es donde se esconden los casos raros. */

test('splitFrontmatter tolera CRLF y BOM', () => {
  const s = splitFrontmatter('﻿---\r\nid: fk_x\r\n---\r\nCuerpo');
  assert.ok(s);
  assert.equal(s.yaml, 'id: fk_x');
  assert.equal(s.body, 'Cuerpo');
});

test('splitFrontmatter no confunde un --- del cuerpo con el cierre', () => {
  const s = splitFrontmatter('---\nid: fk_x\n---\nUno\n\n---\n\nDos');
  assert.ok(s);
  assert.equal(s.yaml, 'id: fk_x');
  assert.match(s.body, /^Uno/);
  assert.match(s.body, /Dos$/);
});

test('cuerpo vacío → intro vacía, sin romper', () => {
  const res = compileForm(wrap(BASE));
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.def.intro, '');
});
