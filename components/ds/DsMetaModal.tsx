'use client';
import { useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { TagInput } from '@/components/studio/TagInput';
import { btn, btnGhost, colors, field, input, label, seg, segOn } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* De dónde parte un sistema nuevo. La plantilla Interactius lee sus valores de lib/tokens.ts
   (lib/ds/template.ts); la otra son los valores por defecto del motor. */
export type DsStart = 'default' | 'interactius';

export type DsMetaValues = { name: string; client: string; tags: string[]; start: DsStart };

type Mode = 'new' | 'duplicate' | 'edit';

const TITLES: Record<Mode, string> = {
  new: 'Crear design system',
  duplicate: 'Duplicar design system',
  edit: 'Renombrar design system',
};
const SUBMIT: Record<Mode, string> = { new: 'Crear', duplicate: 'Duplicar', edit: 'Guardar' };
/* Sin puntos suspensivos (punctuationRules.noEllipsis). */
const BUSY: Record<Mode, string> = { new: 'Creando', duplicate: 'Duplicando', edit: 'Guardando' };

const STARTS: { value: DsStart; label: string }[] = [
  { value: 'default', label: 'Valores por defecto' },
  { value: 'interactius', label: 'Marca Interactius' },
];

/* Crear, duplicar y renombrar comparten modal, como en FormMak_r. El punto de partida solo existe
   al crear: duplicar parte del original y renombrar no toca la marca. */
export function DsMetaModal({
  mode,
  initial,
  allTags = [],
  hint,
  onClose,
  onSubmit,
}: {
  mode: Mode;
  initial?: Partial<DsMetaValues>;
  allTags?: string[];
  hint?: string;
  onClose: () => void;
  onSubmit: (values: DsMetaValues) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [client, setClient] = useState(initial?.client ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [start, setStart] = useState<DsStart>(initial?.start ?? 'default');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), client: client.trim(), tags, start });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      setBusy(false);
    }
  }

  return (
    <Modal title={TITLES[mode]} onClose={onClose}>
      <form onSubmit={submit}>
        {hint && <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginBottom: 16 }}>{hint}</div>}

        <div style={field}>
          <label style={label} htmlFor="ds-name">Nombre</label>
          <input id="ds-name" style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme web" autoFocus />
        </div>

        <div style={field}>
          <label style={label} htmlFor="ds-client">Cliente</label>
          <input id="ds-client" style={input} value={client} onChange={(e) => setClient(e.target.value)} placeholder="Opcional" />
        </div>

        {mode === 'new' && (
          <div style={field}>
            <label style={label}>Punto de partida</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {STARTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStart(s.value)}
                  aria-pressed={start === s.value}
                  style={{ ...seg, ...(start === s.value ? segOn : {}), textTransform: 'none', letterSpacing: '.02em' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={field}>
          <TagInput tags={tags} onChange={setTags} suggestions={allTags} listId="ds-tags" placeholder="Escribe y pulsa Enter (web, app)" />
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
