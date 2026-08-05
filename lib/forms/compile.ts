/* Interactius Forms — compilador tolerante, seguro en navegador.

   Es el equivalente de `compileDeck` para formularios: convierte el texto del editor en una
   definición renderizable SIN LANZAR NUNCA. Donde `lib/forms/parse.ts` lanza (correcto para el
   registry: un .md roto en disco debe fallar ruidosamente), aquí devolvemos issues, porque en un
   editor en vivo el YAML está a medio escribir la mitad del tiempo.

   El formato es EXACTAMENTE el de content/forms/*.md — frontmatter YAML (metadatos + `fields`) y
   cuerpo Markdown como intro. La validación es la misma `frontmatterSchema` de ./schema: no hay una
   segunda gramática que mantener.

   Sin dependencias de Node: js-yaml + zod. `version` (hash sha256) se calcula solo en servidor,
   en parse.ts — por eso aquí el resultado es un FormDraft, sin versión. */

import { load, YAMLException } from 'js-yaml';
import { frontmatterSchema, isInputField, optionValue, type FormDraft } from './schema.ts';

export type IssueLevel = 'error' | 'warning';

export type FormIssue = {
  level: IssueLevel;
  /** Ruta dentro del frontmatter, p. ej. `fields.3.label`. `(root)` si es del documento. */
  path: string;
  message: string;
  /** Línea 1-based dentro del texto completo, cuando se puede localizar. */
  line?: number;
};

export type CompileResult =
  | { ok: true; def: FormDraft; issues: FormIssue[] }
  | { ok: false; def: null; issues: FormIssue[] };

/* ── Separación del frontmatter.
   Manual en vez de regex: el cierre `---` tiene que ser una línea entera, y así no hay sorpresas
   con CRLF, BOM ni con un `---` que aparezca dentro de un valor. */
export type Split = {
  yaml: string;
  /** Índice 0-based de la primera línea de YAML dentro del texto completo. */
  yamlStartLine: number;
  body: string;
};

export function splitFrontmatter(raw: string): Split | null {
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;

  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) return null;

  return {
    yaml: lines.slice(1, end).join('\n'),
    yamlStartLine: 1,
    body: lines.slice(end + 1).join('\n'),
  };
}

/* ── Compilación. Nunca lanza. */
export function compileForm(raw: string): CompileResult {
  const split = splitFrontmatter(raw);
  if (!split) {
    return {
      ok: false,
      def: null,
      issues: [
        {
          level: 'error',
          path: '(root)',
          message:
            'Falta el frontmatter. El documento tiene que empezar con una línea `---` y cerrar con otra línea `---`.',
          line: 1,
        },
      ],
    };
  }

  const yamlLines = split.yaml.split('\n');
  const at = (path: (string | number)[]) => locate(yamlLines, path, split.yamlStartLine);

  // 1) YAML.
  let data: unknown;
  try {
    data = load(split.yaml) ?? {};
  } catch (err) {
    const line =
      err instanceof YAMLException && err.mark
        ? split.yamlStartLine + err.mark.line + 1
        : undefined;
    return {
      ok: false,
      def: null,
      issues: [{ level: 'error', path: '(root)', message: yamlMessage(err), line }],
    };
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      ok: false,
      def: null,
      issues: [
        {
          level: 'error',
          path: '(root)',
          message: 'El frontmatter tiene que ser una lista de `clave: valor`.',
          line: split.yamlStartLine + 1,
        },
      ],
    };
  }

  // 2) Esquema (el mismo que valida los .md del repo y, derivado, los envíos).
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      level: 'error' as const,
      path: i.path.length ? i.path.join('.') : '(root)',
      message: i.message,
      line: at(i.path as (string | number)[]),
    }));
    return { ok: false, def: null, issues: dedupe(issues) };
  }

  const def: FormDraft = { ...parsed.data, intro: split.body.trim() };

  // 3) Comprobaciones entre campos que el esquema no puede expresar.
  const errors = crossFieldErrors(def, at);
  if (errors.length) return { ok: false, def: null, issues: dedupe(errors) };

  return { ok: true, def, issues: dedupe(warnings(def, at)) };
}

