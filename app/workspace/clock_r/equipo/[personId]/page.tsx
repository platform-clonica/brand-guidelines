import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAuthServer } from '@/lib/supabase/server';
import { isClockAdmin } from '@/lib/auth/role';
import { DetallePersona } from '@/components/clock/DetallePersona';
import '@/components/clock/clock.css';

/* Historial de una persona. La pantalla que se abre el día de una revisión.

   Mismo criterio que el panel: el rol se comprueba en servidor y la negativa se explica. La RLS
   devolvería cero filas a quien no es administración, y una pantalla vacía parece rota. */
export const metadata: Metadata = {
  title: 'Clockr · Historial',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ personId: string }> };

export default async function DetallePage({ params }: Ctx) {
  const { personId } = await params;
  const sb = await supabaseAuthServer();

  if (!(await isClockAdmin(sb))) {
    return (
      <div className="ix-clock">
        <main className="ixc-main">
          <p className="ixc-eyebrow">Historial</p>
          <p style={{ marginTop: 16 }}>
            Esta pantalla es de administración. Tu jornada está en{' '}
            <Link href="/workspace/clock_r">Mi jornada</Link>.
          </p>
        </main>
      </div>
    );
  }

  return <DetallePersona personId={personId} />;
}
