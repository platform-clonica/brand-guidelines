import { Fragment } from 'react';

/* Inline markdown for deck text: **negrita** → <strong>, and ` / palabra / ` → the brand
   emphasis span (keeps the slashes, as in the manifesto title). Deterministic and
   injection-safe (we only emit <strong>/<span>, never raw HTML). Returns the plain string
   untouched when there's nothing to format. */

// Slash emphasis: `/ word /` delimited by slash-space … space-slash. The surrounding spaces
// stay outside the match so they're preserved; ordinary slashes (URLs, paths, "co-CEO / x")
// never match because they lack the paired `/ … /` shape.
const EMPH = /\/ (.+?) \//g;

function emphasize(text: string, keyBase: string): React.ReactNode {
  if (!text.includes('/ ')) return text;
  const parts = text.split(EMPH);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span className="emph" key={`${keyBase}-e${i}`}>/ {part} /</span>
      : <Fragment key={`${keyBase}-f${i}`}>{part}</Fragment>
  );
}

function formatted(text: string): React.ReactNode {
  if (!text.includes('**') && !text.includes('/ ')) return text;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i}>{part}</strong>
      : <Fragment key={i}>{emphasize(part, String(i))}</Fragment>
  );
}

export function inline(text: string): React.ReactNode {
  if (!text) return text;
  /* Salto de línea explícito. El parser guarda `\n` en el texto cuando el autor terminó la línea
     con `\` (ver lib/deck/parse.ts). Se emite un <br> real, así que FitText lo mide igual que
     cualquier otro salto y la slide sigue sin desbordar. */
  if (!text.includes('\n')) return formatted(text);
  return text.split('\n').map((line, i) => (
    <Fragment key={`l${i}`}>
      {i > 0 && <br />}
      {formatted(line)}
    </Fragment>
  ));
}
