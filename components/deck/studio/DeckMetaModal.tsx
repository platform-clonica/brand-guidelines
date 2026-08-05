'use client';
import { useState } from 'react';
import type { DeckType } from '@/lib/deck';
import type { ClientRecord, DeckMeta } from '@/lib/decks/types';
import { addClient, uploadLogo } from '@/lib/decks/api';
import { Modal } from './Modal';
import { TagInput } from '@/components/studio/TagInput';
import { btn, btnGhost, colors, field, input, label, seg, segOn } from './ui';

export type MetaValues = Pick<DeckMeta, 'commercial_id' | 'client_id' | 'contact_emails' | 'logo_path' | 'budget_url' | 'type' | 'tags'>;

const TYPES: { id: DeckType; label: string }[] = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'informe', label: 'Informe' },
  { id: 'generica', label: 'Genérica' },
];

type Mode = 'new' | 'edit' | 'duplicate';

const TITLES: Record<Mode, string> = {
  new: 'Crear Nuevo Deck',
  edit: 'Editar Presentación',
  duplicate: 'Duplicar Deck',
};
const SUBMIT: Record<Mode, string> = { new: 'Generar', edit: 'Guardar', duplicate: 'Duplicar' };

export function DeckMetaModal({
  mode,
  clients,
  initial,
  allTags = [],
  hint,
  onClose,
  onSubmit,
}: {
  mode: Mode;
  clients: ClientRecord[];
  initial?: Partial<MetaValues> & { client_name?: string | null };
  allTags?: string[];
  hint?: string;
  onClose: () => void;
  onSubmit: (values: MetaValues) => Promise<void> | void;
}) {
  const [commercialId, setCommercialId] = useState(initial?.commercial_id ?? '');
  const [type, setType] = useState<DeckType>(initial?.type ?? 'comercial');
  const [clientName, setClientName] = useState(initial?.client_name ?? '');
  const [emails, setEmails] = useState((initial?.contact_emails ?? []).join(', '));
  const [budgetUrl, setBudgetUrl] = useState(initial?.budget_url ?? '');
  const [logoPath, setLogoPath] = useState<string | null>(initial?.logo_path ?? null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill emails/logo from a client's defaults when its name is matched and fields are empty.
  const onClientChange = (value: string) => {
    setClientName(value);
    const match = clients.find((c) => c.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      if (!emails.trim() && match.default_emails?.length) setEmails(match.default_emails.join(', '));
      if (!logoPath && match.default_logo_path) setLogoPath(match.default_logo_path);
    }
  };

  const pickLogo = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const path = await uploadLogo(file);
      setLogoPath(path);
      setLogoName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el logo');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!commercialId.trim()) {
      setError('El ID Comercial es obligatorio');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Resolve client: reuse existing by name (case-insensitive), else create it.
      let clientId: string | null = null;
      const name = clientName.trim();
      if (name) {
        const match = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
        clientId = match ? match.id : (await addClient({ name, default_logo_path: logoPath, default_emails: parseEmails(emails) })).id;
      }
      await onSubmit({
        commercial_id: commercialId.trim(),
        client_id: clientId,
        contact_emails: parseEmails(emails),
        logo_path: logoPath,
        budget_url: budgetUrl.trim() || null,
        type,
        tags,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      setBusy(false);
    }
  };

  return (
    <Modal title={TITLES[mode]} onClose={onClose}>
      {hint && (
        <div style={{ font: '400 11px/1.5 var(--font-ibm-plex-mono, monospace)', color: '#46433F', background: '#F5F2ED', border: '1px solid #E0DAD2', padding: '10px 12px', marginBottom: 14 }}>
          {hint}
        </div>
      )}
      <div style={field}>
        <label style={label}>ID Comercial</label>
        <input style={input} value={commercialId} onChange={(e) => setCommercialId(e.target.value)} placeholder="04826-QUALITAHUB-BR" autoFocus />
      </div>

      <div style={field}>
        <label style={label}>Tipo</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {TYPES.map((t) => (
            <button key={t.id} type="button" onClick={() => setType(t.id)} style={{ ...seg, ...(type === t.id ? segOn : {}) }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={field}>
        <label style={label}>Cliente</label>
        <input style={input} list="deck-clients" value={clientName} onChange={(e) => onClientChange(e.target.value)} placeholder="Selecciona o escribe un cliente" />
        <datalist id="deck-clients">
          {clients.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </div>

      <div style={field}>
        <label style={label}>Email de contacto (separados por comas)</label>
        <input style={input} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="email@cliente.com, otro@cliente.com" />
      </div>

      <div style={field}>
        <label style={label}>Logo (SVG)</label>
        <input type="file" accept="image/svg+xml,image/*" onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])} style={{ font: '400 12px/1.4 var(--font-ibm-plex-mono, monospace)' }} />
        <div style={{ font: '400 10px/1.4 var(--font-ibm-plex-mono, monospace)', color: '#75706B', marginTop: 6 }}>
          {uploading ? 'Subiendo…' : logoPath ? `✓ ${logoName ?? 'logo guardado'}` : 'Sin logo'}
        </div>
      </div>

      {mode === 'edit' && (
        <div style={field}>
          <TagInput
            tags={tags}
            onChange={setTags}
            suggestions={allTags}
            listId="deck-tags"
            placeholder="Escribe y pulsa Enter (recruitment, 2024…)"
          />
        </div>
      )}

      {mode !== 'edit' && (
        <div style={field}>
          <label style={label}>URL Presupuesto</label>
          <input style={input} value={budgetUrl} onChange={(e) => setBudgetUrl(e.target.value)} placeholder="https://…" />
        </div>
      )}

      {error && <div style={{ font: '400 11px/1.4 var(--font-ibm-plex-mono, monospace)', color: '#99335F', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={btnGhost} onClick={onClose} disabled={busy}>Cancelar</button>
        <button style={btn} onClick={submit} disabled={busy || uploading}>{busy ? '…' : SUBMIT[mode]}</button>
      </div>
    </Modal>
  );
}

function parseEmails(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
