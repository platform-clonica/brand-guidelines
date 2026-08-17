import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

import { routing, type Locale } from '@/lib/i18n/routing';
import { Sidebar } from '@/components/chrome/Sidebar';
import { MobileHeader } from '@/components/chrome/MobileHeader';
import { MenuOverlayLazy } from '@/components/chrome/MenuOverlayLazy';

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
      {/* El `<html>` del layout raíz declara `lang="es"` y no puede saber el locale sin volverse
          dinámico. Este wrapper lo afina para /en y /ca, que es lo que lee un lector de pantalla:
          `lang` en un elemento anidado acota el idioma de su subárbol. `display:contents` lo saca
          del layout, así que no añade ninguna caja ni altera el CSS existente. */}
      <div lang={locale} style={{ display: 'contents' }}>
        <Sidebar />
        <MobileHeader ariaOpen={t('openMenu')} />
        <MenuOverlayLazy />
        <main className="pl-0 md:pl-[var(--sidebar-w)] min-h-dvh pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
