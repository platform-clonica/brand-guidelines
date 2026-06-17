import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import type { ImageCreateInput } from '@/lib/decks/types';

export const dynamic = 'force-dynamic';

// GET /api/images — gallery index, newest first.
export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/images — register an image already uploaded to Storage.
export async function POST(req: Request) {
  let body: ImageCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.storage_path || !body?.url) {
    return NextResponse.json({ error: 'storage_path and url are required' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from('images')
    .insert({
      storage_path: body.storage_path,
      url: body.url,
      alt: body.alt ?? null,
      width: body.width ?? null,
      height: body.height ?? null,
      source: body.source ?? 'upload',
      prompt: body.prompt ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
