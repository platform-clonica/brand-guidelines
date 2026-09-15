/* DSMak_r — styleguide HTML autocontenido (x3 y L6 del prototipo). Lo abre un cliente: va en
   castellano, con los nombres técnicos de token en inglés.

   El HTML de cada componente NO se genera aquí: entra ya pintado por la función `render` (plan, R3).
   Así este módulo no depende de React y se testea en node; el paso 4 le pasa los renders reales.

   Diferencias con el prototipo:
   - Todo el texto libre pasa por ../escape.ts, también la familia tipográfica dentro de `<style>`.
   - Una hoja de fuentes por familia (plan, H10).
   - Los titulares usan los pesos del sistema (`--ds-font-weight-*`), no un 600 fijo: con la
     plantilla Interactius ese 600 ponía IBM Plex Serif fuera de la norma.
   - Avisos de contraste (plan, H5), marcados con el color de error DEL PROPIO SISTEMA: el documento
     es del cliente y no lleva colores de Interactius.
   - Ratios con coma decimal y niveles en castellano. */

import { COMPONENTS, componentAxes, componentSummary, configFor, type AxisKey } from '../components.ts';
import { rateContrast, type ContrastLevel } from '../engine/contrast.ts';
import { TYPE_ROLES } from '../engine/presets.ts';
import { radiusCss, shadowCss, type ResolvedTokens } from '../engine/resolve.ts';
import { surfaces } from '../engine/surfaces.ts';
import type { ContrastWarning } from '../engine/warnings.ts';
import { escapeHtml as esc } from '../escape.ts';
import { fontStylesheets } from '../fonts.ts';
import type { ComponentConfig, Configs, Tokens } from '../schema.ts';
import { exportCss } from './css.ts';

export type StyleguideVariant = { key: string; html: string; selected: boolean };

export type StyleguideComponent = {
  key: string;
  name: string;
  summary: string;
  axes: { key: AxisKey; label: string; values: string[]; selected: string }[];
  variants: StyleguideVariant[];
  anatomy: { label: string; value: string }[];
  note: string;
  truncated: boolean;
};

export type RenderComponent = (key: string, config: ComponentConfig, resolved: ResolvedTokens) => string;

const MAX_VARIANTS = 120;
const RENDER_FAILED = '<em>—</em>';

const LEVEL_LABEL: Record<ContrastLevel, string> = { AAA: 'AAA', AA: 'AA', 'AA-large': 'AA grande', fail: 'Insuficiente' };
const MODE_LABEL = { light: 'claro', dark: 'oscuro', both: 'claro y oscuro' } as const;
const decimal = (n: number) => String(n).replace('.', ',');

export function buildStyleguideComponents(opts: {
  configs: Configs;
  resolved: ResolvedTokens;
  render: RenderComponent;
}): StyleguideComponent[] {
  // Los 17: un componente sin tocar entra con su configuración por defecto (ver configFor).
  return COMPONENTS.map((spec) => {
    const config = configFor(opts.configs, spec);
    const axes = componentAxes(spec);

    let combos: Partial<Record<AxisKey, string>>[] = [{}];
    for (const axis of axes) combos = combos.flatMap((c) => axis.values.map((v) => ({ ...c, [axis.key]: v })));
    const truncated = combos.length > MAX_VARIANTS;
    if (truncated) combos = combos.slice(0, MAX_VARIANTS);

    const keyOf = (c: Partial<Record<AxisKey, string | null>>) => axes.map((a) => c[a.key] ?? '').join('||');
    const selectedKey = keyOf(config);

    const variants = combos.map((combo) => {
      let html: string;
      try {
        html = opts.render(spec.key, { ...config, ...combo }, opts.resolved);
      } catch {
        html = RENDER_FAILED;
      }
      return { key: keyOf(combo), html, selected: keyOf(combo) === selectedKey };
    });
    // Una configuración con un valor que ya no existe en el eje no deja la tarjeta en blanco.
    if (variants.length && !variants.some((v) => v.selected)) variants[0].selected = true;

    return {
      key: spec.key,
      name: spec.name,
      summary: componentSummary(spec),
      axes: axes.map((a) => ({ ...a, selected: String(config[a.key] ?? a.values[0]) })),
      variants,
      anatomy: Object.entries(spec.anatomy).map(([k, a]) => ({
        label: a.label,
        value: a.type === 'bool' ? (config.anatomy[k] ? 'sí' : 'no') : String(config.anatomy[k] ?? a.def),
      })),
      note: config.note,
      truncated,
    };
  });
}