/* ── Errores que invalidan el formulario aunque el esquema los acepte. */
function crossFieldErrors(
  def: FormDraft,
  at: (path: (string | number)[]) => number | undefined,
): FormIssue[] {
  const out: FormIssue[] = [];

  // `name` duplicado: al enviar, una respuesta pisaría a la otra en silencio.
  const seen = new Map<string, number>();
  def.fields.forEach((f, i) => {
    if (!('name' in f) || !f.name) return;
    const first = seen.get(f.name);
    if (first === undefined) {
      seen.set(f.name, i);
      return;
    }
    out.push({
      level: 'error',
      path: `fields.${i}.name`,
      message: `name duplicado "${f.name}" (ya está en el campo ${first + 1}). Cada campo necesita un name único o una respuesta pisa a la otra.`,
      line: at(['fields', i, 'name']),
    });
  });

  // Rangos imposibles: el campo se renderiza pero es imposible de responder.
  def.fields.forEach((f, i) => {
    if ((f.type === 'scale' || f.type === 'number') && f.min !== undefined && f.max !== undefined && f.min >= f.max) {
      out.push({
        level: 'error',
        path: `fields.${i}.min`,
        message: `min (${f.min}) tiene que ser menor que max (${f.max}).`,
        line: at(['fields', i, 'min']),
      });
    }
    if (f.type === 'checkbox' && f.min_select !== undefined && f.min_select > f.options.length) {
      out.push({
        level: 'error',
        path: `fields.${i}.min_select`,
        message: `min_select (${f.min_select}) pide más opciones de las que hay (${f.options.length}).`,
        line: at(['fields', i, 'min_select']),
      });
    }
  });

  return out;
}

/* ── Avisos: el formulario compila y se puede previsualizar, pero algo huele mal. */
function warnings(
  def: FormDraft,
  at: (path: (string | number)[]) => number | undefined,
): FormIssue[] {
  const out: FormIssue[] = [];

  if (!def.fields.some(isInputField)) {
    out.push({
      level: 'warning',
      path: 'fields',
      message: 'No hay ningún campo que se pueda responder: solo bloques `section`/`content`.',
      line: at(['fields']),
    });
  }

  def.fields.forEach((f, i) => {
    if (!('options' in f) || !Array.isArray(f.options)) return;
    const values = f.options.map(optionValue);
    const dupes = [...new Set(values.filter((v, n) => values.indexOf(v) !== n))];
    if (dupes.length) {
      out.push({
        level: 'warning',
        path: `fields.${i}.options`,
        message: `opciones con el mismo valor (${dupes.join(', ')}) — se pisan al guardar la respuesta.`,
        line: at(['fields', i, 'options']),
      });
    }
  });

  // min_select/max_select cruzados: no rompe, pero nunca se podrá enviar.
  def.fields.forEach((f, i) => {
    if (f.type !== 'checkbox') return;
    if (f.min_select !== undefined && f.max_select !== undefined && f.min_select > f.max_select) {
      out.push({
        level: 'warning',
        path: `fields.${i}.max_select`,
        message: `max_select (${f.max_select}) es menor que min_select (${f.min_select}): el campo nunca valida.`,
        line: at(['fields', i, 'max_select']),
      });
    }
  });

  return out;
}

/* ── Localización aproximada de una ruta del frontmatter en el texto.
   Aproximada a propósito: sirve para llevar el cursor cerca, no para subrayar el carácter exacto.
   Devuelve línea 1-based del documento completo. */
function locate(
  yamlLines: string[],
  path: (string | number)[],
  yamlStartLine: number,
): number | undefined {
  const abs = (relIndex: number) => yamlStartLine + relIndex + 1;

  if (!path.length) return undefined;

  // Claves de primer nivel: `title:`, `accent:`, `fields:`…
  if (path[0] !== 'fields') {
    const key = String(path[0]);
    const i = yamlLines.findIndex((l) => new RegExp(`^${escapeRe(key)}\\s*:`).test(l));
    return i === -1 ? undefined : abs(i);
  }

  const fieldsAt = yamlLines.findIndex((l) => /^fields\s*:/.test(l));
  if (fieldsAt === -1) return undefined;
  if (path.length === 1) return abs(fieldsAt);

  // Inicios de cada elemento de la lista `fields`, al mismo nivel de indentación.
  const starts: number[] = [];
  let itemIndent: number | null = null;
  for (let i = fieldsAt + 1; i < yamlLines.length; i++) {
    const line = yamlLines[i];
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) break; // volvimos al nivel raíz: la lista terminó
    const isItem = /^\s*-\s/.test(line);
    if (isItem && (itemIndent === null || indent === itemIndent)) {
      itemIndent ??= indent;
      starts.push(i);
    }
  }

  const n = Number(path[1]);
  const start = starts[n];
  if (start === undefined) return abs(fieldsAt);
  if (path.length === 2) return abs(start);

  // Clave dentro del elemento: buscar entre este inicio y el siguiente.
  const end = starts[n + 1] ?? yamlLines.length;
  const key = String(path[2]);
  for (let i = start; i < end; i++) {
    if (new RegExp(`^\\s*-?\\s*${escapeRe(key)}\\s*:`).test(yamlLines[i])) return abs(i);
  }
  return abs(start);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* js-yaml mete el snippet y la marca en el mensaje; para el panel basta la primera línea. */
function yamlMessage(err: unknown): string {
  if (err instanceof YAMLException) return `YAML inválido — ${err.reason}`;
  return `YAML inválido — ${(err as Error)?.message ?? 'error desconocido'}`;
}

/* Dos reglas distintas pueden señalar lo mismo; el panel no debe repetirlo. */
function dedupe(issues: FormIssue[]): FormIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.level}|${i.path}|${i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
