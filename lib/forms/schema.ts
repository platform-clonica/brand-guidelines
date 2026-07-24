/* Interactius Forms — schema (SSOT for the Markdown form format).
   Two jobs:
   1. Validate the .md frontmatter/fields → a typed `FormDefinition` (parse-time, lib/forms/parse.ts).
   2. Derive a per-form Zod validator for the SUBMIT payload → revalidated on the server
      before insert (app/forms/api/submit/route.ts). Never trust the client.

   Field spec mirrors the PRD §8.3. `section`/`content` are presentational (no input, not collected).
   Written for Zod v4. */

import { z } from 'zod';

/* ── Accents: only the three brand accents are selectable per form.
   Lowercase keys map to the CSS vars --c-{accent} in app/globals.css (verified against lib/tokens.ts,
   whose canonical order is Opal → Bordeaux → Emerald). */
export const ACCENTS = ['opal', 'bordeaux', 'emerald'] as const;
export type Accent = (typeof ACCENTS)[number];

/* ── Option (radio/checkbox/select). Short form ("Sí") or long form ({ value, label }). */
const optionSchema = z.union([
  z.string(),
  z.object({ value: z.string(), label: z.string() }),
]);
export type FieldOption = z.infer<typeof optionSchema>;

export function optionValue(o: FieldOption): string {
  return typeof o === 'string' ? o : o.value;
}
export function optionLabel(o: FieldOption): string {
  return typeof o === 'string' ? o : o.label;
}

/* ── Common input props (PRD §8.2). */
const inputBase = {
  name: z.string().min(1).regex(/^[A-Za-z0-9_-]+$/, 'name: sólo letras, números, _ y - (sin espacios)'),
  label: z.string().min(1),
  caption: z.string().optional(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
};

/* ── The 14 field types (PRD §8.3). Discriminated by `type`. */
export const fieldSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), ...inputBase, maxlength: z.number().int().positive().optional(), pattern: z.string().optional(), default: z.string().optional() }),
  z.object({ type: z.literal('email'), ...inputBase, default: z.string().optional() }),
  z.object({ type: z.literal('number'), ...inputBase, min: z.number().optional(), max: z.number().optional(), step: z.number().optional(), default: z.number().optional() }),
  z.object({ type: z.literal('tel'), ...inputBase, pattern: z.string().optional(), default: z.string().optional() }),
  z.object({ type: z.literal('url'), ...inputBase, default: z.string().optional() }),
  z.object({ type: z.literal('textarea'), ...inputBase, rows: z.number().int().positive().optional(), maxlength: z.number().int().positive().optional(), default: z.string().optional() }),
  z.object({ type: z.literal('radio'), ...inputBase, options: z.array(optionSchema).min(1), default: z.string().optional() }),
  z.object({ type: z.literal('checkbox'), ...inputBase, options: z.array(optionSchema).min(1), min_select: z.number().int().nonnegative().optional(), max_select: z.number().int().positive().optional(), default: z.array(z.string()).optional() }),
  z.object({ type: z.literal('ranking'), ...inputBase, options: z.array(optionSchema).min(2), default: z.array(z.string()).optional() }),
  z.object({ type: z.literal('select'), ...inputBase, options: z.array(optionSchema).min(1), default: z.string().optional() }),
  z.object({ type: z.literal('boolean'), ...inputBase, default: z.boolean().optional() }),
  z.object({ type: z.literal('scale'), ...inputBase, min: z.number().int(), max: z.number().int(), min_label: z.string().optional(), max_label: z.string().optional(), default: z.number().optional() }),
  z.object({ type: z.literal('date'), ...inputBase, min: z.string().optional(), max: z.string().optional(), default: z.string().optional() }),
  // Presentational blocks — no input, not collected.
  z.object({ type: z.literal('section'), title: z.string().min(1), description: z.string().optional() }),
  z.object({ type: z.literal('content'), body: z.string().min(1) }),
]);

export type Field = z.infer<typeof fieldSchema>;
export type InputField = Exclude<Field, { type: 'section' } | { type: 'content' }>;

const INPUT_TYPES = ['text', 'email', 'number', 'tel', 'url', 'textarea', 'radio', 'checkbox', 'ranking', 'select', 'boolean', 'scale', 'date'] as const;
export function isInputField(f: Field): f is InputField {
  return (INPUT_TYPES as readonly string[]).includes(f.type);
}

