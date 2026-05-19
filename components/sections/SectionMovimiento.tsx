import { getLocale, getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { EasingCurve } from '@/components/brand/EasingCurve';
import { EasingDemo } from '@/components/brand/EasingDemo';
import { easings, durations, heroReferenceUrl, heroVideoUrl } from '@/lib/motion';
import type { Locale } from '@/lib/i18n/routing';

export async function SectionMovimiento() {
  const t = await getTranslations('movimiento');
  const locale = (await getLocale()) as Locale;

  return (
    <SectionShell id="movimiento" title={t('title')}>
      <div className="flex flex-col gap-5 mb-14 sm:mb-20 items-start">
        <p className="font-mono font-semibold text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('lead')}
        </p>
        <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('body')}
        </p>
      </div>

      {/* Easing curves */}
      <div className="flex flex-col gap-8 mb-16 sm:mb-24">
        <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
          {t('easingsTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {easings.map((e) => (
            <div key={e.id} className="flex flex-col gap-4">
              <div className="aspect-square bg-pure-white text-dark">
                <EasingCurve curve={e.curve} className="block w-full h-full" />
              </div>

              {/* Live demo of the easing */}
              <EasingDemo
                cssCubic={e.cssCubic}
                durationMs={e.recommendedMs ?? 600}
                label={t('playLabel')}
              />

              <div className="flex flex-col gap-2 mt-2">
                <div className="font-mono text-body-sm text-dark">
                  .{e.name}
                </div>
                <div className="font-mono text-caption text-dark/60 break-all leading-[1.4]">
                  {e.cssCubic}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-caption uppercase tracking-[0.08em] text-dark/50">
                  {e.tailwindToken && <span>{e.tailwindToken}</span>}
                  {e.gsapToken && <span>{e.gsapToken}</span>}
                  {e.recommendedMs && <span>{e.recommendedMs}ms</span>}
                </div>
                <p className="mt-2 font-mono text-body-sm text-dark/70 leading-[1.6]">
                  {e.usage[locale]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Durations */}
      <div className="flex flex-col gap-8 mb-16 sm:mb-24">
        <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
          {t('durationsTitle')}
        </h3>
        <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[120px_1fr] gap-x-6 sm:gap-x-12 max-w-[820px] border-t border-dark/15">
          {durations.map((d) => (
            <div key={d.ms} className="contents">
              <div className="font-mono text-body-sm font-medium text-dark py-5 border-b border-dark/15 tabular-nums">
                {d.ms}ms
              </div>
              <div className="font-mono text-body-sm text-dark leading-[1.6] py-5 border-b border-dark/15">
                {d.usage[locale]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Applied reference — hero video embedded in-situ */}
      <div className="flex flex-col gap-4">
        <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
          {t('referenceTitle')}
        </h3>
        <div className="bg-dark overflow-hidden">
          <video
            src={heroVideoUrl}
            controls
            playsInline
            preload="metadata"
            className="block w-full h-auto"
          >
            {t('videoFallback')}
          </video>
        </div>
        <a
          href={heroReferenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-2 inline-flex items-center gap-3 font-mono text-body-sm text-dark w-fit"
        >
          <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">↗</span>
          <span className="hover-wipe-underline">{t('referenceLabel')}</span>
        </a>
      </div>
    </SectionShell>
  );
}
