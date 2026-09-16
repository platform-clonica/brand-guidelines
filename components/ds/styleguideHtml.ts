import { renderToStaticMarkup } from 'react-dom/server';
import { getComponent } from '@/lib/ds/components';
import { resolveTokens } from '@/lib/ds/engine/resolve';
import { contrastWarnings } from '@/lib/ds/engine/warnings';
import { buildStyleguideComponents, exportStyleguide } from '@/lib/ds/export/styleguide';
import type { Brand, Configs, Tokens } from '@/lib/ds/schema';
import { renderComponent } from './previews';

/* DSMak_r — el styleguide, con sus componentes pintados.

   `lib/ds/export/styleguide.ts` no sabe nada de React a propósito (plan, R3): recibe el HTML de cada
   componente ya hecho, y así se testea en node. Quien lo pinta es esto, que corre en el navegador con
   los mismos renders que se ven en el paso 3: el styleguide entregado y la pantalla no pueden
   divergir.

   Sin marca (una fila con la marca dañada que se exporta desde la galería) no hay avisos de
   contraste: se miden sobre el primario tal como lo dio el cliente, que vive en `brand`. */
export function buildStyleguideHtml(opts: {
  name: string;
  tokens: Tokens;
  configs: Configs;
  brand: Brand | null;
  mode: 'light' | 'dark';
  generatedAt: string;
}): string {
  const resolved = resolveTokens(opts.tokens, opts.mode);

  const components = buildStyleguideComponents({
    configs: opts.configs,
    resolved,
    render: (key, config, tokens) => {
      const spec = getComponent(key);
      const element = spec ? renderComponent(spec, tokens, config) : null;
      return element ? renderToStaticMarkup(element) : '';
    },
  });

  return exportStyleguide({
    name: opts.name,
    generatedAt: opts.generatedAt,
    tokens: opts.tokens,
    mode: opts.mode,
    warnings: opts.brand ? contrastWarnings(opts.tokens, opts.brand) : [],
    components,
  });
}
