import { getLocale } from 'next-intl/server';

import { sections, type SectionId } from '@/lib/sections';
import type { Locale } from '@/lib/i18n/routing';

type Props = {
  id: SectionId;
  title: string;
  children: React.ReactNode;
  /** Renderiza fullbleed (sin padding lateral) entre el header y el children */
  bleed?: React.ReactNode;
  /** Contenido alineado a la derecha del titular, a su misma altura */
  headerRight?: React.ReactNode;
  variant?: 'light' | 'dark';
  className?: string;
};

export async function SectionShell({ id, title, children, bleed, headerRight, variant = 'light', className }: Props) {
  const locale = (await getLocale()) as Locale;
  const section = sections.find((s) => s.id === id);
  const num = section?.num ?? '';
  const eyebrow = section?.label[locale] ?? '';
  const isDark = variant === 'dark';

  const eyebrowColor = isDark ? 'text-warm-light/55' : 'text-dark/60';

  return (
    <section
      id={id}
      className={`min-h-dvh w-full ${isDark ? 'bg-dark text-warm-light' : 'bg-warm-light text-dark'} ${className ?? ''}`}
    >
      <div className="pt-20 sm:pt-24 lg:pt-28 pb-20 sm:pb-24 lg:pb-28">
        <header className="px-6 sm:px-10 lg:px-16">
          <div className={`font-mono text-caption uppercase tracking-[0.08em] mb-3 ${eyebrowColor}`}>
            {num}/ {eyebrow}
          </div>
          <div className="flex items-baseline justify-between gap-6 flex-wrap">
            <h2 className="font-serif font-normal text-[28px] sm:text-[34px] lg:text-[40px] leading-[1.15] tracking-tight">
              {title}
            </h2>
            {headerRight && <div className="text-right">{headerRight}</div>}
          </div>
        </header>

        {bleed && <div className="mt-12 sm:mt-16 w-full">{bleed}</div>}

        <div className={`px-6 sm:px-10 lg:px-16 ${bleed ? 'mt-12 sm:mt-16' : 'mt-12 sm:mt-16'}`}>
          {children}
        </div>
      </div>
    </section>
  );
}
