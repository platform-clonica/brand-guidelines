import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

import { evalText, type EvalResult } from '@/lib/eval';
import { buildRewriterPrompt } from '@/lib/rewriter/prompt';
import { applyLengthPolicy } from '@/lib/rewriter/lengthPolicy';
import {
  clampAxis,
  isLengthId,
  isOutputLang,
  isPresetId,
  textTypeOrDefault,
  type RewriteRequest,
  type RewriteResult,
} from '@/lib/rewriter/options';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds (presupuesto de la función en Netlify)

/* La sesión de equipo la exige middleware.ts, que tiene /api/rewrite en EDITOR_API: sin cookie
   válida, 401 antes de llegar aquí. Aun así el tope de entrada se queda — un borrador enorme
   es coste de tokens directo, y el 401 no protege de un usuario legítimo con un pegote. */
const MAX_DRAFT = 8000;
const MAX_CONTEXT = 2000;

/* Opus 5 al nivel de esfuerzo más bajo. Un correo es un texto corto con restricciones duras:
   el trabajo está en respetar la lista roja y el tono, no en razonar largo. Subir el esfuerzo
   alarga la respuesta y acerca el 504 del gateway que ya nos mordió en /api/translate con los
   decks. Si algún día hace falta más calidad, este es el primer dial. */
const MODEL = 'claude-opus-5';
const EFFORT = 'low' as const;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
    changes: { type: 'array', items: { type: 'string' } },
  },
  required: ['subject', 'body', 'changes'],
  additionalProperties: false,
};

type Payload = RewriteResult & { eval: EvalResult };

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Devuelve la petición saneada, o un mensaje de error listo para el cliente. */
function parseRequest(body: unknown): RewriteRequest | string {
  if (typeof body !== 'object' || body === null) return 'Cuerpo de la petición inválido.';
  const b = body as Record<string, unknown>;

  const draft = typeof b.draft === 'string' ? b.draft.trim() : '';
  if (!draft) return 'Falta el borrador.';
  if (draft.length > MAX_DRAFT) return `El borrador supera los ${MAX_DRAFT} caracteres.`;

  return {
    draft,
    context: typeof b.context === 'string' ? b.context.trim().slice(0, MAX_CONTEXT) : '',
    textType: textTypeOrDefault(b.textType),
    preset: isPresetId(b.preset) ? b.preset : 'cliente',
    formality: clampAxis(b.formality),
    warmth: clampAxis(b.warmth),
    lang: isOutputLang(b.lang) ? b.lang : 'auto',
    length: isLengthId(b.length) ? b.length : 'igual',
    brandVoice: b.brandVoice !== false,
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail('Falta ANTHROPIC_API_KEY en el servidor.', 500);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('Cuerpo de la petición inválido. Se espera JSON.', 400);
  }

  const input = parseRequest(raw);
  if (typeof input === 'string') return fail(input, 400);

  const client = new Anthropic({ apiKey });

  let response;
  try {
    /* Structured outputs en vez de pedir JSON por prompt y parsear a mano: el esquema lo
       impone la API, así que no hay backticks que limpiar ni respuestas a medio formatear. */
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: buildRewriterPrompt(input),
      output_config: { effort: EFFORT, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [{ role: 'user', content: input.draft }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return fail('Demasiadas peticiones seguidas. Espera unos segundos.', 429);
    }
    if (e instanceof Anthropic.APIError) {
      return fail(`Claude API: ${e.message}`, e.status ?? 502);
    }
    return fail(e instanceof Error ? e.message : 'Error al reescribir', 500);
  }

  // Los clasificadores pueden declinar: llega un 200 con content vacío, no una excepción.
  if (response.stop_reason === 'refusal') {
    return fail('El modelo ha declinado reescribir este texto.', 422);
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  let parsed: RewriteResult;
  try {
    parsed = JSON.parse(text) as RewriteResult;
  } catch {
    return fail('La respuesta del modelo no ha llegado en el formato esperado.', 502);
  }

  const payload: Payload = {
    subject: parsed.subject ?? '',
    body: parsed.body ?? '',
    changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    /* El mismo motor que /api/eval: la salida se audita contra las reglas duras en vez de
       confiar en que el modelo las haya respetado. La política de longitud evita penalizar la
       forma corta en los formatos que la piden — la misma tabla que la relajó en el prompt. */
    eval: applyLengthPolicy(evalText(parsed.body ?? ''), input.textType),
  };

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
