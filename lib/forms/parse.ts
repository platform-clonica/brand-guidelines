/* Interactius Forms — parser de servidor. Turns one .md into a typed, validated FormDefinition.
   Frontmatter (metadata + fields) es YAML; el cuerpo Markdown es la intro (PRD §8.5).

   El parseo y la validación viven en ./compile.ts (compartidos con el editor en vivo, que necesita
   correr en el navegador). Aquí solo quedan las dos cosas que son propias del servidor:
   el hash de contenido (`node:crypto`) y el contrato de "falla ruidosamente" — un .md roto en disco
   debe tumbar su formulario, no renderizarse a medias. */

import { createHash } from 'node:crypto';
import { compileForm } from './compile.ts';
import type { FormDefinition } from './schema.ts';

/* Short, stable content hash → stored as `form_version` with every response, so we always
   know which version of the questionnaire a submission answered. */
export function contentVersion(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 12);
}

/* Parse + validate a single form. Throws (with the source name) on invalid frontmatter/fields
   so a broken form fails loudly at registry time rather than rendering half-formed. */
export function parseForm(raw: string, fileName: string): FormDefinition {
  const result = compileForm(raw);

  if (!result.ok) {
    const issues = result.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    throw new Error(`Form "${fileName}" inválido — ${issues}`);
  }

  return { ...result.def, version: contentVersion(raw) };
}
