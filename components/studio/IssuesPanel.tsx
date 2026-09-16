'use client';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERT = '#99335F'; // Burdeos — rol de alerta declarado en lib/tokens.ts

export type PanelIssue = { level: 'error' | 'warning'; path: string; message: string };

/* Errores y avisos de un compilador, al pie del editor. Compartido por FormMak_r y DSMak_r.

   Cada herramienta dice dónde está cada incidencia con `locate`: FormMak_r devuelve la línea del
   markdown ("L12"), DSMak_r el paso del editor ("P1"), porque allí no hay texto. Si `locate` da
   `null`, la incidencia no lleva a ningún sitio y la fila no es pulsable. */
export function IssuesPanel<T extends PanelIssue>({
  issues,
  locate,
  onJump,
  stale,
  staleMessage = 'El documento no compila — el visor muestra la última versión válida.',
}: {
  issues: T[];
  locate: (issue: T) => { label: string; title: string } | null;
  onJump: (issue: T) => void;
  /* true cuando el visor está mostrando la última versión buena. */
  stale: boolean;
  staleMessage?: string;
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
          {staleMessage}
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {issues.map((issue, i) => {
          const isError = issue.level === 'error';
          const where = locate(issue);
          return (
            <li key={`${issue.path}-${i}`} style={{ borderBottom: `1px solid ${colors.warmDark}` }}>
              <button
                type="button"
                onClick={() => where && onJump(issue)}
                disabled={!where}
                title={where?.title}
                style={{
                  display: 'flex', gap: 8, width: '100%', textAlign: 'left', appearance: 'none',
                  border: 'none', background: 'transparent', padding: '8px 12px',
                  cursor: where ? 'pointer' : 'default',
                  font: `400 11px/1.5 ${MONO}`, color: colors.dark,
                }}
              >
                <span style={{ color: isError ? ALERT : colors.ash, flexShrink: 0 }} aria-hidden>
                  {isError ? '✕' : '!'}
                </span>
                <span style={{ color: colors.ash, flexShrink: 0, minWidth: 34 }}>{where?.label ?? '—'}</span>
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
