import { getLocale, getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { serviceShapes } from '@/lib/graphics';
import type { Locale } from '@/lib/i18n/routing';

export async function SectionSistemaGrafico() {
  const t = await getTranslations('sistemaGrafico');
  const locale = (await getLocale()) as Locale;

  return (
    <SectionShell id="sistema-grafico" title={t('title')}>
      <div className="flex flex-col gap-5 mb-12 sm:mb-16 items-start">
        <p className="font-mono font-semibold text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('lead')}
        </p>
        <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('body')}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
          {t('shapesTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {serviceShapes.map((s) => (
            <figure key={s.id} className="flex flex-col gap-4 m-0">
              <div className="aspect-square flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.assetPath}
                  alt={`Interactius shape — ${s.name}`}
                  className="block w-full h-full"
                />
              </div>
              <figcaption className="flex flex-col gap-2">
                <div className="font-mono text-body-sm text-dark">
                  .shape-{s.id}
                </div>
                <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/55">
                  {s.serviceLabel[locale]}
                </div>
                <div className="font-mono text-caption text-dark/60">
                  {s.colorName} · {s.fillColor}
                </div>
                <p className="mt-2 font-mono text-body-sm text-dark/70 leading-[1.6]">
                  {s.usage[locale]}
                </p>
                <div className="mt-2">
                  <DownloadButton href={s.assetPath} fileName={s.downloadFileName}>
                    {t('downloadLabel')}
                  </DownloadButton>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
