import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';

export async function SectionUniversoVisual() {
  const t = await getTranslations('universoVisual');
  return (
    <SectionShell id="universo-visual" title={t('title')} variant="dark">
      <div className="flex flex-col gap-5 mb-10 sm:mb-14 items-start">
        <p className="font-mono font-semibold text-body-sm text-warm-light leading-[1.7] max-w-[720px]">
          {t('lead')}
        </p>
        <p className="font-mono text-body-sm text-warm-light leading-[1.7] max-w-[720px]">
          {t('body')}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-01.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-4 aspect-[3/4] object-cover w-full h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-02.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-5 aspect-[3/2] object-cover w-full h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-03.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-3 aspect-square object-cover w-full h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-04.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-4 aspect-[2/3] object-cover w-full h-full lg:col-start-9" />
      </div>
    </SectionShell>
  );
}
