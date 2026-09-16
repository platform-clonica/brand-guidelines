'use client';
import { useState } from 'react';
import { CardActions } from '@/components/studio/CardActions';
import { colors } from '@/components/deck/studio/ui';
import type { DesignSystemListItem } from '@/lib/ds/types';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const fmt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

/* Una tarjeta de design system.

   La miniatura es la tira de color que calcula el servidor (primario 600, secundario 600, neutro 400;
   lib/ds/mirror.ts): son colores del cliente, no de Interactius, y es lo que identifica a un sistema
   de un vistazo. El nombre va debajo y no encima, porque sobre un color arbitrario no se garantiza
   que se lea.

   Sin tira, los tokens guardados están dañados: se dice en Burdeos, como "No compila" en FormMak_r.

   Las acciones son las de DeckMak_r y FormMak_r (`CardActions`), más renombrar y exportar. */
export function DsCard({
  item,
  onOpen,
  onRename,
  onExport,
  onDuplicate,
  onDelete,
}: {
  item: DesignSystemListItem;
  onOpen: (id: string) => void;
  onRename: (item: DesignSystemListItem) => void;
  onExport: (item: DesignSystemListItem) => void;
  onDuplicate: (item: DesignSystemListItem) => void;
  onDelete: (item: DesignSystemListItem) => void;
}) {
  const [hover, setHover] = useState(false);
  const published = item.status === 'published';

  return (
    /* El hover vive en el envoltorio, no en el botón: pasar el puntero a los iconos no lo apaga. */
    <div
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={() => onOpen(item.id)}
        title="Abrir design system"
        style={{
          appearance: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, border: 'none',
          background: 'transparent', display: 'block', width: '100%',
        }}
      >
        <div
          style={{
            position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', display: 'flex',
            border: `1px solid ${hover ? colors.dark : colors.warmDark}`, background: colors.warmDark,
            boxShadow: hover ? '0 6px 18px rgba(28,26,23,.16)' : 'none',
            transform: hover ? 'translateY(-2px)' : 'none',
            transition: 'transform .15s, box-shadow .15s, border-color .15s',
          }}
        >
          {item.palette.map((hex, i) => (
            <span key={i} aria-hidden style={{ flex: 1, background: hex }} />
          ))}

          <span
            style={{
              position: 'absolute', top: 10, left: 10, padding: '4px 8px',
              font: `500 9px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase',
              background: published ? colors.dark : colors.warmLight,
              color: published ? colors.warmLight : colors.ash,
              border: `1px solid ${published ? colors.dark : colors.ash}`,
            }}
          >
            {published ? 'Publicado' : 'Borrador'}
          </span>
        </div>
      </button>

      <CardActions
        visible={hover}
        actions={[
          { icon: 'edit', label: `Renombrar «${item.name}»`, onClick: () => onRename(item) },
          { icon: 'download', label: `Exportar «${item.name}»`, onClick: () => onExport(item) },
          { icon: 'copy', label: `Duplicar «${item.name}»`, onClick: () => onDuplicate(item) },
          { icon: 'trash', label: `Eliminar «${item.name}»`, onClick: () => onDelete(item) },
        ]}
      />

      <div style={{ paddingLeft: 2 }}>
        <div style={{ font: `500 11px/1.4 ${MONO}`, color: colors.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        {item.client && <div style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, marginTop: 2 }}>{item.client}</div>}
        <div style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash, marginTop: 2 }}>
          {item.palette.length === 0 ? <span style={{ color: '#99335F' }}>Tokens dañados · </span> : null}
          Editado el {fmt(item.updated_at)}
        </div>
      </div>
    </div>
  );
}
