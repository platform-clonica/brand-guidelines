'use client';
import { colors, toolbarBtn } from '@/components/deck/studio/ui';
import { FormLogo } from '@/components/studio/Wordmark';
import { FieldPalette } from './FieldPalette';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ALERT = '#99335F'; // Burdeos — rol de alerta declarado en lib/tokens.ts

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function FormToolbar({
  title,
  status,
  saveState,
  dirty,
  publicId,
  responses,
  canPublish,
  onBack,
  onAddField,
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
  onBack: () => void;
  onAddField: (snippet: string) => void;
  onTogglePublish: () => void;
  onCopyUrl: () => void;
  onSaveNow: () => void;
  copied: boolean;
}) {
  const published = status === 'published';

  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight, flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{ ...toolbarBtn, border: 'none', background: 'transparent', paddingLeft: 0 }}
        title="Volver a la galería"
      >
        ← Galería
      </button>

      <FormLogo height={22} />

      <span
        style={{
          font: `500 11px/1.4 ${MONO}`, color: colors.dark, marginLeft: 8,
          maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
        title={title}
      >
        {title || 'Sin título'}
      </span>

      <span
        style={{
          padding: '4px 8px', font: `500 9px/1 ${MONO}`, letterSpacing: '.08em',
          textTransform: 'uppercase',
          background: published ? colors.dark : 'transparent',
          color: published ? colors.warmLight : colors.ash,
          border: `1px solid ${published ? colors.dark : colors.ash}`,
        }}
      >
        {published ? 'Publicado' : 'Borrador'}
      </span>

      <SaveIndicator state={saveState} dirty={dirty} onSaveNow={onSaveNow} />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {responses > 0 && publicId && (
          <a
            href={`/forms/api/export?form_id=${encodeURIComponent(publicId)}`}
            style={{ ...toolbarBtn, textDecoration: 'none', display: 'inline-block' }}
            title="Descargar las respuestas en CSV"
          >
            CSV ({responses})
          </a>
        )}

        <FieldPalette onPick={onAddField} />

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
      </div>
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
  const base: React.CSSProperties = { font: `400 10px/1 ${MONO}`, letterSpacing: '.04em', marginLeft: 4 };

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
