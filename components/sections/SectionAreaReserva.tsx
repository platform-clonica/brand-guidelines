import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';

export async function SectionAreaReserva() {
  const t = await getTranslations('areaReserva');
  return (
    <SectionShell id="area-reserva" title={t('title')}>
      <div className="flex flex-col gap-12 sm:gap-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/area-reserva/space-area.svg"
          alt="Diagrama del área de reserva del logotipo Interactius"
          className="block w-1/2 h-auto"
        />

        <div className="grid grid-cols-12 gap-6 lg:gap-10">
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-5">
            <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
              {t('body')}
            </p>
            <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
              {t('measure')}
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
