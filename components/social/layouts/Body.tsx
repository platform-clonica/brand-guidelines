import type { RichNode } from '@/lib/social/types';
import { inline } from '@/components/deck/inline';

/* Los nodos de cuerpo que comparten varios layouts: párrafos, listas
   sueltas y citas, en el orden en que se escribieron. */
export function Body({ nodes, className = 'copy' }: { nodes: RichNode[]; className?: string }) {
  return (
    <div className={className}>
      {nodes.map((n, i) => {
        if (n.t === 'p') return <p key={i}>{inline(n.text)}</p>;
        if (n.t === 'quote') return <p key={i}>{inline(n.text)}</p>;
        return (
          <ul className="items" key={i}>
            {n.items.map((it, j) => (
              <li key={j}>
                <span className="n">{j + 1}</span>
                <span className="t">
                  {it.lead && <span className="lead">{inline(it.lead)} </span>}
                  {inline(it.text)}
                </span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
