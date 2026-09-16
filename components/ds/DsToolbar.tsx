'use client';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { colors, toolbarBtn } from '@/components/deck/studio/ui';
import type { SaveState } from '@/lib/hooks/useAutosave';
import { DS_STEPS, type DsStep } from '@/lib/ds/steps';
import type { DsStatus } from '@/lib/ds/types';
import { ALERT, MONO } from './controls';

/* Los cuatro pasos están disponibles desde 5d. */
const AVAILABLE: readonly DsStep[] = [1, 2, 3, 4];

/* Barra del editor: imagotipo (vuelve a la galería), nombre del sistema, pasos, estado de guardado y
   sello borrador/publicado. El nombre no es un botón: se edita en el paso 1, que es donde vive
   `brand.name`.

   Sin el wordmark de la herramienta, a diferencia de FormToolbar y DeckToolbar: decisión de Carlos
   del 2026-09-16. Dentro del editor ya se sabe dónde se está, y el sitio es para el nombre del
   sistema. La galería sí lo lleva, que es donde se entra. */
export function DsToolbar({
  name,
  step,
  onStep,
  status,
  onToggleStatus,
  saveState,
  dirty,
  paused,
  readOnly,
  onHome,
  onRetry,
  onConflict,
}: {
  name: string;
  step: DsStep;
  onStep: (step: DsStep) => void;
  status: DsStatus;
  onToggleStatus: () => void;
  saveState: SaveState;
  dirty: boolean;
  paused: boolean;
  readOnly: boolean;
  onHome: () => void;
  onRetry: () => void;
  onConflict: () => void;
}) {
  const published = status === 'published';

  /* Los pasos van centrados y NO se mueven cuando cambia lo que hay a los lados: el indicador de
     guardado aparece y desaparece, y el nombre gana un • al haber cambios sin guardar. Con
     `margin: 0 auto` el hueco sobrante se repartía según el ancho de cada lado, así que el menú
     bailaba en cuanto salía "Guardando". Los dos lados son ahora `flex: 1 1 0`: reparten el sobrante
     a partes iguales, el centro cae siempre en el mismo sitio y lo que crece lo hace hacia fuera. */
  const side = { flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 } as const;

  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', flexShrink: 0,
        borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight,
      }}
    >
      <div style={side}>
        <button
          onClick={onHome}
          title="Volver a la galería"
          aria-label="Volver a la galería"
          style={{ appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'inline-flex', flexShrink: 0 }}
        >
          <BrandMark height={20} />
        </button>
        <MarkDivider />

        <span
          title={name}
          style={{
            minWidth: 0, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            font: `500 13px/1 ${MONO}`, letterSpacing: '.02em', textTransform: 'uppercase', color: colors.dark,
          }}
        >
          {name}
          {dirty && !readOnly ? ' •' : ''}
        </span>
      </div>

      <nav aria-label="Pasos" style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {DS_STEPS.map((s) => {
          const available = AVAILABLE.includes(s.n);
          const on = s.n === step;
          return (
            <button
              key={s.n}
              type="button"
              onClick={() => onStep(s.n)}
              disabled={!available}
              aria-current={on ? 'step' : undefined}
              title={available ? undefined : 'Todavía no disponible'}
              style={{
                ...toolbarBtn,
                display: 'inline-flex', gap: 8, alignItems: 'center',
                border: `1px solid ${on ? colors.dark : colors.warmDark}`,
                background: on ? colors.dark : colors.white,
                color: on ? colors.warmLight : available ? colors.dark : colors.ash,
                cursor: available ? 'pointer' : 'not-allowed',
                opacity: available ? 1 : 0.55,
              }}
            >
              <span aria-hidden>{s.n}</span>
              {s.label}
            </button>
          );
        })}
      </nav>

      <div style={{ ...side, justifyContent: 'flex-end' }}>
        <SaveIndicator state={saveState} dirty={dirty} paused={paused} readOnly={readOnly} onRetry={onRetry} onConflict={onConflict} />

        <button
          type="button"
          onClick={onToggleStatus}
          disabled={readOnly}
          title={published ? 'Pasar a borrador' : 'Marcar como publicado'}
          style={{
            appearance: 'none', flexShrink: 0, padding: '5px 8px', cursor: readOnly ? 'default' : 'pointer',
            font: `500 9px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase',
            background: published ? colors.dark : 'transparent',
            color: published ? colors.warmLight : colors.ash,
            border: `1px solid ${published ? colors.dark : colors.ash}`,
          }}
        >
          {published ? 'Publicado' : 'Borrador'}
        </button>
      </div>
    </header>
  );
}

/* Sin puntos suspensivos (punctuationRules.noEllipsis): "Guardando", no "Guardando…". */
function SaveIndicator({
  state,
  dirty,
  paused,
  readOnly,
  onRetry,
  onConflict,
}: {
  state: SaveState;
  dirty: boolean;
  paused: boolean;
  readOnly: boolean;
  onRetry: () => void;
  onConflict: () => void;
}) {
  const base = { font: `400 10px/1 ${MONO}`, letterSpacing: '.04em', flexShrink: 0, whiteSpace: 'nowrap' } as const;
  const linkish = { appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 } as const;

  if (readOnly) return <span style={{ ...base, color: colors.ash }}>Solo lectura</span>;
  if (state === 'conflict') {
    return (
      <button type="button" onClick={onConflict} style={{ ...base, ...linkish, color: ALERT }}>
        Otra pestaña guardó · resolver
      </button>
    );
  }
  if (state === 'error') {
    return (
      <button type="button" onClick={onRetry} style={{ ...base, ...linkish, color: ALERT }}>
        Error · reintentar
      </button>
    );
  }
  if (state === 'saving') return <span style={{ ...base, color: colors.ash }}>Guardando</span>;
  if (state === 'saved') return <span style={{ ...base, color: colors.ash }}>Guardado ✓</span>;
  if (dirty && paused) return <span style={{ ...base, color: ALERT }}>Sin guardar · corrige los errores</span>;
  if (dirty) return <span style={{ ...base, color: colors.ash }}>Sin guardar</span>;
  return null;
}
