/* La slug como URL pública, y la capa de metadatos que cuelga de ella.

   Lo que se protege aquí es lo que se rompe en silencio: una slug que deja de resolver, una copia
   que se lleva la URL del original, un formulario privado que empieza a publicar datos
   estructurados con el nombre del cliente dentro. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRouteKey, looksLikeSlug, normalizeSlug, slugError, SLUG_MAX } from '../slug.ts';
import { aiCrawlerMeta, formJsonLd, formPath, formUrl, shareDescription, AI_AGENTS } from '../seo.ts';
import { applyMeta, duplicateMd } from '../edit.ts';
import { compileForm } from '../compile.ts';
import type { FormDraft } from '../schema.ts';

const DOC = `---
id: fk_x
title: Título
status: draft
fields:
  - type: text
    name: a
    label: A
---

Cuerpo.
`;

const draft = (over: Partial<FormDraft> = {}): FormDraft => {
  const res = compileForm(DOC);
  assert.equal(res.ok, true);
  if (!res.ok) throw new Error('fixture rota');
  return { ...res.def, ...over };
};

/* ── normalizeSlug: lo que se teclea → lo que vale. */

test('normalizeSlug quita acentos, espacios y mayúsculas', () => {
  assert.equal(normalizeSlug('Taller de Estrategia'), 'taller-de-estrategia');
  assert.equal(normalizeSlug('Massimo Dutti — Prework'), 'massimo-dutti-prework');
  // El ordinal `º` se cae sin dejar separador: "nº3" → "n3", que es como se lee.
  assert.equal(normalizeSlug('  ¿Sesión nº3?  '), 'sesion-n3');
});

test('normalizeSlug nunca deja guiones sueltos en los extremos', () => {
  assert.equal(normalizeSlug('---hola---'), 'hola');
  assert.equal(normalizeSlug('!!!'), '');
  assert.equal(normalizeSlug('a  b'), 'a-b');
});

test('normalizeSlug recorta al máximo sin dejar un guion colgando', () => {
  const largo = normalizeSlug(`${'a'.repeat(SLUG_MAX - 1)} palabra`);
  assert.ok(largo.length <= SLUG_MAX);
  assert.ok(!largo.endsWith('-'));
});

test('lo que sale de normalizeSlug siempre es una slug válida', () => {
  for (const entrada of ['Taller ACME', 'ñandú', '¡¡Hola!!', '2026/Q1 — plan', 'a_b_c']) {
    const out = normalizeSlug(entrada);
    if (!out) continue;
    assert.equal(slugError(out), null, `"${entrada}" → "${out}"`);
  }
});

/* ── slugError: la gramática, y por qué es la que es. */

test('una slug vacía es válida: significa "sin alias"', () => {
  assert.equal(slugError(''), null);
});

test('la slug no admite guiones bajos, para no poder parecerse nunca a un id público', () => {
  assert.ok(slugError('fk_Hjd81rX'));
  assert.equal(looksLikeSlug('fk_Hjd81rX'), false);
  assert.equal(looksLikeSlug('taller-acme'), true);
});

test('la slug rechaza mayúsculas, acentos y guiones dobles', () => {
  for (const malo of ['Taller', 'sesión', 'a--b', '-a', 'a-', 'con espacio']) {
    assert.ok(slugError(malo), `"${malo}" debería rechazarse`);
  }
});

test('los segmentos reservados no se pueden usar como slug', () => {
  assert.ok(slugError('api'));
  assert.ok(slugError('f'));
});

test('las slugs que ya hay escritas a mano en content/forms siguen siendo válidas', () => {
  for (const s of ['dutti-taller-estrategia', 'calidad-proyecto', 'prework-taller-acme', 'ejemplo-ranking']) {
    assert.equal(slugError(s), null, s);
  }
});

/* ── isRouteKey: el cinturón antes de PostgREST.

   El segmento de la URL se concatena dentro de un filtro `.or()`. Una coma o un paréntesis
   cambiarían la consulta, así que todo lo que no sea [A-Za-z0-9_-] tiene que caer antes. */

test('isRouteKey deja pasar ids y slugs, y nada más', () => {
  assert.equal(isRouteKey('fk_Hjd81rX'), true);
  assert.equal(isRouteKey('taller-acme'), true);
  for (const ataque of ['a,b', 'a)b', 'a.eq.b', 'a b', 'a/b', '', 'a'.repeat(121)]) {
    assert.equal(isRouteKey(ataque), false, ataque);
  }
});

/* ── La URL canónica. */

test('la canónica es la slug cuando la hay, y el id cuando no', () => {
  assert.equal(formPath(draft()), '/forms/f/fk_x');
  assert.equal(formPath(draft({ slug: 'taller-acme' })), '/forms/f/taller-acme');
  assert.equal(formUrl(draft({ slug: 'taller-acme' })), 'https://brand.interactius.com/forms/f/taller-acme');
});

