/* Generate the three canonical service shapes as faithful vector SVGs.
   Replicates the math from ~/interactius-git/components/capacity/CapacityVortex.tsx
   for the "pure state" (no animation, no morph) of each shape.

   Each shape = 22 rings × 96 samples, drawn as a dotted polyline stroked with
   a diagonal linear gradient from the accent colour to FADE_COLOR (warm-light).
   Outputs to public/sistema-grafico/. Run with: node scripts/generate-shapes.mjs */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'sistema-grafico');

const VIEWBOX = 600;
const CENTER = VIEWBOX / 2;
const MAX_R = VIEWBOX * 0.5 * 0.95;
const RINGS = 22;
const SAMPLE_N = 96;
const SPACING = 0.72;
const DOT_SIZE = 4;
const FADE_COLOR = '#F5F2ED';

function regularPolygon(sides, radius, rotOffset, cx, cy) {
  return Array.from({ length: sides }, (_, i) => {
    const a = (2 * Math.PI * i) / sides + rotOffset;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  });
}

function wavePoints(R, waveCount, amp, tilt, cx, cy, n) {
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const phaseAnchor = (3 * Math.PI) / 2;
  return Array.from({ length: n }, (_, i) => {
    const theta = phaseAnchor + (i * 2 * Math.PI) / n;
    const r = R * (1 + amp * Math.sin(waveCount * (theta - phaseAnchor)));
    const ux = r * Math.cos(theta);
    const uy = r * Math.sin(theta);
    const x = ux * cosT - uy * sinT;
    const y = ux * sinT + uy * cosT;
    return [cx + x, cy + y];
  });
}

function ellipsePoints(a, b, tilt, cx, cy, n, waveN = 0, waveAmp = 0) {
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const phaseAnchor = (3 * Math.PI) / 2;
  return Array.from({ length: n }, (_, i) => {
    const t = phaseAnchor + (i * 2 * Math.PI) / n;
    const mod = waveAmp > 0 ? 1 + waveAmp * Math.sin(waveN * (t - phaseAnchor)) : 1;
    const ux = a * Math.cos(t) * mod;
    const uy = b * Math.sin(t) * mod;
    const x = ux * cosT - uy * sinT;
    const y = ux * sinT + uy * cosT;
    return [cx + x, cy + y];
  });
}

function samplePoly(pts, n) {
  const sides = pts.length;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * sides;
    const seg = Math.floor(t);
    const f = t - seg;
    const p0 = pts[seg % sides];
    const p1 = pts[(seg + 1) % sides];
    return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
  });
}

/* Polygon — canonical: triangle, 22 rings, slight per-ring rotation.
   Matches POLY_SIDE_COUNTS[0]=3, POLY_BASE_ROTS[0]=-π/2, POLY_ROT_PER_RING[0]=0.05. */
function buildPolygonShape(maxR, cx, cy) {
  const sides = 3;
  const baseRot = -Math.PI / 2;
  const rotPerRing = 0.05;
  const scale = 1.0;
  return Array.from({ length: RINGS }, (_, r) => {
    const frac = ((RINGS - r) / RINGS) * SPACING + (1 - SPACING);
    const pts = regularPolygon(sides, maxR * scale * frac, baseRot + rotPerRing * r, cx, cy);
    return samplePoly(pts, SAMPLE_N);
  });
}

/* Ellipse — canonical: shape #0 (eccentric outer → circular inner, π/4 tilt).
   Matches ELL_A[0]=0.6, ELL_B[0]=1.0, ELL_INNER_CIRC[0]=1.0, ELL_BASE_ROTS[0]=π/4,
   ELL_ROT_PER_RING[0]=0.10, ELL_ROT_POWER[0]=0.85, ELL_SHAPE_SCALE[0]=0.78. */
function buildEllipseShape(maxR, cx, cy) {
  const baseA = 0.6;
  const baseB = 1.0;
  const innerCirc = 1.0;
  const baseRot = Math.PI / 4;
  const rotPerRing = 0.10;
  const rotPower = 0.85;
  const shapeScale = 0.78;
  const totalTilt = rotPerRing * (RINGS - 1);
  return Array.from({ length: RINGS }, (_, r) => {
    const frac = ((RINGS - r) / RINGS) * SPACING + (1 - SPACING);
    const ringR = maxR * shapeScale * frac;
    const tEcc = (RINGS - 1 - r) / (RINGS - 1);
    const aR = baseA + (1 - baseA) * innerCirc * (1 - tEcc);
    const bR = baseB + (1 - baseB) * innerCirc * (1 - tEcc);
    const u = r / (RINGS - 1);
    const tiltOffset = totalTilt * Math.pow(u, rotPower);
    return ellipsePoints(ringR * aR, ringR * bR, baseRot + tiltOffset, cx, cy, SAMPLE_N);
  });
}

/* Wave — canonical: shape #0 (4-lobe wave, amp 0.13).
   Matches WAVE_N[0]=4, WAVE_AMP[0]=0.13, WAVE_ROT_PER_RING[0]=0.1, WAVE_SHAPE_SCALE[0]=0.78. */
function buildWaveShape(maxR, cx, cy) {
  const waveN = 4;
  const amp = 0.13;
  const baseRot = 0;
  const rotPerRing = 0.1;
  const shapeScale = 0.78;
  return Array.from({ length: RINGS }, (_, r) => {
    const frac = ((RINGS - r) / RINGS) * SPACING + (1 - SPACING);
    const ringR = maxR * shapeScale * frac;
    return wavePoints(ringR, waveN, amp, baseRot + rotPerRing * r, cx, cy, SAMPLE_N);
  });
}

function ringsToSvg(rings) {
  return rings
    .map((ring) => {
      const points = ring.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      return `  <polyline points="${points}"/>`;
    })
    .join('\n');
}

function buildSvg(rings, accentColor, label, id) {
  const polylines = ringsToSvg(rings);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${VIEWBOX}" height="${VIEWBOX}" role="img" aria-label="${label}">
  <title>${label}</title>
  <defs>
    <linearGradient id="grad-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${VIEWBOX}" y2="${VIEWBOX}">
      <stop offset="0" stop-color="${accentColor}"/>
      <stop offset="1" stop-color="${FADE_COLOR}"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#grad-${id})" stroke-width="${DOT_SIZE}" stroke-linecap="round" stroke-dasharray="0 ${DOT_SIZE * 2}">
${polylines}
  </g>
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });

const cx = CENTER;
const cy = CENTER;
const maxR = MAX_R;

const variants = [
  {
    file: 'shape-polygon.svg',
    rings: buildPolygonShape(maxR, cx, cy),
    color: '#B0B5B0',
    label: 'Interactius shape · polygon (Strategic thinking)',
    id: 'polygon',
  },
  {
    file: 'shape-ellipse.svg',
    rings: buildEllipseShape(maxR, cx, cy),
    color: '#99335F',
    label: 'Interactius shape · ellipse (Experience design)',
    id: 'ellipse',
  },
  {
    file: 'shape-wave.svg',
    rings: buildWaveShape(maxR, cx, cy),
    color: '#5999A6',
    label: 'Interactius shape · wave (Cultural transformation)',
    id: 'wave',
  },
];

for (const v of variants) {
  const path = resolve(OUT_DIR, v.file);
  writeFileSync(path, buildSvg(v.rings, v.color, v.label, v.id));
  console.log(`Wrote ${path}`);
}
