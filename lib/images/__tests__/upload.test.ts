/* IMG_r — subida: qué se acepta, dónde va cada fichero, cuándo un lote está listo y qué dice la
   interfaz en cada momento. Los textos son los del prototipo validado (img-r-prototype.html) y los
   aprobados en el plan (§ 9.4): se comprueban literalmente. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BYTES,
  afterFailure,
  effectiveTags,
  failureReason,
  leftAfterRemove,
  formatBytes,
  missingVariants,
  objectPaths,
  publicObjectUrl,
  rowProblem,
  unreadableMessage,
  uploadButtonLabel,
  uploadSummary,
  validateCreateInput,
  validateFile,
  validateUpdateInput,
  variantPaths,
} from '../upload.ts';

const ID = '3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6f';
const MB = 1024 * 1024;

test('acepta JPEG, PNG y WebP', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.equal(validateFile({ name: 'a', type, size: 1000 }), null);
  }
});

test('rechaza el resto con el mensaje exacto', () => {
  assert.equal(validateFile({ name: 'x.gif', type: 'image/gif', size: 1000 }), 'x.gif: no es JPEG, PNG ni WebP.');
  assert.equal(validateFile({ name: 'logo.svg', type: 'image/svg+xml', size: 1000 }), 'logo.svg: no es JPEG, PNG ni WebP.');
  assert.equal(validateFile({ name: 'foto.heic', type: 'image/heic', size: 1000 }), 'foto.heic: no es JPEG, PNG ni WebP.');
});

test('rechaza más de 25 MB con el peso formateado; 25 MB justos pasan, como en el bucket', () => {
  assert.equal(MAX_BYTES, 26214400);
  assert.equal(validateFile({ name: 'x.jpg', type: 'image/jpeg', size: Math.round(31.2 * MB) }), 'x.jpg: pesa 31,2 MB y el límite es 25 MB.');
  assert.equal(validateFile({ name: 'x.jpg', type: 'image/jpeg', size: MAX_BYTES }), null);
  assert.match(validateFile({ name: 'x.jpg', type: 'image/jpeg', size: MAX_BYTES + 1 })!, /el límite es 25 MB\.$/);
});

test('formatBytes: KB por debajo de 1 MB y un decimal con coma en MB', () => {
  assert.equal(formatBytes(300 * 1024), '300 KB');
  assert.equal(formatBytes(Math.round(14.2 * MB)), '14,2 MB');
  assert.equal(formatBytes(3 * MB), '3,0 MB');
});

test('las tres variantes viven en images/<id>/', () => {
  assert.deepEqual(variantPaths(ID, 'image/jpeg'), {
    original: `images/${ID}/original.jpg`,
    light: `images/${ID}/light.jpg`,
    thumb: `images/${ID}/thumb.jpg`,
  });
  assert.equal(variantPaths(ID, 'image/png').original, `images/${ID}/original.png`);
  assert.equal(variantPaths(ID, 'image/webp').original, `images/${ID}/original.webp`);
});

test('variantPaths no fabrica rutas con un id que no es uuid ni con un tipo no admitido', () => {
  assert.throws(() => variantPaths('../logos', 'image/jpeg'));
  assert.throws(() => variantPaths(ID, 'image/gif'));
});

test('la URL pública tiene el formato de Supabase Storage', () => {
  assert.equal(
    publicObjectUrl('https://x.supabase.co', 'deck-images', `images/${ID}/light.jpg`),
    `https://x.supabase.co/storage/v1/object/public/deck-images/images/${ID}/light.jpg`,
  );
});

test('etiquetas efectivas: comunes y propias, normalizadas y sin repetir', () => {
  assert.deepEqual(effectiveTags(['oficina', 'Luz'], ['luz', 'sala grande']), ['oficina', 'luz', 'sala-grande']);
});

test('una fila del lote necesita nombre y al menos una etiqueta, propia o común', () => {
  assert.equal(rowProblem({ name: '  ', tags: ['luz'] }, []), 'Falta el nombre.');
  assert.equal(rowProblem({ name: 'Pasillo', tags: [] }, []), 'Falta al menos una etiqueta, propia o común.');
  assert.equal(rowProblem({ name: 'Pasillo', tags: [] }, ['oficina']), null);
  assert.equal(rowProblem({ name: 'Pasillo', tags: ['luz'] }, []), null);
});

test('el botón dice Subir, Subir N imágenes o Subiendo X de N', () => {
  assert.equal(uploadButtonLabel(1), 'Subir');
  assert.equal(uploadButtonLabel(0), 'Subir');
  assert.equal(uploadButtonLabel(3), 'Subir 3 imágenes');
  assert.equal(uploadButtonLabel(3, { current: 2, total: 3 }), 'Subiendo 2 de 3');
});

test('el aviso al terminar, en singular, plural y con errores', () => {
  assert.equal(uploadSummary(1, 0), 'Imagen subida');
  assert.equal(uploadSummary(3, 0), '3 imágenes subidas');
  assert.equal(uploadSummary(2, 1), '2 subidas · 1 con error');
  assert.equal(uploadSummary(1, 2), '1 subida · 2 con error');
  assert.equal(uploadSummary(0, 3), 'No se ha subido ninguna · 3 con error');
});

test('el mensaje de una imagen que no se puede leer', () => {
  assert.equal(unreadableMessage('x.jpg'), 'x.jpg: no se ha podido leer la imagen. Prueba con otro archivo.');
});

const urlFor = (path: string) => `https://x.supabase.co/storage/v1/object/public/deck-images/${path}`;
const body = {
  id: ID,
  name: '  Pasillo de la oficina ',
  tags: ['Oficina', 'luz natural'],
  original_type: 'image/png',
  original_bytes: 10 * MB,
  original_width: 6000,
  original_height: 4000,
  width: 1600,
  height: 1067,
};

test('validateCreateInput recalcula rutas y URL en servidor y normaliza nombre y etiquetas', () => {
  const r = validateCreateInput(body, urlFor);
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    id: ID,
    name: 'Pasillo de la oficina',
    alt: 'Pasillo de la oficina',
    tags: ['oficina', 'luz-natural'],
    source: 'upload',
    storage_path: `images/${ID}/light.jpg`,
    url: urlFor(`images/${ID}/light.jpg`),
    thumb_path: `images/${ID}/thumb.jpg`,
    original_path: `images/${ID}/original.png`,
    original_bytes: 10 * MB,
    original_width: 6000,
    original_height: 4000,
    width: 1600,
    height: 1067,
  });
});

test('validateCreateInput rechaza lo que no cuadra, con su motivo', () => {
  const bad = (patch: Record<string, unknown>) => {
    const r = validateCreateInput({ ...body, ...patch }, urlFor);
    assert.ok(!r.ok, JSON.stringify(patch));
    return r.error;
  };
  assert.equal(bad({ id: 'x' }), 'Id no válido.');
  assert.equal(bad({ name: '   ' }), 'Falta el nombre.');
  assert.equal(bad({ name: 'a'.repeat(141) }), 'El nombre es demasiado largo.');
  assert.equal(bad({ tags: [' ', ''] }), 'Falta al menos una etiqueta.');
  assert.equal(bad({ tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }), 'Demasiadas etiquetas.');
  assert.equal(bad({ original_type: 'image/gif' }), 'Tipo de imagen no admitido.');
  assert.equal(bad({ original_bytes: MAX_BYTES + 1 }), 'Peso no válido.');
  assert.equal(bad({ width: 0 }), 'Medidas no válidas.');
  assert.equal(bad({ original_height: 1.5 }), 'Medidas no válidas.');
  assert.equal(validateCreateInput(null, urlFor).ok, false);
});

test('validateUpdateInput exige nombre, una etiqueta y el updated_at que se leyó', () => {
  const ok = validateUpdateInput({ name: ' Pasillo ', tags: ['Luz'], expectedUpdatedAt: '2026-10-01T10:00:00.123456+00:00' });
  assert.ok(ok.ok);
  assert.deepEqual(ok.value, { name: 'Pasillo', tags: ['luz'], expectedUpdatedAt: '2026-10-01T10:00:00.123456+00:00' });
  const err = (b: unknown) => {
    const r = validateUpdateInput(b);
    assert.ok(!r.ok);
    return r.error;
  };
  assert.equal(err({ name: '', tags: ['luz'], expectedUpdatedAt: '2026-10-01T10:00:00Z' }), 'Falta el nombre.');
  assert.equal(err({ name: 'a', tags: [], expectedUpdatedAt: '2026-10-01T10:00:00Z' }), 'Falta al menos una etiqueta.');
  assert.equal(err({ name: 'a', tags: ['luz'] }), 'Falta la fecha de la versión que se editó.');
  assert.equal(err('x'), 'Cuerpo no válido.');
});

test('missingVariants dice qué ficheros de la imagen no están en Storage', () => {
  const paths = variantPaths(ID, 'image/png');
  assert.deepEqual(missingVariants(paths, ['light.jpg', 'original.png', 'thumb.jpg']), []);
  assert.deepEqual(missingVariants(paths, ['light.jpg']), ['original.png', 'thumb.jpg']);
  assert.deepEqual(missingVariants(paths, []), ['original.png', 'light.jpg', 'thumb.jpg']);
});

test('objectPaths da todos los ficheros de una imagen para borrarla, sin nulos', () => {
  const nueva = { original_path: `images/${ID}/original.png`, storage_path: `images/${ID}/light.jpg`, thumb_path: `images/${ID}/thumb.jpg`, prior_original_path: null };
  assert.deepEqual(objectPaths(nueva), [`images/${ID}/original.png`, `images/${ID}/light.jpg`, `images/${ID}/thumb.jpg`]);
  assert.deepEqual(objectPaths({ ...nueva, prior_original_path: `images/${ID}/original-1.png` }).length, 4);
  const antigua = { original_path: null, storage_path: 'images/1789503530988-BLANC_MAD_02-215.jpg', thumb_path: null, prior_original_path: null };
  assert.deepEqual(objectPaths(antigua), ['images/1789503530988-BLANC_MAD_02-215.jpg']);
});

/* Revisión final, puntos 1 a 3: qué se hace con los ficheros de un intento que falla. Borrar los de una
   fila que existe la deja rota; no borrar los de una que no existe deja huérfanos. */
