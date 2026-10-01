/* IMG_r — nombres y etiquetas.

   `legacyName` es la regla con la que la migración bautiza las imágenes que se subieron antes de
   IMG_r. La aplica el SQL (`image_legacy_name`); esta copia la fija y sirve para contrastar los
   nombres que produjo la migración. Si las dos se separan, la comparación del bloque 1 lo dice. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeChanges, downloadName, legacyName, normalizeTag, normalizeTags } from '../naming.ts';

test('legacyName prefiere el alt, que guarda el nombre original del fichero sin sanear', () => {
  assert.equal(
    legacyName('ChatGPT Image 20 ago 2026, 13_27_16', 'images/1787225969299-ChatGPT_Image_20_ago_2026__13_27_16.jpg'),
    'ChatGPT Image 20 ago 2026, 13_27_16',
  );
  assert.equal(legacyName('  hub (1)  ', 'images/1782815153902-hub__1_.jpg'), 'hub (1)');
});

test('legacyName sin alt quita la carpeta, la marca de tiempo y la extensión, y conserva _ y -', () => {
  assert.equal(legacyName(null, 'images/1789503530988-BLANC_MAD_02-215.jpg'), 'BLANC_MAD_02-215');
  assert.equal(legacyName('', 'images/1789503530988-BLANC_MAD_02-215.jpg'), 'BLANC_MAD_02-215');
  assert.equal(legacyName('   ', 'images/1782813956420-portada-v3-final.jpeg'), 'portada-v3-final');
});

test('legacyName nunca devuelve un nombre vacío', () => {
  assert.equal(legacyName(null, 'images/1789503530988-.jpg'), 'images/1789503530988-.jpg');
});

test('normalizeTag: minúsculas, espacios a un solo guion, sin guiones en los bordes, con tildes', () => {
  assert.equal(normalizeTag('  Sala   Grande '), 'sala-grande');
  assert.equal(normalizeTag('Presentación'), 'presentación');
  assert.equal(normalizeTag('--luz -- natural--'), 'luz-natural');
  assert.equal(normalizeTag('   '), '');
});

test('normalizeTag recorta a 40 caracteres sin dejar un guion colgando', () => {
  const t = normalizeTag(`${'a'.repeat(39)} b`);
  assert.equal(t, 'a'.repeat(39));
  assert.ok(t.length <= 40);
});

test('normalizeTags parte por comas, quita vacías y duplicados y respeta el orden', () => {
  assert.deepEqual(normalizeTags(['Oficina, luz', 'LUZ', '', 'oficina ', 'sala grande']), ['oficina', 'luz', 'sala-grande']);
});

test('downloadName quita lo que un sistema de ficheros no admite y conserva las tildes', () => {
  assert.equal(downloadName('Pasillo de la oficina: Poblenou', 'jpg'), 'Pasillo de la oficina Poblenou.jpg');
  assert.equal(downloadName('a/b\\c*d?"e<f>g|h', 'png'), 'abcdefgh.png');
  assert.equal(downloadName('Escalera  del   Mercat ', 'webp'), 'Escalera del Mercat.webp');
  assert.equal(downloadName('...', 'jpg'), 'imagen.jpg');
});

test('describeChanges cuenta solo lo que la otra pestaña cambió', () => {
  const opened = { name: 'Pasillo', tags: ['oficina', 'luz'] };
  assert.equal(
    describeChanges(opened, { name: 'Pasillo revisado', tags: ['oficina', 'portada', 'equipo'] }),
    'Sus cambios: nombre «Pasillo revisado»; etiquetas añadidas: portada, equipo; etiqueta quitada: luz.',
  );
  assert.equal(describeChanges(opened, { name: 'Pasillo', tags: ['oficina', 'luz', 'portada'] }), 'Sus cambios: etiqueta añadida: portada.');
  assert.equal(describeChanges(opened, { name: 'Pasillo', tags: ['luz', 'oficina'] }), '');
});
