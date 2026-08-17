/* Eval rubric — pure function that scores text against Interactius brand rules.
   Used by:
   - /api/eval endpoint (HTTP)
   - scripts/eval-content.ts (CI / manual self-validation)
   - Future agent loops that need to validate before returning copy. */

/* Relativo con extensión, no el alias `@/`: es la convención de lib/forms y lo que permite
   cargar el módulo desde node --test, que no resuelve los paths de tsconfig. */
import { forbiddenVocabularyDetailed, sentenceLength } from './tokens.ts';

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

  // Word count for the whole text (sum of sentence words).
  const wordCount = sentences.reduce((sum, s) => sum + countWords(s), 0);

  return {
    score: scoreFor(violations),
    violations,
    sentenceCount: sentences.length,
    wordCount,
    hardFail: hardFailFor(violations),
  };
}

/* ─── La rúbrica, como funciones puras ───

   Extraídas para que quien filtre violaciones (la política por tipo de texto de ReWrit_r, el
   descarte de etiquetas cortas de /api/eval/manual) recalcule score y hardFail con ESTA regla y
   no con una copia. Antes /api/eval/manual repetía a mano el `100 - n*10` y la lista de reglas
   duras; dos copias de la misma rúbrica que podían separarse sin que nada avisara.

   `evalText` no cambia de firma ni de comportamiento: solo delega. */

export function isLengthViolation(v: EvalViolation): boolean {
  return v.rule === 'length:under_min' || v.rule === 'length:over_max';
}

/** Cada violación resta 10 puntos, con suelo en 0. */
export function scoreFor(violations: readonly EvalViolation[]): number {
  return Math.max(0, 100 - violations.length * 10);
}

/* Solo vocabulario prohibido y puntuación son no negociables. Las de longitud son blandas:
   un texto puede necesitar un fragmento corto. */
export function hardFailFor(violations: readonly EvalViolation[]): boolean {
  return violations.some(
    (v) =>
      v.rule === 'forbidden' ||
      v.rule === 'punctuation:exclamation' ||
      v.rule === 'punctuation:ellipsis',
  );
}
