import type { Accent, BudgetItem, GanttRow, GanttSpan, Token } from './types.ts';

const ACCENTS: Accent[] = ['opal', 'bordeaux', 'emerald'];

// Default example (ref p.42): used when `## Presupuesto` is left empty in the .md.
const DEFAULT_BUDGET_ITEMS: BudgetItem[] = [
  { label: 'Análisis Heurístico', amount: '3.315 €' },
  { label: 'Benchmark Android/Mobile', amount: '3.770 €' },
  { label: 'Inmersión + gestión', amount: '3.991 €' },
];
const DEFAULT_CONDICIONES = [
  'Emisión de factura inicial por el 60% del total del proyecto una vez recibida la orden de compra al inicio del proyecto.',
  'Emisión de factura final por el 40% del total del proyecto una vez realizada la entrega.',
  'Al importe se le añadirá el IVA correspondiente de acuerdo con la legislación vigente.',
  'Cobro de facturas a 30 días, día de pago habitual del cliente.',
  'Esta propuesta económica tiene una validez de tres meses a partir de la fecha de la misma.',
];

/* Peel the amount off a list item; the rest (sans separators) is the label. Two rules,
   in order — the strict one first because it is the one that disambiguates:
   1. A clean figure closing the line (`Análisis — 3.315 €`). It works with any separator,
      space included, and lets a label keep its own colon (`Fase 1: análisis: 3.000 €`),
      because only the split that leaves a well-formed figure on the right can match.
   2. Otherwise, the first colon separates. The amount is then free text rendered with
      inline(): it may be negative, carry a unit (`500 €/mes`), hold a second figure or
      use **negrita** (`-259 € **4.915 €**`). */
function splitBudgetItem(raw: string): BudgetItem {
  const clean = raw.match(/^(.*?)[\s:—–|\t]+((?:€\s*)?\d[\d.\s]*(?:,\d+)?\s*€?)$/);
  const m = clean ?? raw.match(/^([^:]+):\s*(\S.*)$/);
  if (!m) return { label: raw.trim(), amount: '' };
  return { label: m[1].trim(), amount: m[2].replace(/\s+/g, ' ').trim() };
}

function amountToNumber(amount: string): number {
  // Only the FIRST figure counts: a free-form amount may show a second one (the subtotal
  // after a discount), and concatenating both digits would invent a number nobody wrote.
  // Spanish formatting: '.' groups thousands, ',' is the decimal separator.
  const m = amount.match(/-?\d[\d.]*(?:,\d+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function formatEUR(n: number, decimals: boolean): string {
  const body = n.toLocaleString('es-ES', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
    // es-ES leaves four-digit integers ungrouped by default (9999 → "9999" but 10560 → "10.560"),
    // so a total under 10.000 came out looking unlike every other amount on the slide. Grouping is
    // typographic here, not locale trivia: the column has to read as one set of figures.
    useGrouping: 'always',
  });
  return `${body} €`;
}

/* Marker that suppresses the total row. There are budgets whose figures do not add up to
   anything meaningful — a one-off plus a monthly retainer — and printing a total there
   would state a number the proposal does not make. Several spellings because decks are
   written in es/ca/en; `nototal` is the canonical one. */
const NO_TOTAL = /^(no\s*total|sin\s*total|sense\s*total)$/i;
const isNoTotal = (s: string) => NO_TOTAL.test(s.trim().replace(/[.:]$/, ''));

export function parseBudget(tokens: Token[]): { items: BudgetItem[]; total?: string; conditions: string[]; conditionsLabel?: string } {
  // Conditions: optional list under a "### Condiciones" sub-heading; the first
  // remaining list holds the line items.
  let condIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // es: condiciones · ca: condicions · en: conditions
    if (t.t === 'h' && t.level >= 3 && /condicion|condition/i.test(t.text)) { condIdx = i; break; }
  }
  // The "### Condiciones" heading text is rendered as the section label (editable/translatable).
  const condHead = condIdx >= 0 ? tokens[condIdx] : undefined;
  const conditionsLabel = condHead && condHead.t === 'h' ? condHead.text : undefined;
  const condList = condIdx >= 0
    ? (tokens.slice(condIdx + 1).find((t) => t.t === 'ul') as Extract<Token, { t: 'ul' }> | undefined)
    : undefined;
  const itemList = tokens.find((t, i) =>
    t.t === 'ul' && (condIdx < 0 || i < condIdx)) as Extract<Token, { t: 'ul' }> | undefined;

  const conditions = condList?.items ?? DEFAULT_CONDICIONES;

  // The marker rides either as one more bullet (`- nototal`) or as a loose line in the block.
  const raw = (itemList?.items ?? []).map(splitBudgetItem);
  const noTotal = raw.some((it) => !it.amount && isNoTotal(it.label))
    || tokens.some((t) => t.t === 'p' && isNoTotal(t.text));
  // An explicit "Total" row wins; otherwise we auto-sum the line items.
  const explicitTotal = raw.find((it) => /^total(es)?$/i.test(it.label.replace(/[:.]$/, '').trim()));
  const items = raw.filter((it) => it !== explicitTotal && !(!it.amount && isNoTotal(it.label)));

  if (items.length === 0) {
    const fallback = { items: DEFAULT_BUDGET_ITEMS, conditions, conditionsLabel };
    return noTotal ? fallback : { ...fallback, total: '11.076 €' };
  }
  if (noTotal) return { items, conditions, conditionsLabel };

  const decimals = items.some((it) => /,/.test(it.amount));
  const sum = items.reduce((acc, it) => acc + amountToNumber(it.amount), 0);
  const total = explicitTotal?.amount || formatEUR(sum, decimals);
  return { items, total, conditions, conditionsLabel };
}

// The axis line sets the column count AND its unit label (the word the user typed).
const UNIT_KEYS = new Set([
  // es
  'semanas', 'semana', 'meses', 'mes', 'días', 'dias', 'día', 'dia',
  // ca
  'setmanes', 'setmana', 'mesos', 'dies',
  // en
  'weeks', 'week', 'months', 'month', 'days', 'day',
]);
const capitalize = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w);

