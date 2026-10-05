import { evalText } from '../../eval.ts';
import { NAME_MAX, normalizeTags } from '../naming.ts';
import type { AnalysisOutput, StoredStyle } from './schema.ts';
import { verdictFrom } from './verdict.ts';

/* Lo que se hace con la salida del modelo antes de enseñarla o guardarla.

   - El veredicto sale de los criterios (verdictFrom), no del modelo.
   - El nombre y el motivo se auditan con evalText(). «Pasa» es no tener ningún incumplimiento duro
     (vocabulario prohibido o puntuación): la longitud es una regla blanda, y un nombre de 3 a 8 palabras
     siempre la incumpliría. Un nombre que no pasa no se propone. Un motivo que no pasa se reintenta una
     vez (lo decide quien llama, con `reasonFailed`) y, si sigue sin pasar, se guarda sin motivo.
   - Las etiquetas se normalizan igual que las de la subida. */

export const PROPOSAL_TAGS_MAX = 5;

export type AnalysisResult = {
  proposal: { name: string | null; tags: string[] };
  style: StoredStyle;
};

const passes = (text: string) => !evalText(text).hardFail;

export function finishAnalysis(out: AnalysisOutput): { result: AnalysisResult; reasonFailed: boolean } {
  const name = out.name.trim().replace(/\.+$/, '').trim().slice(0, NAME_MAX);
  const reason = out.style.reason.trim();
  const reasonOk = reason !== '' && passes(reason);
  return {
    result: {
      proposal: { name: name && passes(name) ? name : null, tags: normalizeTags(out.tags).slice(0, PROPOSAL_TAGS_MAX) },
      style: { verdict: verdictFrom(out.style.checks), checks: out.style.checks, reason: reasonOk ? reason : null, people_present: out.people_present },
    },
    reasonFailed: !reasonOk,
  };
}

/* Las columnas de estilo de una fila, desde lo que manda el navegador al registrar una subida o desde un
   análisis del banco. El veredicto se recalcula y el motivo se vuelve a auditar: lo que llega del navegador
   no se toma como bueno. */
export function styleColumns(style: StoredStyle, now = new Date()) {
  const reason = style.reason?.trim() || null;
  return {
    style_verdict: verdictFrom(style.checks),
    style_checks: style.checks,
    style_reason: reason && passes(reason) ? reason : null,
    people_present: style.people_present,
    style_analyzed_at: now.toISOString(),
  };
}
