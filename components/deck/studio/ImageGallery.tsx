'use client';
import { useEffect, useRef, useState } from 'react';
import type { ImageRecord } from '@/lib/decks/types';
import { deleteImage, imageUsage, listImages, registerImage, uploadImage } from '@/lib/decks/api';
import { optimizeImage } from '@/lib/deck/optimizeImage';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { btn, btnGhost, colors } from './ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Confirmation copy, warning when the image is still referenced by one or more decks. */
function deleteMessage(usage: { count: number; decks: string[] } | null): string {
  const permanent = 'Esta acción no se puede deshacer.';
  if (!usage) return `Comprobando si la imagen se usa en algún deck… ${permanent}`;
  if (usage.count === 0) {
    return `Esta imagen se eliminará de la galería de forma permanente. ${permanent}`;
  }
  const names = Array.from(new Set(usage.decks));
  const plural = usage.count === 1 ? 'un deck' : `${usage.count} decks`;
  const listed = names.length ? ` (${names.join(', ')})` : '';
  return `⚠ Esta imagen ya se usa en ${plural}${listed}. Si la eliminas, esas presentaciones mostrarán la imagen rota. ${permanent}`;
}

/* Reusable image gallery: pick an already-uploaded image or upload a new one.
   Uploads are optimised client-side, stored in Supabase Storage and indexed in `images`,
   so every image stays available across slides and decks. onSelect returns the public URL. */
export function ImageGallery({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ImageRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [usage, setUsage] = useState<{ count: number; decks: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listImages()
      .then(setImages)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudieron cargar las imágenes'))
      .finally(() => setLoading(false));
  }, []);

  const onFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await optimizeImage(file);
      const blob = await (await fetch(dataUrl)).blob();
      const base = file.name.replace(/\.[^.]+$/, '');
      const { path, url } = await uploadImage(blob, `${base}.jpg`);
      const rec = await registerImage({ storage_path: path, url, alt: base });
      setImages((prev) => [rec, ...prev]);
      setSelected(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!toDelete) {
      setUsage(null);
      return;
    }
    let live = true;
    const id = toDelete.id;
    imageUsage(id)
      .then((u) => live && setUsage(u))
      .catch(() => live && setUsage(null));
    return () => {
      live = false;
    };
  }, [toDelete]);

  const onDelete = async (img: ImageRecord) => {
    setDeleting(true);
    setError(null);
    try {
      await deleteImage(img.id);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      if (selected === img.url) setSelected(null);
      setToDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la imagen');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal title="Galería de Imágenes" onClose={onClose} width={960}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash }}>
          {loading ? 'Cargando…' : `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}
        </span>
        <button style={btn} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Subiendo…' : 'Subir'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div style={{ font: `400 11px/1.4 ${MONO}`, color: '#99335F', marginBottom: 12 }}>{error}</div>
      )}

      <div
        style={{
          minHeight: 200,
          maxHeight: '52vh',
          overflowY: 'auto',
          border: `1px solid ${colors.warmDark}`,
          padding: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
          alignContent: 'start',
        }}
      >
        {!loading && images.length === 0 && (
          <div style={{ gridColumn: '1 / -1', font: `400 12px/1.5 ${MONO}`, color: colors.ash, padding: '24px 4px', textAlign: 'center' }}>
            Aún no hay imágenes. Pulsa «Subir» para añadir la primera.
          </div>
        )}
        {images.map((img) => {
          const isSel = selected === img.url;
          const showBin = hovered === img.id;
          return (
            <div
              key={img.id}
              style={{ position: 'relative', aspectRatio: '4 / 3' }}
              onMouseEnter={() => setHovered(img.id)}
              onMouseLeave={() => setHovered((h) => (h === img.id ? null : h))}
            >
              <button
                type="button"
                onClick={() => setSelected(img.url)}
                title={img.alt ?? ''}
                style={{
                  appearance: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  backgroundImage: `url('${img.url}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: isSel ? `2px solid ${colors.dark}` : `1px solid ${colors.warmDark}`,
                  outline: isSel ? `2px solid ${colors.dark}` : 'none',
                }}
              />
              <button
                type="button"
                aria-label="Eliminar imagen"
                title="Eliminar imagen"
                onClick={(e) => {
                  e.stopPropagation();
                  setToDelete(img);
                }}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  display: 'grid',
                  placeItems: 'center',
                  width: 26,
                  height: 26,
                  padding: 0,
                  cursor: 'pointer',
                  color: '#fff',
                  background: 'rgba(28, 26, 23, 0.72)',
                  border: 'none',
                  borderRadius: 4,
                  opacity: showBin ? 1 : 0,
                  transform: showBin ? 'scale(1)' : 'scale(0.85)',
                  transition: 'opacity 120ms ease, transform 120ms ease',
                  pointerEvents: showBin ? 'auto' : 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={btn} onClick={() => selected && onSelect(selected)} disabled={!selected}>
          Aceptar
        </button>
      </div>

      {toDelete && (
        <ConfirmModal
          title="Eliminar imagen"
          message={deleteMessage(usage)}
          confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
          danger
          onConfirm={() => !deleting && onDelete(toDelete)}
          onClose={() => !deleting && setToDelete(null)}
        />
      )}
    </Modal>
  );
}