export function parseGantt(body: string): { weeks: number; unit: string; rows: GanttRow[]; milestones: number[]; milestoneLabel?: string } {
  let weeks = 8;
  let unit = 'Semanas';
  const rows: GanttRow[] = [];
  let milestones: number[] = [];
  let milestoneLabel: string | undefined;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const [keyPart, valPart] = splitOnce(line, ':');
    const key = keyPart.trim().toLowerCase();
    const val = (valPart ?? '').trim();
    if (UNIT_KEYS.has(key)) { weeks = parseInt(val, 10) || weeks; unit = capitalize(keyPart.trim()); continue; }
    if (key.startsWith('hitos') || key.startsWith('milestone')) {
      milestones = val.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
      // The word after `hitos`/`milestones` is the milestone row label (e.g. `hitos cliente:`).
      const label = keyPart.trim().replace(/^(hitos|milestones?)\s*/i, '').trim();
      if (label) milestoneLabel = capitalize(label);
      continue;
    }
    rows.push({ label: keyPart.trim(), spans: parseSpans(val), accent: ACCENTS[rows.length % ACCENTS.length] });
  }
  return { weeks, unit, rows, milestones, milestoneLabel };
}

function splitOnce(s: string, sep: string): [string, string | undefined] {
  const idx = s.indexOf(sep);
  return idx === -1 ? [s, undefined] : [s.slice(0, idx), s.slice(idx + 1)];
}

// A row value is a comma-separated list of spans, so a phase can skip units
// (`4, 6, 9` → three one-unit bars). Each item goes through parseRange, so a
// list may mix ranges, single units and halves: `1-3, 6, 9-10.5`.
function parseSpans(v: string): GanttSpan[] {
  return v.split(',').map((s) => s.trim()).filter(Boolean).map(parseRange);
}

function parseRange(v: string): GanttSpan {
  // Endpoints may be halves (e.g. 2-3.5, 4-4.5) to draw half-week bars.
  const m = v.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  const n = parseFloat(v) || 1;
  // A whole number is a one-week block at that week; a bare fraction (e.g. 0.5)
  // is a short block starting at week 1.
  return Number.isInteger(n) ? [n, n] : [1, 1 + n];
}
