import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPS, GROUPS, appsIn } from '../catalog.ts';

test('los ids son únicos', () => {
  const ids = APPS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('toda entrada tiene label y pertenece a un grupo declarado', () => {
  const known = new Set(GROUPS.map((g) => g.id));
  for (const a of APPS) {
    assert.ok(a.label.trim(), `${a.id} sin label`);
    assert.ok(known.has(a.group), `${a.id} en un grupo no declarado: ${a.group}`);
  }
});

test('los destinos internos son rutas absolutas de este dominio', () => {
  for (const a of APPS) {
    if (!a.href || a.external) continue;
    assert.ok(a.href.startsWith('/'), `${a.id}: "${a.href}" debería empezar por /`);
    assert.ok(!a.href.startsWith('//'), `${a.id}: "${a.href}" parece una URL externa`);
  }
});

test('los destinos externos son absolutos y van marcados', () => {
  for (const a of APPS) {
    if (!a.external) continue;
    assert.ok(a.href, `${a.id}: external sin href`);
    assert.match(a.href!, /^https:\/\//, `${a.id}: los externos van por https`);
  }
});

test('una tarjeta deshabilitada no puede ser externa', () => {
  // Si no hay href no hay nada que abrir; `external: true` ahí sería una contradicción silenciosa.
  for (const a of APPS) {
    if (a.href === null) assert.ok(!a.external, `${a.id}: deshabilitada pero marcada como externa`);
  }
});

test('una tarjeta deshabilitada explica por qué', () => {
  // Sin descripción, una tarjeta apagada parece rota en vez de pendiente.
  for (const a of APPS) {
    if (a.href === null) assert.ok(a.description?.trim(), `${a.id}: deshabilitada y sin explicación`);
  }
});

test('toda herramienta trae su wordmark; ningún link lo trae', () => {
  for (const a of APPS) {
    if (a.group === 'tools') {
      assert.ok(a.wordmark, `${a.id}: tool sin wordmark`);
      assert.ok(a.wordmark!.before.trim(), `${a.id}: wordmark.before vacío`);
      assert.ok(a.wordmark!.after.trim(), `${a.id}: wordmark.after vacío`);
    } else {
      assert.equal(a.wordmark, undefined, `${a.id}: un link no lleva wordmark`);
    }
  }
});

test('ningún grupo se queda vacío', () => {
  for (const g of GROUPS) {
    assert.ok(appsIn(g.id).length > 0, `el grupo ${g.id} no tiene ninguna app`);
  }
});

test('appsIn respeta el orden de declaración', () => {
  assert.deepEqual(appsIn('tools').map((a) => a.id), ['deckmakr', 'formmakr', 'dsmakr']);
  assert.deepEqual(appsIn('links').map((a) => a.id), ['starmeapp', 'timer']);
});

test('las herramientas que ya existen apuntan a sus rutas reales', () => {
  const byId = new Map(APPS.map((a) => [a.id, a]));
  assert.equal(byId.get('deckmakr')?.href, '/workspace/deckmak_r');
  assert.equal(byId.get('formmakr')?.href, '/workspace/formmak_r');
  assert.equal(byId.get('timer')?.href, '/timer');
  assert.equal(byId.get('dsmakr')?.href, null);
});
