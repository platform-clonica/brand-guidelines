'use client';
import { useId, useState, type CSSProperties } from 'react';
import { suggestTags } from '@/lib/images/filter';
import { colors, input, label as labelStyle, srOnly } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Por defecto, como siempre: recortar y minúsculas. IMG_r pasa la suya (con guiones en lugar de
   espacios); DeckMak_r, FormMak_r y DSMak_r no, y la forma de sus etiquetas no cambia. */
const keepCase = (raw: string) => raw.trim().toLowerCase();

/* Entrada de etiquetas: chips + campo con sugerencias.
   Intro o coma añaden; salir del campo también; Retroceso con el campo vacío borra la última. Pegar
   «a, b» añade dos.

   Extraído de DeckMetaModal para que FormMaker no lo duplique: es el mismo gesto, y dos copias
   del mismo comportamiento acaban divergiendo.

   Las sugerencias eran un <datalist>: la lista la pintaba el navegador y decidía él qué coincidía (Chrome
   busca por subcadena y distingue tildes). Ahora es una lista propia, con el traje del desplegable de
   cliente de GalleryFilters: propone las etiquetas que EMPIEZAN por lo escrito, sin distinguir tildes, y
   se recorre con las flechas (detalle 20 de IMG_r). `listId` da nombre a esa lista. */
export function TagInput({
  tags,
  onChange,
  suggestions = [],
  listId,
  label = 'Etiquetas',
  placeholder = 'Escribe y pulsa Enter',
  normalize = keepCase,
  invalid = false,
  disabled = false,
  hideLabel = false,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  listId: string;
  label?: string;
  /** Solo se ve mientras no hay ninguna etiqueta. */
  placeholder?: string;
  normalize?: (raw: string) => string;
  /** El campo en Burdeos: falta una etiqueta que hace falta. */
  invalid?: boolean;
  disabled?: boolean;
  /** La etiqueta se lee con lector de pantalla pero no se ve (las filas de la subida de IMG_r). */
  hideLabel?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const uid = useId();
  const inputId = `${listId}-${uid}`;
  const listboxId = `${inputId}-sugerencias`;
  const options = open && !disabled ? suggestTags(draft, suggestions, tags) : [];
  const active = hi >= 0 && hi < options.length ? hi : -1;

  const add = (raw: string) => {
    const next = [...tags];
    for (const piece of raw.split(',')) {
      const t = normalize(piece);
      if (t && !next.includes(t)) next.push(t);
    }
    if (next.length !== tags.length) onChange(next);
    setDraft('');
    setHi(-1);
  };
  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length) {
      e.preventDefault();
      setHi((active + 1) % options.length);
    } else if (e.key === 'ArrowUp' && options.length) {
      e.preventDefault();
      setHi(active <= 0 ? options.length - 1 : active - 1);
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(active >= 0 ? options[active] : draft);
    } else if (e.key === 'Escape' && options.length) {
      // Cierra la lista, no el modal en el que está el campo.
      e.stopPropagation();
      setOpen(false);
      setHi(-1);
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <>
      <label htmlFor={inputId} style={hideLabel ? srOnly : labelStyle}>
        {label}
      </label>
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
                disabled={disabled}
                aria-label={`Quitar ${t}`}
                style={{
                  appearance: 'none', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer',
                  color: colors.ash, font: `400 12px/1 ${MONO}`, padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          style={{ ...input, border: `1px solid ${invalid ? colors.bordeaux : colors.warmDark}` }}
          value={draft}
          disabled={disabled}
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
            setHi(-1);
          }}
          onKeyDown={onKey}
          onBlur={() => {
            if (draft.trim()) add(draft);
            setOpen(false);
          }}
          placeholder={tags.length ? '' : placeholder}
        />
        {options.length > 0 && (
          <ul id={listboxId} role="listbox" aria-label={label} style={panel}>
            {options.map((o, i) => (
              <li
                key={o}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown y no click: el clic llegaría después del blur, que ya habría añadido lo escrito.
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(o);
                }}
                onMouseEnter={() => setHi(i)}
                style={{
                  ...row,
                  borderBottom: i < options.length - 1 ? `1px solid ${colors.warmDark}` : 'none',
                  background: i === active ? colors.warmLight : colors.white,
                }}
              >
                {o}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

const panel: CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 5, margin: 0, padding: 0, listStyle: 'none',
  maxHeight: 180, overflowY: 'auto', background: colors.white, border: `1px solid ${colors.dark}`,
};

const row: CSSProperties = {
  padding: '8px 10px', cursor: 'pointer', font: `400 12px/1.2 ${MONO}`, color: colors.dark,
};