/* ── Frontmatter (form level, PRD §8.1). `intro` is the Markdown body of the .md (filled by the parser). */
export const frontmatterSchema = z.object({
  id: z.string().min(1),
  slug: z.string().optional(),
  title: z.string().min(1),
  client: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  logo: z.string().optional(),
  background: z.string().optional(),
  accent: z.enum(ACCENTS).default('bordeaux'),
  intro_title: z.string().optional(),
  submit_label: z.string().default('Enviar'),
  success_title: z.string().default('Gracias'),
  success_message: z.string().default('Hemos recibido tus respuestas.'),
  allow_multiple: z.boolean().default(true),
  fields: z.array(fieldSchema).min(1),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/* A fully-parsed form: frontmatter + the Markdown intro body + a content hash (form_version). */
export type FormDefinition = Frontmatter & {
  intro: string;         // raw Markdown from the .md body (rendered as intro)
  version: string;       // short content hash — stored as `form_version` with each response
};

/* ── Coerce a raw `answers` object to typed values and drop empties → undefined (omitted).
   Shared by the client (before validating/sending) and the server (before validating/inserting),
   so an empty optional field never trips a type check and required-emptiness is detected uniformly.
   Returns only the meaningful keys. */
export function normalizeAnswers(def: FormDefinition, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (!isInputField(f)) continue;
    const v = normalizeValue(f, raw[f.name]);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

function normalizeValue(f: InputField, v: unknown): unknown {
  switch (f.type) {
    case 'checkbox': {
      if (!Array.isArray(v)) return undefined;
      const arr = v.filter((x): x is string => typeof x === 'string');
      return arr.length ? arr : undefined;
    }
    case 'ranking': {
      // Always return a FULL permutation of the option values: keep the submitted order for known
      // values (deduped), then append any missing ones in declared order. Tamper-proof.
      const all = f.options.map(optionValue);
      const ordered: string[] = [];
      if (Array.isArray(v)) {
        for (const x of v) if (typeof x === 'string' && all.includes(x) && !ordered.includes(x)) ordered.push(x);
      }
      for (const x of all) if (!ordered.includes(x)) ordered.push(x);
      return ordered;
    }
    case 'boolean':
      return typeof v === 'boolean' ? v : undefined;
    case 'number':
    case 'scale': {
      if (v === '' || v === null || v === undefined) return undefined;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isNaN(n) ? undefined : n;
    }
    default: {
      // All string-valued fields (text, email, tel, url, textarea, radio, select, date).
      if (typeof v !== 'string') return undefined;
      return v.trim() === '' ? undefined : v;
    }
  }
}

/* ── Zod object for TYPE/CONSTRAINT checks only (every field optional — presence is handled
   separately in validateAnswers). Unknown keys need no strict(): normalizeAnswers already drops
   anything not in the field list before this runs. */
function buildTypeSchema(def: FormDefinition): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields) {
    if (!isInputField(f)) continue;
    shape[f.name] = fieldValueSchema(f); // already optional
  }
  return z.object(shape) as z.ZodType<Record<string, unknown>>;
}

/* A required field is "missing" when normalization left it out/empty (consent boolean must be true). */
function isMissing(f: InputField, v: unknown): boolean {
  if (f.type === 'boolean') return v !== true;
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

export type AnswersResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/* ── Validate the SUBMIT payload (PRD §8.4). Presence (required) + type/constraint, in that order.
   Single source of truth: called by both the client (FormRenderer) and the server (submit route).
   Pass ALREADY-normalized answers (normalizeAnswers). */
export function validateAnswers(def: FormDefinition, normalized: Record<string, unknown>): AnswersResult {
  const errors: Record<string, string> = {};

  // 1) Required presence.
  for (const f of def.fields) {
    if (!isInputField(f) || !f.required) continue;
    if (isMissing(f, normalized[f.name])) errors[f.name] = 'obligatorio';
  }

  // 2) Type/constraint on present values.
  const res = buildTypeSchema(def).safeParse(normalized);
  if (!res.success) {
    for (const issue of res.error.issues) {
      const key = String(issue.path[0] ?? '_');
      errors[key] ??= issue.message;
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: (res.success ? res.data : normalized) as Record<string, unknown> };
}

function fieldValueSchema(f: InputField): z.ZodTypeAny {
  switch (f.type) {
    case 'text':
    case 'tel': {
      let s = z.string();
      if ('maxlength' in f && f.maxlength) s = s.max(f.maxlength);
      if ('pattern' in f && f.pattern) s = s.regex(new RegExp(f.pattern));
      return s.optional();
    }
    case 'textarea': {
      let s = z.string();
      if (f.maxlength) s = s.max(f.maxlength);
      return s.optional();
    }
    case 'email':
      return z.string().email().optional();
    case 'url':
      return z.string().url().optional();
    case 'number': {
      let s = z.number();
      if (f.min !== undefined) s = s.min(f.min);
      if (f.max !== undefined) s = s.max(f.max);
      return s.optional();
    }
    case 'scale': {
      return z.number().int().min(f.min).max(f.max).optional();
    }
    case 'date':
      // ISO date (YYYY-MM-DD); range bounds are enforced client-side, revalidated loosely here.
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
    case 'boolean':
      return z.boolean().optional();
    case 'radio':
    case 'select': {
      const values = f.options.map(optionValue);
      return z.enum(values as [string, ...string[]]).optional();
    }
    case 'checkbox': {
      const values = new Set(f.options.map(optionValue));
      let s = z.array(z.string().refine((v) => values.has(v), 'valor fuera de opciones'));
      if (f.min_select !== undefined) s = s.min(f.min_select);
      if (f.max_select !== undefined) s = s.max(f.max_select);
      return s.optional();
    }
    case 'ranking':
      // normalizeValue already guarantees a full, valid permutation.
      return z.array(z.string()).optional();
  }
}
