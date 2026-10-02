'use client';
import { useState, type CSSProperties } from 'react';
import { CardActions, type CardAction } from '@/components/studio/CardActions';
import { colors } from '@/components/deck/studio/ui';
import { publicImageUrl } from '@/lib/decks/api';
import type { ImageListItem } from '@/lib/decks/types';
import { isLegacy, thumbSrc } from '@/lib/images/view';
import './images.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const urlFor = (path: string) => publicImageUrl(path) ?? '';

/* La tarjeta de una imagen del banco. Una sola pieza para IMG_r y el popup de DeckMak_r y FormMak_r.

   - `bank`, la de IMG_r (detalles 8 a 11): miniatura 4:3, insignias «En uso · N» y «Solo versión
     ligera», nombre (en ceniza si es antigua) y etiquetas.
   - `pick`, la del popup (detalle 38): miniatura y nombre, seleccionable con borde de tinta, y las
     acciones al pasar el ratón (la papelera, con el borrado bloqueado si está en uso).

   Las antiguas no tienen miniatura: se pinta la ligera, que pesa más, con carga diferida. */
export function ImageCard({
  item,
  variant,
  selected = false,
  onOpen,
  actions,
}: {
  item: ImageListItem;
  variant: 'bank' | 'pick';
  selected?: boolean;
  onOpen: (item: ImageListItem) => void;
  actions?: CardAction[];
}) {
  const [hover, setHover] = useState(false);
  const legacy = isLegacy(item);

  const img = (
    // <img> y no next/image, como BrandMark: la URL pública de Storage ya es el fichero que se quiere.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbSrc(item, urlFor)}
      alt=""
      loading="lazy"
      decoding="async"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );

  if (variant === 'pick') {
    return (
      <div
        style={{ position: 'relative', minWidth: 0 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          type="button"
          onClick={() => onOpen(item)}
          aria-pressed={selected}
          aria-label={item.name}
          title={item.name}
          style={{
            appearance: 'none', display: 'block', width: '100%', padding: 0, textAlign: 'left', cursor: 'pointer',
            background: 'transparent', border: `2px solid ${selected ? colors.dark : 'transparent'}`,
          }}
        >
          <div style={{ aspectRatio: '4 / 3', background: colors.grey, overflow: 'hidden' }}>{img}</div>
          <div style={{ ...nameStyle(legacy), font: `500 11px/1.35 ${MONO}`, padding: '6px 4px' }}>{item.name}</div>
        </button>
        {actions && actions.length > 0 && <CardActions visible={hover} actions={actions} />}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="ixi-zoom"
      onClick={() => onOpen(item)}
      aria-label={`Abrir ${item.name}`}
      style={{
        appearance: 'none', display: 'block', width: '100%', minWidth: 0, padding: 0, border: 'none',
        background: 'transparent', textAlign: 'left', cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden',
          background: colors.grey, border: `1px solid ${colors.warmDark}`,
        }}
      >
        {img}
        {(item.use_count > 0 || legacy) && (
          <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {item.use_count > 0 && <span style={{ ...badge, background: colors.dark, color: colors.warmLight }}>En uso · {item.use_count}</span>}
            {legacy && <span style={badge}>Solo versión ligera</span>}
          </div>
        )}
      </div>
      <div style={{ paddingTop: 10, display: 'grid', gap: 6 }}>
        <div style={{ ...nameStyle(legacy), font: `500 12px/1.35 ${MONO}` }}>{item.name}</div>
        <TagChips tags={item.tags} />
      </div>
    </button>
  );
}

/* Las etiquetas de una imagen: blancas con borde cálido; «Sin etiquetas» discontinua y transparente
   (detalle 8). Las usan la tarjeta y el detalle. */
export function TagChips({ tags }: { tags: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {tags.length ? (
        tags.map((t) => (
          <span key={t} style={tag}>
            {t}
          </span>
        ))
      ) : (
        <span style={{ ...tag, borderStyle: 'dashed', background: 'transparent', color: colors.ash }}>Sin etiquetas</span>
      )}
    </div>
  );
}

const nameStyle = (legacy: boolean): CSSProperties => ({ color: legacy ? colors.ash : colors.dark, overflowWrap: 'anywhere' });

const badge: CSSProperties = {
  font: `500 10px/1 ${MONO}`, letterSpacing: '.04em', padding: '5px 6px', background: colors.warmLight, color: colors.dark,
};

const tag: CSSProperties = {
  font: `400 10px/1 ${MONO}`, color: colors.ashDark, background: colors.white,
  border: `1px solid ${colors.warmDark}`, borderStyle: 'solid', padding: '4px 5px',
};