/* ── duplicar: la copia NO se lleva la URL del original. */

test('duplicar quita la slug: dos formularios no pueden compartir URL', () => {
  const conSlug = DOC.replace('id: fk_x', 'id: fk_x\nslug: taller-acme');
  const copia = compileForm(duplicateMd(conSlug, { publicId: 'fk_y', title: 'T copia' }));
  assert.equal(copia.ok, true, copia.ok ? '' : JSON.stringify(copia.issues));
  if (!copia.ok) return;
  assert.equal(copia.def.slug, undefined);
  assert.equal(copia.def.id, 'fk_y');
});

/* ── applyMeta: las claves nuevas del modal de ajustes. */

test('applyMeta escribe slug, descripción, indexable y ai_crawlers', () => {
  const out = applyMeta(DOC, {
    title: 'Título',
    slug: 'taller-acme',
    description: 'Prework del taller de marzo.',
    indexable: true,
    ai_crawlers: 'allow',
  });
  const res = compileForm(out);
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.slug, 'taller-acme');
  assert.equal(res.def.description, 'Prework del taller de marzo.');
  assert.equal(res.def.indexable, true);
  assert.equal(res.def.ai_crawlers, 'allow');
});

test('applyMeta borra la clave en vez de escribir el valor por defecto', () => {
  const lleno = applyMeta(DOC, {
    title: 'Título',
    slug: 'taller-acme',
    description: 'Algo.',
    indexable: true,
    ai_crawlers: 'allow',
  });
  const vacio = applyMeta(lleno, {
    title: 'Título',
    slug: '',
    description: '',
    indexable: false,
    ai_crawlers: 'block',
  });

  for (const clave of ['slug:', 'description:', 'indexable:', 'ai_crawlers:']) {
    assert.ok(!vacio.includes(clave), `"${clave}" debería haberse borrado, no escrito a su valor por defecto`);
  }

  const res = compileForm(vacio);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.def.slug, undefined);
  assert.equal(res.def.indexable, false);
  assert.equal(res.def.ai_crawlers, 'block');
});

test('applyMeta sin las claves nuevas no las toca: crear y duplicar no opinan sobre la URL', () => {
  const conSlug = DOC.replace('id: fk_x', 'id: fk_x\nslug: taller-acme');
  const out = applyMeta(conSlug, { title: 'Otro título' });
  const res = compileForm(out);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.def.slug, 'taller-acme');
  assert.equal(res.def.title, 'Otro título');
});

test('una descripción con dos puntos no rompe el YAML', () => {
  const out = applyMeta(DOC, { title: 'T', description: 'Prework: antes del taller' });
  const res = compileForm(out);
  assert.equal(res.ok, true, res.ok ? '' : JSON.stringify(res.issues));
  if (!res.ok) return;
  assert.equal(res.def.description, 'Prework: antes del taller');
});

test('el esquema rechaza una slug imposible antes de que se pueda publicar', () => {
  const res = compileForm(DOC.replace('id: fk_x', 'id: fk_x\nslug: Taller ACME'));
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.ok(res.issues.some((i) => i.path === 'slug'));
});

/* ── Compartir. */

test('sin descripción propia se compone una con el cliente, y sin cliente no hay ninguna', () => {
  assert.equal(shareDescription(draft({ description: 'La mía' })), 'La mía');
  assert.equal(shareDescription(draft({ client: 'Acme' })), 'Formulario para Acme');
  assert.equal(shareDescription(draft()), undefined);
});

/* ── GEO. */

test('bloquear emite una directiva por agente; permitir no emite ninguna', () => {
  const bloqueado = aiCrawlerMeta(draft({ ai_crawlers: 'block' }));
  assert.equal(Object.keys(bloqueado).length, AI_AGENTS.length);
  assert.equal(bloqueado.GPTBot, 'noindex, nofollow, noarchive');
  assert.equal(bloqueado.ClaudeBot, 'noindex, nofollow, noarchive');

  assert.deepEqual(aiCrawlerMeta(draft({ ai_crawlers: 'allow' })), {});
});

test('un formulario no indexable no publica datos estructurados', () => {
  // Es el defecto, y es lo que evita que el nombre del cliente viaje en el HTML de un enlace privado.
  assert.equal(formJsonLd(draft({ client: 'Acme' })), null);
});

test('un formulario indexable publica JSON-LD con su canónica', () => {
  const ld = formJsonLd(draft({ indexable: true, slug: 'taller-acme', description: 'Prework.' }));
  assert.ok(ld);
  assert.equal(ld['@type'], 'WebPage');
  assert.equal(ld.url, 'https://brand.interactius.com/forms/f/taller-acme');
  assert.equal(ld.description, 'Prework.');
});
