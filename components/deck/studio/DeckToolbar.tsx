'use client';
import { useState } from 'react';
import type { SaveState } from '../DeckStudio';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { btn, colors, toolbarBtn } from './ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Top toolbar: ← Galería · <título editable> · Guardar · Revisar Tono · Descargar PDF · Compartir URL.
   (Crear/Abrir viven ahora en la galería; sus handlers siguen disponibles en DeckStudio.) */
export function DeckToolbar({
  title,
  dirty,
  saving,
  saveState,
  hasId,
  onHome,
  onEditTitle,
  onSave,
  onToggleTone,
  toneOn,
  onDownloadPdf,
  onCopyUrl,
  copied,
}: {
  title: string | null;
  dirty: boolean;
  saving: boolean;
  saveState: SaveState;
  hasId: boolean;
  onHome: () => void;
  onEditTitle: () => void;
  onSave: () => void;
  onToggleTone: () => void;
  toneOn: boolean;
  onDownloadPdf: () => void;
  onCopyUrl: () => void;
  copied: boolean;
}) {
  const [titleHover, setTitleHover] = useState(false);
  const showTip = titleHover && !!title;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight, flexShrink: 0,
      }}
    >
      {/* El imagotipo es la vuelta a la galería: hace lo mismo que hacía el botón "← Galería",
          y así todas las cabeceras abren igual. onHome respeta el aviso de cambios sin guardar,
          por eso es un botón y no un <a>. */}
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

      {/* Editable title (commercial_id). Hover shows a box + "Editar" tooltip; click edits metadata. */}
      <span
        style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}
        onMouseEnter={() => setTitleHover(true)}
        onMouseLeave={() => setTitleHover(false)}
      >
        <button
          onClick={onEditTitle}
          disabled={!title}
          aria-label={title ? 'Editar presentación' : undefined}
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
          {title ?? 'Sin guardar'}{dirty && title ? ' •' : ''}
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

      <SaveIndicator dirty={dirty} saving={saving} saveState={saveState} hasId={hasId} onSave={onSave} />

      <button style={{ ...toolbarBtn, ...(toneOn ? { background: colors.dark, color: colors.warmLight, borderColor: colors.dark } : {}) }} onClick={onToggleTone}>
        Revisar Tono
      </button>

      <button style={toolbarBtn} onClick={onDownloadPdf}>Descargar PDF</button>

      <button style={toolbarBtn} onClick={onCopyUrl}>{copied ? 'Copiado ✓' : 'Compartir URL'}</button>
    </div>
  );
}

/* The former "Guardar" button, now a save-state indicator. Autosave persists edits once the deck
   has an id, so the control mostly just reports status; clicking still forces an immediate save
   (or a retry). A brand-new deck has no id, so it keeps a solid "Guardar" CTA to open the save
   dialog and create the row. */
function SaveIndicator({
  dirty, saving, saveState, hasId, onSave,
}: {
  dirty: boolean;
  saving: boolean;
  saveState: SaveState;
  hasId: boolean;
  onSave: () => void;
}) {
  // New deck: the first save is manual — keep the solid call-to-action.
  if (!hasId) {
    return (
      <button style={btn} onClick={onSave} title="Guardar la presentación">Guardar</button>
    );
  }

  const label: { text: string; color: string; tip: string } = { text: 'Guardado ✓', color: colors.ash, tip: 'Guardado automático activo' };
  if (saving) { label.text = 'Guardando…'; }
  /* Burdeos, no un rojo inventado. `lib/tokens.ts:28` declara #99335F como "alerta y estados
     críticos en interfaz" — es el `uiRole` del acento, la regla que CLAUDE.md recoge. El repo lo
     respeta en 26 sitios (authUi.errorBox, FormStudio, TranslatingOverlay, Rewriter, btnDanger de
     este mismo ui.ts); este indicador era la única desviación, con un #B4402E que no sale de
     ninguna parte. Mismo rol, un solo valor. */
  else if (saveState === 'error') { label.text = 'Error · reintentar'; label.color = '#99335F'; label.tip = 'Reintentar guardado'; }
  else if (dirty) { label.text = 'Sin guardar'; label.tip = 'Guardar ahora'; }

  return (
    <button
      onClick={onSave}
      disabled={saving}
      title={label.tip}
      style={{
        appearance: 'none', border: '1px solid transparent', background: 'transparent',
        font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', whiteSpace: 'nowrap',
        color: label.color, padding: '10px 12px', flexShrink: 0,
        cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
      }}
    >
      {label.text}
    </button>
  );
}
