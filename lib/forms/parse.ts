/* Interactius Forms — parser. Turns one .md into a typed, validated FormDefinition.
   Frontmatter (metadata + fields) is YAML; the Markdown body is the rich intro (PRD §8.5).
   Server-only (uses node:crypto + the file contents read by lib/forms/registry.ts). */

import matter from 'gray-matter';
import { createHash } from 'node:crypto';
import { frontmatterSchema, type FormDefinition } from './schema';

/* Short, stable content hash → stored as `form_version` with every response, so we always
   know which version of the questionnaire a submission answered. */
function contentVersion(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 12);
}

/* Parse + validate a single form file. Throws (with the file name) on invalid frontmatter/fields
   so a broken form fails loudly at build/registry time rather than rendering half-formed. */
export function parseForm(raw: string, fileName: string): FormDefinition {
  const { data, content } = matter(raw);

  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Form "${fileName}" inválido — ${issues}`);
  }

  // Cross-field: input `name`s must be unique, or one answer silently overwrites another on submit.
  const names = parsed.data.fields.flatMap((f) => ('name' in f && f.name ? [f.name] : []));
  const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (dupes.length) {
    throw new Error(`Form "${fileName}" inválido — name duplicado: ${dupes.join(', ')} (cada campo necesita un name único)`);
  }

  return {
    ...parsed.data,
    intro: content.trim(),
    version: contentVersion(raw),
  };
}
