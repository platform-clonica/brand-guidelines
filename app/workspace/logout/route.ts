import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAuthServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/* POST /deck/logout — end the session and return to the login screen. */
export async function POST(req: NextRequest) {
  const sb = await supabaseAuthServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/workspace/login', req.url), { status: 303 });
}
