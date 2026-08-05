'use client';
import { useEffect, useRef, useState } from 'react';
import { FIELD_SNIPPETS } from '@/lib/forms/templates';
import { colors, menuPanel, toolbarBtn } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Paleta "añadir campo" — el equivalente de LayoutGallery en el estudio del deck.
   Inserta el snippet YAML al final de la lista `fields` y deja el cursor encima. */
export function FieldPalette({ onPick }: { onPick: (snippet: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        style={toolbarBtn}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        + Añadir campo
      </button>

      {open && (
        <div style={{ ...menuPanel, width: 260 }} role="menu">
          {FIELD_SNIPPETS.map((s) => (
            <button
              key={s.type}
              type="button"
              role="menuitem"
              onClick={() => {
                onPick(s.snippet);
                setOpen(false);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.warmLight)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', textAlign: 'left',
                appearance: 'none', border: 'none', borderBottom: `1px solid ${colors.warmDark}`,
                background: 'transparent', cursor: 'pointer', padding: '10px 12px',
                font: `500 11px/1.4 ${MONO}`, color: colors.dark,
              }}
            >
              <span style={{ flex: 1 }}>{s.label}</span>
              <span style={{ font: `400 10px/1 ${MONO}`, color: colors.ash }}>{s.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
