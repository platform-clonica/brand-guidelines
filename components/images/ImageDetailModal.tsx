'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btnGhost, colors, label, linkBtn, linkDanger } from '@/components/deck/studio/ui';
import { useToast } from '@/components/ui/Toast';
import { analyzeBankImage, getImage, publicImageUrl } from '@/lib/decks/api';
import type { ImageDetail, ImageRecord, ImageUse } from '@/lib/decks/types';
import { LEGACY_NOTE, downloads, errorText, factLines, isLegacy, styleOf } from '@/lib/images/view';
import { isUuid } from '@/lib/uuid';
import { TagChips } from './ImageCard';
import { ImageDeleteModal, UsesList } from './ImageDeleteModal';
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
   estilo» lo pide y lo guarda en la fila; mientras tanto, «Analizando la imagen». */
export function ImageDetailModal({
  id,
  initial,
  allTags,
  onClose,
  onChanged,
  onDeleted,
  onGone,
}: {
  id: string;
  initial?: ImageRecord;
  allTags: string[];
  onClose: () => void;
  onChanged: (row: ImageRecord) => void;
  onDeleted: (id: string) => void;
  onGone: () => void;
}) {
  const toast = useToast();
  const [row, setRow] = useState<ImageRecord | null>(initial ?? null);
  const [extra, setExtra] = useState<{ uses: ImageUse[]; uploadedBy: string | null } | null>(null);
  const [natural, setNatural] = useState<Size | undefined>();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

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
        const { uses, uploaded_by, ...rest } = d;
        setRow(rest);
        setExtra({ uses, uploadedBy: uploaded_by });
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
        <div style={{ background: colors.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
          {/* <img> y no next/image: la URL pública de Storage ya es el fichero que se quiere. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.url}
            alt={row.name}
            onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
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
              <dt style={dt}>Original</dt>
              <dd style={dd}>{facts.original}</dd>
              <dt style={dt}>Ligera</dt>
              <dd style={dd}>{facts.light}</dd>
              <dt style={dt}>Subida</dt>
              <dd style={dd}>{facts.uploaded}</dd>
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
            <button type="button" className="hover-wipe-underline" style={linkDanger} onClick={() => setDeleting(true)}>
              Eliminar
            </button>
          </div>

          {legacy && <p style={note}>{LEGACY_NOTE}</p>}
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
const note: CSSProperties = {
  font: `400 11px/1.5 ${MONO}`, color: colors.ash, borderLeft: `2px solid ${colors.warmDark}`, paddingLeft: 10, margin: 0,
};
