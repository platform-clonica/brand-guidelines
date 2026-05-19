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

      {/* Vertical use — uso especial permitido, refuerza concepto liminal */}
      <div className="mt-16 sm:mt-24">
        <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60 mb-6">
          {t('verticalEyebrow')}
        </div>
        <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.25] tracking-tight mb-10 sm:mb-12">
          {t('verticalTitle')}
        </h3>

        <div className="grid grid-cols-12 gap-6 sm:gap-10 lg:gap-12 items-stretch">
          {/* Stage vertical — SVG rotado, abraza la altura del bloque de texto */}
          <div
            className="col-span-12 sm:col-span-4 lg:col-span-3 bg-pure-white flex items-center justify-center overflow-hidden min-h-[320px] self-stretch"
            aria-label={t('verticalCaption')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/interactius-positivo.svg"
              alt={t('verticalCaption')}
              className="block h-auto"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                width: 'min(70%, 280px)',
              }}
            />
          </div>

          {/* Concepto + aplicaciones */}
          <div className="col-span-12 sm:col-span-8 lg:col-span-9 flex flex-col gap-6 max-w-[640px]">
            <p className="font-mono font-semibold text-body-sm text-dark leading-[1.7]">
              {t('verticalLead')}
            </p>
            <p className="font-mono text-body-sm text-dark leading-[1.7]">
              {t('verticalBody')}
            </p>
            <div className="pt-6 border-t border-dark/15 flex flex-col gap-3">
              <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/50">
                {t('verticalApplicationsLabel')}
              </div>
              <p className="font-mono text-body-sm text-dark leading-[1.7]">
                {t('verticalApplications')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
