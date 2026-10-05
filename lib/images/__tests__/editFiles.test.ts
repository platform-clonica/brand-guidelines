import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyName, editedPaths, overwritePlan, parseTmp, revertPlan, staleTmp, tmpPaths } from '../edit/files.ts';

const ID = '0b6c2a1e-5f1d-4a3b-9c7e-2d8f4e6a1b3c';
const TMP = '9f1e2d3c-4b5a-4c6d-8e7f-0a1b2c3d4e5f';

test('los temporales de una edición viven en images/_tmp/, el resultado y sus dos variantes', () => {
  assert.deepEqual(tmpPaths(TMP, 'jpg'), {
    result: `images/_tmp/${TMP}.jpg`,
    light: `images/_tmp/${TMP}-light.jpg`,
    thumb: `images/_tmp/${TMP}-thumb.jpg`,
  });
});

test('parseTmp solo acepta un temporal de images/_tmp/ con id y extensión de imagen', () => {
  assert.deepEqual(parseTmp(`images/_tmp/${TMP}.jpg`), { id: TMP, ext: 'jpg' });
  assert.deepEqual(parseTmp(`images/_tmp/${TMP}.png`), { id: TMP, ext: 'png' });
  assert.equal(parseTmp(`images/_tmp/${TMP}-light.jpg`), null);
  assert.equal(parseTmp(`images/${ID}/original.jpg`), null);
  assert.equal(parseTmp(`images/_tmp/../${ID}/original.jpg`), null);
  assert.equal(parseTmp(`images/_tmp/${TMP}.gif`), null);
  assert.equal(parseTmp('images/_tmp/no-es-un-id.jpg'), null);
});

test('sobrescribir usa rutas nuevas, con una marca: la URL cambia y no hay caché vieja', () => {
  assert.deepEqual(editedPaths(ID, 'image/jpeg', 'a1b2c3d4'), {
    original: `images/${ID}/original-a1b2c3d4.jpg`,
    light: `images/${ID}/light-a1b2c3d4.jpg`,
    thumb: `images/${ID}/thumb-a1b2c3d4.jpg`,
  });
  assert.equal(editedPaths(ID, 'image/png', 'ff').original, `images/${ID}/original-ff.png`);
});

const nueva = {
  id: ID,
  original_path: `images/${ID}/original.jpg`,
  storage_path: `images/${ID}/light.jpg`,
  thumb_path: `images/${ID}/thumb.jpg`,
  prior_original_path: null,
};

test('primera sobrescritura de una nueva: su original pasa a original previo y se borran ligera y miniatura', () => {
  assert.deepEqual(overwritePlan(nueva), {
    prior: `images/${ID}/original.jpg`,
    remove: [`images/${ID}/light.jpg`, `images/${ID}/thumb.jpg`],
  });
});

test('segunda sobrescritura: el original previo sigue siendo el de verdad y la edición intermedia se borra', () => {
  const editada = {
    ...nueva,
    original_path: `images/${ID}/original-aa.jpg`,
    storage_path: `images/${ID}/light-aa.jpg`,
    thumb_path: `images/${ID}/thumb-aa.jpg`,
    prior_original_path: `images/${ID}/original.jpg`,
  };
  assert.deepEqual(overwritePlan(editada), {
    prior: `images/${ID}/original.jpg`,
    remove: [`images/${ID}/original-aa.jpg`, `images/${ID}/light-aa.jpg`, `images/${ID}/thumb-aa.jpg`],
  });
});

test('una antigua: su ligera es su único fichero, pasa a original previo y no se borra ni se mueve', () => {
  const antigua = { id: ID, original_path: null, storage_path: 'images/1789503530988-BLANC_MAD_02-215.jpg', thumb_path: null, prior_original_path: null };
  assert.deepEqual(overwritePlan(antigua), { prior: 'images/1789503530988-BLANC_MAD_02-215.jpg', remove: [] });
  const antiguaEditada = {
    ...antigua,
    original_path: `images/${ID}/original-bb.jpg`,
    storage_path: `images/${ID}/light-bb.jpg`,
    thumb_path: `images/${ID}/thumb-bb.jpg`,
    prior_original_path: 'images/1789503530988-BLANC_MAD_02-215.jpg',
  };
  assert.deepEqual(overwritePlan(antiguaEditada), {
    prior: 'images/1789503530988-BLANC_MAD_02-215.jpg',
    remove: [`images/${ID}/original-bb.jpg`, `images/${ID}/light-bb.jpg`, `images/${ID}/thumb-bb.jpg`],
  });
});

test('volver al original borra los ficheros editados; en una antigua, la ligera vuelve a ser la de siempre', () => {
  const editada = {
    id: ID,
    original_path: `images/${ID}/original-aa.jpg`,
    storage_path: `images/${ID}/light-aa.jpg`,
    thumb_path: `images/${ID}/thumb-aa.jpg`,
    prior_original_path: `images/${ID}/original.jpg`,
  };
  assert.deepEqual(revertPlan(editada), {
    legacy: false,
    remove: [`images/${ID}/original-aa.jpg`, `images/${ID}/light-aa.jpg`, `images/${ID}/thumb-aa.jpg`],
  });
  assert.equal(revertPlan({ ...editada, prior_original_path: 'images/1789503530988-BLANC_MAD_02-215.jpg' })?.legacy, true);
  assert.equal(revertPlan({ ...editada, prior_original_path: null }), null);
});

test('staleTmp: solo los temporales de más de 24 horas, sin carpetas ni marcadores', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const objs = [
    { name: `${TMP}.jpg`, created_at: '2026-10-02T11:59:00Z' },
    { name: `${TMP}-light.jpg`, created_at: '2026-10-02T11:00:00Z' },
    { name: 'reciente.jpg', created_at: '2026-10-03T11:00:00Z' },
    { name: '.emptyFolderPlaceholder', created_at: '2026-09-01T00:00:00Z' },
    { name: 'sin-fecha.jpg', created_at: null },
  ];
  assert.deepEqual(staleTmp(objs, now), [`images/_tmp/${TMP}.jpg`, `images/_tmp/${TMP}-light.jpg`]);
});

test('la copia se llama como la imagen más «(editada)», sin pasar del máximo de un nombre', () => {
  assert.equal(copyName('Pasillo con luz lateral'), 'Pasillo con luz lateral (editada)');
  const largo = 'a'.repeat(140);
  assert.equal(copyName(largo).length, 140);
  assert.ok(copyName(largo).endsWith(' (editada)'));
});
