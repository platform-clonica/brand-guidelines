import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendField, duplicateMd, getFrontmatterValue, setFrontmatterValue } from '../edit.ts';
import { compileForm } from '../compile.ts';
import { FIELD_SNIPPETS, newFormMd, newPublicId } from '../templates.ts';

const FIXTURE = join(process.cwd(), 'content', 'forms', 'massimo-dutti.md');
const real = () => readFileSync(FIXTURE, 'utf8');

const DOC = `---
id: fk_x
title: Título
status: draft
fields:
  - type: text
    name: a
    label: A
---

Cuerpo del formulario.
`;

/* ── setFrontmatterValue: publicar no debe reformatear el documento. */

test('cambia status sin tocar ninguna otra línea', () => {
  const out = setFrontmatterValue(DOC, 'status', 'published');
  assert.match(out, /^status: published$/m);

  const before = DOC.split('\n');
  const after = out.split('\n');
  assert.equal(before.length, after.length);
  const changed = before.map((l, i) => (l === after[i] ? null : i)).filter((x) => x !== null);
  assert.deepEqual(changed, [3]); // solo la línea de status
});

test('inserta status si no existía, justo tras title', () => {
  const doc = `---\nid: fk_x\ntitle: T\nfields:\n  - type: text\n    name: a\n    label: A\n---\n`;
  const out = setFrontmatterValue(doc, 'status', 'published');
  const lines = out.split('\n');
  assert.equal(lines[2], 'title: T');
  assert.equal(lines[3], 'status: published');
  assert.equal(compileForm(out).ok, true);
});

test('publicar y despublicar el formulario real lo deja compilando igual', () => {
  const raw = real();
  const draft = setFrontmatterValue(raw, 'status', 'draft');
  const back = setFrontmatterValue(draft, 'status', 'published');

  assert.equal(back, raw, 'la ida y vuelta tiene que ser idéntica al original');

  const a = compileForm(raw);
  const b = compileForm(draft);
  assert.equal(a.ok && b.ok, true);
  if (!a.ok || !b.ok) return;
  assert.equal(b.def.status, 'draft');
  assert.deepEqual(a.def.fields, b.def.fields);
});

test('sin frontmatter devuelve el texto intacto', () => {
  assert.equal(setFrontmatterValue('solo texto', 'status', 'published'), 'solo texto');
});

test('getFrontmatterValue lee la clave aunque el documento no compile', () => {
  const roto = `---\nid: fk_x\nstatus: published\nfields: [\n---\n`;
  assert.equal(compileForm(roto).ok, false);
  assert.equal(getFrontmatterValue(roto, 'status'), 'published');
});

test('getFrontmatterValue quita las comillas', () => {
  assert.equal(getFrontmatterValue(`---\ntitle: "Con comillas"\n---\n`, 'title'), 'Con comillas');
});

/* ── appendField: el resultado tiene que seguir compilando, siempre. */

test('añade un campo al final de la lista y sigue compilando', () => {
  const snippet = FIELD_SNIPPETS.find((s) => s.type === 'radio')!.snippet;
  const { md } = appendField(DOC, snippet);

  const res = compileForm(md);
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.fields.length, 2);
  assert.equal(res.def.fields[1].type, 'radio');
  assert.match(md, /Cuerpo del formulario\./); // el cuerpo se conserva
});

test('cada snippet de la paleta produce un documento que compila', () => {
  for (const s of FIELD_SNIPPETS) {
    const { md } = appendField(DOC, s.snippet);
    const res = compileForm(md);
    assert.equal(res.ok, true, `snippet "${s.type}" no compila: ${res.ok ? '' : JSON.stringify(res.issues)}`);
  }
});

test('añadir sobre el formulario real conserva los 7 campos y suma uno', () => {
  const raw = real();
  const snippet = FIELD_SNIPPETS.find((s) => s.type === 'date')!.snippet;
  const { md } = appendField(raw, snippet);

  const res = compileForm(md);
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.fields.length, 8);
  assert.equal(res.def.fields[7].type, 'date');
  assert.equal(res.def.fields[6].type, 'boolean'); // el consentimiento sigue en su sitio
  assert.match(res.def.intro, /^Como parte de la preparación/);
});

