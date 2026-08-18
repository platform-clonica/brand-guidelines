import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAuthServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth/safeNext';
import { isTeamEmail } from '@/lib/auth/team';

export const dynamic = 'force-dynamic';

/* GET /workspace/callback — cierra el flujo PKCE de Google y deja la sesión puesta.

   Por qué en el servidor y no en el cliente, como hacía ResetForm. El cliente de navegador es
   `createBrowserClient` de @supabase/ssr (lib/supabase/client.ts), que guarda la sesión en COOKIES
   y no en localStorage — precisamente para que el servidor pueda leerla. Eso implica que el
   verificador PKCE también viaja en una cookie, así que el intercambio se puede hacer aquí, y
   conviene: la sesión queda escrita antes del primer render y el middleware la ve al primer
   intento, sin el rebote que tenía el flujo anterior.

   OJO con lib/supabase/server.ts:45. El `setAll` de `supabaseAuthServer()` lleva un try/catch
   porque desde un Server Component las cookies son de solo lectura. Aquí NO es el caso: un Route
   Handler sí puede escribirlas, y de hecho es lo único que hace que este endpoint sirva de algo.

   El `next` se valida con safeNext(), el mismo guard contra open-redirect que ya usaba el login
   por contraseña. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  /* En producción hay balanceador (Netlify): `req.url` puede traer el host interno, así que el
     destino se reconstruye sobre el host original cuando el proxy lo anuncia. */
  const forwardedHost = req.headers.get('x-forwarded-host');
  const origin =
    process.env.NODE_ENV === 'development' || !forwardedHost ? url.origin : `https://${forwardedHost}`;

  const fail = (reason: 'oauth' | 'dominio') =>
    NextResponse.redirect(`${origin}/workspace/login?error=${reason}`);

  // Google devuelve `error=access_denied` si la persona cancela en la pantalla de consentimiento.
  if (!code) return fail('oauth');

  const sb = await supabaseAuthServer();

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth:callback] exchange', error.message);
    return fail('oauth');
  }

  /* Tercera capa de la barrera de dominio. El hook `before-user-created` ya impide que se cree una
     cuenta de fuera, y el consent screen "Internal" impide llegar hasta aquí, pero esto cubre el
     caso que las otras dos no ven: una cuenta que YA existía antes de que se pusieran las capas.
     Hoy es exactamente el caso de info@interactius.com si algún día se cambiara de dominio. */
  const { data } = await sb.auth.getUser();
  if (!isTeamEmail(data.user?.email)) {
    console.warn('[auth:callback] fuera de dominio:', data.user?.email ?? '-');
    await sb.auth.signOut();
    return fail('dominio');
  }

  return NextResponse.redirect(`${origin}${next}`);
}
