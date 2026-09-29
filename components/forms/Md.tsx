/* Inline/block Markdown for form copy (labels, captions, intro, content — PRD §8).
   Brand note: `*emphasis*` renders NON-italic (globals.css neutralises <em>); authors should use
   **bold** to emphasise. `inline` unwraps the paragraph so it can sit inside a <label>/<span>.
   `newTab` opens links in a new tab — for links inside a form, where leaving the page loses the answers. */

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Md({ children, inline = false, newTab = false }: { children: string; inline?: boolean; newTab?: boolean }) {
  const components: Components = {};
  if (inline) components.p = ({ children }) => <>{children}</>;
  if (newTab) components.a = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