export function exportStyleguide(opts: {
  name: string;
  generatedAt: string;
  tokens: Tokens;
  mode: 'light' | 'dark';
  warnings: ContrastWarning[];
  components: StyleguideComponent[];
}): string {
  const { tokens, mode } = opts;
  const s = surfaces(tokens, mode);
  const name = opts.name.trim() || 'Design system';
  const alert = tokens.semantic.error[mode === 'dark' ? '400' : '600'];
  const date = new Date(opts.generatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const swatch = (step: string, hex: string) => {
    const r = rateContrast(hex);
    return `<div class="sw"><i style="background:${esc(hex)}"></i><b>${esc(step)}</b><span>${esc(hex)}</span><span>${decimal(r.ratio)}:1 ${LEVEL_LABEL[r.level]}</span></div>`;
  };
  const rampRow = (title: string, ramp: Record<string, string>, cls = '') =>
    `<div class="ramp-row"><h4>${esc(title)}</h4><div class="ramp${cls}">${Object.entries(ramp).map(([step, hex]) => swatch(step, hex)).join('')}</div></div>`;

  const warningText = (w: ContrastWarning) =>
    w.kind === 'color-on-canvas'
      ? `El primario ${esc(w.color)} sobre el fondo ${w.mode === 'dark' ? 'oscuro' : 'claro'} (${esc(w.against)}) da ${decimal(w.ratio)}:1 y no llega a AA, que pide 4,5:1.`
      : `El mejor texto posible sobre ${esc(w.path.replace('palette.', ''))} (${esc(w.color)}) da ${decimal(w.ratio)}:1 y no llega a AA, que pide 4,5:1.`;

  const preview = (key: string) => TYPE_ROLES.find((r) => r.key === key)?.preview ?? key;

  const componentSection = (c: StyleguideComponent) => {
    const controls = c.axes
      .map(
        (a) => `<div class="sg-axis" data-axis="${esc(a.key)}" data-value="${esc(a.selected)}"><span class="sg-axis-lbl">${esc(a.label)}</span>${a.values
          .map((v) => `<button type="button" data-v="${esc(v)}"${v === a.selected ? ' class="on"' : ''}>${esc(v)}</button>`)
          .join('')}</div>`,
      )
      .join('');
    return `<section class="sg-comp" data-comp="${esc(c.key)}" data-name="${esc(c.name.toLowerCase())}">
<div class="sg-comp-head"><h3>${esc(c.name)}</h3><span class="sg-meta">${esc(c.summary)}</span></div>
${controls ? `<div class="sg-controls">${controls}</div>` : ''}
<div class="sg-stage">${c.variants.map((v) => `<div class="sg-var" data-k="${esc(v.key)}"${v.selected ? '' : ' hidden'}>${v.html}</div>`).join('')}</div>
${c.anatomy.length ? `<div class="sg-anatomy">${c.anatomy.map((a) => `<span class="sg-pill">${esc(a.label)}: <b>${esc(a.value)}</b></span>`).join('')}</div>` : ''}
${c.note ? `<p class="sg-note"><b>Comportamiento específico:</b> ${esc(c.note)}</p>` : ''}
${c.truncated ? `<p class="sg-note">Se muestran las primeras ${MAX_VARIANTS} combinaciones.</p>` : ''}
</section>`;
  };

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} · Styleguide</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontStylesheets(tokens).map((f) => `<link rel="stylesheet" href="${esc(f.url)}">`).join('\n')}
<style>
${exportCss(tokens).replace(/@import url\([^)]*\);\n?/g, '')}
*{box-sizing:border-box}
body{margin:0;background:${s.canvas};color:${s.text};font-family:var(--ds-font-body);font-size:15px;line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:56px 32px 96px}
h1,h2,h3{font-family:var(--ds-font-heading);margin:0}
h1{font-size:var(--ds-font-size-display-l);font-weight:var(--ds-font-weight-display-l);line-height:1.1;letter-spacing:-.02em}
h2{font-size:var(--ds-font-size-h2);font-weight:var(--ds-font-weight-h2);margin:56px 0 18px;padding-bottom:10px;border-bottom:1px solid ${s.border}}
h4{font-size:13px;font-weight:var(--ds-font-weight-body-s);text-transform:uppercase;letter-spacing:.09em;color:${s.textMuted};margin:22px 0 8px;font-family:var(--ds-font-body)}
.sub{color:${s.textMuted};margin:10px 0 0}
.ramp{display:grid;grid-template-columns:repeat(10,1fr);gap:6px}
.ramp-3{grid-template-columns:repeat(3,minmax(0,1fr));max-width:420px}
.sw i{display:block;height:52px;border-radius:var(--ds-radius-sm);border:1px solid rgba(0,0,0,.08)}
.sw b{display:block;font-size:11px;margin-top:6px}
.sw span{display:block;font-size:10px;color:${s.textMuted}}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${s.textMuted};font-weight:400;padding:0 10px 8px 0}
td{padding:10px 10px 10px 0;border-top:1px solid ${s.border};vertical-align:middle}
.chips{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
.chip{text-align:center;font-size:11px;color:${s.textMuted}}
.chip i{display:block;background:${s.surfaceAlt};border:1px solid ${s.border};margin-bottom:6px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.card{background:${s.surface};border:1px solid ${s.border};border-radius:var(--ds-radius-lg);padding:22px 16px;text-align:center;font-size:12px}
code{font-size:12px;background:${s.surfaceAlt};padding:2px 5px;border-radius:3px}
.alerts{list-style:none;padding:0;margin:0}
.alerts li{border-left:3px solid ${alert};padding:8px 14px;margin:0 0 8px;background:${s.surface}}
.sg-search{width:100%;max-width:340px;padding:9px 12px;margin:0 0 22px;font:inherit;font-size:13px;color:${s.text};background:${s.surface};border:1px solid ${s.border};border-radius:var(--ds-radius-md)}
.sg-comp{border:1px solid ${s.border};border-radius:var(--ds-radius-lg);background:${s.surface};margin-bottom:18px;overflow:hidden}
.sg-comp-head{display:flex;align-items:baseline;gap:12px;padding:14px 20px}
.sg-comp-head h3{font-size:var(--ds-font-size-h4);font-weight:var(--ds-font-weight-h4)}
.sg-meta{font-size:11px;color:${s.textMuted}}
.sg-controls{display:flex;flex-wrap:wrap;gap:18px;padding:12px 20px;background:${s.surfaceAlt};border-top:1px solid ${s.border};border-bottom:1px solid ${s.border}}
.sg-axis{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sg-axis-lbl{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:${s.textMuted};margin-right:2px}
.sg-axis button{font:inherit;font-size:11.5px;line-height:1;padding:5px 9px;cursor:pointer;color:${s.text};background:${s.surface};border:1px solid ${s.border};border-radius:999px}
.sg-axis button:hover{border-color:${s.textMuted}}
.sg-axis button.on{background:${s.text};color:${s.surface};border-color:${s.text}}
.sg-stage{padding:32px 20px;display:flex;align-items:center;min-height:110px;background:${s.canvas}}
.sg-var[hidden]{display:none}
.sg-anatomy{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-top:1px solid ${s.border}}
.sg-pill{font-size:11px;color:${s.textMuted};border:1px solid ${s.border};border-radius:999px;padding:2px 9px}
.sg-note{font-size:12px;color:${s.textMuted};margin:0;padding:10px 20px;border-top:1px solid ${s.border}}
</style></head><body><div class="wrap">
<h1>${esc(name)}</h1>
<p class="sub">Styleguide generado el ${esc(date)} · modo ${MODE_LABEL[tokens.modes]}${tokens.highContrast ? ' · alto contraste' : ''}</p>
${opts.warnings.length ? `<h2>Avisos de contraste</h2><ul class="alerts">${opts.warnings.map((w) => `<li>${warningText(w)}</li>`).join('')}</ul>` : ''}

<h2>Color</h2>
${Object.entries(tokens.palette).map(([family, ramp]) => rampRow(family, ramp)).join('')}
<h4>Semánticos</h4>
${Object.entries(tokens.semanticScale).map(([key, scale]) => rampRow(key, scale, ' ramp-3')).join('')}

<h2>Tipografía</h2>
<p class="sub">${esc(tokens.fonts.heading)} para titulares · ${esc(tokens.fonts.body)} para texto</p>
<table><thead><tr><th>Token</th><th>Muestra</th><th>Tamaño</th><th>Peso</th><th>Interlineado</th></tr></thead><tbody>
${tokens.typography
  .map(
    (t) => `<tr><td><code>${esc(t.key)}</code></td><td style="font-family:var(--ds-font-${t.family});font-size:${Math.min(t.size, 46)}px;font-weight:${t.weight};line-height:1.2">${esc(preview(t.key))}</td><td>${t.size}px</td><td>${t.weight}</td><td>${t.lineHeight}px</td></tr>`,
  )
  .join('')}
</tbody></table>

<h2>Espaciado</h2><div class="chips">
${tokens.spacing.map((sp) => `<div class="chip"><i style="width:${Math.min(sp.value, 72)}px;height:${Math.min(sp.value, 72)}px"></i>${esc(sp.name)} · ${sp.value}px</div>`).join('')}
</div>

<h2>Radios</h2><div class="chips">
${Object.entries(tokens.radius).map(([n, v]) => `<div class="chip"><i style="width:64px;height:44px;border-radius:${radiusCss(v)}"></i>${esc(n)} · ${v >= 999 ? 'completo' : `${v}px`}</div>`).join('')}
</div>

<h2>Sombras</h2><div class="cards">
${tokens.shadows.map((sh) => `<div class="card" style="box-shadow:${shadowCss(sh)}"><b>${esc(sh.name)}</b><br><span style="color:${s.textMuted}">${shadowCss(sh)}</span></div>`).join('')}
</div>

<h2>Breakpoints y retícula</h2>
<table><thead><tr><th>Nombre</th><th>Mínimo</th><th>Máximo</th><th>Columnas</th><th>Gutter</th><th>Margen</th></tr></thead><tbody>
${tokens.breakpoints
  .map((b) => {
    const g = tokens.grid.find((x) => x.name === b.name);
    return `<tr><td>${esc(b.name)}</td><td>${b.min}px</td><td>${b.max === null ? '∞' : `${b.max}px`}</td><td>${g ? g.columns : '—'}</td><td>${g ? `${g.gutter}px` : '—'}</td><td>${g ? `${g.margin}px` : '—'}</td></tr>`;
  })
  .join('')}
</tbody></table>

${opts.components.length ? `<h2>Componentes</h2>
<p class="sub" style="margin-bottom:20px">Cambia variante, tamaño y estado con los controles de cada tarjeta. Pintados en modo ${mode === 'dark' ? 'oscuro' : 'claro'}.</p>
<input class="sg-search" id="sg-q" type="search" placeholder="Buscar componente" autocomplete="off">
<div id="sg-list">${opts.components.map(componentSection).join('')}</div>` : ''}
</div>
<script>
(function () {
  document.querySelectorAll('.sg-comp').forEach(function (sec) {
    var axes = Array.prototype.slice.call(sec.querySelectorAll('.sg-axis'));
    function apply() {
      var k = axes.map(function (a) { return a.dataset.value; }).join('||');
      var found = false;
      sec.querySelectorAll('.sg-var').forEach(function (v) {
        var on = v.dataset.k === k;
        v.hidden = !on;
        if (on) found = true;
      });
      if (!found) { var f = sec.querySelector('.sg-var'); if (f) f.hidden = false; }
    }
    axes.forEach(function (axis) {
      axis.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          axis.dataset.value = b.dataset.v;
          axis.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
          apply();
        });
      });
    });
  });
  var q = document.getElementById('sg-q');
  if (q) q.addEventListener('input', function () {
    var t = q.value.trim().toLowerCase();
    document.querySelectorAll('.sg-comp').forEach(function (sec) {
      sec.style.display = sec.dataset.name.indexOf(t) === -1 ? 'none' : '';
    });
  });
})();
</script>
</body></html>`;
}
