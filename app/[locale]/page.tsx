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
import { SectionSistemaTexto } from '@/components/sections/SectionSistemaTexto';
import { SectionColor } from '@/components/sections/SectionColor';
import { SectionUniversoVisual } from '@/components/sections/SectionUniversoVisual';
import { SectionSistemaGrafico } from '@/components/sections/SectionSistemaGrafico';
import { SectionAplicaciones } from '@/components/sections/SectionAplicaciones';
import { SectionMovimiento } from '@/components/sections/SectionMovimiento';
import { SectionIaReady } from '@/components/sections/SectionIaReady';

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
      <SectionSistemaTexto />
      <SectionColor />
      <SectionUniversoVisual />
      <SectionSistemaGrafico />
      <SectionAplicaciones />
      <SectionMovimiento />
      <SectionIaReady />
    </ToastProvider>
  );
}
