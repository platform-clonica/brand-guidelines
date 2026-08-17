import { getTranslations } from 'next-intl/server';

export async function SectionIntro() {
  const t = await getTranslations('intro');
  return (
    <section
      id="intro"
      className="min-h-lvh w-full bg-warm-light text-dark flex flex-col"
    >
      <div className="grid grid-cols-12 gap-6 px-6 sm:px-10 lg:px-16 pt-20 sm:pt-24 lg:pt-28">
        <div className="col-span-12 lg:col-span-12 flex flex-col gap-6">
          <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
            01/ {t('kicker')}
          </div>
          {/* El documento no tenía ningún <h1>: arrancaba en H2 y encadenaba 35 encabezados sin
              raíz, así que quien navega por encabezados —la forma habitual de recorrer un
              documento de 24.000 px— entraba por la mitad. El título de nivel 1 es el logotipo,
              que es literalmente el título del manual; su nombre accesible sale del alt.
              `m-0 leading-[0]` neutraliza los márgenes por defecto del h1: ni un píxel cambia. */}
          <h1 className="m-0 leading-[0]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/interactius-positivo.svg"
              alt="interactīus · Brand Guidelines 2026"
              className="block w-full max-w-[320px] h-auto"
            />
          </h1>
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
