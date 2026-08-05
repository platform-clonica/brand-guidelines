/* FormMaker — ediciones quirúrgicas sobre el texto del formulario.

   Todo lo de aquí opera sobre LÍNEAS, nunca reserializando el YAML. Es deliberado: cargar el
   frontmatter con js-yaml y volcarlo de nuevo reordenaría claves, se comería los comentarios y
   reformatearía cadenas que el autor escribió a mano. El `md` es del autor; nosotros solo tocamos
   la línea concreta que toca.

   Sin dependencias de Node: corre en el navegador. */

type Range = { lines: string[]; start: number; end: number; eol: string };

/* Frontmatter delimitado por líneas: [start, end) son las líneas de YAML. null si no hay. */
function frontmatterRange(raw: string): Range | null {
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) return null;
  return { lines, start: 1, end, eol };
}

/* ── Cambia (o añade) una clave de primer nivel del frontmatter.
   Se usa para publicar/despublicar sin tocar nada más del documento. */
export function setFrontmatterValue(raw: string, key: string, value: string): string {
  const fm = frontmatterRange(raw);
  if (!fm) return raw;

  const { lines, start, end, eol } = fm;
  const re = new RegExp(`^${escapeRe(key)}\\s*:`);

  for (let i = start; i < end; i++) {
    if (re.test(lines[i])) {
      lines[i] = `${key}: ${value}`;
      return lines.join(eol);
    }
  }

  // No estaba: se inserta justo después de `title:` si existe, o al principio del frontmatter.
  const titleAt = lines.findIndex((l, i) => i >= start && i < end && /^title\s*:/.test(l));
  const at = titleAt === -1 ? start : titleAt + 1;
  lines.splice(at, 0, `${key}: ${value}`);
  return lines.join(eol);
}

/* ── Lee una clave de primer nivel sin compilar el documento entero.
   Útil cuando el formulario no compila pero aún queremos saber si está publicado. */
export function getFrontmatterValue(raw: string, key: string): string | null {
  const fm = frontmatterRange(raw);
  if (!fm) return null;
  const re = new RegExp(`^${escapeRe(key)}\\s*:\\s*(.*)$`);
  for (let i = fm.start; i < fm.end; i++) {
    const m = fm.lines[i].match(re);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

/* ── Añade un campo al final de la lista `fields`.
   Devuelve también el rango del texto insertado, para que el editor lleve el cursor allí:
   añadir un campo a ciegas al final de un documento largo es invisible. */
export type Insertion = { md: string; selectionStart: number; selectionEnd: number };

export function appendField(raw: string, snippet: string): Insertion {
  const fm = frontmatterRange(raw);
  if (!fm) return { md: raw, selectionStart: raw.length, selectionEnd: raw.length };

  const { lines, start, end, eol } = fm;
  const snippetLines = snippet.split('\n');

  const fieldsAt = lines.findIndex((l, i) => i >= start && i < end && /^fields\s*:/.test(l));

  // Sin `fields:` todavía: se crea la clave justo antes del cierre del frontmatter.
  if (fieldsAt === -1) {
    const at = end;
    lines.splice(at, 0, 'fields:', ...snippetLines);
    return withSelection(lines, eol, at + 1, snippetLines.length);
  }

  // Final de la lista: la primera línea no vacía que vuelve al nivel raíz, o el cierre.
  let insertAt = end;
  for (let i = fieldsAt + 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      insertAt = i;
      break;
    }
  }
  // No arrastrar las líneas en blanco que hubiera al final de la lista.
  while (insertAt > fieldsAt + 1 && !lines[insertAt - 1].trim()) insertAt--;

  lines.splice(insertAt, 0, ...snippetLines);
  return withSelection(lines, eol, insertAt, snippetLines.length);
}

/* ── Borra una clave de primer nivel del frontmatter.
   Se usa cuando se vacía un campo opcional (p. ej. el cliente): dejar `client: ""` colando
   es más sucio que no tener la clave. */
export function removeFrontmatterKey(raw: string, key: string): string {
  const fm = frontmatterRange(raw);
  if (!fm) return raw;

  const { lines, start, end, eol } = fm;
  const re = new RegExp(`^${escapeRe(key)}\\s*:`);
  const at = lines.findIndex((l, i) => i >= start && i < end && re.test(l));
  if (at === -1) return raw;

  // Arrastra las líneas de continuación de un valor multilínea (`clave: |`).
  let last = at;
  while (last + 1 < end && /^\s+\S/.test(lines[last + 1])) last++;

  lines.splice(at, last - at + 1);
  return lines.join(eol);
}

/* ── Aplica los metadatos editados en el modal del editor.
   Solo toca las claves que el modal gobierna; el resto del documento no se mueve.
   Las etiquetas NO van aquí: viven en la columna `tags` de la tabla, no en el markdown. */
export function applyMeta(
  raw: string,
  meta: { title: string; client?: string; accent?: string },
): string {
  let md = setFrontmatterValue(raw, 'title', yamlString(meta.title));
  if (meta.accent) md = setFrontmatterValue(md, 'accent', meta.accent);
  md = meta.client?.trim()
    ? setFrontmatterValue(md, 'client', yamlString(meta.client.trim()))
    : removeFrontmatterKey(md, 'client');
  return md;
}

/* ── Markdown de una copia.
   Se parte del documento original y solo se reescriben las claves que DEBEN cambiar; el resto
   (campos, intro, imágenes, textos de éxito) se hereda tal cual, que es justo el sentido de duplicar.

   Dos reglas no negociables:
   - `id` nuevo, porque es único en la tabla y porque las respuestas se agrupan por él.
   - `status: draft`, porque publicar una copia sin querer es un error caro. */
export function duplicateMd(
  source: string,
  opts: { publicId: string; title: string; client?: string; accent?: string },
): string {
  let md = setFrontmatterValue(source, 'id', opts.publicId);
  md = setFrontmatterValue(md, 'title', yamlString(opts.title));
  md = setFrontmatterValue(md, 'status', 'draft');
  if (opts.accent) md = setFrontmatterValue(md, 'accent', opts.accent);
  if (opts.client) md = setFrontmatterValue(md, 'client', yamlString(opts.client));
  return md;
}

/* ── Comilla un valor escalar solo cuando el YAML lo necesita.
   Única copia de la regla: la usan la plantilla, el duplicado, el modal de metadatos y el
   selector de imagen. Tenerla en dos sitios era pedir que divergieran.

   `https://…` se deja sin comillas a propósito: `://` es un escalar plano válido (el problema
   sería `: ` con espacio) y así el frontmatter se lee como el que ya hay escrito a mano. */
export function yamlString(s: string): string {
  if (/^https?:\/\/\S+$/.test(s)) return s;
  return /[:#\-?[\]{}&*!|>'"%@`,]|^\s|\s$/.test(s) ? JSON.stringify(s) : s;
}

/* Offsets de carácter del bloque recién insertado, a partir de su rango de líneas. */
function withSelection(lines: string[], eol: string, from: number, count: number): Insertion {
  const md = lines.join(eol);
  const before = lines.slice(0, from).join(eol);
  const selectionStart = from === 0 ? 0 : before.length + eol.length;
  const inserted = lines.slice(from, from + count).join(eol);
  return { md, selectionStart, selectionEnd: selectionStart + inserted.length };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
