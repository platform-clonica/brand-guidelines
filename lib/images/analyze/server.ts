import Anthropic from '@anthropic-ai/sdk';
import { buildAnalysisPrompt } from './prompt';
import { finishAnalysis, type AnalysisResult } from './result';
import { ANALYSIS_JSON_SCHEMA, analysisSchema, type AnalysisOutput } from './schema';

/* La llamada a Claude del análisis de una imagen. Solo servidor: usa ANTHROPIC_API_KEY.

   Opus 5 al esfuerzo más bajo y con structured outputs, como /api/rewrite: la API impone la forma y el
   esquema Zod la vuelve a validar. Si el motivo no pasa evalText(), se pide otra vez el análisis entero,
   una sola, y solo si queda tiempo: Netlify corta cada petición a los 60 s (plan de la fase 2, § 4). */

const MODEL = 'claude-opus-5';
const EFFORT = 'low' as const;
/* Cada llamada tarda unos 5 s (prueba del plan). El tope deja sitio para el reintento dentro de los 60 s. */
const CALL_TIMEOUT_MS = 25_000;
const RETRY_BEFORE_MS = 20_000;

export const ANALYSIS_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AnalysisImage = { data: string; mediaType: (typeof ANALYSIS_TYPES)[number] };

/* Un fallo con su código HTTP y un mensaje que la interfaz puede enseñar. */
export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

async function callOnce(client: Anthropic, system: string, image: AnalysisImage): Promise<AnalysisOutput> {
  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system,
      output_config: { effort: EFFORT, format: { type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: 'Analiza esta foto.' },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AnalysisError('Demasiadas peticiones seguidas. Espera unos segundos.', 429);
    if (e instanceof Anthropic.APIError) throw new AnalysisError(`Claude API: ${e.message}`, 502);
    throw new AnalysisError(e instanceof Error ? e.message : 'Error al analizar la imagen.', 502);
  }

  // Los clasificadores pueden declinar: llega un 200 con el contenido vacío, no una excepción.
  if (response.stop_reason === 'refusal') throw new AnalysisError('El modelo ha declinado analizar esta imagen.', 422);

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AnalysisError('La respuesta del modelo no ha llegado en el formato esperado.', 502);
  }
  const out = analysisSchema.safeParse(parsed);
  if (!out.success) throw new AnalysisError('La respuesta del modelo no ha llegado en el formato esperado.', 502);
  return out.data;
}

export async function analyzeImage(image: AnalysisImage, existingTags: readonly string[]): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnalysisError('Falta ANTHROPIC_API_KEY en el servidor.', 500);

  const client = new Anthropic({ apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 0 });
  const system = buildAnalysisPrompt(existingTags);
  const started = Date.now();

  const first = finishAnalysis(await callOnce(client, system, image));
  if (!first.reasonFailed || Date.now() - started > RETRY_BEFORE_MS) return first.result;

  try {
    const second = finishAnalysis(await callOnce(client, system, image));
    return second.reasonFailed ? first.result : second.result;
  } catch {
    // El reintento es solo por el motivo: si falla, vale el primer análisis, sin motivo.
    return first.result;
  }
}
