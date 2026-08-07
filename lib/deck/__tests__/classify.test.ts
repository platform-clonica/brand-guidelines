import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../parse.ts';
import { classify } from '../classify.ts';

const one = (md: string) => classify(parse(md)[0], 0, 1);

test('first slide with title+subtitle+client → cover', () => {
  const s = classify(parse('# Propuesta\nSub.\n> cliente: Naturgy')[0], 0, 3) as any;
  assert.equal(s.kind, 'cover');
  assert.equal(s.title, 'Propuesta');
  assert.equal(s.subtitle, 'Sub.');
  assert.equal(s.client, 'Naturgy');
  assert.equal(s.theme, 'dark');
});

test('generic caps eyebrow + heading → statement', () => {
  const s = one('NUESTRA MIRADA\n# Incrementar la conversión') as any;
  assert.equal(s.kind, 'statement');
  assert.equal(s.eyebrow, 'NUESTRA MIRADA');
  assert.equal(s.title, 'Incrementar la conversión');
});

test('EL RETO keyword → elreto; CONTEXTO → contexto; OBJETIVOS → objetivos; ROADMAP → roadmapPhases; PRESUPUESTO → budget', () => {
  assert.equal((one('EL RETO\n# Incrementar la conversión') as any).kind, 'elreto');
  assert.equal((one('CONTEXTO\nUn párrafo corto de contexto.') as any).kind, 'contexto');
  assert.equal((one('## Objetivos\n- a\n- b') as any).kind, 'objetivos');
  assert.equal((one('## Roadmap\n### Diagnóstico\nx\n- y') as any).kind, 'roadmapPhases');
  assert.equal((one('## Presupuesto') as any).kind, 'budget');
});

test('budget: line items + total auto-summed from the .md', () => {
  const s = one('## Presupuesto\n- Análisis: 3.315 €\n- Benchmark: 3.770 €\n- Inmersión: 3.991 €') as any;
  assert.equal(s.kind, 'budget');
  assert.deepEqual(s.items, [
    { label: 'Análisis', amount: '3.315 €' },
    { label: 'Benchmark', amount: '3.770 €' },
    { label: 'Inmersión', amount: '3.991 €' },
  ]);
  assert.equal(s.total, '11.076 €');
});

/* es-ES does not group four-digit integers by default (9999 → "9999", 10560 → "10.560"), so an
   auto-summed total under 10.000 lost its separator and read differently from every other amount
   on the same slide. The thousands mark is not optional below 10k. */
test('budget: a four-digit total still carries its thousands separator', () => {
  const s = one('## Presupuesto\n- Fase 1: 4.500 €\n- Fase 2: 5.499 €') as any;
  assert.equal(s.total, '9.999 €');
});

test('budget: four-digit totals keep the separator with decimals too', () => {
  const s = one('## Presupuesto\n- Fase 1: 4.500,50 €\n- Fase 2: 5.499,25 €') as any;
  assert.equal(s.total, '9.999,75 €');
});

test('budget: explicit Total row wins over auto-sum', () => {
  const s = one('## Presupuesto\n- Fase 1: 1.000 €\n- Fase 2: 2.000 €\n- Total: 3.500 €') as any;
  assert.equal(s.items.length, 2);
  assert.equal(s.total, '3.500 €');
});

test('budget: `nototal` drops the total row (as a bullet or as a loose line)', () => {
  const asItem = one('## Presupuesto\n- Fase 1: 1.000 €\n- nototal') as any;
  assert.deepEqual(asItem.items, [{ label: 'Fase 1', amount: '1.000 €' }]);
  assert.equal(asItem.total, undefined);
  const asLine = one('## Presupuesto\n- Fase 1: 1.000 €\nnototal') as any;
  assert.equal(asLine.total, undefined);
  assert.equal(asLine.items.length, 1);
});

test('budget: the `nototal` marker is spelled several ways', () => {
  for (const w of ['nototal', 'no total', 'sin total', 'sense total', 'NoTotal']) {
    const s = one(`## Presupuesto\n- Fase 1: 1.000 €\n- ${w}`) as any;
    assert.equal(s.total, undefined, `«${w}» debería quitar el total`);
    assert.equal(s.items.length, 1, `«${w}» no debería quedarse como partida`);
  }
});

test('budget: without the marker the total is still there', () => {
  assert.equal((one('## Presupuesto\n- Fase 1: 1.000 €') as any).total, '1.000 €');
});

test('budget: an amount may be negative, carry markup or hold a second figure', () => {
  const s = one(
    '## Presupuesto\n- Entorno de test y diagnóstico: 5.173 €\n' +
    '- Descuento cliente recurrente 5%: -259 € **4.915 €**\n' +
    '- Mantenimiento mensual recurrente: 1.825 €\n- nototal',
  ) as any;
  assert.deepEqual(s.items, [
    { label: 'Entorno de test y diagnóstico', amount: '5.173 €' },
    { label: 'Descuento cliente recurrente 5%', amount: '-259 € **4.915 €**' },
    { label: 'Mantenimiento mensual recurrente', amount: '1.825 €' },
  ]);
  assert.equal(s.total, undefined);
});

