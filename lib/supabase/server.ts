import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { isTeamEmail } from '@/lib/auth/team';

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }
  return { url, key };
}

/* Cliente SIN sesión, con la clave anónima.

   REGLA (2026-08-17, tras endurecer la RLS). Este cliente es SOLO para las tres superficies
   genuinamente públicas, y en ellas se lee por RPC `SECURITY DEFINER`, no contra la tabla:
     · el visor de propuestas (app/deck/[id]/view) y su imagen social  → deck_public(), deck_public_signature()
     · POST /api/sign                                                  → deck_sign_target() + INSERT en signatures
     · el formulario público (/forms/f/[id]) y POST /forms/api/submit  → políticas propias de forms/responses

   Cualquier ruta bajo EDITOR_API usa `supabaseAuthServer()`. Antes esto daba igual porque las
   políticas eran `USING (true)` para `anon`; ya no: `decks`, `clients` e `images` solo son
   accesibles con sesión de equipo (supabase/migrations/20260817121000_tighten_rls.sql), así que
   usar el cliente equivocado aquí ya no es un detalle de estilo, es un 403. */
export function supabaseServer() {
  const { url, key } = env();
  return createClient(url, key, { auth: { persistSession: false } });
}

/* Cookie-aware server client (Server Components / Route Handlers) — reads and refreshes the
   user's session from cookies. Use it to authorize, NOT (for now) as the data client. */
export async function supabaseAuthServer() {
  const { url, key } = env();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component (read-only cookies): the middleware refreshes the session instead.
        }
      },
    },
  });
}

/* Convenience: the currently authenticated user, or null. */
export async function getUser(): Promise<User | null> {
  const sb = await supabaseAuthServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

/* Route Handler guard: 401 si no hay sesión de equipo, null si la hay.

   "De equipo" es sesión Y dominio. Poner el `isTeamEmail` aquí y no en cada handler es
   deliberado: los nueve que ya llaman a `requireUser()` heredan la comprobación sin tocarlos, y
   el que se escriba mañana la hereda también. */
export async function requireUser(): Promise<NextResponse | null> {
  const user = await getUser();
  if (!user || !isTeamEmail(user.email)) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return null;
}

/* Fallo de base de datos: al log del servidor, mensaje genérico al cliente.

   Antes había 21 retornos con `{ error: error.message }` que reenviaban el texto de PostgREST tal
   cual — nombres de columna, de restricción y de tipo — y ninguno de ellos dejaba rastro: en los
   18 handlers de `app/api/**` no había un solo `console.*`. O sea que el error se le contaba al
   cliente y no al equipo, que es justo al revés de lo que hace falta.

   El patrón correcto ya existía en el repo, en los endpoints públicos de forms
   (`app/forms/api/submit/route.ts:60`). Esto lo generaliza. Los mensajes de validación propios
   ("commercial_id is required") se quedan como están: son útiles y no revelan nada. */
export function dbFail(scope: string, e: { code?: string; message: string }, status = 500): NextResponse {
  console.error(`[db:${scope}]`, e.code ?? '-', e.message);
  return NextResponse.json({ error: 'No se pudo completar la operación' }, { status });
}
