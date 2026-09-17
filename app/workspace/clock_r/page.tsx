import type { Metadata } from 'next';
import { supabaseAuthServer } from '@/lib/supabase/server';
import { currentPerson } from '@/lib/auth/role';
import { MiJornada } from '@/components/clock/MiJornada';

/* Mi jornada. El acceso lo controla middleware.ts: sin sesión de equipo —sesión Y cuenta
   @interactius.com— redirige a /workspace/login, y todo /workspace/* lleva X-Robots-Tag.
   `robots` aquí es el cinturón del tirante, igual que en las demás herramientas.

   ES UN SERVER COMPONENT Y RESUELVE LA PERSONA, y las dos cosas por el mismo motivo: el cliente no
   puede saber quién es. `/api/clock/people` devuelve una sola ficha a un miembro y todas a
   administración, así que de esa lista no se deduce cuál soy. Aquí se resuelve con la sesión y se
   pasa como prop — mismo patrón que app/workspace/page.tsx.

   De paso, el alta automática del primer acceso ocurre al cargar la página, que es donde tiene
   sentido: nadie tiene que pedir que le den de alta antes de poder fichar. */
export const metadata: Metadata = {
  title: 'Clockr',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ClockPage() {
  const sb = await supabaseAuthServer();
  const persona = await currentPerson(sb);

  return <MiJornada persona={persona} />;
}
