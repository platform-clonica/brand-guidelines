/* IMG_r — lo que la tarjeta y el detalle enseñan de una fila.

   Las imágenes subidas antes de IMG_r no tienen original, ni miniatura, ni medidas: es donde más
   fácil se rompe la pantalla, y por eso tiene test. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_NOTE, downloads, editableName, editedNote, editFacts, errorText, factLines, formatDate, isLegacy, styleOf, styleRows, thumbSrc, usedByText } from '../view.ts';

const ID = '3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6f';
const urlFor = (path: string) => `https://x.supabase.co/storage/v1/object/public/deck-images/${path}`;

const nueva = {
  name: 'Pasillo de la oficina',
  url: urlFor(`images/${ID}/light.jpg`),
  width: 1600,
  height: 1067,
  original_path: `images/${ID}/original.png`,
  original_bytes: Math.round(14.2 * 1024 * 1024),
  original_width: 6000,
  original_height: 4000,
  thumb_path: `images/${ID}/thumb.jpg`,
  created_at: '2026-09-28T09:00:00+00:00',
};

const antigua = {
  name: 'BLANC_MAD_02-215',
  url: urlFor('images/1789503530988-BLANC_MAD_02-215.jpg'),
  width: null,
  height: null,
  original_path: null,
  original_bytes: null,
  original_width: null,
  original_height: null,
  thumb_path: null,
  created_at: '2026-05-14T09:00:00+00:00',
};

test('una imagen es antigua si no tiene original', () => {
  assert.equal(isLegacy(nueva), false);
  assert.equal(isLegacy(antigua), true);
});

test('la miniatura es la de 480 px y, si no hay, la ligera', () => {
  assert.equal(thumbSrc(nueva, urlFor), urlFor(`images/${ID}/thumb.jpg`));
  assert.equal(thumbSrc(antigua, urlFor), antigua.url);
});

test('la fecha va en castellano, día, mes corto y año', () => {
  assert.match(formatDate('2026-09-28T09:00:00+00:00'), /^28 sept?\.? 2026$/);
});

test('datos de una nueva: original con medidas y peso, ligera con medidas y JPEG', () => {
  const f = factLines(nueva, 'Carlos Ruiz Re');
  assert.equal(f.original, '6000 × 4000 px · 14,2 MB');
  assert.equal(f.light, '1600 × 1067 px · JPEG');
  assert.match(f.uploaded, /^28 sept?\.? 2026 · Carlos Ruiz Re$/);
});

test('datos de una antigua: «No se guardó», y las medidas de la ligera solo si ya se conocen', () => {
  const sin = factLines(antigua, null);
  assert.equal(sin.original, 'No se guardó');
  assert.equal(sin.light, 'JPEG');
  assert.match(sin.uploaded, /^14 may\.? 2026$/);
  assert.equal(factLines(antigua, null, { width: 1600, height: 1067 }).light, '1600 × 1067 px · JPEG');
});

test('una nueva se descarga en original y en ligera, con el nombre de la imagen', () => {
  const [original, ligera] = downloads(nueva, urlFor);
  assert.equal(original.href, `${urlFor(`images/${ID}/original.png`)}?download=${encodeURIComponent('Pasillo de la oficina.png')}`);
  assert.equal(original.label, 'Descargar original');
  assert.equal(original.toast, 'Descargando el original · 14,2 MB');
  assert.equal(ligera.href, `${nueva.url}?download=${encodeURIComponent('Pasillo de la oficina.jpg')}`);
  assert.equal(ligera.label, 'Descargar versión ligera');
  assert.equal(ligera.toast, 'Descargando la versión ligera · JPEG 1600 px');
});

test('una antigua solo ofrece la ligera, y la nota lo explica', () => {
  const d = downloads(antigua, urlFor);
  assert.equal(d.length, 1);
  assert.equal(d[0].label, 'Descargar versión ligera');
  assert.equal(
    LEGACY_NOTE,
    'Esta imagen se subió desde un deck antes de que existiera IMG_r. Solo se guardó la versión ligera de 1600 px: no hay original que descargar.',
  );
});

test('la ligera de un original pequeño dice su lado largo real', () => {
  const pequena = { ...nueva, width: 1200, height: 800 };
  assert.equal(downloads(pequena, urlFor)[1].toast, 'Descargando la versión ligera · JPEG 1200 px');
});

test('errorText: el mensaje de la API sí; el fallo de red del navegador, en inglés, no', () => {
  assert.equal(errorText(new Error('Esa imagen ya no está en el banco.'), 'No se pudo.'), 'Esa imagen ya no está en el banco.');
  // fetch rechaza con TypeError («Failed to fetch», «Load failed»…): eso no se enseña.
  assert.equal(errorText(new TypeError('Failed to fetch'), 'No se pudo.'), 'No se pudo.');
  assert.equal(errorText('algo', 'No se pudo.'), 'No se pudo.');
  assert.equal(errorText(new Error(''), 'No se pudo.'), 'No se pudo.');
});

test('editableName: una antigua empieza vacía solo mientras conserva el nombre del fichero', () => {
  const legacy = { name: 'ChatGPT Image 21 sept 2026, 18_48_07', alt: 'ChatGPT Image 21 sept 2026, 18_48_07', storage_path: 'images/1790-ChatGPT_Image.jpg', original_path: null };
  assert.equal(editableName(legacy), '');
  // Ya renombrada en IMG_r: se edita su nombre, no se vuelve a escribir.
  assert.equal(editableName({ ...legacy, name: 'Mesa de trabajo con portátil' }), 'Mesa de trabajo con portátil');
  // Las nuevas siempre con su nombre.
  assert.equal(editableName({ ...legacy, name: 'Pasillo', original_path: 'images/x/original.jpg' }), 'Pasillo');
});

/* Fase 2: el estilo de una fila, y las seis filas del banner desplegado (F25). */
test('styleOf: sin veredicto o sin criterios, la imagen está sin analizar', () => {
  const checks = { film: true, dof: false, light: true, motion: null, not_stock: true, subject: true };
  assert.equal(styleOf({ style_verdict: null, style_checks: null, style_reason: null, people_present: null }), null);
  assert.equal(styleOf({ style_verdict: 'si', style_checks: null, style_reason: null, people_present: null }), null);
  assert.deepEqual(styleOf({ style_verdict: 'parcial', style_checks: checks, style_reason: 'Motivo.', people_present: true }), {
    verdict: 'parcial', checks, reason: 'Motivo.', people_present: true,
  });
});

