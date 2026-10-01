'use client';
import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { TagInput } from '@/components/studio/TagInput';
import { btn, btnGhost, colors, field, input, linkBtn, srOnly } from '@/components/deck/studio/ui';
import { useToast } from '@/components/ui/Toast';
import type { ImageRecord } from '@/lib/decks/types';
import { UnreadableImageError, uploadToBank } from '@/lib/images/client';
import { normalizeTag } from '@/lib/images/naming';
import {
  effectiveTags,
  formatBytes,
  rowProblem,
  unreadableMessage,
  uploadButtonLabel,
  uploadSummary,
  validateFile,
} from '@/lib/images/upload';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const TAGS_HINT = 'Por ejemplo: oficina, presentación, equipo';
const NETWORK_ERROR = 'No se pudo subir. Revisa la conexión y vuelve a pulsar Subir.';

type RowState = 'idle' | 'up' | 'done' | 'err';

type Row = {
  key: number;
  file: File;
  preview: string;
  name: string;
  tags: string[];
  state: RowState;
  /** El fallo de la subida (conexión o fichero ilegible). */
  error: string | null;
  /** Se pulsó Subir sin nombre o sin etiqueta. */
  bad: boolean;
};

/* Para que la galería añada a una subida ya abierta los ficheros que se sueltan sobre la página. */
export type UploadHandle = { addFiles: (files: FileList | File[]) => void };

/* La subida al banco (detalles 16 a 27): la misma en IMG_r y en el popup de DeckMak_r y FormMak_r.

   Cada imagen pide nombre y al menos una etiqueta, propia o común al lote. El nombre empieza vacío: el
   del fichero solo aparece como pista, para que nadie suba «IMG_4821» sin pensarlo. Se sube una detrás
   de otra; mientras sube, el modal no se cierra (ni Escape, ni clic fuera, ni Cancelar) y las filas no se
   tocan. Si una falla, las buenas quedan subidas y volver a pulsar Subir solo reintenta las fallidas.

   `onUploaded` recibe las que se subieron en cada pasada, también si alguna falló, para que la rejilla las
   enseñe ya. Si no falló ninguna, el modal se cierra solo. */
