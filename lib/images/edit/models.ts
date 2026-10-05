/* Los modelos de «Editar con IA». Decisión de Carlos (3 de octubre de 2026), tras la prueba del plan
   (docs/features/img-r-fase-2-plan.md, § 1): Nano Banana 2 por defecto y Pro a elección de quien edita.

   Este fichero y adapter.ts son lo que se toca para cambiar de modelo o de proveedor. Este no lleva la clave
   ni llama a nadie: lo lee también el navegador, para los nombres del selector. La fila guarda el `id`
   (`edit_model`), no el nombre del modelo de Google: el id es estable aunque cambie el modelo de detrás.

   El tamaño pedido sale de la foto. Nano Banana 2 pide 2K hasta 2048 px de lado y 4K por encima: pedir 4K
   para una ligera de 1600 px sería ampliarla. Pro pide siempre 2K: en 4K tardó 45 s en la prueba, y Netlify
   corta cada petición a los 60. */

export type EditModelId = 'fast' | 'pro';
export type OutputSize = '2K' | '4K';

export const EDIT_MODELS = [
  { id: 'fast', label: 'Nano Banana 2', model: 'gemini-3.1-flash-image', maxSize: '4K' },
  { id: 'pro', label: 'Nano Banana Pro', model: 'gemini-3-pro-image', maxSize: '2K' },
] as const satisfies readonly { id: EditModelId; label: string; model: string; maxSize: OutputSize }[];

export const DEFAULT_EDIT_MODEL: EditModelId = 'fast';

export function editModel(id: unknown) {
  return EDIT_MODELS.find((m) => m.id === id) ?? EDIT_MODELS[0];
}

const TWO_K_EDGE = 2048;

export function outputSize(id: EditModelId, longEdge: number): OutputSize {
  return editModel(id).maxSize === '4K' && longEdge > TWO_K_EDGE ? '4K' : '2K';
}
