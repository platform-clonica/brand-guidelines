import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageSize } from '../edit/dimensions.ts';

/* Las medidas de la imagen que devuelve el modelo, leídas de la cabecera: «Versión N · <ancho> × <alto> px»
   (F8) sin decodificar la imagen en el servidor. */

const jpeg = (w: number, h: number, sof = 0xc0) =>
  Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // APP0
    0xff, sof, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ]);

const png = (w: number, h: number) => {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};

test('lee ancho y alto de un JPEG, base y progresivo', () => {
  assert.deepEqual(imageSize(jpeg(2528, 1686)), { width: 2528, height: 1686 });
  assert.deepEqual(imageSize(jpeg(5056, 3372, 0xc2)), { width: 5056, height: 3372 });
});

test('lee ancho y alto de un PNG', () => {
  assert.deepEqual(imageSize(png(2048, 1536)), { width: 2048, height: 1536 });
});

test('devuelve null con lo que no es una imagen', () => {
  assert.equal(imageSize(Buffer.from('no es una imagen')), null);
  assert.equal(imageSize(Buffer.alloc(0)), null);
});
