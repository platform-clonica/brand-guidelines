'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ConfirmModal } from '@/components/deck/studio/ConfirmModal';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors, label, linkBtn, linkDanger } from '@/components/deck/studio/ui';
import { useToast } from '@/components/ui/Toast';
import { analyzeBankImage, getImage, publicImageUrl, revertImage } from '@/lib/decks/api';
import type { ImageDetail, ImageRecord, ImageUse } from '@/lib/decks/types';
import { uploadEditVariants } from '@/lib/images/client';
import { LEGACY_NOTE, downloads, editFacts, editedNote, errorText, factLines, isLegacy, styleOf, usedByText } from '@/lib/images/view';
import { isUuid } from '@/lib/uuid';
import { TagChips } from './ImageCard';
import { ImageDeleteModal, UsesList } from './ImageDeleteModal';
import { AiEditModal } from './AiEditModal';
import { HoldToCompare } from './HoldToCompare';
import { ImageMetaModal } from './ImageMetaModal';
import { StyleVerdict } from './StyleVerdict';
import './images.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const SERIF = 'var(--font-ibm-plex-serif, serif)';

const urlFor = (path: string) => publicImageUrl(path) ?? '';

type Size = { width: number; height: number };

/* El detalle de una imagen (detalles 28 a 37): la ligera sobre tinta, el nombre, las etiquetas, los datos,
   dónde se usa, las descargas, editar y eliminar.

   Desde la rejilla llega `initial`, la fila de la tarjeta, y se pinta al momento; la petición completa
   lo que la tarjeta no trae (dónde se usa y quién la subió). Entrando por el enlace no hay `initial` y se
   espera a la petición. Si la imagen no existe, `onGone`.

   Las antiguas no guardaron medidas: se leen de la imagen ya cargada.

   Fase 2 (F27): debajo de «Se usa en», el estilo Interactius. Si la imagen no se ha analizado, «Analizar
   estilo» lo pide y lo guarda en la fila; mientras tanto, «Analizando la imagen».

   Fase 2 (F1, F18 a F20): «Editar con IA»; en una editada, «Editada», «Sale de», el prompt, el modelo, la
   indicación y la nota de tamaño; en una sobrescrita, el original previo, su descarga y «Volver al
   original», que se bloquea si la imagen está en uso (plan, § 6). Comparar con el original se precarga: el
   original previo puede pesar 25 MB y mantener pulsado no puede esperar a bajarlo. */
