import { z } from 'zod';
import type { StyleCriterionKey } from '../../prompts.ts';

/* La salida del análisis de una imagen: propuesta de nombre y etiquetas, si hay personas, y los seis
   criterios de estilo con su motivo.

   Va dos veces, a propósito. `ANALYSIS_JSON_SCHEMA` es lo que se manda a la API de Claude
   (structured outputs: la API impone la forma). `analysisSchema` la vuelve a validar al recibirla, y es
   el tipo con el que trabaja el resto del código. analyze.test.ts comprueba que piden lo mismo.

   El veredicto NO está en la salida: lo calcula verdictFrom() (verdict.ts). */

export const CHECK_KEYS = ['film', 'dof', 'light', 'motion', 'not_stock', 'subject'] as const satisfies readonly StyleCriterionKey[];

const check = z.boolean().nullable();
const checksSchema = z.strictObject({
  film: check,
  dof: check,
  light: check,
  motion: check,
  not_stock: check,
  subject: check,
});

export const analysisSchema = z.strictObject({
  name: z.string(),
  tags: z.array(z.string()),
  people_present: z.boolean(),
  style: z.strictObject({ reason: z.string(), checks: checksSchema }),
});
export type AnalysisOutput = z.infer<typeof analysisSchema>;

/* Lo que se guarda en la fila (`style_verdict`, `style_checks`, `style_reason`, `people_present`), tal
   como lo manda el navegador al registrar una subida. `reason` es null si no pasó evalText(). */
export const STYLE_VERDICTS = ['si', 'parcial', 'no'] as const;
export const storedStyleSchema = z.strictObject({
  verdict: z.enum(STYLE_VERDICTS),
  checks: checksSchema,
  reason: z.string().nullable(),
  people_present: z.boolean(),
});
export type StoredStyle = z.infer<typeof storedStyleSchema>;

const nullableBool = { type: ['boolean', 'null'] } as const;

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    people_present: { type: 'boolean' },
    style: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        checks: {
          type: 'object',
          properties: Object.fromEntries(CHECK_KEYS.map((k) => [k, nullableBool])) as Record<(typeof CHECK_KEYS)[number], typeof nullableBool>,
          required: [...CHECK_KEYS],
          additionalProperties: false,
        },
      },
      required: ['reason', 'checks'],
      additionalProperties: false,
    },
  },
  required: ['name', 'tags', 'people_present', 'style'],
  additionalProperties: false,
} as const;
