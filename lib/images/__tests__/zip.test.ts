import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { fetchBytes, zipParts } from '../zip.ts';

/* Entrega 3, G11: el ZIP se monta en el navegador con fflate, sin volver a comprimir. Si una bajada falla se
   reintenta una vez; si vuelve a fallar, el ZIP sale sin ese fichero y se cuenta. */

const bytes = (s: string) => new TextEncoder().encode(s);
const joined = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

test('una bajada que falla se reintenta una vez', async () => {
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new TypeError('Failed to fetch');
    return new Response(bytes('ok'));
  };
  assert.equal(strFromU8((await fetchBytes('u', flaky as typeof fetch))!), 'ok');
  assert.equal(calls, 2);
});

test('si falla dos veces, no hay fichero', async () => {
  let calls = 0;
  const broken = async () => {
    calls++;
    return new Response('no', { status: 404 });
  };
  assert.equal(await fetchBytes('u', broken as typeof fetch), null);
  assert.equal(calls, 2);
});

test('el ZIP lleva los ficheros que se bajaron, con su nombre en UTF-8, y cuenta los que no', async () => {
  const files = [
    { url: 'a', name: 'Sala de reunión.jpg' },
    { url: 'b', name: 'Pasillo.png' },
    { url: 'c', name: 'Rota.jpg' },
  ];
  const got = await zipParts(files, async (url) => (url === 'c' ? null : bytes(`contenido ${url}`)));
  assert.equal(got.added, 2);
  assert.equal(got.failed, 1);
  const zip = unzipSync(joined(got.parts));
  assert.deepEqual(Object.keys(zip).sort(), ['Pasillo.png', 'Sala de reunión.jpg']);
  assert.equal(strFromU8(zip['Sala de reunión.jpg']), 'contenido a');
});
