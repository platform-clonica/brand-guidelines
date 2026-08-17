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

/* Cabeceras de seguridad. No había ninguna declarada en el repo: ni en este fichero, ni en
   netlify.toml, ni en public/_headers, ni en el middleware. Netlify añade HSTS por su cuenta en un
   dominio propio, pero CSP, X-Frame-Options, Referrer-Policy y Permissions-Policy no las añade
   nadie. Van aquí y no en netlify.toml para que viajen con el repo y se revisen en un PR.

   Falta la CSP, y es deliberado: el studio pinta con estilos inline y next/font inyecta un
   <style>, así que una CSP útil necesita medirse primero en modo informe contra un endpoint que
   recoja los avisos. Es una tarea propia, no un renglón más en esta lista. */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  /* SAMEORIGIN y no DENY en el sitio general: un cliente podría estar embebiendo un formulario de
     /forms/f/[id] en su propia web, y romperlo en silencio sería peor que el riesgo que evita. */
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  reactStrictMode: true,
  /* Anunciaba el framework en cada respuesta. No es una vulnerabilidad, es información gratis para
     quien escanea en masa eligiendo objetivos por framework y versión. */
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BRAND_VERSION_DATE: lastBrandChange() ?? '',
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        /* El área interna sí va con DENY: ahí el clickjacking sobre el formulario de acceso es el
           escenario que importa, y nadie tiene motivo para embeberla. */
        source: '/workspace/:path*',
        headers: [...SECURITY_HEADERS.filter((h) => h.key !== 'X-Frame-Options'),
                  { key: 'X-Frame-Options', value: 'DENY' }],
      },
    ];
  },
};

export default withNextIntl(withMDX(nextConfig));
