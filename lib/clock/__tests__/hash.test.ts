/* Clock_r — el hash de asiento, contra los vectores generados en Postgres.

   Este test es lo único que impide que la garantía de integridad sea decorativa. En producción el
   hash lo calcula SOLO Postgres (plan, H4); `lib/clock/hash.ts` existe como oráculo para poder
   comprobar aquí, sin base de datos, que el algoritmo es el mismo y que no cambia sin querer.

   Ningún test de este repo habla con Supabase, así que la paridad se prueba contra
   fixtures/hash-vectors.json, que SE GENERA DESDE POSTGRES con scripts/clock-hash-vectors.ts. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clockEntryHash, clockEntryPayload, type ClockHashFields } from '../hash.ts';

type Vector = { label: string; why: string; fields: ClockHashFields; payload: string; hash: string };

const { vectors } = JSON.parse(
  readFileSync(new URL('./fixtures/hash-vectors.json', import.meta.url), 'utf8'),
) as { vectors: Vector[] };

const byLabel = (label: string): Vector => {
  const v = vectors.find((x) => x.label === label);
  assert.ok(v, `no hay ningún vector con la etiqueta "${label}"`);
  return v;
};

test('hay vectores que comprobar', () => {
  // Un fichero vacío haría pasar todos los tests de abajo sin comprobar nada.
  assert.ok(vectors.length >= 8, `solo hay ${vectors.length} vectores`);
});

test('cada vector reproduce la carga útil que compuso Postgres', () => {
  for (const v of vectors) {
    assert.equal(clockEntryPayload(v.fields), v.payload, `${v.label}: la carga útil no coincide`);
  }
});

test('cada vector reproduce el hash que calculó Postgres', () => {
  for (const v of vectors) {
    assert.equal(clockEntryHash(v.fields), v.hash, `${v.label}: el hash no coincide`);
  }
});

test('el prefijo de longitud se mide en bytes, no en caracteres', () => {
  /* «José Muñoz» son 10 caracteres y 12 bytes en UTF-8. Si el prefijo contara caracteres —que es
     lo que da String.length en JavaScript— este vector fallaría, y la función de TypeScript y la de
     Postgres habrían divergido en silencio para cualquier nombre con acento. */
  const v = byLabel('motivo-multibyte');
  assert.match(clockEntryPayload(v.fields), /12:José Muñoz/, 'el nombre no lleva su longitud en bytes');
});

test('un motivo que contiene dos puntos no rompe la carga útil', () => {
  const v = byLabel('motivo-con-dos-puntos');
  assert.equal(clockEntryPayload(v.fields), v.payload, 'los dos puntos del motivo alteran la carga');
});

test('el prefijo de longitud evita la colisión que un concatenado sin prefijo permitiría', () => {
  /* Los mismos bytes repartidos distinto entre dos campos: 'ab'+'c' y 'a'+'bc'. Sin prefijo, los
     dos asientos producirían la misma carga útil y el mismo hash, y se podría sustituir uno por
     otro sin romper la cadena. */
  const a = byLabel('adversario-a');
  const b = byLabel('adversario-b');
  assert.notEqual(clockEntryHash(a.fields), clockEntryHash(b.fields), 'los dos adversarios colisionan');
});

test('cambiar un solo campo cambia el hash', () => {
  const base = byLabel('correccion-con-motivo').fields;
  const original = clockEntryHash(base);
  for (const key of Object.keys(base) as (keyof ClockHashFields)[]) {
    const tocado = { ...base, [key]: `${base[key]}x` };
    assert.notEqual(clockEntryHash(tocado), original, `tocar ${key} no cambia el hash`);
  }
});

test('el hash es un sha256 en hexadecimal', () => {
  for (const v of vectors) {
    assert.match(clockEntryHash(v.fields), /^[0-9a-f]{64}$/, `${v.label}: el hash no tiene forma de sha256`);
  }
});
