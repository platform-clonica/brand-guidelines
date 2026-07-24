/* Interactius Forms — registry. Reads content/forms/*.md and maps the opaque `id` → FormDefinition.
   The `id` (frontmatter) is what appears in the public URL, decoupled from the readable file name/slug
   so URLs aren't enumerable (PRD §10). Server-only. */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseForm } from './parse';
import type { FormDefinition } from './schema';

const FORMS_DIR = join(process.cwd(), 'content', 'forms');

function loadAll(): Map<string, FormDefinition> {
  const map = new Map<string, FormDefinition>();
  let files: string[];
  try {
    files = readdirSync(FORMS_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    return map; // no content/forms dir yet → no forms
  }

  for (const file of files) {
    // Diseño líquido: un .md inválido se SALTA y se avisa; nunca tumba a los demás formularios.
    // El formulario roto queda ausente del registro → su URL da 404 hasta que se corrija.
    try {
      const raw = readFileSync(join(FORMS_DIR, file), 'utf8');
      const def = parseForm(raw, file);
      if (map.has(def.id)) {
        console.warn(`[forms] id duplicado "${def.id}" en ${file} — se ignora (se mantiene el primero).`);
        continue;
      }
      map.set(def.id, def);
    } catch (err) {
      console.warn(`[forms] ${(err as Error).message} — formulario ignorado.`);
    }
  }
  return map;
}

// Cache in production (content is static post-build); always re-read in dev so new/edited .md show up.
let cached: Map<string, FormDefinition> | null = null;
function registry(): Map<string, FormDefinition> {
  if (process.env.NODE_ENV === 'production') {
    cached ??= loadAll();
    return cached;
  }
  return loadAll();
}

/* A form by id, or null. Callers enforce `status: published` (drafts → 404, PRD §10). */
export function getForm(id: string): FormDefinition | null {
  return registry().get(id) ?? null;
}

/* A publicly-viewable form by id, or null (draft and unknown are both null → 404). */
export function getPublishedForm(id: string): FormDefinition | null {
  const def = getForm(id);
  return def && def.status === 'published' ? def : null;
}
