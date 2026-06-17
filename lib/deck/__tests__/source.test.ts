import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { splitSourceBlocks, setBlockImage } from '../source.ts';
import { compileDeck } from '../index.ts';

const md = readFileSync(fileURLToPath(new URL('./fixtures/sample.md', import.meta.url)), 'utf8');

test('splitSourceBlocks yields one block per --- section with correct ranges', () => {
  const blocks = splitSourceBlocks(md);
  // sample.md has 6 slides
  assert.equal(blocks.length, 6);
  // each block text round-trips from its range
  for (const b of blocks) assert.equal(md.slice(b.start, b.end), b.text);
  // blocks are ordered and non-overlapping
  for (let i = 1; i < blocks.length; i++) assert.ok(blocks[i].start > blocks[i - 1].end);
});

test('provenance is 1:1 with source blocks (no injection, any type)', () => {
  assert.deepEqual(compileDeck(md, 'generica').provenance, [0, 1, 2, 3, 4, 5]);
  // commercial no longer injects, so provenance is identical and fully non-null.
  const deck = compileDeck(md, 'comercial');
  assert.deepEqual(deck.provenance, [0, 1, 2, 3, 4, 5]);
  assert.ok(deck.provenance?.every((p) => p !== null));
});

test('setBlockImage replaces the existing image in the target block, keeping alt', () => {
  const src = '# Portada\n![Equipo](old.jpg)\n\n---\n\n## Otra\nTexto';
  const out = setBlockImage(src, 0, 'https://cdn/new.jpg');
  assert.match(out, /!\[Equipo\]\(https:\/\/cdn\/new\.jpg\)/);
  assert.doesNotMatch(out, /old\.jpg/);
  // the second block is untouched
  assert.match(out, /## Otra\nTexto$/);
});

test('setBlockImage appends an image when the target block has none', () => {
  const src = '# Portada\nSin imagen\n\n---\n\n## Split\n![x](a.jpg)';
  const out = setBlockImage(src, 0, 'https://cdn/new.jpg');
  // block 0 gains an image line; block 1 keeps its own image
  assert.match(out, /# Portada\nSin imagen\n\n!\[\]\(https:\/\/cdn\/new\.jpg\)/);
  assert.match(out, /!\[x\]\(a\.jpg\)/);
  // still 2 source blocks
  assert.equal(splitSourceBlocks(out).length, 2);
});

test('setBlockImage returns md unchanged for an out-of-range slide', () => {
  const src = '# Portada\n![a](a.jpg)';
  assert.equal(setBlockImage(src, 9, 'b.jpg'), src);
});
