import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAM_DOMAIN, isTeamEmail } from '../team.ts';

test('el dominio declarado es el de la empresa', () => {
  assert.equal(TEAM_DOMAIN, 'interactius.com');
});

test('acepta el dominio del equipo, en cualquier caja', () => {
  assert.ok(isTeamEmail('alberto@interactius.com'));
  assert.ok(isTeamEmail('Alberto@Interactius.COM'));
  assert.ok(isTeamEmail('  carlos@interactius.com  '));
  assert.ok(isTeamEmail('info@interactius.com'));
});

test('rechaza dominios que solo se le parecen', () => {
  // Un `endsWith('interactius.com')` a secas dejaría pasar los dos primeros.
  assert.ok(!isTeamEmail('x@evil-interactius.com'));
  assert.ok(!isTeamEmail('x@notinteractius.com'));
  assert.ok(!isTeamEmail('x@interactius.com.evil.io'));
  assert.ok(!isTeamEmail('x@interactius.co'));
});

test('rechaza los subdominios, y es deliberado', () => {
  // Google Workspace puede tener dominios secundarios. Si algún día hace falta uno, se añade
  // aquí a propósito y con su test; no se cuela por una comprobación laxa.
  assert.ok(!isTeamEmail('x@sub.interactius.com'));
  assert.ok(!isTeamEmail('x@mail.interactius.com'));
});

test('rechaza lo vacío y lo que no es un email', () => {
  for (const v of [null, undefined, '', '   ', 'interactius.com', '@interactius.com',
                   'a@b@interactius.com', 'alberto@']) {
    assert.ok(!isTeamEmail(v as string | null | undefined), `debería rechazar ${JSON.stringify(v)}`);
  }
});
