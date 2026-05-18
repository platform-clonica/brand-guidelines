import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Serif } from 'next/font/google';
import './globals.css';

const mono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const serif = IBM_Plex_Serif({
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
  },
  icons: {
    icon: '/logo/isotipo-positivo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
