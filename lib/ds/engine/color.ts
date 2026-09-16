/* DSMak_r — conversión de color. sRGB ↔ OKLab ↔ OKLCH.

   Portado de prototipos/ds-maker/prototipo.app.js (tn, Cf, zC, Pu, B0, MC, wC, Ml, S2, sa), con
   los mismos coeficientes: son los de la definición de OKLab de Björn Ottosson. Sin dependencias,
   seguro en navegador y en node. */

export type Rgb = { r: number; g: number; b: number };
export type Oklch = { L: number; C: number; h: number };

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export function parseHex(hex: string): Rgb | null {
  let s = String(hex ?? '').trim().replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return {
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255,
  };
}

export const isHex = (hex: string) => parseHex(hex) !== null;

export function toHex({ r, g, b }: Rgb): string {
  const ch = (v: number) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0');
  return ('#' + ch(r) + ch(g) + ch(b)).toUpperCase();
}

export const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

function rgbToOklab({ r, g, b }: Rgb) {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToRgb({ L, a, b }: { L: number; a: number; b: number }): Rgb {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return {
    r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

/* Un hex inválido se trata como negro, igual que en el prototipo: el motor no lanza. La validación
   de entrada es cosa del esquema (lib/ds/schema.ts). */
export function hexToOklch(hex: string): Oklch {
  const { L, a, b } = rgbToOklab(parseHex(hex) ?? { r: 0, g: 0, b: 0 });
  return { L, C: Math.sqrt(a * a + b * b), h: (Math.atan2(b, a) * 180) / Math.PI };
}

const inGamut = ({ r, g, b }: Rgb) =>
  r >= -5e-4 && r <= 1.0005 && g >= -5e-4 && g <= 1.0005 && b >= -5e-4 && b <= 1.0005;

/* Fuera de gama se recorta SOLO el croma, por bisección (24 pasos), conservando L y tono. Es lo que
   mantiene la rampa ordenada por luminosidad aunque el color pedido no exista en sRGB. */
export function oklchToHex(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const at = (c: number) => oklabToRgb({ L: clamp(L, 0, 1), a: Math.cos(rad) * c, b: Math.sin(rad) * c });
  let rgb = at(C);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid;
      else hi = mid;
    }
    rgb = at(lo);
  }
  return toHex(rgb);
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex) ?? { r: 0, g: 0, b: 0 };
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}
