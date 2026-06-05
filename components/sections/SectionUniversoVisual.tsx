import { getLocale, getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { CopyButton } from '@/components/ui/CopyButton';
import { getImagePrompt } from '@/lib/prompts';
import type { Locale } from '@/lib/i18n/routing';

export async function SectionUniversoVisual() {
  const t = await getTranslations('universoVisual');
  const locale = (await getLocale()) as Locale;
  const promptText = getImagePrompt(locale);

  return (
    <SectionShell id="universo-visual" title={t('title')} variant="dark">
      <div className="flex flex-col gap-5 mb-10 sm:mb-14 items-start">
        <p className="font-mono font-semibold text-body-sm text-warm-light leading-[1.7] max-w-[720px]">
          {t('lead')}
        </p>
        <p className="font-mono text-body-sm text-warm-light leading-[1.7] max-w-[720px]">
          {t('body')}
        </p>

        <CopyButton
          value={promptText}
          toastMessage={t('copyPromptToast')}
          label={t('copyPromptLabel')}
          className="group mt-2 inline-flex items-center gap-3 font-mono text-body-sm text-warm-light normal-case tracking-normal w-fit"
        >
          <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">⧉</span>
          <span className="hover-wipe-underline">{t('copyPromptLabel')}</span>
        </CopyButton>
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-01.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-5 aspect-[3/4] object-cover w-full h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-02.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-7 aspect-[3/2] object-cover w-full h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-03.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-7 aspect-[16/10] object-cover w-full h-full" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/universo/universo-04.jpg" alt="" aria-hidden
             className="col-span-6 lg:col-span-5 aspect-[3/4] object-cover w-full h-full" />
      </div>
    </SectionShell>
  );
}
