import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';

export async function SectionAplicaciones() {
  const t = await getTranslations('aplicaciones');

  return (
    <SectionShell id="aplicaciones" title={t('title')} variant="dark">
      <div className="mb-10 sm:mb-14">
        <p className="font-mono text-body-sm text-warm-light leading-[1.7] max-w-[720px]">
          {t('lead')}
        </p>
      </div>

      {/* Grid mockups — layout del PDF: móvil dominante a la izquierda, dos
          piezas apiladas a la derecha. Items-stretch para igualar alturas. */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">
        <figure className="col-span-12 lg:col-span-7 flex flex-col gap-3 m-0">
          <div className="aspect-[4/3] overflow-hidden bg-warm-light/5 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/aplicaciones/aplicaciones-movil.png"
              alt={t('captionMovil')}
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="font-mono text-caption uppercase tracking-[0.08em] text-warm-light/55">
            {t('captionMovil')}
          </figcaption>
        </figure>

        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 sm:gap-4">
          <figure className="flex flex-col gap-3 m-0 flex-1">
            <div className="aspect-[5/4] overflow-hidden bg-warm-light/5 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/aplicaciones/aplicaciones-tarjetas.png"
                alt={t('captionTarjetas')}
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="font-mono text-caption uppercase tracking-[0.08em] text-warm-light/55">
              {t('captionTarjetas')}
            </figcaption>
          </figure>

          <figure className="flex flex-col gap-3 m-0 flex-1">
            <div className="aspect-[9/8] overflow-hidden bg-warm-light/5 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/aplicaciones/aplicaciones-folder.png"
                alt={t('captionFolder')}
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="font-mono text-caption uppercase tracking-[0.08em] text-warm-light/55">
              {t('captionFolder')}
            </figcaption>
          </figure>
        </div>
      </div>
    </SectionShell>
  );
}
