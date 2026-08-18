import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './lib/i18n/routing';
import { updateSession } from './lib/supabase/middleware';
import { legacyRedirect } from './lib/auth/legacyRoutes';

const intl = createMiddleware(routing);

/* Editor-only APIs that require a team session. Public APIs (/api/sign, /api/brand.json)
   are intentionally left open — the client-facing deck viewer depends on them. */
const EDITOR_API = ['/api/decks', '/api/clients', '/api/images', '/api/translate', '/api/rewrite', '/api/eval', '/api/forms'];
const isEditorApi = (p: string) => EDITOR_API.some((base) => p === base || p.startsWith(base + '/'));

/* Páginas de /workspace alcanzables sin sesión: son la propia puerta de entrada.
   `/workspace/callback` es el retorno de Google y entra aquí por obligación: llega SIN sesión —
   la está creando— así que si el gate lo tratara como una página normal lo mandaría al login y el
   `?code=` se perdería en el rebote. */
const isAuthPage = (p: string) =>
  p === '/workspace/login' || p === '/workspace/callback' ||
  p === '/workspace/forgot' || p === '/workspace/reset';

/* El visor de presentaciones es PÚBLICO y NO se ha movido a /workspace: su URL se manda a
   clientes, se firma desde ahí y ya hay enlaces circulando. Ver docs/features/urls-workspace.md. */
const isPublicViewer = (p: string) => /^\/deck\/[^/]+\/view(\/|$)/.test(p);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Rutas antiguas → nuevas, antes que cualquier otra cosa. 308 conserva el método,
  //    así que el POST de cerrar sesión sigue funcionando desde una pestaña vieja.
  const legacy = legacyRedirect(pathname);
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy;
    return NextResponse.redirect(url, 308);
  }

  // 1) Workspace: todas las herramientas internas. Salta next-intl (sin prefijo de idioma)
  //    y exige sesión de equipo salvo en las páginas de acceso.
  if (pathname === '/workspace' || pathname.startsWith('/workspace/')) {
    const { response, user } = await updateSession(request);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (isAuthPage(pathname)) return response;
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/workspace/login';
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 2) Interactius Forms: el formulario público y sus APIs. Sin locale y sin auth.
  //    El export en CSV es la excepción: refresca la sesión de equipo (el 401 lo impone
  //    requireUser() dentro del handler).
  if (pathname.startsWith('/forms')) {
    if (pathname === '/forms/api/export') {
      const { response } = await updateSession(request);
      return response;
    }
    const response = NextResponse.next();
    // Belt-and-braces noindex at the edge for the public form pages (also set via page metadata).
    if (!pathname.startsWith('/forms/api')) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  // 3) Visor público de presentaciones. Lo que queda bajo /deck es solo esto.
  if (pathname.startsWith('/deck')) {
    if (isPublicViewer(pathname)) {
      const { response } = await updateSession(request);
      return response;
    }
    // Cualquier otra cosa bajo /deck ya no existe: al workspace.
    const url = request.nextUrl.clone();
    url.pathname = '/workspace/deckmak_r';
    url.search = '';
    return NextResponse.redirect(url, 308);
  }

  // 3b) Timer: standalone public tool. Skips next-intl (the URL is /timer, with no locale
  //     prefix) and deliberately skips updateSession() too — it stores nothing, so it must
  //     not inherit the deck's hard dependency on the Supabase credentials.
  if (pathname === '/timer' || pathname.startsWith('/timer/')) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  // 4) API routes: gate the editor ones, pass the public ones straight through.
  if (pathname.startsWith('/api')) {
    if (!isEditorApi(pathname)) return NextResponse.next();
    const { response, user } = await updateSession(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return response;
  }

  // 5) Everything else (localized brand-guidelines site): next-intl, as before.
  return intl(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
