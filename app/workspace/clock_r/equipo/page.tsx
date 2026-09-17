import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAuthServer } from '@/lib/supabase/server';
import { isClockAdmin } from '@/lib/auth/role';
import { PanelEquipo } from '@/components/clock/PanelEquipo';
/* La hoja se importa AQUÍ y no solo en PanelEquipo: la rama de «no eres administración» usa las
   clases .ix-clock y no monta el panel, así que sin esto ese mensaje saldría sin estilos. */
import '@/components/clock/clock.css';

/* Panel de equipo. Primera pantalla del workspace donde no todo el equipo ve lo mismo.

   EL ROL SE COMPRUEBA AQUÍ Y SE EXPLICA. La RLS ya protege los datos —quien no es administración
   recibiría cero filas— pero un panel vacío parece roto y hace creer que ha fallado algo. Esto no
   protege nada que no esté ya protegido: solo convierte una lista vacía en una negativa legible. */
export const metadata: Metadata = {
  title: 'Clockr · Equipo',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EquipoPage() {
  const sb = await supabaseAuthServer();

  if (!(await isClockAdmin(sb))) {
    return (
      <div className="ix-clock">
        <main className="ixc-main">
          <p className="ixc-eyebrow">Equipo</p>
          <p style={{ marginTop: 16 }}>
            Esta pantalla es de administración. Tu jornada está en{' '}
            <Link href="/workspace/clock_r">Mi jornada</Link>.
          </p>
        </main>
      </div>
    );
  }

  return <PanelEquipo />;
}
