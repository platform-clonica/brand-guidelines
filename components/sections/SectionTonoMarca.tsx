import { getLocale, getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { CopyButton } from '@/components/ui/CopyButton';
import { getTonePrompt } from '@/lib/prompts';
import type { Locale } from '@/lib/i18n/routing';

export async function SectionTonoMarca() {
  const t = await getTranslations('tonoMarca');
  const locale = (await getLocale()) as Locale;
  const promptText = getTonePrompt(locale);

  const axes = [
    { title: t('ax1Title'), body: t('ax1Body') },
    { title: t('ax2Title'), body: t('ax2Body') },
    { title: t('ax3Title'), body: t('ax3Body') },
    { title: t('ax4Title'), body: t('ax4Body') },
  ];

  const redList = [
    { word: t('red1Word'), rule: t('red1Rule') },
    { word: t('red2Word'), rule: t('red2Rule') },
    { word: t('red3Word'), rule: t('red3Rule') },
    { word: t('red4Word'), rule: t('red4Rule') },
    { word: t('red5Word'), rule: t('red5Rule') },
  ];

  return (
    <SectionShell id="tono-marca" title={t('title')}>
      <div className="flex flex-col gap-12 sm:gap-16">
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.25] tracking-tight max-w-[720px]">
            {t('voiceTitle')}
          </h3>
          <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
            {t('voiceBody')}
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.25] tracking-tight max-w-[720px]">
            {t('axesTitle')}
          </h3>
          <ul className="flex flex-col gap-8">
            {axes.map((axis, i) => (
              <li key={axis.title} className="flex flex-col gap-2 max-w-[720px]">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-caption uppercase tracking-[0.08em] text-dark/40">
                    {String(i + 1).padStart(2, '0')}/
                  </span>
                  <h4 className="font-mono font-semibold text-body-sm text-dark">
                    {axis.title}
                  </h4>
                </div>
                <p className="font-mono text-body-sm text-dark leading-[1.7]">
                  {axis.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5 max-w-[720px]">
            <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.25] tracking-tight">
              {t('redTitle')}
            </h3>
            <p className="font-mono text-body-sm text-dark leading-[1.7]">
              {t('redBody')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-x-8 sm:gap-x-12 border-t border-dark/15">
            <div className="hidden sm:block font-mono text-caption uppercase tracking-[0.08em] text-dark/40 py-4 border-b border-dark/15">
              {t('redHeadWord')}
            </div>
            <div className="hidden sm:block font-mono text-caption uppercase tracking-[0.08em] text-dark/40 py-4 border-b border-dark/15">
              {t('redHeadRule')}
            </div>

            {redList.map((row) => (
              <div key={row.word} className="contents">
                <div className="font-mono font-semibold text-body-sm text-dark py-5 border-b border-dark/15">
                  {row.word}
                </div>
                <div className="font-mono text-body-sm text-dark leading-[1.7] pb-5 sm:py-5 sm:border-b border-dark/15">
                  {row.rule}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 max-w-[720px]">
          <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.25] tracking-tight">
            {t('puncTitle')}
          </h3>
          <ul className="flex flex-col gap-4">
            <li className="font-mono text-body-sm text-dark leading-[1.7]">
              {t('punc1')}
            </li>
            <li className="font-mono text-body-sm text-dark leading-[1.7]">
              {t('punc2')}
            </li>
          </ul>
        </div>

        <CopyButton
          value={promptText}
          toastMessage={t('copyPromptToast')}
          label={t('copyPromptLabel')}
          className="group inline-flex items-center gap-3 font-mono text-body-sm text-dark normal-case tracking-normal w-fit"
        >
          <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">⧉</span>
          <span className="hover-wipe-underline">{t('copyPromptLabel')}</span>
        </CopyButton>
      </div>
    </SectionShell>
  );
}
