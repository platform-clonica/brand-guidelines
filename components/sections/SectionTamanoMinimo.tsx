import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';

export async function SectionTamanoMinimo() {
  const t = await getTranslations('tamanoMinimo');
  return (
    <SectionShell id="tamano-minimo" title={t('title')}>
      <div className="flex flex-col gap-12 items-start">
        <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[480px]">
          {t('body')}
        </p>

        <div className="flex flex-col gap-6 items-start w-full max-w-[340px]">
          <div className="bg-pure-white p-8 sm:p-10 flex flex-col gap-5 items-start w-full">
            <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
              {t('print')}
            </div>
            <div className="flex items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/interactius-positivo.svg"
                alt=""
                aria-hidden
                className="h-[28px] w-auto"
              />
              <span className="font-mono text-caption text-dark/40">10 mm</span>
            </div>
            <p className="font-mono text-body-sm text-dark">{t('printValue')}</p>
          </div>

          <div className="bg-pure-white p-8 sm:p-10 flex flex-col gap-5 items-start w-full">
            <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
              {t('digital')}
            </div>
            <div className="flex items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/interactius-positivo.svg"
                alt=""
                aria-hidden
                className="h-[20px] w-auto"
              />
              <span className="font-mono text-caption text-dark/40">20 px</span>
            </div>
            <p className="font-mono text-body-sm text-dark">{t('digitalValue')}</p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
