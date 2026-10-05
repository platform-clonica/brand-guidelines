import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ZIP_MAX_BYTES,
  ZIP_MAX_FILES,
  blockedMessage,
  deleteDone,
  deleteMessage,
  downloadDone,
  downloadStart,
  selectVisibleLabel,
  selectedLabel,
  tagsDone,
  tagsIntro,
  zipBlocked,
  zipEntries,
  zipName,
} from '../bulk.ts';

/* Entrega 3: los textos de la barra y de sus modales (G9 a G12), con su singular, y lo que entra en el ZIP
   (G11). La copia nueva respecto al prototipo está marcada en el plan para que Carlos la apruebe. */

test('la barra: «N seleccionada(s)» y «Seleccionar las N visibles»', () => {
  assert.equal(selectedLabel(1), '1 seleccionada');
  assert.equal(selectedLabel(3), '3 seleccionadas');
  assert.equal(selectVisibleLabel(1), 'Seleccionar la visible');
  assert.equal(selectVisibleLabel(24), 'Seleccionar las 24 visibles');
});

test('añadir etiquetas: la entradilla y el aviso, con singular', () => {
  assert.equal(tagsIntro(1), 'Se añaden a la imagen seleccionada. Las etiquetas que ya tiene no cambian.');
  assert.equal(tagsIntro(3), 'Se añaden a las 3 imágenes seleccionadas. Las etiquetas que ya tienen no cambian.');
  assert.equal(tagsDone({ done: 3, full: 0, missing: 0 }), 'Etiquetas añadidas a 3 imágenes');
  assert.equal(tagsDone({ done: 1, full: 0, missing: 0 }), 'Etiquetas añadidas a 1 imagen');
  assert.equal(tagsDone({ done: 2, full: 1, missing: 0 }), 'Etiquetas añadidas a 2 imágenes · 1 ya tenía 10 etiquetas');
  assert.equal(tagsDone({ done: 2, full: 2, missing: 1 }), 'Etiquetas añadidas a 2 imágenes · 2 ya tenían 10 etiquetas · 1 ya no está en el banco');
});

test('eliminar: la confirmación dice qué se borra, y sin «original» si todas son antiguas', () => {
  assert.equal(deleteMessage(1, false), 'Se borrará 1 imagen, con su original y su versión ligera. Esta acción no se puede deshacer.');
  assert.equal(deleteMessage(3, false), 'Se borrarán 3 imágenes, con sus originales y sus versiones ligeras. Esta acción no se puede deshacer.');
  assert.equal(deleteMessage(2, true), 'Se borrarán 2 imágenes. Esta acción no se puede deshacer.');
});

test('eliminar: las que están en uso, con singular, y cuando no se puede ninguna', () => {
  assert.equal(blockedMessage(1, 3), '1 no se puede eliminar porque se usa en documentos. Cambia la imagen en ellos y vuelve a intentarlo.');
  assert.equal(blockedMessage(2, 3), '2 no se pueden eliminar porque se usan en documentos. Cambia la imagen en ellos y vuelve a intentarlo.');
  assert.equal(blockedMessage(3, 3), 'Ninguna se puede eliminar porque se usan en documentos. Cambia la imagen en ellos y vuelve a intentarlo.');
  assert.equal(blockedMessage(1, 1), 'Se usa en documentos. Cambia la imagen en ellos y vuelve a intentarlo.');
});

test('eliminar: el aviso final cuenta lo que pasó de verdad', () => {
  assert.equal(deleteDone({ deleted: 1, blocked: 0, failed: 0 }), '1 imagen eliminada');
  assert.equal(deleteDone({ deleted: 4, blocked: 1, failed: 0 }), '4 imágenes eliminadas · 1 en uso no se ha tocado');
  assert.equal(deleteDone({ deleted: 2, blocked: 3, failed: 1 }), '2 imágenes eliminadas · 3 en uso no se han tocado · 1 no se ha podido eliminar');
});

const row = (name: string, original: string | null, bytes: number | null = 1000) => ({
  name,
  url: `https://x/${name}-light.jpg`,
  original_path: original,
  original_bytes: bytes,
});
const urlFor = (p: string) => `https://x/${p}`;

test('el ZIP lleva los originales con el nombre de la imagen, y la ligera de las antiguas', () => {
  const e = zipEntries([row('Sala', 'images/a/original.png'), row('Antigua', null, null)], urlFor);
  assert.deepEqual(e.files, [
    { url: 'https://x/images/a/original.png', name: 'Sala.png' },
    { url: 'https://x/Antigua-light.jpg', name: 'Antigua.jpg' },
  ]);
  assert.equal(e.legacy, 1);
});

test('en el ZIP no se repite ningún nombre', () => {
  const e = zipEntries([row('Sala', 'images/a/original.jpg'), row('Sala', 'images/b/original.jpg'), row('sala', 'images/c/original.jpg')], urlFor);
  assert.deepEqual(e.files.map((f) => f.name), ['Sala.jpg', 'Sala (2).jpg', 'sala (3).jpg']);
});

test('el ZIP tiene dos topes: 50 imágenes y 100 MB', () => {
  assert.equal(ZIP_MAX_FILES, 50);
  assert.equal(ZIP_MAX_BYTES, 100 * 1024 * 1024);
  assert.equal(zipBlocked(50, ZIP_MAX_BYTES), null);
  assert.equal(zipBlocked(51, 10), 'Puedes descargar hasta 50 imágenes a la vez.');
  assert.equal(zipBlocked(3, ZIP_MAX_BYTES + 1), 'La selección pesa 100,0 MB. Puedes descargar hasta 100 MB a la vez.');
  const heavy = zipEntries([row('A', 'images/a/original.jpg', 60 * 1024 * 1024), row('B', 'images/b/original.jpg', 50 * 1024 * 1024)], urlFor);
  assert.equal(heavy.bytes, 110 * 1024 * 1024);
});

test('el aviso de la descarga, y cuando falla alguna', () => {
  assert.equal(downloadStart(3, 1), 'Descargando 3 imágenes en un ZIP · 1 solo en versión ligera');
  assert.equal(downloadStart(1, 0), 'Descargando 1 imagen en un ZIP');
  assert.equal(downloadDone(3, 0), null);
  assert.equal(downloadDone(3, 1), 'ZIP descargado con 2 imágenes · 1 no se ha podido descargar');
  assert.equal(downloadDone(3, 3), 'No se ha podido preparar el ZIP. Vuelve a intentarlo.');
});

test('el nombre del ZIP lleva la fecha', () => {
  assert.equal(zipName(new Date(2026, 9, 5)), 'imagenes-interactius-2026-10-05.zip');
});
