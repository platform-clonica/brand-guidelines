/* Per-type field row: label + caption + control + inline error, wired for accessibility
   (label[for], aria-describedby, aria-required, aria-invalid). One switch over the 12 input types
   (PRD §8.3). Presentational `section`/`content` are handled in FormRenderer, not here. */

'use client';

import { useState } from 'react';
import type { InputField, FieldOption } from '@/lib/forms/schema';
import { optionValue, optionLabel } from '@/lib/forms/schema';
import { Md } from '../Md';

type Props = {
  field: InputField;
  value: unknown;
  error?: string;
  onChange: (name: string, value: unknown) => void;
};

export function FieldRow({ field, value, error, onChange }: Props) {
  const id = `f_${field.name}`;
  const captionId = field.caption ? `${id}_cap` : undefined;
  const errorId = error ? `${id}_err` : undefined;
  const describedBy = [captionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ixf-field">
      {/* boolean renders its label beside the checkbox (in Control) — no top label here, or it duplicates. */}
      {field.type !== 'boolean' ? (
        <label className="ixf-label" htmlFor={id}>
          <Md inline>{field.label}</Md>
          {field.required ? <span className="ixf-req" aria-hidden>*</span> : null}
        </label>
      ) : null}
      {field.caption ? (
        <span className="ixf-caption" id={captionId}>
          <Md inline>{field.caption}</Md>
        </span>
      ) : null}

      <Control field={field} id={id} value={value} onChange={onChange} describedBy={describedBy} invalid={Boolean(error)} />

      {error ? (
        <span className="ixf-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Control({
  field,
  id,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  field: InputField;
  id: string;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  describedBy?: string;
  invalid: boolean;
}) {
  const common = {
    id,
    name: field.name,
    'aria-describedby': describedBy,
    'aria-required': field.required || undefined,
    'aria-invalid': invalid || undefined,
  } as const;
  const set = (v: unknown) => onChange(field.name, v);

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          {...common}
          className="ixf-textarea"
          rows={field.rows ?? 4}
          maxLength={field.maxlength}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => set(e.target.value)}
        />
      );

    case 'radio':
    case 'select':
      if (field.type === 'select') {
        return (
          <select {...common} className="ixf-select" value={(value as string) ?? ''} onChange={(e) => set(e.target.value)}>
            <option value="" disabled>
              {field.placeholder ?? 'Selecciona…'}
            </option>
            {field.options.map((o: FieldOption) => (
              <option key={optionValue(o)} value={optionValue(o)}>
                {optionLabel(o)}
              </option>
            ))}
          </select>
        );
      }
      return (
        <div className="ixf-choices" role="radiogroup" aria-describedby={describedBy} aria-required={field.required || undefined}>
          {field.options.map((o: FieldOption) => (
            <label key={optionValue(o)} className="ixf-choice">
              <input
                type="radio"
                name={field.name}
                value={optionValue(o)}
                checked={value === optionValue(o)}
                onChange={() => set(optionValue(o))}
              />
              <span>{optionLabel(o)}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (v: string) =>
        set(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
      return (
        <div className="ixf-choices" role="group" aria-describedby={describedBy}>
          {field.options.map((o: FieldOption) => (
            <label key={optionValue(o)} className="ixf-choice">
              <input type="checkbox" checked={selected.includes(optionValue(o))} onChange={() => toggle(optionValue(o))} />
              <span>{optionLabel(o)}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'ranking':
      return <RankingControl field={field} value={value} onChange={onChange} describedBy={describedBy} />;

    case 'boolean':
      return (
        <label className="ixf-choice">
          <input
            id={id}
            type="checkbox"
            aria-describedby={describedBy}
            aria-required={field.required || undefined}
            checked={value === true}
            onChange={(e) => set(e.target.checked)}
          />
          <span>
            <Md inline>{field.label}</Md>
            {field.required ? <span className="ixf-req" aria-hidden>*</span> : null}
          </span>
        </label>
      );

    case 'scale': {
      const steps = [];
      for (let i = field.min; i <= field.max; i++) steps.push(i);
      return (
        <div className="ixf-scale">
          <div className="ixf-scale__track" role="radiogroup" aria-describedby={describedBy} aria-required={field.required || undefined}>
            {steps.map((n) => (
              <button
                key={n}
                type="button"
                className="ixf-scale__btn"
                aria-pressed={value === n}
                onClick={() => set(n)}
              >
                {n}
              </button>
            ))}
          </div>
          {field.min_label || field.max_label ? (
            <div className="ixf-scale__ends">
              <span>{field.min_label}</span>
              <span>{field.max_label}</span>
            </div>
          ) : null}
        </div>
      );
    }

    case 'number':
      return (
        <input
          {...common}
          className="ixf-input"
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          value={(value as string | number | undefined) ?? ''}
          onChange={(e) => set(e.target.value)}
        />
      );

    case 'date':
      return (
        <input
          {...common}
          className="ixf-input"
          type="date"
          min={field.min}
          max={field.max}
          value={(value as string) ?? ''}
          onChange={(e) => set(e.target.value)}
        />
      );

    default: {
      // text, email, tel, url
      const inputType = field.type === 'text' ? 'text' : field.type;
      return (
        <input
          {...common}
          className="ixf-input"
          type={inputType}
          maxLength={'maxlength' in field ? field.maxlength : undefined}
          pattern={'pattern' in field ? field.pattern : undefined}
          placeholder={field.placeholder}
          value={(value as string) ?? ''}
          onChange={(e) => set(e.target.value)}
        />
      );
    }
  }
}

type RankingField = Extract<InputField, { type: 'ranking' }>;

/* Orderable list: the value is the full set of option values in the chosen order (top → bottom).
   Reorder by drag (desktop) or the ↑/↓ buttons (keyboard + touch). The buttons are the accessible
   path; dragging is a progressive enhancement. */
function RankingControl({
  field,
  value,
  onChange,
  describedBy,
}: {
  field: RankingField;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  describedBy?: string;
}) {
  const all = field.options.map(optionValue);
  // Current order = stored value if valid, else declared option order.
  const order = Array.isArray(value) && value.length ? (value as string[]) : all;
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // Insertion slot for the drop indicator: 0..length ("insert before this index").
  const [dropAt, setDropAt] = useState<number | null>(null);
  // Just-moved item: value + a counter to re-trigger the fade even on repeated moves.
  const [flash, setFlash] = useState<{ v: string; n: number } | null>(null);
  const flag = (v: string) => setFlash((prev) => ({ v, n: (prev?.n ?? 0) + 1 }));

  const labelFor = (v: string) => {
    const opt = field.options.find((o) => optionValue(o) === v);
    return opt ? optionLabel(opt) : v;
  };

  // Buttons: swap with the neighbour (remove + reinsert).
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = order.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(field.name, next);
    flag(moved);
  };

  // Drag: drop the item into an insertion slot (0..length).
  const drop = (from: number, slot: number) => {
    const next = order.slice();
    const [moved] = next.splice(from, 1);
    next.splice(from < slot ? slot - 1 : slot, 0, moved);
    onChange(field.name, next);
    flag(moved);
  };

  const clearDrag = () => {
    setDragFrom(null);
    setDropAt(null);
  };

  // The indicator is meaningful only when it would actually change the order.
  const showAt = dragFrom !== null && dropAt !== null && dropAt !== dragFrom && dropAt !== dragFrom + 1 ? dropAt : null;

  return (
    <ol className="ixf-rank" aria-describedby={describedBy}>
      {order.map((v, i) => {
        const classes = ['ixf-rank__item'];
        if (dragFrom === i) classes.push('is-dragging');
        if (showAt === i) classes.push('is-drop-before');
        if (showAt === order.length && i === order.length - 1) classes.push('is-drop-after');
        const flashed = flash?.v === v;
        if (flashed) classes.push('is-just-moved');
        return (
          <li
            // Re-key on each flash so the CSS fade restarts even when the same item is moved again.
            key={flashed ? `${v}::${flash!.n}` : v}
            className={classes.join(' ')}
            onAnimationEnd={flashed ? () => setFlash(null) : undefined}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragEnd={clearDrag}
            onDragOver={(e) => {
              e.preventDefault();
              // Top half → insert before this item; bottom half → after it.
              const rect = e.currentTarget.getBoundingClientRect();
              const before = e.clientY < rect.top + rect.height / 2;
              setDropAt(before ? i : i + 1);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null && dropAt !== null) drop(dragFrom, dropAt);
              clearDrag();
            }}
          >
            <span className="ixf-rank__num" aria-hidden>{i + 1}</span>
            <span className="ixf-rank__label">{labelFor(v)}</span>
            <span className="ixf-rank__handle" aria-hidden title="Arrastra para reordenar">⠿</span>
            <span className="ixf-rank__btns">
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Subir "${labelFor(v)}"`}>↑</button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} aria-label={`Bajar "${labelFor(v)}"`}>↓</button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
