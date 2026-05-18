import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

import { routing, type Locale } from '@/lib/i18n/routing';
import { Sidebar } from '@/components/chrome/Sidebar';
import { MobileHeader } from '@/components/chrome/MobileHeader';
import { MenuOverlay } from '@/components/chrome/MenuOverlay';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'chrome' });
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Sidebar />
      <MobileHeader ariaOpen={t('openMenu')} />
      <MenuOverlay />
      <main className="pl-0 md:pl-[var(--sidebar-w)] min-h-dvh pt-14 md:pt-0">
        {children}
      </main>
    </NextIntlClientProvider>
  );
}
