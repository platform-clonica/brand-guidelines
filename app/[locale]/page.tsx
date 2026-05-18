import { setRequestLocale } from 'next-intl/server';

import { ToastProvider } from '@/components/ui/Toast';
import { SectionIntro } from '@/components/sections/SectionIntro';
import { SectionTonoMarca } from '@/components/sections/SectionTonoMarca';
import { SectionConcepto } from '@/components/sections/SectionConcepto';
import { SectionLogo } from '@/components/sections/SectionLogo';
import { SectionAreaReserva } from '@/components/sections/SectionAreaReserva';
import { SectionTamanoMinimo } from '@/components/sections/SectionTamanoMinimo';
import { SectionUsosIncorrectos } from '@/components/sections/SectionUsosIncorrectos';
import { SectionTipografia } from '@/components/sections/SectionTipografia';
import { SectionColor } from '@/components/sections/SectionColor';
import { SectionUniversoVisual } from '@/components/sections/SectionUniversoVisual';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ToastProvider>
      <SectionIntro />
      <SectionTonoMarca />
      <SectionConcepto />
      <SectionLogo />
      <SectionAreaReserva />
      <SectionTamanoMinimo />
      <SectionUsosIncorrectos />
      <SectionTipografia />
      <SectionColor />
      <SectionUniversoVisual />
    </ToastProvider>
  );
}
