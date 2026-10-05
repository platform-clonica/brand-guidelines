import { editModel, type EditModelId, type OutputSize } from './models';
import { imageSize } from './dimensions';

/* El proveedor de «Editar con IA»: Gemini, por `generateContent` y `fetch`, sin SDK. Solo servidor: usa
   GEMINI_API_KEY. Cambiar de proveedor es reescribir este fichero con la misma firma (y los nombres de
   models.ts).

   La llamada lleva su propio límite de 40 s. Netlify corta cada petición a los 60 s y, si corta él, la
   ruta no llega a devolver el intento: mejor fallar antes, a tiempo de devolverlo (plan de la fase 2, § 4).

   Sin imagen en la respuesta es un fallo del proveedor, sea cual sea el motivo: un bloqueo de seguridad
   (`IMAGE_SAFETY`, `PROHIBITED_CONTENT`…) o el `IMAGE_RECITATION` que salió en la prueba con una foto
   conocida. El intento se devuelve. */

export const EDIT_TIMEOUT_MS = 40_000;

export type EditResult = { bytes: Buffer; mime: string; width: number | null; height: number | null };

export class EditError extends Error {
  constructor(
    message: string,
    /** `blocked`: el modelo respondió sin imagen; `timeout`: pasó de 40 s; `provider`: cualquier otro fallo. */
    readonly kind: 'config' | 'blocked' | 'timeout' | 'provider',
  ) {
    super(message);
    this.name = 'EditError';
  }
}

type GeminiResponse = {
  candidates?: { finishReason?: string; content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

export async function editImage(
  source: { bytes: Buffer; mime: string },
  prompt: string,
  opts: { model: EditModelId; size: OutputSize },
): Promise<EditResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new EditError('Falta GEMINI_API_KEY en el servidor.', 'config');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EDIT_TIMEOUT_MS);
  let body: GeminiResponse | null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${editModel(opts.model).model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: source.mime, data: source.bytes.toString('base64') } }, { text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize: opts.size } },
      }),
      signal: ctrl.signal,
    });
    body = (await res.json().catch(() => null)) as GeminiResponse | null;
    if (!res.ok) throw new EditError(`Gemini ${res.status}: ${body?.error?.message ?? 'sin detalle'}`, 'provider');
  } catch (e) {
    if (e instanceof EditError) throw e;
    throw new EditError(ctrl.signal.aborted ? 'Gemini no ha respondido a tiempo.' : `Gemini: ${e instanceof Error ? e.message : String(e)}`, ctrl.signal.aborted ? 'timeout' : 'provider');
  } finally {
    clearTimeout(timer);
  }

  if (body?.promptFeedback?.blockReason) throw new EditError(`Gemini ha bloqueado la petición (${body.promptFeedback.blockReason}).`, 'blocked');
  const cand = body?.candidates?.[0];
  const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!img) throw new EditError(`Gemini no ha devuelto imagen (${cand?.finishReason ?? 'sin motivo'}).`, 'blocked');

  const bytes = Buffer.from(img.data, 'base64');
  const size = imageSize(bytes);
  return { bytes, mime: img.mimeType, width: size?.width ?? null, height: size?.height ?? null };
}
