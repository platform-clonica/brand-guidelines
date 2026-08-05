/* Form column (40%) — client component. Holds state, validates on the client with the SAME derived
   Zod schema the server uses (single source of truth), submits, and swaps to the success panel.
   States: idle → submitting → success | error (PRD §9.4). */

'use client';

import { useRef, useState } from 'react';
import type { FormDraft } from '@/lib/forms/schema';
import { validateAnswers, normalizeAnswers, isInputField, optionValue } from '@/lib/forms/schema';
import { Md } from './Md';
import { FieldRow } from './fields/FieldControl';
import { SuccessPanel } from './SuccessPanel';

type Status = 'idle' | 'submitting' | 'success' | 'error';

function initialValues(def: FormDraft): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (!isInputField(f)) continue;
    if (f.type === 'ranking') {
      // Always a full permutation (default order first, then any missing options).
      const all = f.options.map(optionValue);
      const start: string[] = [];
      if (Array.isArray(f.default)) for (const x of f.default) if (all.includes(x) && !start.includes(x)) start.push(x);
      v[f.name] = [...start, ...all.filter((x) => !start.includes(x))];
    } else if ('default' in f && f.default !== undefined) v[f.name] = f.default;
    else if (f.type === 'checkbox') v[f.name] = [];
    else if (f.type === 'boolean') v[f.name] = false;
  }
  return v;
}

/* `preview` = el visor en vivo de FormMaker: se rellena y se valida igual que el formulario real,
   pero el envío se corta en seco — no se llama a /forms/api/submit y no se escribe nada en
   `responses`. La ruta pública no pasa el prop, así que su comportamiento no cambia en absoluto. */
export function FormRenderer({ def, preview = false }: { def: FormDraft; preview?: boolean }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(def));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const hpRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const accentVar = `var(--c-${def.accent})`;

  const onChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  function validate(): Record<string, string> {
    const res = validateAnswers(def, normalizeAnswers(def, values));
    return res.ok ? {} : res.errors;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;

    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      // Focus the first field with an error.
      const first = Object.keys(found)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});

    // Vista previa: la validación ya ha corrido; aquí se para. Nada de red, nada de persistencia.
    if (preview) {
      setStatus('success');
      return;
    }

    setStatus('submitting');

    try {
      const res = await fetch('/forms/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: def.id,
          answers: normalizeAnswers(def, values),
          hp: hpRef.current?.value ?? '',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.errors) setErrors(data.errors);
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="ixf-panel" style={{ ['--accent' as string]: accentVar }}>
        <SuccessPanel title={def.success_title} message={def.success_message} />
        {preview && (
          <div className="ixf-preview-note" role="note">
            Vista previa — no se ha enviado nada.{' '}
            <button type="button" onClick={() => setStatus('idle')}>
              Volver al formulario
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ixf-panel" style={{ ['--accent' as string]: accentVar }}>
      {def.intro_title ? <div className="ixf-eyebrow">{def.intro_title}</div> : null}
      <h1 className="ixf-title">{def.title}</h1>
      {def.intro ? (
        <div className="ixf-intro">
          <Md>{def.intro}</Md>
        </div>
      ) : null}

      <form ref={formRef} className="ixf-form" onSubmit={onSubmit} noValidate>
        <div className="ixf-fields">
          {def.fields.map((f, i) => {
            if (f.type === 'section') {
              return (
                <div className="ixf-section" key={`s${i}`}>
                  <h2 className="ixf-section__title">{f.title}</h2>
                  {f.description ? <p className="ixf-section__desc">{f.description}</p> : null}
                </div>
              );
            }
            if (f.type === 'content') {
              return (
                <div className="ixf-content" key={`c${i}`}>
                  <Md>{f.body}</Md>
                </div>
              );
            }
            return (
              <FieldRow key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={onChange} />
            );
          })}
        </div>

        {/* Honeypot: hidden field bots tend to fill. Real users never see it. */}
        <input ref={hpRef} type="text" name="website" className="ixf-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <div className="ixf-actions">
          <button type="submit" className="ixf-submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Enviando…' : def.submit_label}
          </button>
          {status === 'error' ? (
            <p className="ixf-submit-error" role="alert">
              No se pudo enviar. Revisa los campos marcados o inténtalo de nuevo; tus respuestas no se han perdido.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
