import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compileDeck } from '../index.ts';

const md = readFileSync(fileURLToPath(new URL('./fixtures/sample.md', import.meta.url)), 'utf8');

test('compiles the sample deck to the expected slide kinds (no injection)', () => {
  const deck = compileDeck(md, 'generica');
  assert.deepEqual(
    deck.slides.map((s) => s.kind),
    ['cover', 'statement', 'bullets', 'columns', 'gantt', 'closing'],
  );
  const cover = deck.slides[0];
  const bullets = deck.slides[2];
  assert.equal('theme' in cover && cover.theme, 'dark');
  assert.equal('theme' in bullets && bullets.theme, 'light');
});

test('commercial type injects the 3 fixed pages right after the cover', () => {
  const deck = compileDeck(md, 'comercial');
  assert.deepEqual(
    deck.slides.slice(0, 4).map((s) => s.kind),
    ['cover', 'manifesto', 'team', 'clients'],
  );
});
