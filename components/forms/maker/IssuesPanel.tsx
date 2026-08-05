'use client';
import { colors } from '@/components/deck/studio/ui';
import type { FormIssue } from '@/lib/forms/compile';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERT = '#99335F'; // Burdeos — rol de alerta declarado en lib/tokens.ts

/* Errores y avisos del compilador. Equivalente del panel de warnings de DeckStudio.
   Cada línea es pulsable: lleva el cursor a la línea del documento donde está el problema. */
export function IssuesPanel({
  issues,
  stale,
  onJump,
}: {
  issues: FormIssue[];
  /* true cuando el documento no compila: el visor está mostrando la última versión buena. */
  stale: boolean;
  onJump: (line: number) => void;
}) {
  if (!issues.length) return null;

  return (
    <div
      style={{
        borderTop: `1px solid ${colors.warmDark}`,
        maxHeight: 180,
        overflowY: 'auto',
        background: colors.white,
        flexShrink: 0,
      }}
    >
      {stale && (
        <div
          style={{
            padding: '8px 12px',
            font: `500 10px/1.4 ${MONO}`,
            letterSpacing: '.04em',
            color: ALERT,
            borderBottom: `1px solid ${colors.warmDark}`,
            background: 'rgba(153,51,95,.05)',
          }}
        >
          El documento no compila — el visor muestra la última versión válida.
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {issues.map((issue, i) => {
          const isError = issue.level === 'error';
          return (
            <li key={`${issue.path}-${i}`} style={{ borderBottom: `1px solid ${colors.warmDark}` }}>
              <button
                type="button"
                onClick={() => issue.line && onJump(issue.line)}
                disabled={!issue.line}
                title={issue.line ? `Ir a la línea ${issue.line}` : undefined}
                style={{
                  display: 'flex', gap: 8, width: '100%', textAlign: 'left', appearance: 'none',
                  border: 'none', background: 'transparent', padding: '8px 12px',
                  cursor: issue.line ? 'pointer' : 'default',
                  font: `400 11px/1.5 ${MONO}`, color: colors.dark,
                }}
              >
                <span style={{ color: isError ? ALERT : colors.ash, flexShrink: 0 }} aria-hidden>
                  {isError ? '✕' : '!'}
                </span>
                <span style={{ color: colors.ash, flexShrink: 0, minWidth: 34 }}>
                  {issue.line ? `L${issue.line}` : '—'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: colors.ash }}>{issue.path}</span>{' '}
                  {issue.message}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
