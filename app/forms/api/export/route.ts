/* GET /forms/api/export?form_id=... — CSV export of a form's responses.
   Team-only: gated by the existing Deck Maker login (requireUser, deck Supabase session).
   Reads with the Forms service-role client (anon has no SELECT under insert-only RLS). */

import { NextResponse } from 'next/server';
import { requireUser, supabaseAuthServer } from '@/lib/supabase/server';
import { getForm } from '@/lib/forms/registry';
import { isInputField } from '@/lib/forms/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauth = await requireUser();
  if (unauth) return unauth; // 401 when there is no team session

  const formId = new URL(req.url).searchParams.get('form_id')?.trim();
  if (!formId) return NextResponse.json({ error: 'form_id requerido' }, { status: 400 });

  const def = await getForm(formId);
  if (!def) return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });

  // Read as the authenticated team member (RLS on `responses` grants SELECT to `authenticated` only).
  const sb = await supabaseAuthServer();
  const { data, error } = await sb
    .from('responses')
    .select('created_at, form_version, answers')
    .eq('form_id', formId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'No se pudo leer las respuestas' }, { status: 500 });

  // Stable columns: the form's input field names, in declared order.
  const fieldNames = def.fields.filter(isInputField).map((f) => f.name);
  const headers = ['created_at', 'form_version', ...fieldNames];

  const rows = (data ?? []).map((r) => {
    const answers = (r.answers ?? {}) as Record<string, unknown>;
    return [r.created_at, r.form_version, ...fieldNames.map((n) => cell(answers[n]))].map(csvEscape).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const filename = `${def.slug ?? def.id}-responses.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join('; ');
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  return String(v);
}

function csvEscape(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
