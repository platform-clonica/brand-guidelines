import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth/sessionUser';
import { SocialStudio } from '@/components/social/SocialStudio';

export const metadata: Metadata = {
  title: 'Social Maker · Interactius',
  robots: { index: false, follow: false },
};

/* El editor sin pieza detrás: se escribe y se exporta, pero no se guarda.
   ─────────────────────────────────────────────────────────────────────────
   Existe como salida de emergencia. La lanzadera necesita la base de datos
   para listar, así que si Supabase no responde (o la tabla todavía no está
   aplicada) la herramienta entera quedaría inaccesible por no poder hacer
   una cosa que el editor ni siquiera necesita: escribir, previsualizar y
   exportar a PNG funcionan sin persistencia.

   Sin `postId`, `useAutosave` queda desactivado por su propia guarda, así
   que esto no es un modo aparte con reglas propias: es el mismo editor al
   que no se le ha dado dónde guardar. */
export default async function SocialBorradorPage() {
  const user = await getSessionUser();
  return <SocialStudio user={user} />;
}
