'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { SearchField } from '@/components/studio/GalleryFilters';
import { LogoutButton } from '@/components/studio/LogoutButton';
import { ImgLogo } from '@/components/studio/Wordmark';
import { colors, srOnly } from '@/components/deck/studio/ui';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import type { ImageRecord } from '@/lib/decks/types';
import { narrows } from '@/lib/images/filter';
import { ImageCard } from './ImageCard';
import { ImageDetailModal } from './ImageDetailModal';
import { ImageFilters } from './ImageFilters';
import { ImageUploadModal, type UploadHandle } from './ImageUploadModal';
import { useImageList } from './useImageList';
import './images.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const BASE = '/workspace/img_r';
const LOAD_ERROR =
  'No se ha podido cargar el banco de imágenes. Recarga la página; si sigue fallando, avisa en el canal de herramientas.';

/* El id de la URL del detalle, o null en la galería. */
const idFromPath = (path: string) => {
  const m = /^\/workspace\/img_r\/([^/]+)\/?$/.exec(path);
  return m ? decodeURIComponent(m[1]) : null;
};

type Detail = { id: string; initial?: ImageRecord; pushed: boolean };

/* IMG_r: la galería del banco de imágenes (/workspace/img_r) y su detalle (/workspace/img_r/[id]).

   Las dos rutas montan esto; la segunda pasa el id y el detalle sale abierto. Abrir una imagen desde la
   rejilla hace `pushState` a su URL: Next sincroniza la ruta sin navegar, así que la galería no se
   vuelve a montar ni pierde el scroll ni los filtros. Cerrar vuelve atrás si el detalle lo abrió la
   rejilla, o reemplaza la URL si se entró por el enlace. Atrás y Adelante abren y cierran el detalle.

   Mismas piezas que el popup de los editores (components/images): lista, filtros, tarjeta, subida y
   borrado. Cabecera, contenedor y rejilla, los de las otras galerías del workspace (D3). */
export function ImageBank({ initialId }: { initialId?: string }) {
  return (
    <ToastProvider>
      <Bank initialId={initialId ?? null} />
    </ToastProvider>
  );
}