test('el rango devuelto señala exactamente el texto insertado', () => {
  const snippet = FIELD_SNIPPETS.find((s) => s.type === 'text')!.snippet;
  const { md, selectionStart, selectionEnd } = appendField(DOC, snippet);
  assert.equal(md.slice(selectionStart, selectionEnd), snippet);
});

test('crea la clave fields si el frontmatter no la tenía', () => {
  const sinFields = `---\nid: fk_x\ntitle: T\n---\n\nCuerpo.\n`;
  const snippet = FIELD_SNIPPETS.find((s) => s.type === 'text')!.snippet;
  const { md, selectionStart, selectionEnd } = appendField(sinFields, snippet);

  assert.match(md, /^fields:$/m);
  assert.equal(md.slice(selectionStart, selectionEnd), snippet);
  assert.equal(compileForm(md).ok, true);
});

test('no arrastra las líneas en blanco del final de la lista', () => {
  const conHueco = `---\nid: fk_x\ntitle: T\nfields:\n  - type: text\n    name: a\n    label: A\n\n---\n\nCuerpo.\n`;
  const snippet = FIELD_SNIPPETS.find((s) => s.type === 'text')!.snippet;
  const { md } = appendField(conHueco, snippet);
  const res = compileForm(md);
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.fields.length, 2);
});

/* ── duplicateMd: hereda todo menos lo que no debe heredarse. */

test('la copia del formulario real hereda campos e intro, pero no el id ni el estado', () => {
  const raw = real();
  const copia = duplicateMd(raw, { publicId: 'fk_Copia1', title: 'Taller (copia)', accent: 'opal' });

  const a = compileForm(raw);
  const b = compileForm(copia);
  assert.equal(a.ok && b.ok, true, b.ok ? '' : JSON.stringify(b));
  if (!a.ok || !b.ok) return;

  // Lo que cambia.
  assert.equal(b.def.id, 'fk_Copia1');
  assert.equal(b.def.title, 'Taller (copia)');
  assert.equal(b.def.status, 'draft');
  assert.equal(b.def.accent, 'opal');

  // Lo que se hereda.
  assert.deepEqual(b.def.fields, a.def.fields);
  assert.equal(b.def.intro, a.def.intro);
  assert.equal(b.def.client, a.def.client);
  assert.equal(b.def.background, a.def.background);
  assert.equal(b.def.logo, a.def.logo);
  assert.equal(b.def.success_message, a.def.success_message);
});

test('duplicar un formulario publicado nunca produce otro publicado', () => {
  const src = `---\nid: fk_x\ntitle: T\nstatus: published\nfields:\n  - type: text\n    name: a\n    label: A\n---\n`;
  const res = compileForm(duplicateMd(src, { publicId: 'fk_y', title: 'T copia' }));
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.def.status, 'draft');
});

test('duplicar añade el cliente si el original no lo tenía', () => {
  const src = `---\nid: fk_x\ntitle: T\nfields:\n  - type: text\n    name: a\n    label: A\n---\n`;
  const res = compileForm(duplicateMd(src, { publicId: 'fk_y', title: 'T copia', client: 'Acme' }));
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.def.client, 'Acme');
});

test('un título de copia con dos puntos no rompe el YAML', () => {
  const src = `---\nid: fk_x\ntitle: T\nfields:\n  - type: text\n    name: a\n    label: A\n---\n`;
  const res = compileForm(duplicateMd(src, { publicId: 'fk_y', title: 'Prework: copia' }));
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.title, 'Prework: copia');
});

/* ── templates */

test('el markdown de un formulario nuevo compila y nace como borrador', () => {
  const md = newFormMd({ title: 'Taller de estrategia', client: 'Acme', accent: 'opal' });
  const res = compileForm(md);
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.status, 'draft');
  assert.equal(res.def.accent, 'opal');
  assert.equal(res.def.client, 'Acme');
  assert.equal(res.def.title, 'Taller de estrategia');
  assert.match(res.def.id, /^fk_/);
});

test('un título con dos puntos no rompe el YAML de la plantilla', () => {
  const md = newFormMd({ title: 'Prework: sesión de alineamiento' });
  const res = compileForm(md);
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.title, 'Prework: sesión de alineamiento');
});

test('newPublicId genera ids con la forma esperada y sin repetirse', () => {
  const ids = new Set(Array.from({ length: 500 }, newPublicId));
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^fk_[A-Za-z1-9]{7}$/);
});
