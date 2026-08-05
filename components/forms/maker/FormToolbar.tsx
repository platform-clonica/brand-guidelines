'use client';
import { useState } from 'react';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { colors, toolbarBtn } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERT = '#99335F'; // Burdeos — rol de alerta declarado en lib/tokens.ts

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/* Barra superior del editor de formularios. Misma anatomía que DeckToolbar:
   imagotipo (vuelve a la galería) · título editable · estado de guardado · acciones. */
export function FormToolbar({
  title,
  status,
  saveState,
  dirty,
  publicId,
  responses,
  canPublish,
  onHome,
  onEditTitle,
  onTogglePublish,
  onCopyUrl,
  onSaveNow,
  copied,
}: {
  title: string;
  status: 'draft' | 'published';
  saveState: SaveState;
  dirty: boolean;
  publicId: string | null;
  responses: number;
  /* false cuando el documento no compila: publicar algo roto no debe ser posible. */
  canPublish: boolean;
  onHome: () => void;
  onEditTitle: () => void;
  onTogglePublish: () => void;
  onCopyUrl: () => void;
  onSaveNow: () => void;
  copied: boolean;
}) {
  const [titleHover, setTitleHover] = useState(false);
  const published = status === 'published';
  const showTip = titleHover && !!title;

  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight, flexShrink: 0,
      }}
    >
      {/* El imagotipo es la vuelta a la galería. Es un botón, no un <a>, para que respete
          el aviso de cambios sin guardar. */}
      <button
        onClick={onHome}
        title="Volver a la galería"
        aria-label="Volver a la galería"
        style={{
          appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
          padding: 0, display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        }}
      >
        <BrandMark height={20} />
      </button>
      <MarkDivider />

      {/* Título editable — mismo tratamiento que el commercial_id del DeckMaker: al pasar por
          encima aparece la caja y el aviso "Editar"; al pulsar se abre el modal de metadatos. */}
      <span
        style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}
        onMouseEnter={() => setTitleHover(true)}
        onMouseLeave={() => setTitleHover(false)}
      >
        <button
          onClick={onEditTitle}
          disabled={!title}
          aria-label={title ? 'Editar formulario' : undefined}
          style={{
            maxWidth: '100%', textAlign: 'left', appearance: 'none',
            border: `1px solid ${showTip ? colors.warmDark : 'transparent'}`,
            background: showTip ? colors.white : 'transparent',
            cursor: title ? 'pointer' : 'default', padding: '7px 10px',
            font: `500 15px/1 ${MONO}`, letterSpacing: '.02em', color: title ? colors.dark : colors.ash,
            textTransform: 'uppercase',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'background .15s, border-color .15s',
          }}
        >
          {title || 'Sin título'}{dirty && title ? ' •' : ''}
        </button>
        {showTip && (
          <span
            role="tooltip"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: colors.dark, color: colors.warmLight,
              font: `500 10px/1 ${MONO}`, letterSpacing: '.04em', padding: '5px 7px',
              whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
            }}
          >
            Editar
          </span>
        )}
      </span>

      <span
        style={{
          padding: '4px 8px', font: `500 9px/1 ${MONO}`, letterSpacing: '.08em',
          textTransform: 'uppercase', flexShrink: 0,
          background: published ? colors.dark : 'transparent',
          color: published ? colors.warmLight : colors.ash,
          border: `1px solid ${published ? colors.dark : colors.ash}`,
        }}
      >
        {published ? 'Publicado' : 'Borrador'}
      </span>

      <SaveIndicator state={saveState} dirty={dirty} onSaveNow={onSaveNow} />

      {responses > 0 && publicId && (
        <a
          href={`/forms/api/export?form_id=${encodeURIComponent(publicId)}`}
          style={{ ...toolbarBtn, textDecoration: 'none', display: 'inline-block' }}
          title="Descargar las respuestas en CSV"
        >
          CSV ({responses})
        </a>
      )}

      {published && publicId && (
        <button type="button" style={toolbarBtn} onClick={onCopyUrl}>
          {copied ? 'Copiado ✓' : 'Compartir URL'}
        </button>
      )}

      <button
        type="button"
        style={{
          ...toolbarBtn,
          ...(published
            ? {}
            : { background: canPublish ? colors.dark : colors.warmDark, color: colors.warmLight, borderColor: canPublish ? colors.dark : colors.warmDark }),
          ...(canPublish ? {} : { cursor: 'not-allowed', opacity: 0.6 }),
        }}
        onClick={onTogglePublish}
        disabled={!canPublish}
        title={canPublish ? undefined : 'El formulario no compila: corrige los errores antes de publicar.'}
      >
        {published ? 'Despublicar' : 'Publicar'}
      </button>
    </header>
  );
}

/* Mismo lenguaje que el indicador del DeckStudio: "Guardando… / Guardado ✓ / Sin guardar / Error". */
function SaveIndicator({
  state,
  dirty,
  onSaveNow,
}: {
  state: SaveState;
  dirty: boolean;
  onSaveNow: () => void;
}) {
  const base: React.CSSProperties = {
    font: `400 10px/1 ${MONO}`, letterSpacing: '.04em', marginLeft: 4, flexShrink: 0,
  };

  if (state === 'error') {
    return (
      <button type="button" onClick={onSaveNow} style={{ ...base, ...linkish, color: ALERT }}>
        Error · reintentar
      </button>
    );
  }
  if (state === 'saving') return <span style={{ ...base, color: colors.ash }}>Guardando…</span>;
  if (state === 'saved') return <span style={{ ...base, color: colors.ash }}>Guardado ✓</span>;
  if (dirty) return <span style={{ ...base, color: colors.ash }}>Sin guardar</span>;
  return null;
}

const linkish: React.CSSProperties = {
  appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
};
