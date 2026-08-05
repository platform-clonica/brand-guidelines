import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyRedirect } from '../legacyRoutes.ts';

/* ── Lo que NO se toca. Estos son los que duelen si se rompen. ── */

test('el visor público de presentaciones NO se redirige', () => {
  // Es la URL que se manda a clientes y desde la que firman. Ya hay enlaces circulando.
  assert.equal(legacyRedirect('/deck/abc-123/view'), null);
  assert.equal(legacyRedirect('/deck/abc-123/view/'), null);
  assert.equal(legacyRedirect('/deck/9f8e7d6c-1234-4567-89ab-cdef01234567/view'), null);
});

test('la imagen social del visor tampoco se redirige', () => {
  assert.equal(legacyRedirect('/deck/abc-123/view/opengraph-image'), null);
});

test('el formulario público NO se redirige', () => {
  assert.equal(legacyRedirect('/forms/f/fk_Hjd81rX'), null);
});

test('las APIs no se redirigen', () => {
  assert.equal(legacyRedirect('/forms/api/submit'), null);
  assert.equal(legacyRedirect('/forms/api/export'), null);
  assert.equal(legacyRedirect('/api/decks'), null);
  assert.equal(legacyRedirect('/api/forms/abc'), null);
});

test('lo que ya está en su sitio no se redirige', () => {
  assert.equal(legacyRedirect('/workspace'), null);
  assert.equal(legacyRedirect('/workspace/login'), null);
  assert.equal(legacyRedirect('/workspace/deckmak_r/abc'), null);
  assert.equal(legacyRedirect('/timer'), null);
  assert.equal(legacyRedirect('/es'), null);
  assert.equal(legacyRedirect('/'), null);
});

/* ── Lo que sí se mueve. ── */

test('el dispatcher', () => {
  assert.equal(legacyRedirect('/home'), '/workspace');
});

test('las páginas de acceso', () => {
  assert.equal(legacyRedirect('/deck/login'), '/workspace/login');
  assert.equal(legacyRedirect('/deck/forgot'), '/workspace/forgot');
  // Crítico: los emails de recuperación ya enviados apuntan aquí.
  assert.equal(legacyRedirect('/deck/reset'), '/workspace/reset');
  assert.equal(legacyRedirect('/deck/logout'), '/workspace/logout');
});

test('las landings de cada herramienta', () => {
  assert.equal(legacyRedirect('/deck'), '/workspace/deckmak_r');
  assert.equal(legacyRedirect('/forms/maker'), '/workspace/formmak_r');
});

test('los editores, conservando el id', () => {
  assert.equal(legacyRedirect('/deck/abc-123'), '/workspace/deckmak_r/abc-123');
  assert.equal(legacyRedirect('/forms/maker/abc-123'), '/workspace/formmak_r/abc-123');
});

test('un id que se parece a una página de acceso sigue yendo al editor correcto', () => {
  // `/deck/login` es exacto y gana; `/deck/loginX` es un id.
  assert.equal(legacyRedirect('/deck/login'), '/workspace/login');
  assert.equal(legacyRedirect('/deck/loginX'), '/workspace/deckmak_r/loginX');
});

test('ninguna redirección devuelve una URL externa', () => {
  const paths = [
    '/home', '/deck', '/deck/login', '/deck/forgot', '/deck/reset', '/deck/logout',
    '/deck/abc', '/forms/maker', '/forms/maker/abc', '/home/loquesea',
  ];
  for (const p of paths) {
    const out = legacyRedirect(p);
    assert.ok(out, `${p} debería redirigir`);
    assert.ok(out.startsWith('/workspace'), `${p} → ${out} debería quedarse en /workspace`);
    assert.ok(!out.startsWith('//'), `${p} → ${out} parece una URL externa`);
  }
});