test('afterFailure: sin registrar se borra; registrada se devuelve; sin poder comprobarlo no se toca nada', () => {
  assert.equal(afterFailure(false, null), 'remove');
  assert.equal(afterFailure(true, 'exists'), 'keep-row');
  assert.equal(afterFailure(true, 'missing'), 'remove');
  // La respuesta del registro se perdió y la comprobación también falla: la fila puede existir.
  assert.equal(afterFailure(true, 'unknown'), 'keep-files');
});

test('leftAfterRemove: lo que queda por borrar en el siguiente intento', () => {
  const all = ['images/x/original.jpg', 'images/x/light.jpg', 'images/x/thumb.jpg'];
  // Storage no respondió: se reintentan las tres rutas (borrar una que no existe no hace daño).
  assert.deepEqual(leftAfterRemove(all, ['images/x/original.jpg'], null), all);
  // Respondió: lo que no aparece como borrado y no llegó a subirse, simplemente no existe.
  assert.deepEqual(leftAfterRemove(all, ['images/x/original.jpg'], ['images/x/original.jpg']), []);
  // Subido y no borrado: queda pendiente.
  assert.deepEqual(leftAfterRemove(all, ['images/x/original.jpg', 'images/x/light.jpg'], ['images/x/light.jpg']), ['images/x/original.jpg']);
});

test('failureReason: el texto de la API en el registro sí; la red y los errores de Storage, no', () => {
  assert.equal(failureReason(new Error('Demasiadas etiquetas.'), true), 'Demasiadas etiquetas.');
  assert.equal(failureReason(new Error('No autorizado.'), true), 'No autorizado.');
  assert.equal(failureReason(new TypeError('Failed to fetch'), true), null);
  assert.equal(failureReason(new Error('Request failed (502)'), true), null);
  // Antes del registro los errores son de Storage, en inglés.
  assert.equal(failureReason(new Error('The object exceeded the maximum allowed size'), false), null);
});

test('rowProblem avisa antes de subir si entre comunes y propias pasan de 20 etiquetas', () => {
  const many = Array.from({ length: 12 }, (_, i) => `a${i}`);
  const more = Array.from({ length: 9 }, (_, i) => `b${i}`);
  assert.equal(rowProblem({ name: 'x', tags: more }, many), 'Demasiadas etiquetas.');
  assert.equal(rowProblem({ name: 'x', tags: more.slice(0, 8) }, many), null);
});
