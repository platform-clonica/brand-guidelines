import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { CopyButton } from '@/components/ui/CopyButton';
import { buildLlmsMarkdown } from '@/lib/llms';

export async function SectionIaReady() {
  const t = await getTranslations('iaReady');
  const promptText = buildLlmsMarkdown();

  return (
    <SectionShell id="ia-ready" title={t('title')}>
      <div className="flex flex-col gap-5 mb-10 sm:mb-14 items-start">
        <p className="font-mono font-semibold text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('lead')}
        </p>
        <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('body')}
        </p>

        <CopyButton
          value={promptText}
          toastMessage={t('copyToast')}
          label={t('copyLabel')}
          className="group mt-2 inline-flex items-center gap-3 font-mono text-body-sm text-dark normal-case tracking-normal w-fit"
        >
          <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">⧉</span>
          <span className="hover-wipe-underline">{t('copyLabel')}</span>
        </CopyButton>
      </div>

      <div className="flex flex-col gap-3 pt-8 border-t border-dark/15 max-w-[720px]">
        <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/55">
          {t('endpointsTitle')}
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-8 gap-y-3 font-mono text-body-sm">
          <a
            href="/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 text-dark w-fit"
          >
            <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">↗</span>
            <span className="hover-wipe-underline">{t('openLlmsLabel')}</span>
          </a>
          <a
            href="/api/brand.json"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 text-dark w-fit"
          >
            <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">↗</span>
            <span className="hover-wipe-underline">{t('openJsonLabel')}</span>
          </a>
        </div>
      </div>
    </SectionShell>
  );
}
