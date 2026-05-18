import { getTranslations } from 'next-intl/server';

export async function SectionIntro() {
  const t = await getTranslations('intro');
  return (
    <section
      id="intro"
      className="min-h-dvh w-full bg-warm-light text-dark flex flex-col"
    >
      <div className="grid grid-cols-12 gap-6 px-6 sm:px-10 lg:px-16 pt-20 sm:pt-24 lg:pt-28">
        <div className="col-span-12 lg:col-span-12 flex flex-col gap-6">
          <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
            01/ {t('kicker')}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/interactius-positivo.svg"
            alt="interactīus"
            className="block w-full max-w-[320px] h-auto"
          />
          <span className="font-mono text-body-sm text-dark/70">{t('tagline')}</span>
        </div>
      </div>

      <div className="flex-1" aria-hidden />

      <div className="grid grid-cols-12 gap-6 px-6 sm:px-10 lg:px-16 pb-20 sm:pb-24 lg:pb-28">
        <aside className="col-span-12 lg:col-span-7 flex flex-col gap-5 max-w-[720px]">
          <p className="font-mono text-body-sm text-dark leading-[1.7]">
            {t('lead')}
          </p>
          <p className="font-mono text-body-sm text-dark leading-[1.7]">
            {t('body')}
          </p>
        </aside>
      </div>
    </section>
  );
}
