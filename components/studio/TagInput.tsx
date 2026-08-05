'use client';
import { useState } from 'react';
import { colors, input, label as labelStyle } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Entrada de etiquetas: chips + campo con autocompletado.
   Enter o coma añaden; Backspace con el campo vacío borra la última.

   Extraído de DeckMetaModal para que FormMaker no lo duplique: es el mismo gesto, y dos copias
   del mismo comportamiento acaban divergiendo. El `listId` separa los datalist de cada herramienta. */
export function TagInput({
  tags,
  onChange,
  suggestions = [],
  listId,
  label = 'Etiquetas',
  placeholder = 'Escribe y pulsa Enter',
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  listId: string;
  label?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft('');
  };
  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <>
      <label style={labelStyle}>{label}</label>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                border: `1px solid ${colors.warmDark}`, background: colors.white,
                font: `400 11px/1 ${MONO}`, color: colors.dark,
              }}
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                aria-label={`Quitar ${t}`}
                style={{
                  appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
                  color: colors.ash, font: `400 12px/1 ${MONO}`, padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        style={input}
        value={draft}
        list={listId}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {suggestions.filter((t) => !tags.includes(t)).map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  );
}
