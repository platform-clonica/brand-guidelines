import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAuthServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/auth/safeNext';
import { isTeamEmail } from '@/lib/auth/team';

export const dynamic = 'force-dynamic';

/* GET /workspace/callback — cierra el flujo PKCE de Google y deja la sesión puesta.

   Por qué en el servidor. El cliente de navegador es
   `createBrowserClient` de @supabase/ssr (lib/supabase/client.ts), que guarda la sesión en COOKIES
   y no en localStorage — precisamente para que el servidor pueda leerla. Eso implica que el
   verificador PKCE también viaja en una cookie, así que el intercambio se puede hacer aquí, y
   conviene: la sesión queda escrita antes del primer render y el middleware la ve al primer
   intento. El flujo de recuperación que había antes hacía el intercambio en el navegador y por eso
   necesitaba un estado de "comprobando" y un rebote; aquí no hace falta ninguno de los dos.

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

  const fail = (reason: 'oauth' | 'dominio' | 'altas') =>
    NextResponse.redirect(`${origin}/workspace/login?error=${reason}`);

  /* Traduce el motivo real a uno de nuestros tres slugs, y lo DEJA EN EL LOG.

     Esto no estaba y costó un diagnóstico: cuando Supabase rechaza el intercambio, redirige aquí
     sin `code` y con el motivo en `error_description`. La primera versión veía "no hay code" y
     devolvía un genérico, así que dos causas muy distintas —el registro desactivado y el hook
     rechazando un dominio— llegaban al usuario como la misma frase inútil. El motivo real estaba
     solo en los logs de Supabase, que no es donde mira quien no puede entrar. */
  const clasificar = (detalle: string): 'oauth' | 'dominio' | 'altas' => {
    const d = detalle.toLowerCase();
    if (d.includes('signups not allowed') || d.includes('signup_disabled')) return 'altas';
    if (d.includes('interactius')) return 'dominio'; // el mensaje del hook de dominio
    return 'oauth';
  };

  /* Supabase devuelve el fallo como parámetros de query, no como excepción. También llega por
     aquí el `access_denied` de quien cancela en la pantalla de consentimiento de Google. */
  const provErr = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (provErr) {
    console.error('[auth:callback] proveedor:', provErr);
    return fail(clasificar(provErr));
  }

  if (!code) {
    console.error('[auth:callback] sin code y sin error: petición incompleta');
    return fail('oauth');
  }

  const sb = await supabaseAuthServer();

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth:callback] exchange:', error.message);
    return fail(clasificar(error.message));
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
