/* DSMak_r — rampas de color 50→900.

   Portado de Pa, ec, fa, Tf, C2 y Ef del prototipo. Los coeficientes de L_CURVE y C_CURVE no tienen
   origen declarado en el prototipo: se conservan tal cual porque son los que producen las rampas
   que Alberto validó, no porque haya una fórmula detrás. No hay criterio escrito para cambiarlos. */

import { clamp, hexToOklch, oklchToHex, parseHex, toHex } from './color.ts';

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type Step = `${(typeof STEPS)[number]}`;
export type Ramp = Record<Step, string>;

/* Luminosidad OKLCH de cada escalón y reparto de croma (1 = el croma del color de entrada). */
const L_CURVE = [0.972, 0.938, 0.884, 0.812, 0.724, 0.632, 0.545, 0.455, 0.362, 0.264];
const C_CURVE = [0.2, 0.34, 0.56, 0.78, 0.94, 1, 0.98, 0.9, 0.78, 0.62];

export type RampOptions = {
  /** Multiplicador de croma. Lo usa "Variar rampa" (overrides.rampTweaks). */
  chromaBoost?: number;
  /** Giro de tono en grados. Idem. */
  hueShift?: number;
  /** Separa claros y oscuros para ganar contraste. No garantiza AAA: empuja en esa dirección. */
  highContrast?: boolean;
  /** Desplaza la curva de luminosidad; lo usan los semánticos (el warning va más claro). */
  lShift?: number;
};

export function buildRamp(hex: string, opts: RampOptions = {}): Ramp {
  const { chromaBoost = 1, hueShift = 0, highContrast = false, lShift = 0 } = opts;
  const base = hexToOklch(hex);
  const chroma = Math.max(base.C, 0.012) * chromaBoost;
  const ramp = {} as Ramp;

  STEPS.forEach((step, i) => {
    let L = L_CURVE[i];
    if (lShift) L = clamp(L + lShift * 4 * L * (1 - L), 0.04, 0.99);
    if (highContrast) L = clamp(L + (i < 5 ? 0.018 : -0.022), 0.04, 0.99);
    ramp[`${step}`] = oklchToHex(L, chroma * C_CURVE[i], base.h + hueShift);
  });

  /* El color del cliente se incrusta EXACTO en el escalón de luminosidad más cercana: su hex tiene
     que estar en su propia rampa, aunque la curva lo habría dejado unas décimas desplazado. Como es
     el más cercano, la rampa sigue ordenada. */
  const nearest = L_CURVE.reduce((best, L, i) => (Math.abs(L - base.L) < Math.abs(L_CURVE[best] - base.L) ? i : best), 0);
  ramp[`${STEPS[nearest]}`] = toHex(parseHex(hex) ?? { r: 0, g: 0, b: 0 });
  return ramp;
}

export const NEUTRAL_PRESETS = {
  pure: { hue: null, chroma: 0 },
  warm: { hue: 70, chroma: 0.012 },
  cool: { hue: 250, chroma: 0.014 },
  'primary-tint': { hue: 'primary', chroma: 0.018 },
} as const;

export type NeutralPreset = keyof typeof NEUTRAL_PRESETS;

export function neutralRamp(preset: NeutralPreset, primary: string, highContrast: boolean): Ramp {
  const p = NEUTRAL_PRESETS[preset] ?? NEUTRAL_PRESETS.pure;
  const hue = p.hue === 'primary' ? hexToOklch(primary).h : (p.hue ?? 0);
  const ramp = {} as Ramp;
  STEPS.forEach((step, i) => {
    let L = L_CURVE[i];
    if (highContrast) L = clamp(L + (i < 5 ? 0.02 : -0.03), 0.03, 0.995);
    ramp[`${step}`] = oklchToHex(L, p.chroma * C_CURVE[i], hue);
  });
  return ramp;
}
