import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './lib/i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intl = createMiddleware(routing);

/* Editor-only APIs that require a team session. Public APIs (/api/sign, /api/brand.json)
   are intentionally left open — the client-facing deck viewer depends on them. */
const EDITOR_API = ['/api/decks', '/api/clients', '/api/images', '/api/translate', '/api/eval'];
const isEditorApi = (p: string) => EDITOR_API.some((base) => p === base || p.startsWith(base + '/'));

/* Public /deck routes reachable without a session. */
const isAuthPage = (p: string) =>
  p === '/deck/login' || p === '/deck/forgot' || p === '/deck/reset';
const isPublicViewer = (p: string) => /^\/deck\/[^/]+\/view(\/|$)/.test(p);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) Interactius Forms: public pages under /forms must skip both next-intl (no locale prefix)
  //    and the deck's Supabase auth. Only the team-gated CSV export refreshes the deck session
  //    (the actual 401 is enforced by requireUser() inside the route handler).
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

  // 0b) Timer: standalone public tool. Skips next-intl (the URL is /timer, with no locale
  //     prefix) and deliberately skips updateSession() too — it stores nothing, so it must
  //     not inherit the deck's hard dependency on the Supabase credentials.
  if (pathname === '/timer' || pathname.startsWith('/timer/')) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  // 1) API routes: gate the editor ones, pass the public ones straight through.
  if (pathname.startsWith('/api')) {
    if (!isEditorApi(pathname)) return NextResponse.next();
    const { response, user } = await updateSession(request);
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    return response;
  }

  // 2) Deck Maker: require a team session, except the auth pages and the public viewer.
  if (pathname.startsWith('/deck')) {
    const { response, user } = await updateSession(request);
    if (isAuthPage(pathname) || isPublicViewer(pathname)) return response;
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/deck/login';
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 3) Everything else (localized brand-guidelines site): next-intl, as before.
  return intl(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