export function ImageDetailModal({
  id,
  initial,
  allTags,
  onClose,
  onChanged,
  onDeleted,
  onGone,
  onOpenImage,
  onCopied,
}: {
  id: string;
  initial?: ImageRecord;
  allTags: string[];
  onClose: () => void;
  onChanged: (row: ImageRecord) => void;
  onDeleted: (id: string) => void;
  onGone: () => void;
  /** «Sale de»: abre el detalle de la imagen de origen. */
  onOpenImage: (id: string) => void;
  /** Copia guardada (F14): se abre su detalle. */
  onCopied: (row: ImageRecord) => void;
}) {
  const toast = useToast();
  const [row, setRow] = useState<ImageRecord | null>(initial ?? null);
  const [extra, setExtra] = useState<{ uses: ImageUse[]; uploadedBy: string | null; parent: ImageDetail['parent'] } | null>(null);
  const [natural, setNatural] = useState<Size | undefined>();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [reverting, setReverting] = useState<'ask' | 'busy' | ImageUse[] | null>(null);
  const [holding, setHolding] = useState(false);
  const [compareReady, setCompareReady] = useState(false);

  // Las salidas y el aviso se leen de una ref: si fueran dependencias, cada render del padre (o cada aviso,
  // que vuelve a pintar el proveedor) volvería a pedir la imagen.
  const out = useRef({ onClose, onGone, toast });
  out.current = { onClose, onGone, toast };

  useEffect(() => {
    let live = true;
    if (!isUuid(id)) {
      out.current.onGone();
      return;
    }
    getImage(id)
      .then((d: ImageDetail | null) => {
        if (!live) return;
        if (!d) return out.current.onGone();
        const { uses, uploaded_by, parent, ...rest } = d;
        setRow(rest);
        setExtra({ uses, uploadedBy: uploaded_by, parent });
      })
      .catch((e) => {
        if (!live) return;
        out.current.toast.show(errorText(e, 'No se ha podido abrir la imagen. Revisa la conexión y vuelve a intentarlo.'));
        out.current.onClose();
      });
    return () => {
      live = false;
    };
  }, [id]);

  /* Con qué se compara: la imagen de origen (copia) o el original previo (sobrescrita). Se baja ya, al abrir. */
  const compareSrc = row?.prior_original_path ? urlFor(row.prior_original_path) : (extra?.parent?.url ?? null);
  useEffect(() => {
    setCompareReady(false);
    if (!compareSrc) return;
    const img = new Image();
    img.onload = () => setCompareReady(true);
    img.src = compareSrc;
  }, [compareSrc]);

  if (!row) {
    return (
      <Modal title="Imagen" titleHidden onClose={onClose} width={1000}>
        <div style={{ font: `400 12px/1.6 ${MONO}`, color: colors.ash }}>Cargando</div>
      </Modal>
    );
  }

  const legacy = isLegacy(row);
  const facts = factLines(row, extra?.uploadedBy ?? null, natural);
  const style = styleOf(row);
  const edit = editFacts(row);
  const note = legacy ? LEGACY_NOTE : editedNote(row);

  const revert = async () => {
    if (!row.prior_original_path) return;
    setReverting('busy');
    try {
      // Una antigua vuelve a su ligera de siempre; una nueva necesita la ligera y la miniatura de su original.
      const legacyPrior = !row.prior_original_path.startsWith(`images/${row.id}/`);
      let variants;
      if (!legacyPrior) {
        const tmpId = crypto.randomUUID();
        variants = { tmpId, ...(await uploadEditVariants(urlFor(row.prior_original_path), tmpId)) };
      }
      const res = await revertImage(row.id, variants);
      if (!res.ok) {
        setReverting(res.uses);
        return;
      }
      setRow(res.row);
      onChanged(res.row);
      setReverting(null);
      toast.show('Original recuperado');
    } catch {
      setReverting(null);
      toast.show('No se ha podido recuperar el original. Vuelve a intentarlo.');
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const next = await analyzeBankImage(row.id);
      setRow(next);
      onChanged(next);
    } catch {
      toast.show('No se ha podido analizar la imagen. Vuelve a intentarlo.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Modal title={row.name} titleHidden onClose={onClose} width={1000}>
      <div className="ixi-detail">
        <div style={{ position: 'relative', background: colors.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
          {compareSrc && (
            <HoldToCompare onHold={setHolding} disabled={!compareReady} style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 1 }} />
          )}
          {/* <img> y no next/image: la URL pública de Storage ya es el fichero que se quiere. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={holding && compareSrc ? compareSrc : row.url}
            alt={row.name}
            onLoad={(e) => !holding && setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            style={{ maxHeight: '62vh', width: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start', minWidth: 0 }}>
          <div>
            <h2 style={{ font: `400 24px/1.15 ${SERIF}`, margin: 0, color: colors.dark, overflowWrap: 'anywhere', textWrap: 'balance' }}>
              {row.name}
            </h2>
            <div style={{ margin: '10px 0 16px' }}>
              <TagChips tags={row.tags} />
            </div>
            <dl style={factsGrid}>
              <dt style={dt}>{facts.originalLabel}</dt>
              <dd style={dd}>{facts.original}</dd>
              <dt style={dt}>Ligera</dt>
              <dd style={dd}>{facts.light}</dd>
              <dt style={dt}>Subida</dt>
              <dd style={dd}>{facts.uploaded}</dd>
              {extra?.parent && (
                <>
                  <dt style={dt}>Sale de</dt>
                  <dd style={dd}>
                    <button type="button" className="hover-wipe-underline" style={{ ...linkBtn, textAlign: 'left' }} onClick={() => onOpenImage(extra.parent!.id)}>
                      {extra.parent.name}
                    </button>
                  </dd>
                </>
              )}
              {row.prior_original_path && (
                <>
                  <dt style={dt}>Original previo</dt>
                  <dd style={dd}>Guardado</dd>
                </>
              )}
              {edit?.prompt && (
                <>
                  <dt style={dt}>Prompt</dt>
                  <dd style={dd}>{edit.prompt}</dd>
                </>
              )}
              {edit?.model && (
                <>
                  <dt style={dt}>Modelo</dt>
                  <dd style={dd}>{edit.model}</dd>
                </>
              )}
              {edit?.instruction && (
                <>
                  <dt style={dt}>Indicación</dt>
                  <dd style={{ ...dd, overflowWrap: 'anywhere' }}>{edit.instruction}</dd>
                </>
              )}
            </dl>
            <div style={{ marginTop: 16 }}>
              <span style={label}>Se usa en</span>
              {!extra ? (
                <p style={muted}>Cargando</p>
              ) : extra.uses.length ? (
                <UsesList uses={extra.uses} />
              ) : (
                <p style={muted}>Ningún deck ni formulario la usa.</p>
              )}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${colors.warmDark}`, paddingTop: 14 }}>
            {style && !analyzing ? (
              <StyleVerdict style={style} />
            ) : (
              <>
                <span style={label}>Estilo Interactius</span>
                {analyzing ? (
                  <p role="status" className="ixi-pulse" style={{ ...muted, font: `500 11px/1.5 ${MONO}`, color: colors.dark }}>
                    Analizando la imagen
                  </p>
                ) : (
                  <>
                    <p style={{ ...muted, marginBottom: 8 }}>Esta imagen aún no se ha analizado.</p>
                    <button type="button" className="hover-wipe-underline" style={linkBtn} onClick={analyze}>
                      Analizar estilo
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 22px', paddingTop: 4 }}>
            {downloads(row, urlFor, natural).map((d) => (
              <a key={d.kind} href={d.href} className="hover-wipe-underline" style={linkBtn} onClick={() => toast.show(d.toast)}>
                {d.label}
              </a>
            ))}
            <button type="button" className="hover-wipe-underline" style={linkBtn} onClick={() => setEditing(true)}>
              Editar nombre y etiquetas
            </button>
            <button type="button" className="hover-wipe-underline" style={linkBtn} onClick={() => setAiOpen(true)}>
              Editar con IA
            </button>
            {row.prior_original_path && (
              <button
                type="button"
                className="hover-wipe-underline"
                style={linkBtn}
                onClick={() => setReverting(extra?.uses.length ? extra.uses : 'ask')}
              >
                Volver al original
              </button>
            )}
            <button type="button" className="hover-wipe-underline" style={linkDanger} onClick={() => setDeleting(true)}>
              Eliminar
            </button>
          </div>

          {note && <p style={noteStyle}>{note}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
        <button type="button" style={btnGhost} onClick={onClose}>
          Cerrar
        </button>
      </div>

      {editing && (
        <ImageMetaModal
          image={row}
          allTags={allTags}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setRow(next);
            setEditing(false);
            onChanged(next);
          }}
          onReloaded={(current) => {
            setRow(current);
            setEditing(false);
            onChanged(current);
          }}
          onGone={onGone}
        />
      )}

      {aiOpen && (
        <AiEditModal
          image={row}
          uses={extra?.uses}
          onClose={() => setAiOpen(false)}
          onSaved={(saved, mode) => {
            setAiOpen(false);
            if (mode === 'copy') onCopied(saved);
            else {
              setRow(saved);
              onChanged(saved);
            }
          }}
        />
      )}

      {(reverting === 'ask' || reverting === 'busy') && (
        <ConfirmModal
          title="Volver al original"
          message={`«${row.name}» recupera el original que tenía antes de sobrescribirla, y la versión editada se borra. Ningún deck ni formulario la usa.`}
          confirmLabel="Volver al original"
          busy={reverting === 'busy'}
          onConfirm={() => void revert()}
          onClose={() => reverting !== 'busy' && setReverting(null)}
        />
      )}

      {Array.isArray(reverting) && (
        <Modal title="Volver al original" onClose={() => setReverting(null)}>
          <p style={{ font: `400 13px/1.55 ${MONO}`, color: colors.dark, margin: '0 0 12px' }}>
            No se puede volver al original: {usedByText(reverting)}. Cambia la imagen en {reverting.length > 1 ? 'esos documentos' : 'ese documento'} y
            vuelve a intentarlo.
          </p>
          <UsesList uses={reverting} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" style={btn} onClick={() => setReverting(null)}>
              Entendido
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ImageDeleteModal image={row} uses={extra?.uses} onClose={() => setDeleting(false)} onDeleted={onDeleted} />
      )}
    </Modal>
  );
}

const factsGrid: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', margin: 0, font: `400 12px/1.4 ${MONO}`, color: colors.dark,
};
const dt: CSSProperties = { color: colors.ash, font: `500 10px/1.6 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase' };
const dd: CSSProperties = { margin: 0, fontVariantNumeric: 'tabular-nums' };
const muted: CSSProperties = { font: `400 12px/1.6 ${MONO}`, color: colors.ash, margin: 0 };
const noteStyle: CSSProperties = {
  font: `400 11px/1.5 ${MONO}`, color: colors.ash, borderLeft: `2px solid ${colors.warmDark}`, paddingLeft: 10, margin: 0,
};
