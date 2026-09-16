/* DSMak_r — esquema de las cuatro columnas JSONB de `design_systems`.

   `brand` y `overrides` son la fuente de verdad; `tokens` es el resultado del motor, guardado para
   que un sistema entregado no cambie solo; `configs` es la configuración del paso 3.
   Ver docs/features/ds-mak-r-plan.md §2. Este fichero solo DECLARA: quien valida sin lanzar es
   ./compile.ts. */

import { z } from 'zod';
import { NEUTRAL_PRESETS, type NeutralPreset } from './engine/ramp.ts';
import { SEMANTIC_KEYS, SOFT_STEPS } from './engine/semantic.ts';
import {
  DENSITY,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  type Density,
  type RadiusStyle,
  type ShadowPreset,
} from './engine/presets.ts';

const keysOf = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as [T, ...T[]];

export const hexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Tiene que ser un color hex de seis dígitos, como #1C1A17');

/* Las familias acaban en variables CSS (`--ds-<familia>-500`): nada de espacios ni mayúsculas.
   Y cinco nombres los pone el propio motor, así que no se pueden usar para un color de marca. */
export const RESERVED_FAMILIES = ['neutral', ...SEMANTIC_KEYS] as const;
export const familyKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'Solo minúsculas, números y guiones, empezando por letra');

export const STEP_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;
export const rampSchema = z.record(z.enum(STEP_KEYS), hexSchema);
export const softScaleSchema = z.record(z.enum(SOFT_STEPS), hexSchema);

const weightSchema = z.number().int().min(100).max(900).multipleOf(100);

export const modeSchema = z.enum(['light', 'dark', 'both']);

export const breakpointSchema = z.object({
  name: z.string().trim().min(1),
  min: z.number().int().min(0),
  max: z.number().int().min(0).nullable(),
});

export const gridSchema = z.object({
  name: z.string().trim().min(1),
  columns: z.number().int().min(1).max(24),
  margin: z.number().int().min(0),
  gutter: z.number().int().min(0),
});

export const brandSchema = z.object({
  name: z.string(),
  client: z.string().nullable(),
  mode: modeSchema,
  highContrast: z.boolean(),
  colors: z
    .record(familyKeySchema, hexSchema)
    .refine((c) => 'primary' in c && 'secondary' in c, 'Faltan el color primario o el secundario'),
  neutralPreset: z.enum(keysOf<NeutralPreset>(NEUTRAL_PRESETS)),
  harmonize: z.boolean(),
  fonts: z.object({ heading: z.string().trim().min(1), body: z.string().trim().min(1) }),
  weights: z.object({ display: weightSchema, heading: weightSchema, body: weightSchema }),
  baseSize: z.number().int().min(10).max(24),
  ratio: z.number().min(1).max(2),
  shadow: z.enum(keysOf<ShadowPreset>(SHADOW_PRESETS)),
  radiusStyle: z.enum(keysOf<RadiusStyle>(RADIUS_PRESETS)),
  spacingUnit: z.number().int().min(2).max(16),
  density: z.enum(keysOf<Density>(DENSITY)),
  breakpoints: z.array(breakpointSchema).min(1),
  grid: z.array(gridSchema),
});

const typeOverrideSchema = z
  .object({
    size: z.number().int().min(1),
    weight: weightSchema,
    lineHeight: z.number().int().min(1),
    letterSpacing: z.number(),
  })
  .partial();

const shadowOverrideSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    blur: z.number().min(0),
    spread: z.number(),
    color: hexSchema,
    opacity: z.number().min(0).max(1),
  })
  .partial();

/* Parche disperso sobre la salida del motor (plan, H1). Solo lo escalar: lo estructural —familias,
   breakpoints, retícula— vive en `brand`. */
export const overridesSchema = z.object({
  /** Muestra concreta por ruta: `palette.primary.500`, `semantic.error.600`, `semanticScale.info.100`. */
  swatches: z.record(z.string(), hexSchema).optional(),
  /** Rampa congelada por familia (plan, H2). Nada del motor la toca. */
  locks: z.record(familyKeySchema, rampSchema).optional(),
  /** Variación guardada de "Variar rampa" (plan, H3): reproducible al reabrir. */
  rampTweaks: z
    .record(familyKeySchema, z.object({ chromaBoost: z.number().min(0.5).max(2), hueShift: z.number().min(-45).max(45) }))
    .optional(),
  /** Color base de un semántico. La plantilla Interactius pone Burdeos en `error`. */
  semanticBase: z.partialRecord(z.enum(SEMANTIC_KEYS), hexSchema).optional(),
  typography: z.record(z.string(), typeOverrideSchema).optional(),
  spacing: z.record(z.string(), z.number().int().min(0)).optional(),
  radius: z.record(z.string(), z.number().int().min(0)).optional(),
  radiusMap: z.record(z.string(), z.string()).optional(),
  shadows: z.record(z.string(), shadowOverrideSchema).optional(),
});

export const typeTokenSchema = z.object({
  key: z.string(),
  family: z.enum(['heading', 'body']),
  size: z.number(),
  weight: z.number(),
  lineHeight: z.number(),
  letterSpacing: z.number(),
});

export const shadowTokenSchema = z.object({
  name: z.string(),
  x: z.number(),
  y: z.number(),
  blur: z.number(),
  spread: z.number(),
  color: hexSchema,
  opacity: z.number(),
});

export const tokensSchema = z.object({
  palette: z.record(familyKeySchema, rampSchema),
  semantic: z.record(z.enum(SEMANTIC_KEYS), rampSchema),
  semanticScale: z.record(z.enum(SEMANTIC_KEYS), softScaleSchema),
  typography: z.array(typeTokenSchema),
  spacing: z.array(z.object({ name: z.string(), value: z.number() })),
  radius: z.record(z.string(), z.number()),
  radiusMap: z.record(z.string(), z.string()),
  shadows: z.array(shadowTokenSchema),
  breakpoints: z.array(breakpointSchema),
  grid: z.array(gridSchema),
  fonts: z.object({ heading: z.string(), body: z.string() }),
  modes: modeSchema,
  highContrast: z.boolean(),
});

export const componentConfigSchema = z.object({
  variant: z.string().nullable(),
  intention: z.string().nullable(),
  size: z.string().nullable(),
  state: z.string().nullable(),
  anatomy: z.record(z.string(), z.union([z.string(), z.boolean()])),
  /** SOLO lo que el diseñador ha cambiado. Los valores por defecto salen de los tokens y la talla. */
  props: z.record(z.string(), z.union([z.number(), z.string()])),
  note: z.string(),
});

export const configsSchema = z.record(z.string(), componentConfigSchema);

export type Brand = z.infer<typeof brandSchema>;
export type Overrides = z.infer<typeof overridesSchema>;
export type Tokens = z.infer<typeof tokensSchema>;
export type TypeToken = z.infer<typeof typeTokenSchema>;
export type ShadowToken = z.infer<typeof shadowTokenSchema>;
export type ComponentConfig = z.infer<typeof componentConfigSchema>;
export type Configs = z.infer<typeof configsSchema>;
export type Mode = z.infer<typeof modeSchema>;
