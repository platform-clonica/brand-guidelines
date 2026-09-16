'use client';
import { colors } from '@/components/deck/studio/ui';
import { rateContrast, type ContrastLevel } from '@/lib/ds/engine/contrast';
import { ALERT, MONO } from './controls';

/* "AA grande", no "AA+": entre 3 y 4,5 solo vale para texto grande (plan, H5). */
const LEVEL_LABEL: Record<ContrastLevel, string> = { AAA: 'AAA', AA: 'AA', 'AA-large': 'AA grande', fail: 'No pasa' };

const ratioText = (ratio: number) => `${String(ratio).replace('.', ',')}:1`;

/* Ratio con su mejor texto (blanco o casi negro). Lo que no llega a AA va en Burdeos, el color de
   alerta del sistema. */
export function ContrastBadge({ hex }: { hex: string }) {
  const r = rateContrast(hex);
  const weak = r.level === 'AA-large' || r.level === 'fail';
  return (
    <span style={{ display: 'block', font: `500 9px/1.4 ${MONO}`, letterSpacing: '.02em', color: weak ? ALERT : colors.ash }}>
      {ratioText(r.ratio)} · {LEVEL_LABEL[r.level]}
    </span>
  );
}

/* Una muestra de rampa: el color con su escalón, el hex y el contraste.
   `overridden` marca un retoque a mano (●); `warn`, un aviso de contraste del sistema. */
export function Swatch({
  hex,
  step,
  overridden = false,
  warn = false,
  selected = false,
  onSelect,
  disabled = false,
  label,
}: {
  hex: string;
  step: string;
  overridden?: boolean;
  warn?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  /** Para lectores de pantalla: "Primario 500". */
  label: string;
}) {
  const on = rateContrast(hex).on;
  const interactive = !!onSelect && !disabled;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!interactive}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`${label}, ${hex}${overridden ? ', retocado a mano' : ''}`}
      style={{ appearance: 'none', padding: 0, border: 'none', background: 'transparent', textAlign: 'left', minWidth: 0, cursor: interactive ? 'pointer' : 'default' }}
    >
      <span
        style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 44, padding: '4px 6px',
          background: hex, color: on, font: `500 10px/1 ${MONO}`,
          outline: selected ? `2px solid ${colors.dark}` : warn ? `2px solid ${ALERT}` : 'none', outlineOffset: 2,
        }}
      >
        <span>{step}</span>
        {overridden && <span aria-hidden>●</span>}
      </span>
      <span style={{ display: 'block', marginTop: 4, font: `400 10px/1.3 ${MONO}`, color: colors.dark }}>{hex}</span>
      <ContrastBadge hex={hex} />
    </button>
  );
}
