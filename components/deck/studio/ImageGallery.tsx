'use client';
import { useEffect, useRef, useState } from 'react';
import { ImageCard } from '@/components/images/ImageCard';
import { ImageDeleteModal } from '@/components/images/ImageDeleteModal';
import { ImageFilters } from '@/components/images/ImageFilters';
import { ImageUploadModal } from '@/components/images/ImageUploadModal';
import { useImageList } from '@/components/images/useImageList';
import { SearchField } from '@/components/studio/GalleryFilters';
import { ToastProvider } from '@/components/ui/Toast';
import { narrows } from '@/lib/images/filter';
import type { ImageListItem } from '@/lib/decks/types';
import { Modal } from './Modal';
import { btn, btnGhost, colors, linkBtn } from './ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* El popup de imágenes de DeckMak_r y FormMak_r: elegir una imagen del banco para un documento, o subir
   una nueva (detalle 38 de IMG_r). `onSelect` devuelve la URL pública de la versión LIGERA, que es la
   que va en el markdown.

   Es el mismo banco que gestiona IMG_r (/workspace/img_r) y monta sus mismas piezas
   (components/images): la misma subida, que pide nombre y etiquetas; la misma tarjeta; los mismos
   filtros, completos; y el mismo borrado, bloqueado si la imagen se usa en algún documento. */
export function ImageGallery({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  return (
    <ToastProvider>
      <Gallery onSelect={onSelect} onClose={onClose} />
    </ToastProvider>
  );
}

function Gallery({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const list = useImageList();
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<ImageListItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // La página siguiente se pide al acercarse al final de la rejilla, que tiene su propio scroll.
  const { hasMore, loadMore } = list;
  useEffect(() => {
    const end = endRef.current;
    if (!end || !hasMore) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void loadMore(), {
      root: scrollRef.current,
      rootMargin: '300px',
    });
    io.observe(end);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  const items = list.items;

  return (
    <Modal title="Galería de imágenes" onClose={onClose} width={960}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <SearchField
            value={list.filter.q}
            onChange={(q) => list.setFilter({ ...list.filter, q })}
            label="Buscar imágenes por nombre o etiqueta"
            width={960}
          />
        </div>
        <button type="button" className="hover-wipe-underline" style={linkBtn} onClick={() => setUploading(true)}>
          Subir imágenes
        </button>
      </div>

      <ImageFilters filter={list.filter} facets={list.facets} onChange={list.setFilter} marginBottom={14} />

      {list.error && (
        <div role="alert" style={{ font: `400 12px/1.5 ${MONO}`, color: colors.bordeaux, marginBottom: 12 }}>
          No se ha podido cargar el banco de imágenes. Recarga la página; si sigue fallando, avisa en el canal de herramientas.
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          minHeight: 200, maxHeight: '52vh', overflowY: 'auto', border: `1px solid ${colors.warmDark}`, padding: 14,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, alignContent: 'start',
        }}
      >
        {items === null && <div style={empty}>Cargando</div>}
        {items?.length === 0 && !list.error && (
          <div style={empty}>
            {narrows(list.filter)
              ? 'Ninguna imagen coincide.'
              : 'Aún no hay imágenes en el banco. Sube la primera con el botón de arriba: te pediremos un nombre y al menos una etiqueta para poder encontrarla después.'}
          </div>
        )}
        {items?.map((item) => (
          <ImageCard
            key={item.id}
            item={item}
            variant="pick"
            selected={selected === item.url}
            onOpen={() => setSelected(item.url)}
            actions={[{ icon: 'trash', label: `Eliminar «${item.name}»`, onClick: () => setToDelete(item) }]}
          />
        ))}
        <div ref={endRef} style={{ gridColumn: '1 / -1', height: 1 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" style={btnGhost} onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          style={{ ...btn, ...(selected ? null : { opacity: 0.45, cursor: 'not-allowed' }) }}
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
        >
          Aceptar
        </button>
      </div>

      {uploading && (
        <ImageUploadModal
          allTags={list.facets.tags.map((t) => t.tag)}
          onClose={() => setUploading(false)}
          onUploaded={(records) => {
            list.prepend(records);
            list.refreshFacets();
            // Tras subir queda seleccionada la primera nueva.
            if (records[0]) setSelected(records[0].url);
          }}
        />
      )}

      {toDelete && (
        <ImageDeleteModal
          image={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={(id) => {
            list.remove(id);
            list.refreshFacets();
            if (selected === toDelete.url) setSelected(null);
            setToDelete(null);
          }}
        />
      )}
    </Modal>
  );
}

const empty = { gridColumn: '1 / -1', font: `400 12px/1.5 ${MONO}`, color: colors.ash, padding: '24px 4px', textAlign: 'center' as const };
