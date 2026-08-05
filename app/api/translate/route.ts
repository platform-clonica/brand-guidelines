import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { formSystemPrompt } from '@/lib/forms/translate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds (Netlify function budget for the translation call)

const LANGS: Record<string, string> = {
  es: 'Spanish (castellano)',
  ca: 'Catalan (català)',
  en: 'English',
};

function systemPrompt(lang: string): string {
  return `You translate the user-visible text of a Markdown slide deck to ${lang}.
Output ONLY the translated Markdown — no preamble, no commentary, and do not wrap the whole document in a code fence.

Preserve the document EXACTLY otherwise:
- Keep every line break, blank line and the \`---\` slide separators.
- Keep all Markdown syntax: #, ##, ###, "- " lists, "> " quotes, **bold**, and fenced \`\`\` blocks.
- NEVER translate or alter a line that starts with \`[ly:\` — copy it verbatim (it is a layout marker).
- Keep verbatim: URLs, e-mails, file paths, numbers, currency amounts, and proper nouns / brand names (e.g. Interactius), person names, company names, tax IDs and postal addresses.

Structural keys — keep the key (the word before the first ":") EXACTLY as written; it identifies a slide field and must not be translated:
- On a \`> cliente: …\` line, keep the whole line verbatim (the key \`cliente\` and the client name).
- On a gantt line, keep the word \`hitos\` verbatim; you MAY translate the label that follows it (e.g. \`hitos cliente:\` → \`hitos client:\`).
- On the acceptance page, keep these keys verbatim: \`nombre:\`, \`cargo:\`, \`empresa:\`, \`nif:\`, \`direccion:\`, \`aviso:\`, \`cta:\`. Translate ONLY the text after the colon — and even then keep proper nouns verbatim: do NOT translate the values of \`nombre\`, \`empresa\`, \`nif\`, \`direccion\` (names/identifiers); DO translate the values of \`cargo\`, \`aviso\`, \`cta\`.

Translate everything else into ${lang}: titles (#, ##, ### — including \`## Presupuesto\` and \`### Condiciones\`), eyebrows (UPPERCASE lines such as CONTEXTO / EL RETO), paragraphs, list items, gantt phase-row labels (the word before ":" on a phase line, keeping the numeric range), and the unit word on a gantt axis line (e.g. \`semanas:\` → its ${lang} equivalent). In a manifesto title, the \` / palabra / \` slash-emphasis stays — keep the two slashes and translate only the word between them. Keep the translation natural and professional; never add or remove content.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY en el servidor' }, { status: 500 });
  }

  let body: { md?: string; target?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const md = body.md ?? '';
  const lang = LANGS[body.target ?? ''];
  if (!md.trim()) return NextResponse.json({ error: 'md vacío' }, { status: 400 });
  if (!lang) return NextResponse.json({ error: 'target inválido (es|ca|en)' }, { status: 400 });

  /* Dos documentos muy distintos comparten esta ruta porque lo caro y lo delicado es el
     streaming (mantiene viva la función de Netlify y evita el 504), no el prompt.
     Un formulario NO puede traducirse con el prompt de un deck: tiene identificadores
     (`name`, `type`, `id`) que son claves de datos. Ver lib/forms/translate.ts. */
  const kind = body.kind === 'form' ? 'form' : 'deck';
  const system = kind === 'form' ? formSystemPrompt(lang) : systemPrompt(lang);

  const client = new Anthropic({ apiKey });

  // Stream the translation as plain-text deltas. Streaming keeps the serverless function
  // actively responding (first bytes arrive in ~1–2s), which avoids the Netlify gateway
  // timing out the whole request with a 504 on long translations of full decks.
  try {
    // Errors before the first byte (auth/validation/connection) surface here → real status code.
    const stream = await client.messages.create({
      // Haiku 4.5: fast enough to keep even the largest decks under the Netlify function
      // timeout (~20s worst case) while streaming; quality is strong for structure-preserving
      // translation. Opus was too slow for large decks and triggered 504s.
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: md }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (e) {
          // Mid-stream failure: bytes may already be sent, so the status can't change.
          // Abort the stream; the client treats an empty/partial result as an error.
          controller.error(e);
        }
      },
    });

    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no', // hint proxies not to buffer the stream
      },
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Claude API: ${e.message}` }, { status: e.status ?? 502 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de traducción' }, { status: 500 });
  }
}
