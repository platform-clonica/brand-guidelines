import { execSync } from 'node:child_process';

import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');
const withMDX = createMDX({});

/* Fecha del registro de versión del manual (el `v2_07.26` de la esquina), en MM.AA.
   Sale del último commit que tocó CONTENIDO DE MARCA, no del último commit a secas: si el mes lo
   moviera cualquier cambio, un arreglo en el Deck Maker envejecería el manual sin que el manual
   haya cambiado, y el dato pasaría a mentir.

   Se resuelve en build. Si git no está disponible (algún entorno sin repo), devuelve null y
   lib/tokens.ts se queda con el valor escrito a mano — o sea, el comportamiento de siempre. */
const BRAND_CONTENT_PATHS = ['lib/tokens.ts', 'lib/typeScale.ts', 'lib/prompts.ts', 'components/sections', 'messages'];

function lastBrandChange() {
  try {
    const iso = execSync(`git log -1 --format=%cs -- ${BRAND_CONTENT_PATHS.join(' ')}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
    return m ? `${m[2]}.${m[1].slice(2)}` : null;
  } catch {
    return null;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BRAND_VERSION_DATE: lastBrandChange() ?? '',
  },
};

export default withNextIntl(withMDX(nextConfig));
