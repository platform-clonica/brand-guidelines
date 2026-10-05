'use client';
import { useId, useState, type CSSProperties } from 'react';
import { CardActions, type CardAction } from '@/components/studio/CardActions';
import { colors } from '@/components/deck/studio/ui';
import { publicImageUrl } from '@/lib/decks/api';
import type { ImageListItem } from '@/lib/decks/types';
import { isLegacy, thumbSrc, usesLabel } from '@/lib/images/view';
import './images.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const urlFor = (path: string) => publicImageUrl(path) ?? '';

/* La tarjeta de una imagen del banco. Una sola pieza para IMG_r y el popup de DeckMak_r y FormMak_r.

   - `bank`, la de IMG_r (entrega 3, G1 a G8): solo la miniatura 4:3, con la primera etiqueta dentro, abajo a
     la izquierda. Arriba a la derecha, el número de usos y, si no encaja con el estilo, la cruz en Burdeos,
     cada uno con su aviso. Arriba a la izquierda, el selector redondo. Abrir y seleccionar son dos botones
     hermanos, no uno dentro de otro (G8). El nombre está en el `aria-label` y en la búsqueda (G1).
   - `pick`, la del popup (detalle 38): miniatura y nombre, seleccionable con borde de tinta, y las
     acciones al pasar el ratón (la papelera, con el borrado bloqueado si está en uso). La cruz de «no
     encaja» lleva el aspecto de G4, pero abajo a la derecha, porque arriba está la papelera (decisión 1 del
     plan de la entrega 3).

   Los avisos de las marcas son también la descripción accesible del botón de abrir. Con el ratón sale el de
   cada marca; con el foco del teclado, los dos juntos y apilados.

   Las antiguas no tienen miniatura: se pinta la ligera, que pesa más, con carga diferida. */
export function ImageCard({
  item,
  variant,
  selected = false,
  onOpen,
  onToggle,
  actions,
}: {
  item: ImageListItem;
  variant: 'bank' | 'pick';
  selected?: boolean;
  onOpen: (item: ImageListItem) => void;
  /** Solo `bank`: marca o desmarca la imagen en la selección de la galería (G6). */
  onToggle?: (item: ImageListItem) => void;
  actions?: CardAction[];
}) {
  const [hover, setHover] = useState(false);
  const legacy = isLegacy(item);
  const id = useId();
  const noFit = item.style_verdict === 'no';

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
    const markId = `${id}-nofit`;
    return (
      <div
        style={{ position: 'relative', minWidth: 0 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="ixi-card"
          aria-pressed={selected}
          aria-label={item.name}
          aria-describedby={noFit ? markId : undefined}
          title={item.name}
          style={{
            appearance: 'none', display: 'block', width: '100%', padding: 0, textAlign: 'left', cursor: 'pointer',
            background: 'transparent', border: `2px solid ${selected ? colors.dark : 'transparent'}`,
          }}
        >
          <div style={{ position: 'relative', aspectRatio: '4 / 3', background: colors.grey, overflow: 'hidden' }}>
            {img}
            {noFit && (
              <span className="ixi-mark">
                <CrossIcon />
                <span id={markId} className="ixi-tip">
                  {NO_FIT}
                </span>
              </span>
            )}
          </div>
          <div style={{ ...nameStyle(legacy), font: `500 11px/1.35 ${MONO}`, padding: '6px 4px' }}>{item.name}</div>
        </button>
        {actions && actions.length > 0 && <CardActions visible={hover} actions={actions} />}
      </div>
    );
  }

  const uses = item.use_count > 0 ? usesLabel(item.use_count) : null;
  const usesId = `${id}-uses`;
  const markId = `${id}-nofit`;
  const describedBy = [uses && usesId, noFit && markId].filter(Boolean).join(' ') || undefined;
  const first = item.tags[0];

  return (
    <div className={selected ? 'ixi-cell ixi-selected' : 'ixi-cell'}>
      <button type="button" className="ixi-open" onClick={() => onOpen(item)} aria-label={`Abrir ${item.name}`} aria-describedby={describedBy}>
        <span className="ixi-thumb">
          {img}
          {first ? <span className="ixi-ontop">{first}</span> : <span className="ixi-ontop ixi-none">Sin etiquetas</span>}
        </span>
      </button>
      {onToggle && (
        <button
          type="button"
          className="ixi-sel"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Seleccionar ${item.name}`}
          onClick={() => onToggle(item)}
        >
          <span className="ixi-dot" aria-hidden="true" />
        </button>
      )}
      {(uses || noFit) && (
        <div className="ixi-marks">
          {uses && (
            <span className="ixi-count">
              {item.use_count}
              <span id={usesId} className="ixi-tip" aria-hidden="true">
                {uses}
              </span>
            </span>
          )}
          {noFit && (
            <span className="ixi-nofit">
              <CrossIcon />
              <span id={markId} className="ixi-tip" aria-hidden="true">
                {NO_FIT}
              </span>
            </span>
          )}
          {/* Con el foco del teclado salen los dos avisos juntos, apilados, en vez de uno encima de otro. */}
          <span className="ixi-tips" aria-hidden="true">
            {uses && <span>{uses}</span>}
            {noFit && <span>{NO_FIT}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

const NO_FIT = 'Esta imagen no encaja en nuestras guidelines';

function CrossIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
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

const tag: CSSProperties = {
  font: `400 10px/1 ${MONO}`, color: colors.ashDark, background: colors.white,
  border: `1px solid ${colors.warmDark}`, borderStyle: 'solid', padding: '4px 5px',
};
