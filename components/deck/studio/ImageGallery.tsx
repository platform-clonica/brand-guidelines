'use client';
import { useEffect, useRef, useState } from 'react';
import type { ImageRecord } from '@/lib/decks/types';
import { listImages, registerImage, uploadImage } from '@/lib/decks/api';
import { optimizeImage } from '@/lib/deck/optimizeImage';
import { Modal } from './Modal';
import { btn, btnGhost, colors } from './ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

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
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelected(img.url)}
              title={img.alt ?? ''}
              style={{
                appearance: 'none',
                padding: 0,
                cursor: 'pointer',
                aspectRatio: '4 / 3',
                backgroundImage: `url('${img.url}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: isSel ? `2px solid ${colors.dark}` : `1px solid ${colors.warmDark}`,
                outline: isSel ? `2px solid ${colors.dark}` : 'none',
              }}
            />
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button style={btnGhost} onClick={onClose}>Cancelar</button>
        <button style={btn} onClick={() => selected && onSelect(selected)} disabled={!selected}>
          Aceptar
        </button>
      </div>
    </Modal>
  );
}
