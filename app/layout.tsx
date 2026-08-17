import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Serif } from 'next/font/google';
import './globals.css';

const mono = IBM_Plex_Mono({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const serif = IBM_Plex_Serif({
  /* Solo 300/400, que es lo que declara `typography.contrast.weights` en lib/tokens.ts.
     Antes se cargaban también 500 y 600: ninguna regla del proyecto los usa (verificado sobre
     todos los CSS y .tsx), así que eran 52.864 B precargados en cada página para nada. */
  weight: ['300', '400'],
  style: ['normal'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-ibm-plex-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Interactius · Brand Guidelines 2026',
  description:
    'Living, AI-ready brand guidelines for Interactius — logotype, typography, colour palette and visual universe.',
  metadataBase: new URL('https://brand.interactius.com'),
  openGraph: {
    title: 'Interactius · Brand Guidelines 2026',
    description: 'Living, AI-ready brand guidelines for Interactius.',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  icons: {
    icon: [
      { url: '/logo/isotipo-positivo.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* `lang` es obligatorio (WCAG 2.1 SC 3.1.1, nivel A) y faltaba en todas las páginas.
       Castellano por defecto, que es correcto para /workspace, /forms, /timer y /deck — su copy
       es español fijo. Las rutas de [locale] lo afinan con un wrapper propio: este layout raíz no
       recibe el locale, y leerlo de cookies aquí volvería dinámico el manual entero, que hoy es
       estático con caché de un año. */
    <html lang="es" className={`${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