function Bank({ initialId }: { initialId: string | null }) {
  const toast = useToast();
  const list = useImageList();
  const [upload, setUpload] = useState<{ files: File[] } | null>(null);
  const uploadRef = useRef<UploadHandle>(null);
  const [detail, setDetail] = useState<Detail | null>(initialId ? { id: initialId, pushed: false } : null);
  const endRef = useRef<HTMLDivElement>(null);

  /* Atrás y Adelante del navegador abren y cierran el detalle. Al llegar a un detalle por el historial,
     debajo queda la galería: cerrarlo es volver atrás. */
  useEffect(() => {
    const onPop = () => {
      const id = idFromPath(window.location.pathname);
      setDetail(id ? { id, pushed: true } : null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openDetail = (item: ImageRecord) => {
    window.history.pushState({ imgr: item.id }, '', `${BASE}/${item.id}`);
    setDetail({ id: item.id, initial: item, pushed: true });
  };

  const closeDetail = () => {
    if (detail?.pushed) {
      window.history.back();
      return;
    }
    window.history.replaceState({ imgr: null }, '', BASE);
    setDetail(null);
  };

  /* Detalle 7: soltar ficheros en cualquier punto de la página abre la subida con ellos, o los añade a la
     abierta. Solo si lo arrastrado son ficheros; mientras sube, la subida los ignora (detalle 25). */
  const uploadOpen = useRef(false);
  uploadOpen.current = upload !== null;
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      if (uploadOpen.current) uploadRef.current?.addFiles(files);
      else setUpload({ files });
    };
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // La página siguiente se pide al acercarse al final de la rejilla.
  const { hasMore, loadMore } = list;
  useEffect(() => {
    const end = endRef.current;
    if (!end || !hasMore) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void loadMore(), {
      rootMargin: '600px',
    });
    io.observe(end);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  const items = list.items;
  const allTags = list.facets.tags.map((t) => t.tag);
  const errorLine = list.error && (
    <div role="alert" style={{ font: `400 12px/1.5 ${MONO}`, color: colors.bordeaux, marginBottom: 20 }}>
      {LOAD_ERROR}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.warmLight, color: colors.dark }}>
      <header
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight,
        }}
      >
        {/* Imagotipo → landing de apps; el wordmark de la herramienta es identidad, no enlace. */}
        <BrandMark height={20} href="/workspace" label="Ir a la landing de aplicaciones" />
        <MarkDivider />
        <ImgLogo height={22} />
        <span style={{ marginLeft: 'auto' }} />
        <LogoutButton />

        {/* Centrado respecto a la cabecera, no al hueco que queda. Igual que en las otras galerías. */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(380px, 42%)',
          }}
        >
          <SearchField
            value={list.filter.q}
            onChange={(q) => list.setFilter((f) => ({ ...f, q }))}
            label="Buscar imágenes por nombre o etiqueta"
            width={380}
          />
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 64px' }}>
        {/* Sin píldoras mientras carga la primera página o si falló, como en el prototipo: aún no hay rejilla que acotar. */}
        {items !== null && !(list.error && !items.length) && (
          <ImageFilters filter={list.filter} facets={list.facets} onChange={list.setFilter} />
        )}

        {/* Si falla la primera carga, arriba; si falla una página siguiente, al final, donde se está mirando. */}
        {!items?.length && errorLine}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 28, alignItems: 'start' }}>
          <button
            type="button"
            onClick={() => setUpload({ files: [] })}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.white)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            style={{
              appearance: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, padding: 0, background: 'transparent',
              border: `2px solid ${colors.dark}`, aspectRatio: '4 / 3', transition: 'background .15s',
            }}
          >
            {/* Mono a 400: IBM Plex Mono admite 400/500/600 (lib/tokens.ts). */}
            <span aria-hidden style={{ font: `400 40px/1 ${MONO}`, color: colors.dark }}>+</span>
            <span style={{ font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', color: colors.dark }}>Subir imágenes</span>
            <span style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, textAlign: 'center', padding: '0 16px' }}>
              JPEG, PNG o WebP · hasta 25 MB · también puedes arrastrarlas aquí
            </span>
          </button>

          {items === null && !list.error && (
            <>
              <span role="status" style={srOnly}>
                Cargando
              </span>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} aria-hidden style={{ minWidth: 0 }}>
                  <div className="ixi-pulse" style={{ aspectRatio: '4 / 3', background: colors.grey, border: `1px solid ${colors.warmDark}` }} />
                  <div style={{ paddingTop: 10, font: `500 12px/1.35 ${MONO}`, color: colors.ash }}>Cargando</div>
                </div>
              ))}
            </>
          )}

          {items?.map((item) => <ImageCard key={item.id} item={item} variant="bank" onOpen={openDetail} />)}
        </div>
        <div ref={endRef} style={{ height: 1 }} />

        {!!items?.length && errorLine}

        {items?.length === 0 && !list.error && (
          <p style={empty}>
            {narrows(list.filter)
              ? 'Ninguna imagen coincide con la búsqueda o con las etiquetas elegidas. Prueba con menos etiquetas o quita los filtros.'
              : 'Aún no hay imágenes en el banco. Sube la primera con el botón de arriba: te pediremos un nombre y al menos una etiqueta para poder encontrarla después.'}
          </p>
        )}
      </div>

      {upload && (
        <ImageUploadModal
          ref={uploadRef}
          initialFiles={upload.files}
          allTags={allTags}
          onClose={() => setUpload(null)}
          onUploaded={(records) => {
            list.prepend(records);
            list.refreshFacets();
          }}
        />
      )}

      {detail && (
        <ImageDetailModal
          key={detail.id}
          id={detail.id}
          initial={detail.initial}
          allTags={allTags}
          onClose={closeDetail}
          onChanged={(row) => {
            list.replace(row);
            list.refreshFacets();
          }}
          onDeleted={(id) => {
            list.remove(id);
            list.refreshFacets();
            closeDetail();
          }}
          onGone={() => {
            toast.show('Esa imagen ya no está en el banco.');
            list.remove(detail.id);
            closeDetail();
          }}
        />
      )}
    </div>
  );
}

const empty: CSSProperties = { font: `400 12px/1.6 ${MONO}`, color: colors.ash, marginTop: 24, maxWidth: '60ch' };
