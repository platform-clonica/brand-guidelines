import { NextResponse } from 'next/server';

import { evalText, type EvalViolation } from '@/lib/eval';
import esMessages from '@/messages/es.json';
import enMessages from '@/messages/en.json';

export const dynamic = 'force-dynamic';

/* Paths excluded from eval. Three categories:
   1. UI labels / chrome — not editorial prose.
   2. Self-referential meta — sections that legitimately cite forbidden
      vocabulary because they ARE the red list or punctuation rules.
   3. Technical / encyclopedic content — definitions, specs, do/don'ts, notes,
      captions. The sentenceLength rule (15-22 words) is meant for brand prose
      (intro, voice, axes, image lead). Technical descriptions follow their own
      logic: a do/don't is a 6-word rule, a font note is a 5-word imperative.

   Paths are tested as "startsWith" against the dotted key. */
const META_PATHS_EXCLUDED: readonly string[] = [
  // 1. UI / chrome
  'menu.',
  'chrome.',
  'ui.',
  'tonoMarca.copyPrompt',
  'universoVisual.copyPrompt',
  'iaReady.copy',
  'iaReady.open',
  'iaReady.endpointsTitle',
  'prompts.',
  // 2. Self-referential meta
  'tonoMarca.red',          // red1Word, red1Rule, ... redHeadWord, redTitle, redBody
  'tonoMarca.punc',         // punctuation rules cite the forbidden symbols
  // 3. Technical / encyclopedic content
  'meta.',                  // SEO metadata, not editorial copy
  'concepto.',              // phonetic / morphological definitions
  'areaReserva.',           // technical spec of clear-space
  'tamanoMinimo.',          // minimum size specs
  'usosIncorrectos.',       // do/don'ts (rules numbered, naturally short)
  'tipografia.brandTitle',
  'tipografia.brandBody',
  'tipografia.brandNotes',
  'tipografia.contrastTitle',
  'tipografia.contrastBody',
  'tipografia.contrastNotes',
  'tipografia.weights',
  'tipografia.italics',
  'tipografia.role',
  'tipografia.subtitle',
  'color.baseBody',
  'color.accentBody',
  'color.baseTitle',
  'color.accentTitle',
  'color.clickHint',
  'movimiento.videoFallback', // browser-fallback string, technical
  'movimiento.playLabel',     // button label
];

/* Length violations only matter for prose. We skip strings that are too short
   to be a sentence with a verb — labels, eyebrows, hints. */
const LENGTH_MIN_WORDS_TO_CHECK = 6;

type FlatEntry = {
  path: string;
  text: string;
};

function flatten(obj: unknown, prefix = ''): FlatEntry[] {
  const out: FlatEntry[] = [];
  if (typeof obj === 'string') {
    out.push({ path: prefix, text: obj });
    return out;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      out.push(...flatten(v, next));
    }
  }
  return out;
}

function isExcluded(path: string): boolean {
  return META_PATHS_EXCLUDED.some((p) => path.startsWith(p));
}

function isLengthOnly(violation: EvalViolation): boolean {
  return violation.rule === 'length:under_min' || violation.rule === 'length:over_max';
}

type LocaleReport = {
  locale: 'es' | 'en';
  totalStrings: number;
  evaluatedStrings: number;
  excludedStrings: number;
  entriesWithViolations: number;
  hardFailEntries: number;
  violations: Array<{
    path: string;
    text: string;
    score: number;
    hardFail: boolean;
    violations: EvalViolation[];
  }>;
};

function reportForLocale(locale: 'es' | 'en', messages: unknown): LocaleReport {
  const all = flatten(messages);
  const evaluated = all.filter((e) => !isExcluded(e.path));
  const excluded = all.length - evaluated.length;

  const violations: LocaleReport['violations'] = [];

  for (const entry of evaluated) {
    const wordCount = entry.text.trim().split(/\s+/u).filter(Boolean).length;
    const result = evalText(entry.text);

    // Filter length violations on very short labels (eyebrows, hints, titles)
    const filtered =
      wordCount < LENGTH_MIN_WORDS_TO_CHECK
        ? result.violations.filter((v) => !isLengthOnly(v))
        : result.violations;

    if (filtered.length === 0) continue;

    const hardFail = filtered.some(
      (v) =>
        v.rule === 'forbidden' ||
        v.rule === 'punctuation:exclamation' ||
        v.rule === 'punctuation:ellipsis',
    );

    violations.push({
      path: entry.path,
      text: entry.text,
      score: Math.max(0, 100 - filtered.length * 10),
      hardFail,
      violations: filtered,
    });
  }

  return {
    locale,
    totalStrings: all.length,
    evaluatedStrings: evaluated.length,
    excludedStrings: excluded,
    entriesWithViolations: violations.length,
    hardFailEntries: violations.filter((v) => v.hardFail).length,
    violations,
  };
}

export function GET() {
  const es = reportForLocale('es', esMessages);
  const en = reportForLocale('en', enMessages);

  const summary = {
    totalHardFail: es.hardFailEntries + en.hardFailEntries,
    totalEntriesWithViolations: es.entriesWithViolations + en.entriesWithViolations,
    rulesApplied: {
      forbidden: 'detect via regex word-boundary, case-insensitive, over ForbiddenEntry.family',
      sentenceLength: 'skipped for strings under 6 words (labels/eyebrows)',
      punctuation: '! / ¡ / … / ... — always applied',
    },
    excludedPathsCount: META_PATHS_EXCLUDED.length,
  };

  return NextResponse.json({ summary, es, en }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
