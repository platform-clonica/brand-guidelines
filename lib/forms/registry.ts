/* Interactius Forms — registry. Resuelve el segmento de la URL → FormDefinition.

   Ese segmento puede ser DOS cosas:
     1. El `id` opaco del frontmatter (`fk_Hjd81rX`) — desacoplado del nombre de fichero para que
        las URLs no sean enumerables (PRD §10). Es el que siempre funciona.
     2. La `slug`, si el formulario tiene una — un alias legible que el autor elige (lib/forms/slug.ts).

   El id manda: si una slug coincidiera con el id de otro formulario, gana el id. No puede pasar
   (las slugs no admiten `_` y los ids nacen con prefijo `fk_`), pero el orden se deja escrito
   porque el día que alguien afloje la gramática de la slug, esto decide sin ambigüedad.

   Server-only.

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
import { isRouteKey, looksLikeSlug } from './slug';
import { supabaseServer, supabaseAuthServer } from '@/lib/supabase/server';
import type { FormDefinition } from './schema';

const FORMS_DIR = join(process.cwd(), 'content', 'forms');

/* ── Fuente 1: la base de datos. */

type Row = { md: string; public_id: string };

async function fromDb(key: string, opts: { publishedOnly: boolean }): Promise<FormDefinition | null> {
  /* Publicados: cliente anónimo, sin sesión — la RLS de `forms` ya limita a `status = 'published'`,
     así que un borrador no es legible ni siquiera a nivel de dato.
     Con sesión de equipo (export): cliente autenticado, que sí ve los borradores. */
  const sb = opts.publishedOnly ? supabaseServer() : await supabaseAuthServer();

  /* El filtro `.or()` de PostgREST se construye concatenando texto, así que el segmento de la URL
     NO puede entrar sin comprobar: una coma o un paréntesis del visitante cambiaría la consulta.
     `isRouteKey` ya lo dejó en [A-Za-z0-9_-] antes de llegar aquí (ver getForm/getPublishedForm),
     y esto es el cinturón por si alguien llama a fromDb desde otro sitio. */
  if (!isRouteKey(key)) return null;

  const filter = looksLikeSlug(key) ? `public_id.eq.${key},slug.eq.${key}` : `public_id.eq.${key}`;

  const { data, error } = await sb
    .from('forms')
    .select('md, public_id')
    .or(filter)
    .limit(2);

  if (error || !data?.length) return null;

  // El id opaco gana sobre la slug si, contra todo pronóstico, los dos apuntaran a filas distintas.
  const rows = data as Row[];
  const row = rows.find((r) => r.public_id === key) ?? rows[0];
  return build(row.md, `forms/${key}`, opts.publishedOnly);
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

  /* El mapa se indexa por id Y por slug, que es lo que puede llegar en la URL. Dos pasadas:
     primero todos los ids, después las slugs — así una slug nunca puede tapar el id de otro
     formulario, que es el orden de precedencia declarado arriba. */
  const defs: FormDefinition[] = [];
  for (const file of files) {
    const raw = readFileSync(join(FORMS_DIR, file), 'utf8');
    const def = build(raw, file, false);
    if (!def) continue;
    if (map.has(def.id)) {
      console.warn(`[forms] id duplicado "${def.id}" en ${file} — se ignora (se mantiene el primero).`);
      continue;
    }
    map.set(def.id, def);
    defs.push(def);
  }

  for (const def of defs) {
    if (!def.slug || map.has(def.slug)) {
      if (def.slug && map.get(def.slug) !== def) {
        console.warn(`[forms] slug "${def.slug}" ya ocupada — "${def.id}" solo será accesible por su id.`);
      }
      continue;
    }
    map.set(def.slug, def);
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

/* Un formulario por id público o por slug, o null. Incluye borradores: solo para superficies con
   sesión de equipo (la exportación de respuestas). */
export async function getForm(key: string): Promise<FormDefinition | null> {
  if (!isRouteKey(key)) return null;
  return (await fromDb(key, { publishedOnly: false })) ?? fileRegistry().get(key) ?? null;
}

/* Un formulario visible públicamente, o null (borrador y desconocido son ambos null → 404). */
export async function getPublishedForm(key: string): Promise<FormDefinition | null> {
  if (!isRouteKey(key)) return null;

  const fromDatabase = await fromDb(key, { publishedOnly: true });
  if (fromDatabase) return fromDatabase;

  const def = fileRegistry().get(key);
  return def && def.status === 'published' ? def : null;
}

/* Comprueba si una slug ya está ocupada por OTRO formulario. La unicidad real la impone el índice
   único de la tabla (supabase/migrations/…_forms_slug_unique.sql); esto existe para poder
   devolver un mensaje entendible antes de chocar contra el 23505, y para cubrir también los
   formularios que viven en content/forms/*.md, que la base de datos no conoce.

   `exceptFormId` es el uuid de la fila que se está guardando: su propia slug no cuenta. */
export async function slugTaken(slug: string, exceptFormId?: string): Promise<boolean> {
  // Igual que en fromDb: nada llega al filtro `.or()` sin pasar la gramática antes.
  if (!slug || !looksLikeSlug(slug)) return false;

  for (const def of new Set(fileRegistry().values())) {
    if (def.slug === slug || def.id === slug) return true;
  }

  const sb = await supabaseAuthServer();
  let q = sb.from('forms').select('id').or(`slug.eq.${slug},public_id.eq.${slug}`).limit(1);
  if (exceptFormId) q = q.neq('id', exceptFormId);

  const { data } = await q;
  return !!data?.length;
}
