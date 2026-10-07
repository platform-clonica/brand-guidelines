'use client';
import { useState, type CSSProperties } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors } from '@/components/deck/studio/ui';
import { TagInput } from '@/components/studio/TagInput';
import { useToast } from '@/components/ui/Toast';
import { bulkAddTags, type BulkTagsResult } from '@/lib/decks/api';
import { tagsDone, tagsIntro } from '@/lib/images/bulk';
import { TAGS_MAX, normalizeTag } from '@/lib/images/naming';
import { errorText } from '@/lib/images/view';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* «Añadir etiquetas» a la selección (entrega 3, G10). Las que cada imagen ya tiene no cambian: la unión la
   hace el servidor fila a fila, hasta TAGS_MAX por imagen. El aviso dice a cuántas se añadieron y, si las hay,
   cuántas ya estaban llenas o ya no estaban en el banco. */
export function BulkTagsModal({
  ids,
  allTags,
  onClose,
  onDone,
}: {
  ids: string[];
  allTags: string[];
  onClose: () => void;
  onDone: (result: BulkTagsResult) => void;
}) {
  const toast = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [bad, setBad] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    if (!tags.length) {
      setBad(true);
      return;
    }
    setSaving(true);
    try {
      const res = await bulkAddTags(ids, tags);
      toast.show(tagsDone({ done: ids.length - res.full.length - res.missing.length, full: res.full.length, missing: res.missing.length }));
      onDone(res);
    } catch (e) {
      toast.show(errorText(e, 'No se han podido añadir las etiquetas. Revisa la conexión y vuelve a intentarlo.'));
      setSaving(false);
    }
  };

  return (
    <Modal title="Añadir etiquetas" onClose={() => !saving && onClose()}>
      <p style={msg}>{tagsIntro(ids.length)}</p>
      <TagInput
        tags={tags}
        onChange={(next) => {
          setTags(next.slice(0, TAGS_MAX));
          setBad(false);
        }}
        suggestions={allTags}
        listId="imgr-bloque-etiquetas"
        label="Etiquetas"
        placeholder="Por ejemplo: oficina, presentación, equipo"
        normalize={normalizeTag}
        invalid={bad}
        disabled={saving}
      />
      <div style={{ ...hint, color: bad ? colors.bordeaux : colors.ash }}>
        {bad ? 'Añade al menos una etiqueta.' : 'Pulsa Intro o coma para añadir cada etiqueta.'}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
        <button type="button" style={{ ...btnGhost, ...(saving ? off : null) }} onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" style={{ ...btn, ...(saving ? off : null) }} onClick={submit} disabled={saving}>
          {saving ? 'Añadiendo' : 'Añadir'}
        </button>
      </div>
    </Modal>
  );
}

const msg: CSSProperties = { font: `400 13px/1.55 ${MONO}`, color: colors.dark, margin: '0 0 14px' };
const hint: CSSProperties = { font: `400 11px/1.5 ${MONO}`, marginTop: 6 };
const off: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
