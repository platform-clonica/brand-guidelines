'use client';
import { useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { TagInput } from '@/components/studio/TagInput';
import { btn, btnGhost, colors, field, input, label, seg, segOn } from '@/components/deck/studio/ui';
import { ACCENTS, type Accent } from '@/lib/forms/schema';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

export type FormMetaValues = {
  title: string;
  client: string;
  accent: Accent;
  tags: string[];
};

type Mode = 'new' | 'duplicate' | 'edit';

const TITLES: Record<Mode, string> = {
  new: 'Crear nuevo formulario',
  duplicate: 'Duplicar formulario',
  edit: 'Editar formulario',
};
const SUBMIT: Record<Mode, string> = { new: 'Crear', duplicate: 'Duplicar', edit: 'Guardar' };
const BUSY: Record<Mode, string> = { new: 'Creando…', duplicate: 'Duplicando…', edit: 'Guardando…' };

/* Los acentos identifican servicios (lib/tokens.ts): no son decoración.
   Se etiquetan con su servicio para que elegir uno sea una decisión consciente. */
const ACCENT_LABELS: Record<Accent, string> = {
  opal: 'Opal · estrategia',
  bordeaux: 'Burdeos · experiencias',
  emerald: 'Esmeralda · cultura',
};

export function FormMetaModal({
  mode,
  initial,
  allTags = [],
  hint,
  onClose,
  onSubmit,
}: {
  mode: Mode;
  initial?: Partial<FormMetaValues>;
  allTags?: string[];
  hint?: string;
  onClose: () => void;
  onSubmit: (values: FormMetaValues) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [client, setClient] = useState(initial?.client ?? '');
  const [accent, setAccent] = useState<Accent>(initial?.accent ?? 'bordeaux');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), client: client.trim(), accent, tags });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setBusy(false);
    }
  }

  return (
    <Modal title={TITLES[mode]} onClose={onClose}>
      <form onSubmit={submit}>
        {hint && (
          <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginBottom: 16 }}>{hint}</div>
        )}

        <div style={field}>
          <label style={label} htmlFor="fm-title">Título</label>
          <input
            id="fm-title"
            style={input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Taller de alineamiento estratégico"
            autoFocus
          />
        </div>

        <div style={field}>
          <label style={label} htmlFor="fm-client">Cliente</label>
          <input
            id="fm-client"
            style={input}
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div style={field}>
          <label style={label}>Acento</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                aria-pressed={accent === a}
                style={{ ...seg, ...(accent === a ? segOn : {}), textTransform: 'none', letterSpacing: '.02em' }}
              >
                {ACCENT_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        <div style={field}>
          <TagInput
            tags={tags}
            onChange={setTags}
            suggestions={allTags}
            listId="form-tags"
            placeholder="Escribe y pulsa Enter (taller, prework…)"
          />
        </div>

        {error && (
          <div style={{ font: `400 11px/1.4 ${MONO}`, color: '#99335F', marginBottom: 12 }} role="alert">
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" style={btnGhost} onClick={onClose}>Cancelar</button>
          <button type="submit" style={btn} disabled={busy}>
            {busy ? BUSY[mode] : SUBMIT[mode]}
          </button>
        </div>
      </form>
    </Modal>
  );
}
