/* FormMaker — markdown de partida y snippets por tipo de campo.
   Equivalente de lib/deck/templates.ts + lib/deck/catalog.ts para formularios.
   Sin dependencias de Node: esto corre en el navegador. */

import type { Accent } from './schema.ts';
import { yamlString } from './edit.ts';

/* ── Id público opaco, con la forma de los que ya existen (`fk_Hjd81rX`).
   Opaco a propósito: es lo que aparece en la URL pública y no debe ser enumerable (PRD §10). */
const ALPHABET = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'; // sin O/o/0/l

export function newPublicId(): string {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `fk_${out}`;
}

/* ── Markdown inicial de un formulario nuevo.
   Nace como borrador: publicar es un acto deliberado, no el estado por defecto. */
export function newFormMd(opts: {
  title: string;
  client?: string;
  accent?: Accent;
  publicId?: string;
}): string {
  const { title, client, accent = 'bordeaux' } = opts;
  const publicId = opts.publicId ?? newPublicId();

  return `---
id: ${publicId}
title: ${yamlString(title)}${client ? `\nclient: ${yamlString(client)}` : ''}
status: draft
accent: ${accent}
intro_title: Antes de empezar
submit_label: Enviar respuestas
success_title: ¡Gracias!
success_message: Hemos recibido tus respuestas.
allow_multiple: true
fields:
  - type: text
    name: nombre
    label: Nombre y apellidos
    required: true
---

Escribe aquí la introducción del formulario. Admite **Markdown**: negritas, enlaces y listas.
`;
}

/* ── Snippets de la paleta "añadir campo". Se insertan al final de la lista `fields`.
   La indentación (2 para el guion, 4 para las claves) es la de content/forms/*.md. */
export type FieldSnippet = { type: string; label: string; snippet: string };

export const FIELD_SNIPPETS: FieldSnippet[] = [
  {
    type: 'text',
    label: 'Texto corto',
    snippet: `  - type: text
    name: campo_texto
    label: Pregunta de texto corto
    required: false`,
  },
  {
    type: 'textarea',
    label: 'Texto largo',
    snippet: `  - type: textarea
    name: campo_texto_largo
    label: Pregunta abierta
    caption: Unas líneas bastan.
    rows: 4
    required: false`,
  },
  {
    type: 'email',
    label: 'Email',
    snippet: `  - type: email
    name: email
    label: Correo electrónico
    required: false`,
  },
  {
    type: 'number',
    label: 'Número',
    snippet: `  - type: number
    name: campo_numero
    label: Pregunta numérica
    min: 0
    max: 100
    required: false`,
  },
  {
    type: 'scale',
    label: 'Escala 1–10',
    snippet: `  - type: scale
    name: campo_escala
    label: Pregunta de valoración
    caption: Siendo 1 poco y 10 mucho.
    min: 1
    max: 10
    required: false`,
  },
  {
    type: 'radio',
    label: 'Opción única',
    snippet: `  - type: radio
    name: campo_opcion
    label: Elige una opción
    options:
      - Primera
      - Segunda
      - Tercera
    required: false`,
  },
  {
    type: 'checkbox',
    label: 'Opción múltiple',
    snippet: `  - type: checkbox
    name: campo_multiple
    label: Elige todas las que apliquen
    options:
      - Primera
      - Segunda
      - Tercera
    required: false`,
  },
  {
    type: 'select',
    label: 'Desplegable',
    snippet: `  - type: select
    name: campo_lista
    label: Elige de la lista
    options:
      - Primera
      - Segunda
      - Tercera
    required: false`,
  },
  {
    type: 'ranking',
    label: 'Ranking',
    snippet: `  - type: ranking
    name: campo_ranking
    label: Ordena por prioridad
    caption: Arrastra de mayor (arriba) a menor (abajo) importancia.
    options:
      - Primera
      - Segunda
      - Tercera
    required: false`,
  },
  {
    type: 'date',
    label: 'Fecha',
    snippet: `  - type: date
    name: campo_fecha
    label: Elige una fecha
    required: false`,
  },
  {
    type: 'boolean',
    label: 'Sí / No',
    snippet: `  - type: boolean
    name: campo_si_no
    label: Acepto el tratamiento de estas respuestas.
    required: false`,
  },
  {
    type: 'url',
    label: 'Enlace',
    snippet: `  - type: url
    name: campo_enlace
    label: Comparte un enlace
    required: false`,
  },
  {
    type: 'tel',
    label: 'Teléfono',
    snippet: `  - type: tel
    name: telefono
    label: Teléfono de contacto
    required: false`,
  },
  {
    type: 'section',
    label: 'Separador de sección',
    snippet: `  - type: section
    title: Título de la sección
    description: Una línea de contexto para el bloque que viene.`,
  },
  {
    type: 'content',
    label: 'Bloque de texto',
    snippet: `  - type: content
    body: Un texto explicativo entre preguntas. Admite **Markdown**.`,
  },
];
