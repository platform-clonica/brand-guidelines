import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';

export async function SectionConcepto() {
  const t = await getTranslations('concepto');

  return (
    <SectionShell
      id="concepto"
      title={t('title')}
      bleed={
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/concepto/interactius-logo-tecnic.svg"
          alt="Construcción técnica del logotipo Interactius"
          className="block w-full h-auto"
        />
      }
    >
      <div className="grid grid-cols-12 gap-6 lg:gap-10">
        {/* Bloque 1: Construcción y Función Fonética */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-5">
          <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.25] tracking-tight max-w-[720px]">
            {t('part1Title')}
          </h3>
          <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
            {t('part1P1')}
          </p>
        </div>

        {/* Visual del macrón "ius" + definición */}
        <div className="col-span-12 mt-4 sm:mt-6 flex flex-col gap-5 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/concepto/ius.svg"
            alt="Representación gráfica del macrón sobre la ī"
            className="block w-full max-w-[180px] h-auto"
          />
          <p className="font-mono text-[11px] text-dark/40 leading-[1.6] max-w-[360px]">
            {t('macronDef')}
          </p>
        </div>

        {/* Párrafo 2 */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-5 mt-4 sm:mt-6">
          <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
            {t('part1P2')}
          </p>
        </div>

        {/* Bloque 2: Actitud liminal y Dinamismo vertical */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-5 mt-12 sm:mt-20">
          <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.25] tracking-tight max-w-[720px]">
            {t('part2Title')}
          </h3>
          <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
            {t('part2P1')}
          </p>
        </div>
      </div>
    </SectionShell>
  );
}
