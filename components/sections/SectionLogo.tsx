import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { LogoStage } from '@/components/brand/LogoStage';

export async function SectionLogo() {
  const t = await getTranslations('logo');
  return (
    <SectionShell id="logo" title={t('title')}>
      <div className="flex flex-col gap-12 sm:gap-16">
        <LogoStage
          src="/logo/interactius-positivo.svg"
          fileName="interactius-positivo.svg"
          bg="light"
          caption={t('positive')}
          downloadLabel={t('downloadPositive')}
        />
        <LogoStage
          src="/logo/interactius-negativo.svg"
          fileName="interactius-negativo.svg"
          bg="dark"
          caption={t('negative')}
          downloadLabel={t('downloadNegative')}
        />
      </div>

      <div className="mt-16 sm:mt-24">
        <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60 mb-6">
          {t('isotipo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <LogoStage
            src="/logo/isotipo-positivo.svg"
            fileName="isotipo-positivo.svg"
            bg="light"
            shape="square"
            caption={t('positive')}
            downloadLabel={t('downloadIsoPositive')}
          />
          <LogoStage
            src="/logo/isotipo-negativo.svg"
            fileName="isotipo-negativo.svg"
            bg="dark"
            shape="square"
            caption={t('negative')}
            downloadLabel={t('downloadIsoNegative')}
          />
        </div>
      </div>
    </SectionShell>
  );
}
