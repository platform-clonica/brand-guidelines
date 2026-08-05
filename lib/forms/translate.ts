/* Traducción de formularios — contrato y red de seguridad.

   Traducir un formulario NO es traducir un deck. En un formulario hay texto que es contenido
   (títulos, etiquetas, opciones) y texto que es IDENTIFICADOR:

   - `name` de cada campo es la clave con la que se guardan las respuestas en `responses.answers`,
     y con la que app/forms/api/export construye las columnas del CSV. Traducir un `name` deja
     huérfanas todas las respuestas ya recogidas.
   - `id` y `slug` son la URL pública. `type` es el discriminante del esquema Zod.
   - `status` y `accent` son enumerados: traducirlos rompe la validación.

   Por eso hay dos capas: un prompt que lo explica y un VERIFICADOR determinista que lo comprueba.
   El modelo puede equivocarse; el verificador no. Si la traducción altera un identificador, se
   rechaza entera y el documento del autor no se toca. */

import { compileForm } from './compile.ts';
import { isInputField, type FormDraft } from './schema.ts';

export const TRANSLATE_LANGS = {
  es: 'Spanish (castellano)',
  ca: 'Catalan (català)',
  en: 'English',
} as const;

export type TranslateTarget = keyof typeof TRANSLATE_LANGS;

export function isTranslateTarget(v: unknown): v is TranslateTarget {
  return typeof v === 'string' && v in TRANSLATE_LANGS;
}

export function formSystemPrompt(lang: string): string {
  return `You translate the user-visible text of a Markdown form definition to ${lang}.
The document is YAML frontmatter (between two \`---\` lines) followed by a Markdown body.
Output ONLY the translated document — no preamble, no commentary, and do not wrap it in a code fence.

Preserve the document EXACTLY otherwise: same key order, same indentation, same line breaks, same
list structure, same \`---\` delimiters. The frontmatter must remain valid YAML.

NEVER translate a YAML KEY. Every key stays verbatim in English/Spanish as written:
id, slug, title, client, status, logo, background, accent, intro_title, submit_label,
success_title, success_message, allow_multiple, fields, type, name, label, caption, required,
placeholder, options, value, min, max, min_label, max_label, min_select, max_select, rows,
maxlength, pattern, step, default, title, description, body.

NEVER translate these VALUES — copy them character for character:
- \`id:\` and \`slug:\` — they are the public URL.
- \`name:\` — THIS IS CRITICAL. It is the storage key for every answer already collected.
  Changing it orphans real data. Copy each \`name\` value exactly, including underscores and hyphens.
- \`type:\` — it is a schema discriminator (text, textarea, email, number, tel, url, radio,
  checkbox, ranking, select, boolean, scale, date, section, content).
- \`status:\` (draft/published) and \`accent:\` (opal/bordeaux/emerald) — enumerations.
- \`logo:\` and \`background:\` — URLs.
- \`required:\`, \`allow_multiple:\` — booleans. Any numeric value.
- On a long-form option \`{ value, label }\`, translate ONLY \`label\`; \`value\` is a storage key.

DO translate into ${lang}: \`title\`, \`label\`, \`caption\`, \`placeholder\`, \`intro_title\`,
\`submit_label\`, \`success_title\`, \`success_message\`, \`description\`, \`body\`, the short-form
strings inside \`options:\` lists, and the whole Markdown body after the closing \`---\`.

Keep verbatim inside translated text: URLs, e-mails, numbers, and proper nouns / brand names
(e.g. Interactius, Massimo Dutti), person names and company names. Keep Markdown syntax
(**bold**, links, lists). Keep the translation natural and professional; never add or remove
content, fields or options.

If a value needs quoting in ${lang} that did not need it before (because it now contains \`:\`),
quote it with double quotes. Never leave the YAML invalid.`;
}

/* ── El verificador. Compara el documento original con el traducido y devuelve la lista de
   identificadores que han cambiado. Vacío = la traducción es segura de aplicar. */
export type TranslationProblem = { kind: string; detail: string };

export function checkTranslation(originalMd: string, translatedMd: string): TranslationProblem[] {
  const before = compileForm(originalMd);
  const after = compileForm(translatedMd);

  if (!before.ok) return [{ kind: 'origen', detail: 'el documento original no compila' }];
  if (!after.ok) {
    const detail = after.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    return [{ kind: 'yaml', detail: `la traducción no compila — ${detail}` }];
  }

  return diffIdentity(before.def, after.def);
}

function diffIdentity(a: FormDraft, b: FormDraft): TranslationProblem[] {
  const out: TranslationProblem[] = [];
  const same = (kind: string, label: string, x: unknown, y: unknown) => {
    if (x !== y) out.push({ kind, detail: `${label}: "${String(x)}" → "${String(y)}"` });
  };

  same('id', 'id', a.id, b.id);
  same('slug', 'slug', a.slug ?? '', b.slug ?? '');
  same('status', 'status', a.status, b.status);
  same('accent', 'accent', a.accent, b.accent);
  same('logo', 'logo', a.logo ?? '', b.logo ?? '');
  same('background', 'background', a.background ?? '', b.background ?? '');

  if (a.fields.length !== b.fields.length) {
    out.push({ kind: 'campos', detail: `el número de campos cambió: ${a.fields.length} → ${b.fields.length}` });
    return out; // sin correspondencia 1:1 no tiene sentido seguir comparando
  }

  a.fields.forEach((fa, i) => {
    const fb = b.fields[i];
    same('type', `campo ${i + 1} type`, fa.type, fb.type);
    if (fa.type !== fb.type) return;

    if ('name' in fa && 'name' in fb) same('name', `campo ${i + 1} name`, fa.name, fb.name);
    if ('required' in fa && 'required' in fb) same('required', `campo ${i + 1} required`, fa.required, fb.required);

    if ('options' in fa && 'options' in fb) {
      if (fa.options.length !== fb.options.length) {
        out.push({ kind: 'opciones', detail: `campo ${i + 1}: ${fa.options.length} → ${fb.options.length} opciones` });
      } else {
        // Los valores de opción son claves de respuesta igual que los `name`.
        fa.options.forEach((oa, k) => {
          const ob = fb.options[k];
          const va = typeof oa === 'string' ? oa : oa.value;
          const vb = typeof ob === 'string' ? ob : ob.value;
          // Forma corta: el string ES a la vez valor y etiqueta, así que traducirlo es
          // legítimo y esperado. Solo se exige estabilidad en la forma larga { value, label }.
          const longForm = typeof oa !== 'string';
          if (longForm && va !== vb) {
            out.push({ kind: 'opciones', detail: `campo ${i + 1} opción ${k + 1} value: "${va}" → "${vb}"` });
          }
        });
      }
    }
  });

  return out;
}

/* Los `name` de los campos de entrada: lo que hay que poder seguir leyendo en `responses`. */
export function answerKeys(def: FormDraft): string[] {
  return def.fields.filter(isInputField).map((f) => f.name);
}
