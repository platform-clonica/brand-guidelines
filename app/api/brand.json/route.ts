import { NextResponse } from 'next/server';

import {
  colorsBase,
  colorsAccent,
  typography,
  brand,
  logoMinSize,
  voicePrinciple,
  voiceAxes,
  forbiddenVocabulary,
  substitutionMatrix,
  punctuationRules,
  sentenceLength,
} from '@/lib/tokens';
import { sections } from '@/lib/sections';
import { getMasterPrompt, getTonePrompt } from '@/lib/prompts';

export const dynamic = 'force-static';

const SITE = 'https://brand.interactius.com';

export function GET() {
  const payload = {
    brand: {
      name: brand.name,
      wordmark: brand.wordmark,
      tagline: brand.tagline,
      version: brand.version,
      versionDate: brand.versionDate,
      concept: brand.concept,
      visualUniverse: brand.visualUniverse,
    },
    voice: {
      principle: voicePrinciple,
      sentenceLength,
      axes: voiceAxes,
      forbiddenVocabulary,
      substitutionMatrix,
      punctuation: {
        noExclamation: punctuationRules.noExclamation,
        noEllipsis: punctuationRules.noEllipsis,
      },
    },
    colors: {
      base: colorsBase,
      accent: colorsAccent,
      rules: {
        onLightBg: '#1C1A17',
        onDarkBg: '#F5F2ED',
      },
    },
    typography: {
      brand: typography.brand,
      contrast: typography.contrast,
      italicsAllowed: false,
    },
    logo: {
      minSize: logoMinSize,
      clearSpace: 'Equivalente a la altura de la "a" minúscula del logotipo.',
      assets: {
        positive: `${SITE}/logo/interactius-positivo.svg`,
        negative: `${SITE}/logo/interactius-negativo.svg`,
        isotypePositive: `${SITE}/logo/isotipo-positivo.svg`,
        isotypeNegative: `${SITE}/logo/isotipo-negativo.svg`,
      },
    },
    prompts: {
      master: { es: getMasterPrompt('es'), en: getMasterPrompt('en') },
      tone: { es: getTonePrompt('es'), en: getTonePrompt('en') },
    },
    sections: sections.map((s) => ({
      id: s.id,
      num: s.num,
      label: s.label,
      url: `${SITE}/#${s.id}`,
    })),
    documents: {
      pdf: `${SITE}/brand-guidelines-2026.pdf`,
      llms: `${SITE}/llms.txt`,
    },
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  });
}
