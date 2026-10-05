'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { colors, linkBtn } from '@/components/deck/studio/ui';
import { selectVisibleLabel, selectedLabel } from '@/lib/images/bulk';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* La barra de la selección de IMG_r (entrega 3, G9): fija abajo y centrada, en Dark, en cuanto hay una
   imagen seleccionada.

   - «Eliminar» va en el color de la barra, no en el rosa del prototipo, que no está en la paleta. El aviso
     de peligro está en la confirmación.
   - 24 px por encima del borde (el prototipo dejaba sitio a su barra de simulación) y por debajo del velo de
     los modales (80 frente a 90): con un modal abierto, la barra queda velada y no se puede pulsar.
   - Mientras está, los avisos flotantes suben por encima de ella: su altura va en `--ixi-bulk-h` del body. */
export function BulkBar({
  count,
  visible,
  allVisible,
  downloading,
  onTags,
  onDownload,
  onDelete,
  onSelectVisible,
  onClear,
}: {
  count: number;
  /** Las imágenes cargadas en la rejilla con el filtro actual. */
  visible: number;
  allVisible: boolean;
  downloading: boolean;
  onTags: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onSelectVisible: () => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const body = document.body;
    const set = () => body.style.setProperty('--ixi-bulk-h', `${el.offsetHeight}px`);
    set();
    body.classList.add('ixi-bulk-open');
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      body.classList.remove('ixi-bulk-open');
      body.style.removeProperty('--ixi-bulk-h');
    };
  }, []);

  const label = selectedLabel(count);
  return (
    <div ref={ref} role="region" aria-label="Acciones sobre la selección" style={bar}>
      <span aria-live="polite">
        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        {label.slice(String(count).length)}
      </span>
      <span style={sep} aria-hidden="true" />
      <button type="button" className="hover-wipe-underline" style={link} onClick={onTags}>
        Añadir etiquetas
      </button>
      <button type="button" className="hover-wipe-underline" style={{ ...link, ...(downloading ? off : null) }} onClick={onDownload} disabled={downloading}>
        {downloading ? 'Descargando' : 'Descargar'}
      </button>
      <button type="button" className="hover-wipe-underline" style={link} onClick={onDelete}>
        Eliminar
      </button>
      <span style={sep} aria-hidden="true" />
      {!allVisible && visible > 0 && (
        <button type="button" className="hover-wipe-underline" style={link} onClick={onSelectVisible}>
          {selectVisibleLabel(visible)}
        </button>
      )}
      <button type="button" className="hover-wipe-underline" style={link} onClick={onClear}>
        Anular selección
      </button>
    </div>
  );
}

const bar: CSSProperties = {
  position: 'fixed', left: 16, right: 16, margin: '0 auto', width: 'fit-content', maxWidth: 'calc(100% - 32px)',
  bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', zIndex: 80,
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px', padding: '12px 16px',
  background: colors.dark, color: colors.warmLight, font: `500 12px/1 ${MONO}`,
};
/* Warm Light al 30 %: una transparencia del token, como en el prototipo. */
const sep: CSSProperties = { width: 1, height: 16, background: 'rgba(245, 242, 237, 0.3)' };
const link: CSSProperties = { ...linkBtn, font: `500 12px/1 ${MONO}`, color: colors.warmLight };
const off: CSSProperties = { cursor: 'not-allowed' };
