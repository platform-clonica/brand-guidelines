import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { TypeSpecimen } from '@/components/brand/TypeSpecimen';

export async function SectionTipografia() {
  const t = await getTranslations('tipografia');
  return (
    <SectionShell id="tipografia" title={t('title')}>
      <div className="flex flex-col gap-16 sm:gap-20">
        <TypeSpecimen
          family="IBM Plex Mono"
          role={t('brandTitle')}
          description={t('brandBody')}
          weightsNote={t('brandNotes')}
          fontClass="font-mono"
          downloadHref="https://fonts.google.com/specimen/IBM+Plex+Mono"
          downloadLabel={t('downloadGoogleFonts')}
        />
        <div className="h-px bg-dark/10" />
        <TypeSpecimen
          family="IBM Plex Serif"
          role={t('contrastTitle')}
          description={t('contrastBody')}
          weightsNote={t('contrastNotes')}
          fontClass="font-serif"
          downloadHref="https://fonts.google.com/specimen/IBM+Plex+Serif"
          downloadLabel={t('downloadGoogleFonts')}
        />
      </div>
    </SectionShell>
  );
}
