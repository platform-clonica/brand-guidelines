'use client';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { colors, input, label as labelStyle, seg, segOn } from '@/components/deck/studio/ui';

/* Controles del editor de DSMak_r. Visten con components/deck/studio/ui.ts: son chrome del
   workspace, así que IBM Plex Mono a 400/500/600 y los colores base de lib/tokens.ts.

   Los campos de número y de color guardan el texto en local y SOLO confirman valores válidos: lo
   que se está tecleando ("14", "#1C1") no llega nunca al estado, y al salir del campo vuelve al
   último valor bueno. Así el sistema no ve un NaN ni un hex a medias. */

export const MONO = 'var(--font-ibm-plex-mono, monospace)';
export const ALERT = '#99335F'; // Burdeos — rol de alerta declarado en lib/tokens.ts

export const hintText: CSSProperties = { font: `400 10px/1.5 ${MONO}`, color: colors.ash };

/* Resincroniza el texto local cuando el valor cambia desde fuera (patrón de React para derivar
   estado de props sin efecto). */
function useDraft(shown: string) {
  const [text, setText] = useState(shown);
  const [prev, setPrev] = useState(shown);
  if (prev !== shown) {
    setPrev(shown);
    setText(shown);
  }
  return [text, setText] as const;
}

export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ background: colors.white, border: `1px solid ${colors.warmDark}`, padding: 24, marginBottom: 20 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: description ? 6 : 16 }}>
        <h2 style={{ margin: 0, font: `600 12px/1.3 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', color: colors.dark }}>
          {title}
        </h2>
        {actions && <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>{actions}</div>}
      </header>
      {description && <p style={{ ...hintText, margin: '0 0 16px' }}>{description}</p>}
      {children}
    </section>
  );
}

export function Grid({ cols, children, gap = 20 }: { cols: number; children: ReactNode; gap?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${Math.floor(760 / cols)}px), 1fr))`, gap: `0 ${gap}px` }}>
      {children}
    </div>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <label style={labelStyle} htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div style={{ ...hintText, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  id,
  ariaLabel,
  placeholder,
  width,
  list,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  width?: number;
  list?: string;
}) {
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      list={list}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...input, ...(width ? { width } : {}) }}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  integer = true,
  nullable = false,
  placeholder,
  suffix,
  width = 76,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  /** Vacío confirma `null` (el "hasta ∞" de un breakpoint). */
  nullable?: boolean;
  placeholder?: string;
  suffix?: string;
  width?: number;
  ariaLabel: string;
}) {
  const shown = value === null ? '' : String(value);
  const [text, setText] = useDraft(shown);

  const commit = (raw: string) => {
    const t = raw.trim().replace(',', '.');
    if (t === '') {
      if (nullable && value !== null) onChange(null);
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) return;
    if ((min !== undefined && n < min) || (max !== undefined && n > max)) return;
    if (n !== value) onChange(n);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => setText(shown)}
        style={{ ...input, width, padding: '7px 8px', font: `400 12px/1.2 ${MONO}` }}
      />
      {suffix && <span style={hintText}>{suffix}</span>}
    </span>
  );
}

export function ColorInput({
  value,
  onChange,
  ariaLabel,
  width = 150,
}: {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
  width?: number;
}) {
  const [text, setText] = useDraft(value);

  const commit = (raw: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(raw.trim());
    if (!m) return;
    const hex = `#${m[1].toUpperCase()}`;
    if (hex !== value) onChange(hex);
  };

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, width, maxWidth: '100%', padding: '6px 10px',
        border: `1px solid ${colors.warmDark}`, background: colors.white, boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          position: 'relative', width: 20, height: 20, flexShrink: 0, overflow: 'hidden', borderRadius: '50%',
          background: value, boxShadow: 'inset 0 0 0 1px rgba(28,26,23,.15)',
        }}
      >
        <input
          type="color"
          value={value.toLowerCase()}
          aria-label={`${ariaLabel} (selector)`}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ position: 'absolute', inset: -6, width: 32, height: 32, opacity: 0, cursor: 'pointer', border: 0, padding: 0 }}
        />
      </span>
      <input
        value={text}
        aria-label={ariaLabel}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => setText(value)}
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: 0,
          font: `400 12px/1.2 ${MONO}`, color: colors.dark, textTransform: 'uppercase',
        }}
      />
    </span>
  );
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  id,
  ariaLabel,
  width,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  id?: string;
  ariaLabel?: string;
  width?: number;
}) {
  /* Un valor guardado que ya no está en la lista (una fila antigua) se muestra igual, no se pisa. */
  const list = options.some((o) => o.value === value) ? options : [{ value, label: String(value) }, ...options];
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={String(list.findIndex((o) => o.value === value))}
      onChange={(e) => onChange(list[Number(e.target.value)].value)}
      style={{ ...input, ...(width ? { width } : {}), padding: '9px 10px', cursor: 'pointer' }}
    >
      {list.map((o, i) => (
        <option key={i} value={i}>{o.label}</option>
      ))}
    </select>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          style={{ ...seg, ...(o.value === value ? segOn : {}), flex: '1 0 auto', textTransform: 'none', letterSpacing: '.02em', padding: '9px 12px' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 14 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: colors.dark }}
      />
      <span>
        <span style={{ display: 'block', font: `400 12px/1.4 ${MONO}`, color: colors.dark }}>{label}</span>
        {hint && <span style={{ ...hintText, display: 'block', marginTop: 2 }}>{hint}</span>}
      </span>
    </label>
  );
}

export function LinkButton({
  onClick,
  children,
  danger = false,
  disabled = false,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        appearance: 'none', border: 'none', background: 'transparent', padding: 0, whiteSpace: 'nowrap',
        font: `500 11px/1.4 ${MONO}`, letterSpacing: '.02em', textDecoration: 'underline', textUnderlineOffset: 3,
        color: danger ? ALERT : colors.dark, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

export const cell: CSSProperties = { padding: '8px 12px 8px 0', verticalAlign: 'middle', font: `400 12px/1.4 ${MONO}`, color: colors.dark };
export const headCell: CSSProperties = { ...labelStyle, textAlign: 'left', padding: '0 12px 8px 0', marginBottom: 0 };
