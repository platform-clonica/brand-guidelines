'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/i18n/routing';

type Props = { variant?: 'light' | 'dark' };

export function LocaleSwitch({ variant = 'light' }: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const isDark = variant === 'dark';
  const labelColor = isDark ? 'text-warm-light/50' : 'text-dark/45';
  const dotColor = isDark ? 'text-warm-light/25' : 'text-dark/25';
  const active = isDark ? 'text-warm-light' : 'text-dark';
  const inactive = isDark ? 'text-warm-light/50' : 'text-dark/55';

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  return (
    <div className="font-mono text-[11px] flex items-center gap-2">
      <span className={labelColor}>{t('menu.locale')}</span>
      <button
        type="button"
        onClick={() => switchTo('es')}
        aria-pressed={locale === 'es'}
        className={`uppercase transition-colors duration-300 ease-expo
                    ${locale === 'es' ? active : `${inactive} hover:${active}`}`}
      >
        ES
      </button>
      <span className={dotColor}>·</span>
      <button
        type="button"
        onClick={() => switchTo('en')}
        aria-pressed={locale === 'en'}
        className={`uppercase transition-colors duration-300 ease-expo
                    ${locale === 'en' ? active : `${inactive} hover:${active}`}`}
      >
        EN
      </button>
    </div>
  );
}
