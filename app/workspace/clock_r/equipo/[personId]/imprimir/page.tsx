import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAuthServer } from '@/lib/supabase/server';
import { isClockAdmin } from '@/lib/auth/role';
import { RegistroImprimible } from '@/components/clock/RegistroImprimible';
import '@/components/clock/clock.css';

/* El registro de una persona, listo para imprimir. ESTO ES EL PDF.

   No hay generación en servidor y no es un olvido: la fase de export con Puppeteer del visor de
   presentaciones nunca se construyó (docs/features/deck-export-visor.md: «sigue pendiente») y
   `@sparticuz/chromium` no es dependencia del proyecto. Añadirla son ~50 MB de bundle, arranque en
   frío y riesgo de timeout en Netlify. Imprimir desde una página limpia sale vectorial, con las
   fuentes reales, y no añade nada al despliegue: es el patrón que el repo ya usa para los decks.

   Con `?print=1` se dispara la impresión sola, igual que `/deck/[id]/view?print=1`.

   Mismo criterio de rol que las otras dos pantallas de administración: se comprueba en servidor y
   la negativa se explica, porque una página vacía parece rota. */
export const metadata: Metadata = {
  title: 'Clockr · Registro para imprimir',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Ctx = {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ from?: string; to?: string; print?: string }>;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function ImprimirPage({ params, searchParams }: Ctx) {
  const { personId } = await params;
  const { from, to, print } = await searchParams;

  const sb = await supabaseAuthServer();
  if (!(await isClockAdmin(sb))) {
    return (
      <div className="ix-clock">
        <main className="ixc-main">
          <p className="ixc-eyebrow">Registro</p>
          <p style={{ marginTop: 16 }}>
            Esta pantalla es de administración. Tu jornada está en{' '}
            <Link href="/workspace/clock_r">Mi jornada</Link>.
          </p>
        </main>
      </div>
    );
  }

  /* El periodo viene por la URL para que el enlace se pueda guardar y repetir: el día que la
     asesoría pida «lo mismo pero de marzo», es cambiar dos números. Sin periodo válido, el mes en
     curso, que es lo que se pide nueve de cada diez veces. */
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = from && ISO.test(from) ? from : `${hoy.slice(0, 7)}-01`;
  const hasta = to && ISO.test(to) ? to : hoy;

  return (
    <RegistroImprimible personId={personId} from={desde} to={hasta} autoPrint={print === '1'} />
  );
}
