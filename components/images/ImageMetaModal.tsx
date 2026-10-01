'use client';
import { useState, type CSSProperties } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { TagInput } from '@/components/studio/TagInput';
import { btn, btnGhost, colors, field, input, label, linkBtn, linkDanger } from '@/components/deck/studio/ui';
import { useToast } from '@/components/ui/Toast';
import { updateImage } from '@/lib/decks/api';
import type { ImageRecord } from '@/lib/decks/types';
import { NAME_MAX, describeChanges, normalizeTag } from '@/lib/images/naming';
import { errorText, isLegacy } from '@/lib/images/view';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const NAME_HINT = 'Lo que verá el equipo al buscar. Describe qué se ve, no el archivo.';
const TAGS_HINT = 'Al menos una. Pulsa Intro o coma para añadirla. Se guardan en minúsculas.';
const CONFLICT = 'Alguien ha cambiado esta imagen desde otra pestaña mientras la editabas.';

/* Editar nombre y etiquetas (detalles 32 a 35).

   Guarda contra la versión que se abrió (`updated_at`). Si otra pestaña guardó antes, la API responde
   409 con la fila actual y aquí se enseña qué cambió de verdad, con dos salidas:
   - «Guardar encima» reenvía contra ESA versión, la que se acaba de ver. Si una tercera pestaña guarda
     entre medias, vuelve a salir el choque: nunca es una escritura a ciegas.
   - «Recargar» descarta lo escrito y pinta la fila actual.

   En las antiguas el nombre empieza vacío, con el actual como pista: el que tienen es el del fichero. */
export function ImageMetaModal({
  image,
  allTags,
  onClose,
  onSaved,
  onReloaded,
  onGone,
}: {
  image: ImageRecord;
  allTags: string[];
  onClose: () => void;
  onSaved: (row: ImageRecord) => void;
  onReloaded: (row: ImageRecord) => void;
  onGone: () => void;
}) {
  const toast = useToast();
  const legacy = isLegacy(image);
  const [name, setName] = useState(legacy ? '' : image.name);
  const [tags, setTags] = useState<string[]>(image.tags);
  const [bad, setBad] = useState({ name: false, tags: false });
  const [conflict, setConflict] = useState<ImageRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (expectedUpdatedAt: string) => {
    if (saving) return;
    const clean = name.trim();
    const problems = { name: !clean, tags: tags.length === 0 };
    setBad(problems);
    if (problems.name || problems.tags) return;
    setSaving(true);
    try {
      const res = await updateImage(image.id, { name: clean, tags, expectedUpdatedAt });
      if (res.ok) {
        toast.show('Cambios guardados');
        onSaved(res.row);
      } else if ('gone' in res) {
        onGone();
      } else {
        setConflict(res.conflict);
      }
    } catch (e) {
      toast.show(errorText(e, 'No se han podido guardar los cambios. Revisa la conexión y vuelve a pulsar Guardar.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Editar imagen" onClose={() => !saving && onClose()}>
      {conflict && (
        <div role="alert" style={conflictBox}>
          <span>
            {CONFLICT} {describeChanges({ name: image.name, tags: image.tags }, conflict)}
          </span>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <button type="button" className="hover-wipe-underline" style={linkDanger} onClick={() => save(conflict.updated_at)}>
              Guardar encima
            </button>
            <button
              type="button"
              className="hover-wipe-underline"
              style={linkBtn}
              onClick={() => {
                toast.show('Recargada con los cambios de la otra pestaña');
                onReloaded(conflict);
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      )}

      <div style={field}>
        <label style={label} htmlFor="imgr-editar-nombre">
          Nombre
        </label>
        <input
          id="imgr-editar-nombre"
          style={{ ...input, border: `1px solid ${bad.name ? colors.bordeaux : colors.warmDark}` }}
          value={name}
          placeholder={legacy ? image.name : undefined}
          maxLength={NAME_MAX}
          onChange={(e) => {
            setName(e.target.value);
            setBad((b) => ({ ...b, name: false }));
          }}
          aria-invalid={bad.name || undefined}
          aria-describedby="imgr-editar-nombre-pista"
        />
        <div id="imgr-editar-nombre-pista" style={{ ...hint, color: bad.name ? colors.bordeaux : colors.ash }}>
          {bad.name ? 'Ponle un nombre para poder guardarla.' : NAME_HINT}
        </div>
      </div>

      <div style={field}>
        <TagInput
          tags={tags}
          onChange={(next) => {
            setTags(next);
            setBad((b) => ({ ...b, tags: false }));
          }}
          suggestions={allTags}
          listId="imgr-editar-etiquetas"
          label="Etiquetas"
          placeholder="Por ejemplo: oficina, presentación, equipo"
          normalize={normalizeTag}
          invalid={bad.tags}
        />
        <div style={{ ...hint, color: bad.tags ? colors.bordeaux : colors.ash }}>
          {bad.tags ? 'Añade al menos una etiqueta.' : TAGS_HINT}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
        <button type="button" style={btnGhost} onClick={() => !saving && onClose()}>
          Cancelar
        </button>
        <button
          type="button"
          style={{ ...btn, ...(saving ? { opacity: 0.45, cursor: 'not-allowed' } : null) }}
          onClick={() => save(image.updated_at)}
          disabled={saving}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}

const hint: CSSProperties = { font: `400 11px/1.5 ${MONO}`, marginTop: 6 };

const conflictBox: CSSProperties = {
  border: `1px solid ${colors.bordeaux}`, padding: 12, marginBottom: 16, display: 'grid', gap: 10,
  font: `400 12px/1.5 ${MONO}`, color: colors.bordeaux,
};
