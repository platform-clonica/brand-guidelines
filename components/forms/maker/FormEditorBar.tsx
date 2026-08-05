'use client';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/deck/studio/IconButton';
import { TranslateMenu } from '@/components/deck/studio/TranslateMenu';
import { FIELD_SNIPPETS } from '@/lib/forms/templates';
import { colors, menuPanel } from '@/components/deck/studio/ui';
import type { TranslateTarget } from '@/lib/forms/translate';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Reglas del formato, en el mismo tooltip que las del markdown del deck. */
const MD_RULES = [
  'FORMATO DEL FORMULARIO',
  '',
  'Frontmatter (entre --- y ---):',
  '  id, title, status: draft|published',
  '  client, accent: opal|bordeaux|emerald',
  '  intro_title, submit_label, success_title',
  '',
  'Campos (lista `fields:`):',
  '  - type: text|textarea|email|number|tel|url',
  '          radio|checkbox|select|ranking',
  '          boolean|scale|date',
  '          section|content (no se responden)',
  '    name:  clave de la respuesta — no la cambies',
  '           si el formulario ya tiene respuestas',
  '    label: la pregunta',
  '    caption, required, options, min, max…',
  '',
  'El cuerpo tras el frontmatter es la intro,',
  'y admite Markdown.',
].join('\n');

/* Cabecera del panel del editor: el rótulo CONTENIDO y la fila de iconos.
   Misma anatomía que la del DeckStudio (components/deck/DeckStudio.tsx). */
export function FormEditorBar({
  onAddField,
  onTranslate,
}: {
  onAddField: (snippet: string) => void;
  onTranslate: (target: TranslateTarget) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
      <span
        style={{
          font: `500 11px/1.4 ${MONO}`, letterSpacing: '.14em',
          textTransform: 'uppercase', color: colors.ash,
        }}
      >
        Contenido
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <IconButton label="Formato del formulario" tooltip={MD_RULES} onClick={() => {}}>
          <RulesIcon />
        </IconButton>
        <TranslateMenu onPick={onTranslate} />
        <FieldMenu onPick={onAddField} />
      </div>
    </div>
  );
}

/* "Añadir campo": mismo patrón que TranslateMenu — icono + desplegable. */
function FieldMenu({ onPick }: { onPick: (snippet: string) => void }) {
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
      <IconButton label="Añadir campo" active={open} onClick={() => setOpen((v) => !v)}>
        <PlusIcon />
      </IconButton>
      {open && (
        <div style={{ ...menuPanel, width: 230, right: 0, left: 'auto' }} role="menu">
          {FIELD_SNIPPETS.map((s) => (
            <button
              key={s.type}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(s.snippet);
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

function RulesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <rect x="2.4" y="2.4" width="11.2" height="11.2" />
      <path d="M5 6h6M5 8.5h6M5 11h3.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M8 3.2v9.6M3.2 8h9.6" strokeLinecap="round" />
    </svg>
  );
}