test('styleRows: los seis criterios con Sí, No o No aplica, y el sexto según haya personas', () => {
  const checks = { film: true, dof: false, light: true, motion: null, not_stock: true, subject: true };
  const rows = styleRows({ verdict: 'parcial', checks, reason: null, people_present: true });
  assert.deepEqual(rows.map((r) => r.value), ['Sí', 'No', 'Sí', 'No aplica', 'Sí', 'Sí']);
  assert.equal(rows[0].label, 'Película analógica: grano fino y color tipo Portra');
  assert.equal(rows[5].label, 'Personas sin posar, sin mirar a cámara ni sonreír de forma corporativa');
  const sinPersonas = styleRows({ verdict: 'parcial', checks, reason: null, people_present: false });
  assert.equal(sinPersonas[5].label, 'El sujeto es el espacio, los objetos o la luz, sin figuras humanas');
});

/* Fase 2: el detalle de una editada (F18) y de una sobrescrita (F19). */
const editada = {
  name: 'Pasillo (editada)', url: 'https://x/l.jpg', width: 1600, height: 1067,
  original_path: 'images/e/original.jpg', original_bytes: 3_000_000, original_width: 2528, original_height: 1686,
  thumb_path: 'images/e/thumb.jpg', created_at: '2026-10-03T10:00:00Z',
  source: 'edited' as const, prior_original_path: null, prompt: 'más cálida', prompt_variant: 'people' as const, edit_model: 'fast',
};

test('una editada dice «Editada» en lugar de «Original» y se descarga como «Descargar editada»', () => {
  assert.equal(factLines(editada, null).originalLabel, 'Editada');
  assert.equal(factLines({ ...editada, source: 'upload' as const, prompt: null, prompt_variant: null, edit_model: null }, null).originalLabel, 'Original');
  const d = downloads(editada, (p) => `https://x/${p}`);
  assert.equal(d[0].label, 'Descargar editada');
  assert.match(d[0].toast, /^Descargando la versión editada · /);
});

test('los datos de la edición: prompt, modelo e indicación si la hubo', () => {
  assert.deepEqual(editFacts(editada), { prompt: 'Personas', model: 'Nano Banana 2', instruction: 'más cálida' });
  assert.deepEqual(editFacts({ ...editada, prompt_variant: 'standard', edit_model: 'pro', prompt: null }), {
    prompt: 'Estándar', model: 'Nano Banana Pro', instruction: null,
  });
  assert.equal(editFacts({ ...editada, source: 'upload' as const, prompt_variant: null }), null);
});

test('la nota de la editada dice a cuántos px sale como máximo', () => {
  assert.equal(editedNote(editada), 'La versión editada sale a 2528 px de lado como máximo, aunque el original fuera más grande.');
});

test('una sobrescrita ofrece también «Descargar original previo»', () => {
  const sobrescrita = { ...editada, name: 'Pasillo', prior_original_path: 'images/e/original.jpg' };
  const d = downloads(sobrescrita, (p) => `https://x/${p}`);
  assert.deepEqual(d.map((x) => x.label), ['Descargar editada', 'Descargar versión ligera', 'Descargar original previo']);
  assert.match(d[2].href, /download=/);
});

test('usedByText: quién usa la imagen, en una frase', () => {
  assert.equal(usedByText([{ kind: 'deck', id: '1', name: 'Propuesta A' }]), 'la usa deck «Propuesta A»');
  assert.equal(
    usedByText([{ kind: 'deck', id: '1', name: 'A' }, { kind: 'form', id: '2', name: 'B' }]),
    'la usan deck «A» y formulario «B»',
  );
  assert.equal(
    usedByText([{ kind: 'deck', id: '1', name: 'A' }, { kind: 'deck', id: '2', name: 'B' }, { kind: 'form', id: '3', name: 'C' }]),
    'la usan deck «A», deck «B» y formulario «C»',
  );
});
