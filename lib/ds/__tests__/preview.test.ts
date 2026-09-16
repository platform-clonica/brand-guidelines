import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { surfaces } from '../engine/surfaces.ts';
import { exportCss } from '../export/css.ts';
import { previewVars } from '../preview.ts';

const tokens = () => composeTokens({ ...defaultBrand(), colors: { primary: '#0E9F8C', secondary: '#E5117F', 'marca-2': '#3355FF' } }, {}).tokens;

test('previsualización: usa las MISMAS variables que el tokens.css que se entrega', () => {
  const vars = previewVars(tokens(), 'light');
  const delivered = [...exportCss(tokens()).matchAll(/(--ds-[a-z0-9-]+):\s*([^;]+);/g)];
  assert.ok(delivered.length > 50);
  for (const [, name, value] of delivered) assert.equal(vars[name], value.trim(), name);
});

test('previsualización: los escalones fuertes de los semánticos salen de la rampa, no de la escala suave', () => {
  const t = tokens();
  const vars = previewVars(t, 'light');
  assert.equal(vars['--ds-error-600'], t.semantic.error['600']);
  assert.equal(vars['--ds-error-50'], t.semanticScale.error['50']);
});

test('previsualización: superficies del modo pedido', () => {
  const t = tokens();
  assert.equal(previewVars(t, 'light')['--ds-canvas'], surfaces(t, 'light').canvas);
  assert.equal(previewVars(t, 'dark')['--ds-canvas'], surfaces(t, 'dark').canvas);
  assert.equal(previewVars(t, 'dark')['--ds-text'], surfaces(t, 'dark').text);
});
