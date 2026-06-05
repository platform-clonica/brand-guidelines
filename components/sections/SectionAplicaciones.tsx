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

      {/* Redes sociales — capturas reales enmarcadas en chrome de navegador */}
      <div className="mt-16 sm:mt-24">
        <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-warm-light/60 mb-6">
          {t('redesLabel')}
        </h3>
        <div className="flex flex-col gap-8 sm:gap-10">
          {[
            { src: '/aplicaciones/redes-linkedin.png', url: 'linkedin.com/company/interactius', alt: 'LinkedIn' },
            { src: '/aplicaciones/redes-youtube.png', url: 'youtube.com/@interactius', alt: 'YouTube' },
            { src: '/aplicaciones/redes-instagram.png', url: 'instagram.com/interactius', alt: 'Instagram' },
          ].map((red) => (
            <figure key={red.url} className="m-0 rounded-[6px] overflow-hidden border border-warm-light/15">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-warm-light/15">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="w-2 h-2 rounded-full bg-warm-light/25" />
                  <span className="w-2 h-2 rounded-full bg-warm-light/25" />
                  <span className="w-2 h-2 rounded-full bg-warm-light/25" />
                </div>
                <a
                  href={`https://www.${red.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-caption text-warm-light/55 hover:text-warm-light transition-colors duration-300 ease-expo hover-wipe-underline w-fit"
                >
                  {red.url}
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={red.src} alt={red.alt} className="block w-full h-auto" />
            </figure>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
