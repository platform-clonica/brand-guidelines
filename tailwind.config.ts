import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './content/**/*.{mdx,md}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base
        dark: '#1C1A17',
        'pure-white': '#FFFFFF',
        grey: '#E8E6E3',
        'warm-light': '#F5F2ED',
        'warm-dark': '#E0DAD2',
        opal: '#B0B5B0',
        // Accent
        bordeaux: '#99335F',
        emerald: '#5999A6',
        // Semantic
        fg: '#1C1A17',
        bg: '#F5F2ED',
        muted: '#E8E6E3',
      },
      fontFamily: {
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
        serif: ['var(--font-ibm-plex-serif)', 'ui-serif', 'serif'],
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      fontSize: {
        'caption': ['0.625rem', { lineHeight: '1.4', letterSpacing: '0.04em' }],
        'body-sm': ['clamp(0.75rem, 0.7rem + 0.25vw, 1rem)', { lineHeight: '1.5' }],
        'body':    ['clamp(0.875rem, 0.8rem + 0.4vw, 1.125rem)', { lineHeight: '1.55' }],
        'title-sm':['clamp(1.25rem, 1rem + 1.25vw, 2rem)', { lineHeight: '1.15' }],
        'title':   ['clamp(2rem, 1.4rem + 3vw, 4rem)', { lineHeight: '1.05' }],
        'display': ['clamp(3rem, 2rem + 5vw, 6rem)', { lineHeight: '1.0' }],
        'super':   ['clamp(4rem, 2rem + 10vw, 12rem)', { lineHeight: '1.0' }],
      },
    },
  },
  plugins: [],
};

export default config;
