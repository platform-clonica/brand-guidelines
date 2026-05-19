/* Eval rubric — pure function that scores text against Interactius brand rules.
   Used by:
   - /api/eval endpoint (HTTP)
   - scripts/eval-content.ts (CI / manual self-validation)
   - Future agent loops that need to validate before returning copy. */

import {
  forbiddenVocabularyDetailed,
  sentenceLength,
} from '@/lib/tokens';

export type EvalViolation =
  | {
      rule: 'forbidden';
      match: string;
      root: string;
      index: number;
    }
  | {
      rule: 'length:under_min' | 'length:over_max';
      sentence: number;
      count: number;
      limit: number;
      excerpt: string;
    }
  | {
      rule: 'punctuation:exclamation' | 'punctuation:ellipsis';
      index: number;
    };

export type EvalResult = {
  score: number;                  // 0-100
  violations: EvalViolation[];
  sentenceCount: number;
  wordCount: number;
  hardFail: boolean;              // true if any rule that is non-negotiable trips
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Split into sentences using terminal punctuation. We accept ?! since the rules
   forbid ! in our copy but split anyway so a violating ! sentence is still
   measured for length. Spanish ¿¡ are stripped at boundaries. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!…])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function countWords(s: string): number {
  // Strip leading/trailing terminal punctuation, normalise whitespace.
  const cleaned = s.replace(/^[¿¡"'(]+|[.!?…)"']+$/gu, '').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/u).filter(Boolean).length;
}

export function evalText(text: string): EvalResult {
  const violations: EvalViolation[] = [];
  const sentences = splitSentences(text);

  // 1. Forbidden vocabulary — regex word-boundary, case-insensitive.
  for (const entry of forbiddenVocabularyDetailed) {
    for (const form of entry.family) {
      // Build pattern that handles multi-word forms (e.g. "valor añadido").
      // \b only works around ASCII word chars, so for unicode we use lookaround
      // with non-letter context.
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegex(form)}(?![\\p{L}\\p{N}])`,
        'giu',
      );
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        violations.push({
          rule: 'forbidden',
          match: m[0],
          root: entry.root,
          index: m.index,
        });
      }
    }
  }

  // 2. Sentence length.
  sentences.forEach((s, i) => {
    const count = countWords(s);
    if (count === 0) return;
    if (count < sentenceLength.min) {
      violations.push({
        rule: 'length:under_min',
        sentence: i + 1,
        count,
        limit: sentenceLength.min,
        excerpt: s.length > 80 ? s.slice(0, 77) + '…' : s,
      });
    } else if (count > sentenceLength.max) {
      violations.push({
        rule: 'length:over_max',
        sentence: i + 1,
        count,
        limit: sentenceLength.max,
        excerpt: s.length > 80 ? s.slice(0, 77) + '…' : s,
      });
    }
  });

  // 3. Punctuation — exclamation (¡ or !) and ellipsis (… or ...).
  const exclRe = /[¡!]/gu;
  let m: RegExpExecArray | null;
  while ((m = exclRe.exec(text)) !== null) {
    violations.push({ rule: 'punctuation:exclamation', index: m.index });
  }
  const ellipsisRe = /…|\.\.\./gu;
  while ((m = ellipsisRe.exec(text)) !== null) {
    violations.push({ rule: 'punctuation:ellipsis', index: m.index });
  }

  // Score: each violation subtracts 10 points, floored at 0.
  const score = Math.max(0, 100 - violations.length * 10);

  // Word count for the whole text (sum of sentence words).
  const wordCount = sentences.reduce((sum, s) => sum + countWords(s), 0);

  // Hard fail = any forbidden or punctuation violation. Length issues are
  // soft (style alert) — copy can sometimes need a short fragment.
  const hardFail = violations.some(
    (v) =>
      v.rule === 'forbidden' ||
      v.rule === 'punctuation:exclamation' ||
      v.rule === 'punctuation:ellipsis',
  );

  return {
    score,
    violations,
    sentenceCount: sentences.length,
    wordCount,
    hardFail,
  };
}
