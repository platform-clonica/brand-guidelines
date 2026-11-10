import type { SlideSource, Token } from './types.ts';

const isCaps = (l: string) =>
  l.length > 0 && l.length <= 48 && l === l.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(l) && !/[.;:]/.test(l);

/* Opciones del troceado.

   `saltosBlandos` cambia qué significa pulsar Enter una vez:

     sin la opción (el deck)   cada línea es un token propio
     con la opción (social)    un Enter es un salto DENTRO del mismo texto;
                               para empezar otra cosa hace falta una línea
                               en blanco

   Existe porque en el Social Maker los saltos desaparecían. Quien escribe
   un titular de tres líneas pulsa Enter dos veces y esperaba tres líneas;
   lo que salía era un titular de una línea y dos párrafos sueltos que el
   layout no pintaba. La barra final (`\`) seguía funcionando, pero nadie
   la adivina.

   NO se activa para el deck, y el motivo está documentado abajo en la
   regla del titular: hay 19 plantillas con el titular pegado a su cuerpo
   sin línea en blanco, y con saltos blandos se tragarían el párrafo
   dentro del titular. */
export type OpcionesParse = { saltosBlandos?: boolean };

export function parse(md: string, opciones: OpcionesParse = {}): SlideSource[] {
  const chunks = md.replace(/\r\n/g, '\n').split(/\n-{3,}\n/);
  return chunks.map((chunk, index) => ({ index, tokens: tokenize(chunk, opciones) }));
}

/* Una línea que empieza algo nuevo: lista, cita, titular, imagen, bloque de
   código, marcador de layout o antetítulo. Con saltos blandos, absorber
   líneas se detiene aquí; si no, el salto se comería la construcción
   siguiente. */
function empiezaOtraCosa(linea: string): boolean {
  const t = linea.trim();
  if (!t) return true;
  return (
    /^[-*]\s+/.test(t) ||
    t.startsWith('> ') ||
    /^#{1,6}\s+/.test(t) ||
    /^!\[.*?\]\(.*?\)$/.test(t) ||
    /^```/.test(t) ||
    /^\[ly:?\s+/i.test(t) ||
    isCaps(t)
  );
}

function tokenize(chunk: string, opciones: OpcionesParse = {}): Token[] {
  const lines = chunk.split('\n');
  const tokens: Token[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    // Explicit layout marker: `[ly: nombre]`, optional background `{blanco|warm-dark|…}` after it.
    const ly = trimmed.match(/^\[ly:?\s+([a-z0-9-]+)\]\s*(?:\{([a-z-]+)\})?$/i);
    if (ly) { tokens.push({ t: 'layout', name: ly[1].toLowerCase(), mod: ly[2]?.toLowerCase() }); i++; continue; }

    const fence = trimmed.match(/^```(\w+)?\s*$/);
    if (fence) {
      const lang = fence[1] ?? '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) { body.push(lines[i]); i++; }
      i++; // closing fence
      tokens.push({ t: 'fence', lang, body: body.join('\n').trim() });
      continue;
    }

    /* Titular. Puede ocupar VARIAS líneas si cada una menos la última acaba en `\` — el salto duro
       nativo de markdown. El texto se guarda con `\n` dentro y el render lo convierte en <br>.

       Por qué hace falta el `\` y no basta con pulsar Enter: en las plantillas de este mismo repo
       hay 19 titulares seguidos INMEDIATAMENTE de su cuerpo sin línea en blanco. Si un salto
       normal continuara el titular, todos esos decks se tragarían el párrafo dentro del titular.
       La barra lo hace explícito y no rompe nada de lo ya escrito. */
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const parts = [h[2].trim()];
      i++;
      while (parts[parts.length - 1].endsWith('\\') && i < lines.length) {
        parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1).trimEnd();
        parts.push(lines[i].trim());
        i++;
      }
      /* Saltos blandos: lo que venga pegado detrás, sin línea en blanco,
         es continuación del titular. */
      if (opciones.saltosBlandos) {
        while (i < lines.length && !empiezaOtraCosa(lines[i])) {
          parts.push(lines[i].trim());
          i++;
        }
      }
      // Una barra colgando al final del bloque dejaría una línea vacía → un <br> fantasma.
      while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
      tokens.push({ t: 'h', level: h[1].length, text: parts.join('\n') });
      continue;
    }

    const img = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (img) { tokens.push({ t: 'image', alt: img[1], src: img[2] }); i++; continue; }

    if (trimmed.startsWith('> ')) {
      const cita = [trimmed.slice(2).trim()];
      i++;
      if (opciones.saltosBlandos) {
        while (i < lines.length && !empiezaOtraCosa(lines[i])) { cita.push(lines[i].trim()); i++; }
      }
      tokens.push({ t: 'quote', text: cita.join('\n') });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const item = [lines[i].trim().replace(/^[-*]\s+/, '')];
        i++;
        /* Lo que venga pegado detrás sin empezar otra cosa es continuación
           de ESTE elemento, no un párrafo suelto que el layout luego no
           pinta. */
        if (opciones.saltosBlandos) {
          while (i < lines.length && !empiezaOtraCosa(lines[i])) { item.push(lines[i].trim()); i++; }
        }
        items.push(item.join('\n'));
      }
      tokens.push({ t: 'ul', items });
      continue;
    }

    if (isCaps(trimmed)) { tokens.push({ t: 'caps', text: trimmed }); i++; continue; }

    if (opciones.saltosBlandos) {
      const parrafo = [trimmed];
      i++;
      while (i < lines.length && !empiezaOtraCosa(lines[i])) {
        parrafo.push(lines[i].trim());
        i++;
      }
      tokens.push({ t: 'p', text: parrafo.join('\n') });
      continue;
    }

    tokens.push({ t: 'p', text: trimmed });
    i++;
  }
  return tokens;
}