test('budget: a unit suffix after the amount no longer swallows the whole line', () => {
  const s = one('## Presupuesto\n- Mantenimiento: 500 €/mes\n- nototal') as any;
  assert.deepEqual(s.items, [{ label: 'Mantenimiento', amount: '500 €/mes' }]);
});

/* A colon inside the label must not split the item there: the clean-figure form wins,
   and only when it fails does the first colon act as the separator. */
test('budget: a label may contain a colon', () => {
  const s = one('## Presupuesto\n- Fase 1: análisis: 3.000 €') as any;
  assert.deepEqual(s.items, [{ label: 'Fase 1: análisis', amount: '3.000 €' }]);
});

test('budget: a negative amount subtracts from the auto-sum', () => {
  const s = one('## Presupuesto\n- Fase 1: 5.173 €\n- Descuento: -259 €') as any;
  assert.equal(s.total, '4.914 €');
});

test('budget: conditions overridable via "### Condiciones" list', () => {
  const s = one('## Presupuesto\n- Fase 1: 1.000 €\n### Condiciones\n- Pago a 30 días.\n- IVA aparte.') as any;
  assert.deepEqual(s.items, [{ label: 'Fase 1', amount: '1.000 €' }]);
  assert.deepEqual(s.conditions, ['Pago a 30 días.', 'IVA aparte.']);
});

test('budget: empty block falls back to the reference example', () => {
  const s = one('## Presupuesto') as any;
  assert.equal(s.items.length, 3);
  assert.equal(s.total, '11.076 €');
  assert.equal(s.conditions.length, 5);
});

test('heading + list → bullets', () => {
  const s = one('## Cómo\n- a\n- b') as any;
  assert.equal(s.kind, 'bullets');
  assert.deepEqual(s.items, ['a', 'b']);
});

test('heading + three subheads → columns', () => {
  const s = one('## Enfoque\n### Uno\nx\n### Dos\ny\n### Tres\nz') as any;
  assert.equal(s.kind, 'columns');
  assert.equal(s.columns.length, 3);
  assert.deepEqual(s.columns[0], { label: '01', heading: 'Uno', body: 'x' });
});

test('heading + image + paragraph → split', () => {
  const s = one('## Contexto\n![a](u.jpg)\nTexto.') as any;
  assert.equal(s.kind, 'split');
  assert.equal(s.image.src, 'u.jpg');
});

test('gantt fence → gantt', () => {
  const s = one('## Roadmap\n```gantt\nsemanas: 8\nDiagnóstico: 1\n```') as any;
  assert.equal(s.kind, 'gantt');
  assert.equal(s.weeks, 8);
  assert.equal(s.rows[0].label, 'Diagnóstico');
});

test('[ly: gantt] reads the spec from plain key:value lines (no fence needed)', () => {
  const s = one('[ly: gantt]\n## Roadmap\nsemanas: 8\nDiagnóstico: 1-1.5\nDiscovery: 2-3\nhitos cliente: 1, 3') as any;
  assert.equal(s.kind, 'gantt');
  assert.equal(s.weeks, 8);
  assert.equal(s.rows.length, 2);
  assert.equal(s.rows[0].label, 'Diagnóstico');
  assert.deepEqual(s.milestones, [1, 3]);
  assert.equal(s.subtitle, undefined); // spec lines must not leak into the subtitle
});

test('last slide titled Gracias → closing', () => {
  const s = classify(parse('# Gracias\nwww.interactius.com')[0], 2, 3) as any;
  assert.equal(s.kind, 'closing');
  assert.equal(s.url, 'www.interactius.com');
});

test('unknown shape (heading + paragraph only) → paragraph fallback', () => {
  const s = one('## Notas\nSolo un párrafo suelto.') as any;
  assert.equal(s.kind, 'paragraph');
});

// --- Explicit layout markers: design no longer depends on the copies ---

test('[ly: lista] forces bullets even with no list in the content', () => {
  const s = one('[ly: lista]\n## Cómo\nSolo un párrafo, sin viñetas.') as any;
  assert.equal(s.kind, 'bullets');
  assert.deepEqual(s.items, []);
});

test('a marker overrides what inference would pick', () => {
  // content (heading + list) would infer bullets; the marker forces columns.
  const s = one('[ly: columnas]\n## Enfoque\n- a\n- b') as any;
  assert.equal(s.kind, 'columns');
});

test('split-der (default) image right, split-izq image left', () => {
  const der = one('[ly: split-der]\n## T\n![a](u.jpg)\nTexto.') as any;
  const izq = one('[ly: split-izq]\n## T\n![a](u.jpg)\nTexto.') as any;
  assert.equal(der.kind, 'split');
  assert.equal(der.imageSide, 'right');
  assert.equal(izq.imageSide, 'left');
});

test('[ly: aceptacion] reads signer key:value lines; defaults when absent', () => {
  const withSigner = one('[ly: aceptacion]\nnombre: Ana Pérez\ncargo: CEO') as any;
  assert.equal(withSigner.kind, 'acceptance');
  assert.equal(withSigner.signer.name, 'Ana Pérez');
  assert.equal(withSigner.signer.role, 'CEO');
  const bare = one('[ly: aceptacion]') as any;
  assert.equal(bare.signer, undefined); // component falls back to default block
});
