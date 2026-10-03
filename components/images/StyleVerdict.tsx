'use client';
import { useId, useState, type CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';
import type { ImageStyle } from '@/lib/decks/types';
import { styleRows } from '@/lib/images/view';
import './images.css';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* El estilo Interactius de una imagen (fase 2, F23 a F26): la misma pieza en el detalle y, compacta, en la
   fila de subida.

   - Encaja: caja blanca con borde, check y «Encaja con nuestro estilo». No se despliega.
   - No encaja: banner blanco con borde, cruz en círculo en Burdeos (el color de alerta del sistema, su
     `uiRole`), el texto y una flecha. Al pulsarlo se despliegan el motivo y los seis criterios, y la flecha
     gira.
   - Encaja en parte: el mismo banner, con un guion en gris. No es un error, así que no lleva Burdeos.

   Es una orientación, no una medida: dos análisis de una foto dudosa pueden no coincidir. */
export function StyleVerdict({ style, compact = false }: { style: ImageStyle; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const text = `500 ${compact ? 11 : 12}px/1.3 ${MONO}`;
  const pad = compact ? '8px 10px' : '10px 12px';

  if (style.verdict === 'si') {
    return (
      <p style={{ ...frame, display: 'flex', alignItems: 'center', gap: 10, margin: 0, padding: pad, font: text, color: colors.dark }}>
        <Icon kind="ok" />
        <span>Encaja con nuestro estilo</span>
      </p>
    );
  }

  const no = style.verdict === 'no';
  return (
    <div style={frame}>
      <button
        type="button"
        className="ixi-vhead"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        style={{
          appearance: 'none', width: '100%', display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'none',
          padding: pad, textAlign: 'left', cursor: 'pointer', font: text, color: colors.dark,
        }}
      >
        <span style={{ display: 'inline-flex', color: no ? colors.bordeaux : colors.ashDark }}>
          <Icon kind={no ? 'no' : 'part'} />
        </span>
        <span style={{ flex: 1 }}>{no ? 'No encaja con nuestro estilo' : 'Encaja en parte con nuestro estilo'}</span>
        <svg className="ixi-chev" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={{ color: colors.ash }}>
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={bodyId} hidden={!open} style={{ padding: compact ? '0 10px 10px 34px' : '0 12px 12px 36px' }}>
        {style.reason && <p style={{ margin: '0 0 10px', font: `400 12px/1.6 ${MONO}`, color: colors.ashDark }}>{style.reason}</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4, font: `400 11px/1.4 ${MONO}`, color: colors.dark }}>
          {styleRows(style).map((r) => (
            <li key={r.label} style={{ display: 'flex', gap: 10 }}>
              <span style={{ minWidth: 64, fontWeight: 500, color: r.value === 'Sí' ? colors.dark : r.value === 'No' ? colors.ashDark : colors.ash }}>
                {r.value}
              </span>
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Icon({ kind }: { kind: 'ok' | 'no' | 'part' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={{ flex: 'none' }}>
      {kind === 'ok' ? (
        <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <circle cx="8" cy="8" r="6.6" />
          {kind === 'no' ? <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" strokeLinecap="round" /> : <path d="M5 8h6" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}

const frame: CSSProperties = { background: colors.white, border: `1px solid ${colors.warmDark}`, width: '100%', boxSizing: 'border-box' };