export function ImageUploadModal({
  initialFiles,
  allTags,
  onClose,
  onUploaded,
  ref,
}: {
  initialFiles?: File[];
  allTags: string[];
  onClose: () => void;
  onUploaded: (records: ImageRecord[]) => void;
  ref?: Ref<UploadHandle>;
}) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [common, setCommon] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(0);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const addFiles = (list: FileList | File[]) => {
    if (busyRef.current) return;
    const fresh: Row[] = [];
    const bad: string[] = [];
    for (const file of Array.from(list)) {
      const problem = validateFile(file);
      if (problem) bad.push(problem);
      else
        fresh.push({
          key: ++keyRef.current,
          file,
          preview: URL.createObjectURL(file),
          name: '',
          tags: [],
          state: 'idle',
          error: null,
          bad: false,
        });
    }
    if (bad.length) setRejected((prev) => [...prev, ...bad]);
    if (fresh.length) setRows((prev) => [...prev, ...fresh]);
  };

  useImperativeHandle(ref, () => ({ addFiles }));

  // Los ficheros con los que se abrió (soltados sobre la galería), una sola vez.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !initialFiles?.length) return;
    seeded.current = true;
    addFiles(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Las vistas previas son URLs de objeto: se liberan al quitar la fila y al cerrar.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.preview)), []);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (row: Row) => {
    if (busy) return;
    URL.revokeObjectURL(row.preview);
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  };

  const pending = rows.filter((r) => r.state !== 'done');

  const submit = async () => {
    if (busy || !pending.length) return;
    const problems = pending.filter((r) => rowProblem(r, common));
    if (problems.length) {
      setRows((prev) => prev.map((r) => (r.state !== 'done' && rowProblem(r, common) ? { ...r, bad: true } : r)));
      toast.show('Revisa las imágenes marcadas: falta nombre o etiqueta');
      return;
    }

    setBusy(true);
    const todo = pending;
    const records: ImageRecord[] = [];
    let failed = 0;
    for (let i = 0; i < todo.length; i++) {
      const row = todo[i];
      setProgress({ current: i + 1, total: todo.length });
      update(row.key, { state: 'up', error: null });
      try {
        const rec = await uploadToBank(row.file, { name: row.name.trim(), tags: effectiveTags(common, row.tags) });
        records.push(rec);
        update(row.key, { state: 'done' });
      } catch (e) {
        failed++;
        update(row.key, { state: 'err', error: e instanceof UnreadableImageError ? unreadableMessage(row.file.name) : NETWORK_ERROR });
      }
    }
    setProgress(null);
    setBusy(false);

    if (records.length) onUploaded(records);
    toast.show(uploadSummary(records.length, failed));
    if (!failed) onClose();
  };

  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Modal title="Subir imágenes" onClose={close}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          // Que no llegue también al soltar de la galería, que abriría otra subida.
          e.stopPropagation();
          setOver(false);
          if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
        }}
        style={{
          display: 'grid', gap: 8, justifyItems: 'center', textAlign: 'center', padding: 22,
          border: `1px dashed ${over ? colors.dark : colors.ash}`, background: over ? colors.grey : colors.white,
        }}
      >
        <p style={dropText}>Arrastra aquí las imágenes o</p>
        <button
          type="button"
          className="hover-wipe-underline"
          style={{ ...linkBtn, ...(busy ? disabledLink : null) }}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          elige archivos
        </button>
        <p style={dropText}>JPEG, PNG o WebP · hasta 25 MB cada una</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {rejected.length > 0 && (
        <div role="alert" style={{ marginTop: 14, display: 'grid', gap: 2, font: `400 11px/1.6 ${MONO}`, color: colors.bordeaux }}>
          {rejected.map((r, i) => (
            <span key={i}>{r}</span>
          ))}
        </div>
      )}

      {rows.length >= 2 && (
        <div style={{ ...field, marginTop: 18 }}>
          <TagInput
            tags={common}
            onChange={(next) => {
              setCommon(next);
              setRows((prev) => prev.map((r) => ({ ...r, bad: false })));
            }}
            suggestions={allTags}
            listId="imgr-comunes"
            label="Etiquetas para todas"
            placeholder={TAGS_HINT}
            normalize={normalizeTag}
            disabled={busy}
          />
          <div style={hint}>
            Se añaden a cada imagen. Cada una puede llevar además las suyas. Pulsa Intro o coma para añadir cada etiqueta.
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {rows.map((row) => (
            <UploadRow
              key={row.key}
              row={row}
              common={common}
              allTags={allTags}
              locked={busy || row.state === 'done' || row.state === 'up'}
              onName={(name) => update(row.key, { name, bad: false })}
              onTags={(tags) => update(row.key, { tags, bad: false })}
              onRemove={() => removeRow(row)}
            />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
        <button type="button" style={{ ...btnGhost, ...(busy ? disabledBtn : null) }} onClick={close} disabled={busy}>
          Cancelar
        </button>
        <button
          type="button"
          style={{ ...btn, ...(busy || !pending.length ? disabledBtn : null) }}
          onClick={submit}
          disabled={busy || !pending.length}
        >
          {uploadButtonLabel(pending.length, progress ?? undefined)}
        </button>
      </div>
    </Modal>
  );
}

function UploadRow({
  row,
  common,
  allTags,
  locked,
  onName,
  onTags,
  onRemove,
}: {
  row: Row;
  common: string[];
  allTags: string[];
  locked: boolean;
  onName: (name: string) => void;
  onTags: (tags: string[]) => void;
  onRemove: () => void;
}) {
  const nameId = `imgr-nombre-${row.key}`;
  const problem = row.bad ? rowProblem(row, common) : null;
  const tags = effectiveTags(common, row.tags);
  const missingName = row.bad && !row.name.trim();
  const missingTags = row.bad && !tags.length;

  let state: { text: string; color: string } | null = null;
  if (row.state === 'done') state = { text: 'Subida', color: colors.ashDark };
  else if (row.state === 'up') state = { text: 'Subiendo', color: colors.ashDark };
  else if (row.state === 'err' && row.error) state = { text: row.error, color: colors.bordeaux };
  else if (problem) state = { text: problem, color: colors.bordeaux };
  else if (tags.length) state = { text: `Etiquetas: ${tags.join(', ')}`, color: colors.ash };

  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', gap: 12, alignItems: 'start',
        borderTop: `1px solid ${colors.warmDark}`, paddingTop: 12,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.preview} alt="" style={{ width: 72, height: 54, objectFit: 'cover', display: 'block', background: colors.grey }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <div style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, overflowWrap: 'anywhere' }}>
            {row.file.name} · {formatBytes(row.file.size)}
          </div>
          <button
            type="button"
            className="hover-wipe-underline"
            style={{ ...linkBtn, fontSize: 11, ...(locked ? disabledLink : null) }}
            onClick={onRemove}
            disabled={locked}
          >
            Quitar
          </button>
        </div>
        <label htmlFor={nameId} style={srOnly}>
          Nombre de {row.file.name}
        </label>
        <input
          id={nameId}
          style={{ ...input, border: `1px solid ${missingName ? colors.bordeaux : colors.warmDark}` }}
          value={row.name}
          placeholder="Nombre: qué se ve en la imagen"
          onChange={(e) => onName(e.target.value)}
          disabled={locked}
          aria-invalid={missingName || undefined}
        />
        <div style={{ marginTop: 8 }}>
          <TagInput
            tags={row.tags}
            onChange={onTags}
            suggestions={allTags}
            listId={`imgr-etiquetas-${row.key}`}
            label={`Etiquetas de ${row.file.name}`}
            hideLabel
            placeholder={TAGS_HINT}
            normalize={normalizeTag}
            invalid={missingTags}
            disabled={locked}
          />
        </div>
        {state && <div style={{ font: `500 11px/1.4 ${MONO}`, marginTop: 6, color: state.color }}>{state.text}</div>}
      </div>
    </div>
  );
}

const dropText: CSSProperties = { margin: 0, font: `400 12px/1.5 ${MONO}`, color: colors.ash };
const hint: CSSProperties = { font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginTop: 6 };
const disabledBtn: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
const disabledLink: CSSProperties = { opacity: 0.3, cursor: 'not-allowed' };
