import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLimiter } from '../limit.ts';

/* F21: la propuesta se pide por fila en cuanto existe la ligera, tres a la vez como máximo. */

test('nunca corren más de N a la vez, y todas terminan en orden de llegada', async () => {
  const limit = createLimiter(3);
  let running = 0;
  let peak = 0;
  const done: number[] = [];
  const job = (i: number) => async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
    done.push(i);
    return i;
  };
  const results = await Promise.all([0, 1, 2, 3, 4, 5, 6].map((i) => limit(job(i))));
  assert.equal(peak, 3);
  assert.deepEqual(results, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(done.length, 7);
});

test('un trabajo que falla no bloquea la cola', async () => {
  const limit = createLimiter(1);
  const a = limit(async () => {
    throw new Error('x');
  });
  const b = limit(async () => 'b');
  await assert.rejects(a);
  assert.equal(await b, 'b');
});
