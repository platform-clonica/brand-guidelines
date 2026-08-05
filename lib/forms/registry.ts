/* Interactius Forms — registry. Resuelve el `id` opaco de la URL → FormDefinition.
   El `id` (frontmatter) es lo que aparece en la URL pública, desacoplado del nombre de fichero
   legible para que las URLs no sean enumerables (PRD §10). Server-only.

   Dos fuentes, en este orden:
     1. La tabla `forms` (FormMaker) — donde vive todo lo que se crea desde la app.
     2. content/forms/*.md — los formularios que se escribieron a mano antes de que existiera el
        maker. Siguen sirviéndose sin tocarlos; no hay migración forzosa.

   Si un id existe en las dos, gana la base de datos.

   Diseño líquido, igual que antes: un formulario que no compila se SALTA con un aviso; nunca
   tumba la página ni a los demás formularios. Su URL da 404 hasta que se corrija. */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileForm } from './compile';
import { contentVersion } from './parse';
import { supabaseServer, supabaseAuthServer } from '@/lib/supabase/server';
import type { FormDefinition } from './schema';

const FORMS_DIR = join(process.cwd(), 'content', 'forms');

/* ── Fuente 1: la base de datos. */

type Row = { md: string };

async function fromDb(id: string, opts: { publishedOnly: boolean }): Promise<FormDefinition | null> {
  /* Publicados: cliente anónimo, sin sesión — la RLS de `forms` ya limita a `status = 'published'`,
     así que un borrador no es legible ni siquiera a nivel de dato.
     Con sesión de equipo (export): cliente autenticado, que sí ve los borradores. */
  const sb = opts.publishedOnly ? supabaseServer() : await supabaseAuthServer();

  const { data, error } = await sb
    .from('forms')
    .select('md')
    .eq('public_id', id)
    .limit(1)
    .maybeSingle<Row>();

  if (error || !data) return null;
  return build(data.md, `forms/${id}`, opts.publishedOnly);
}

/* ── Fuente 2: los ficheros del repo. */

function loadAll(): Map<string, FormDefinition> {
  const map = new Map<string, FormDefinition>();
  let files: string[];
  try {
    files = readdirSync(FORMS_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    return map; // no content/forms dir yet → no forms
  }

  for (const file of files) {
    const raw = readFileSync(join(FORMS_DIR, file), 'utf8');
    const def = build(raw, file, false);
    if (!def) continue;
    if (map.has(def.id)) {
      console.warn(`[forms] id duplicado "${def.id}" en ${file} — se ignora (se mantiene el primero).`);
      continue;
    }
    map.set(def.id, def);
  }
  return map;
}

// Cache in production (content is static post-build); always re-read in dev so new/edited .md show up.
let cached: Map<string, FormDefinition> | null = null;
function fileRegistry(): Map<string, FormDefinition> {
  if (process.env.NODE_ENV === 'production') {
    cached ??= loadAll();
    return cached;
  }
  return loadAll();
}

/* ── Compilación común a las dos fuentes. Nunca lanza. */
function build(raw: string, source: string, publishedOnly: boolean): FormDefinition | null {
  const res = compileForm(raw);
  if (!res.ok) {
    const detail = res.issues.map((i) => `${i.path}: ${i.message}`).join('; ');
    console.warn(`[forms] "${source}" inválido — ${detail} — formulario ignorado.`);
    return null;
  }
  // El `md` manda sobre la columna espejo: si están desincronizados, gana lo que dice el documento.
  if (publishedOnly && res.def.status !== 'published') return null;
  return { ...res.def, version: contentVersion(raw) };
}

/* ── API pública del registry. */

/* Un formulario por id, o null. Incluye borradores: solo para superficies con sesión de equipo
   (la exportación de respuestas). */
export async function getForm(id: string): Promise<FormDefinition | null> {
  return (await fromDb(id, { publishedOnly: false })) ?? fileRegistry().get(id) ?? null;
}

/* Un formulario visible públicamente, o null (borrador y desconocido son ambos null → 404). */
export async function getPublishedForm(id: string): Promise<FormDefinition | null> {
  const fromDatabase = await fromDb(id, { publishedOnly: true });
  if (fromDatabase) return fromDatabase;

  const def = fileRegistry().get(id);
  return def && def.status === 'published' ? def : null;
}
