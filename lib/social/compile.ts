import { parse } from '@/lib/deck/parse';
import { parseBlock, type BlockModel } from '@/lib/deck/model';
import type { Token } from '@/lib/deck/types';
import { LAYOUT_ALIASES, LAYOUT_MAP } from './catalog.ts';
import { resolverAutor } from './autor.ts';
import type {
  AgendaRow,
  Background,
  CanvasId,
  ImageRef,
  ListItem,
  RichNode,
  Slide,
  SlideKind,
  SocialDeck,
  Theme,
} from './types.ts';

/* Compilador del markdown a tarjetas.
   ─────────────────────────────────────────────────────────────────────────
   El troceado y la lectura del markdown se COMPARTEN con el deck: `parse` y
   `parseBlock` se importan tal cual. Es deliberado, y es lo que hace que
   quien ya sabe escribir un deck sepa escribir un carrusel sin aprender
   nada nuevo. Lo que no se comparte es de aquí para abajo: qué layouts hay
   y cómo se pintan.

   CONTRATO DEL MARKDOWN (idéntico al del deck salvo donde se diga)
     ---                  separa una tarjeta de la siguiente
     [ly: nombre] {fondo} elige layout y relleno
     # Titular            titular
     ## Subtítulo         subtítulo (portada) o titular secundario
     - elemento           lista
     - Qué | 09:00        fila de agenda
     > cita               cita
     > clave: valor       metadatos: slug, autor, logo
     ![alt](ruta)         imagen
     LÍNEA EN MAYÚSCULAS  antetítulo */

/* Rellenos admitidos. `dark` es el único que cambia la tinta; los claros la
   conservan, que es lo que les da el contraste. Los alias existen para no
   pelearse con el nombre al escribir. */
function resolveAppearance(tok?: string): { theme?: Theme; bg?: Background } {
  switch (tok?.trim().toLowerCase()) {
    case 'dark':
    case 'oscuro':
      return { theme: 'dark' };
    case 'warm-light':
    case 'light':
    case 'claro':
    case 'crema':
      return { theme: 'light', bg: 'warm-light' };
    case 'white':
    case 'blanco':
      return { theme: 'light', bg: 'white' };
    case 'warm-dark':
    case 'arena':
      return { theme: 'light', bg: 'warm-dark' };
    case 'opal':
      return { theme: 'light', bg: 'opal' };
    default:
      return {};
  }
}

/* `parseBlock` resuelve el fondo con la tabla del deck, que no conoce Opal.
   Así que el modificador se vuelve a leer aquí, en crudo, de donde puede
   venir: la línea `[ly:]` o el sufijo `{…}` del titular. */
function appearanceOf(tokens: Token[], title: string): { theme?: Theme; bg?: Background } {
  const ly = tokens.find((t): t is Extract<Token, { t: 'layout' }> => t.t === 'layout');
  const fromMarker = resolveAppearance(ly?.mod);
  if (fromMarker.theme || fromMarker.bg) return fromMarker;
  const suffix = title.match(/\{([a-z-]+)\}\s*$/i);
  return resolveAppearance(suffix?.[1]);
}

/* Los layouts que nacen oscuros si nadie dice otra cosa. Son los que llevan
   foto a sangre (la foto manda sobre el fondo) y el titular suelto, que es
   el que más se usa en negativo en los carruseles publicados. */
const DARK_BY_ROLE: SlideKind[] = ['portada', 'foto', 'cierre'];

/* Los que YA consumen la imagen del bloque como parte de su diseño. En el
   resto, una imagen suelta se entiende como foto de fondo. */
const CONSUMEN_IMAGEN: SlideKind[] = ['portada', 'foto', 'cierre'];

function themeFor(kind: SlideKind, override: Theme | undefined): Theme {
  if (override) return override;
  return DARK_BY_ROLE.includes(kind) ? 'dark' : 'light';
}

/* Marcador → layout. Sin marcador se deduce de lo que trae el bloque, para
   que escribir deprisa siga dando algo sensato. */
function kindOf(m: BlockModel): SlideKind {
  if (m.marker) {
    const canonical = LAYOUT_ALIASES[m.marker] ?? m.marker;
    const mapped = LAYOUT_MAP[canonical];
    if (mapped) return mapped;
  }
  if (m.isFirst && m.image) return 'portada';
  if (m.quotes.some((q) => !/^[\p{L} ]+:\s*.+$/u.test(q))) return 'cita';
  if (m.items?.some((i) => i.includes('|'))) return 'agenda';
  if (m.items?.length) return 'lista';
  if (m.image && !m.body.length) return 'foto';
  if (m.title && !m.body.length) return 'titular';
  return 'texto';
}

/* `- **Lo primero.** La explicación.` → lead + resto. El lead se pinta en
   Regular sobre el Light del resto: un escalón, que es lo que permite el
   300/400 de la serif y lo que hace falta para que se lea. */
function toListItem(raw: string): ListItem {
  const m = raw.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (m) return { lead: m[1].trim(), text: m[2].trim() };
  return { text: raw.trim() };
}

/* `- Apertura | 09:00` → qué y cuándo. Sin barra, la fila va sin hora. */
function toAgendaRow(raw: string): AgendaRow {
  const at = raw.lastIndexOf('|');
  if (at < 0) return { label: raw.trim() };
  return { label: raw.slice(0, at).trim(), time: raw.slice(at + 1).trim() };
}

/* Los párrafos y las listas del bloque, en el orden en que se escribieron.
   Las líneas `clave: valor` se quedan fuera: son metadatos, no texto. */
function richBody(tokens: Token[]): RichNode[] {
  const out: RichNode[] = [];
  for (const t of tokens) {
    if (t.t === 'p') {
      if (/^[\p{L} ]+:\s*.+$/u.test(t.text)) continue;
      out.push({ t: 'p', text: t.text });
    }
    if (t.t === 'ul') out.push({ t: 'ul', items: t.items.map(toListItem) });
    if (t.t === 'quote' && !/^[\p{L} ]+:\s*.+$/u.test(t.text)) out.push({ t: 'quote', text: t.text });
  }
  return out;
}

function img(ref: ImageRef | undefined): ImageRef | undefined {
  return ref?.src ? ref : undefined;
}

function buildSlide(m: BlockModel): Slide {
  const kind = kindOf(m);
  const app = appearanceOf(m.tokens, m.headings[0]?.text ?? '');

  /* Una imagen en un layout que no la usa es una foto de fondo. Arrastra
     el tema a oscuro: encima va a ir texto claro sobre el velo, y dejar
     que alguien eligiera tinta oscura sería dejarle publicar una tarjeta
     ilegible. */
  const fondo = !CONSUMEN_IMAGEN.includes(kind) ? img(m.image) : undefined;
  const theme = fondo ? 'dark' : themeFor(kind, app.theme);

  const common = {
    theme,
    bg: app.bg,
    fondo,
    slug: m.meta.slug,
    logo: m.meta.logo ? { src: m.meta.logo, alt: '' } : undefined,
  };

  switch (kind) {
    case 'portada': {
      /* `> marca: arriba` pone la papelería en cabecera. Se aceptan las dos
         palabras que alguien escribiría sin pensar. */
      const donde = (m.meta.marca ?? '').toLowerCase();
      const papeleria = donde === 'arriba' || donde === 'cabecera' ? 'cabecera' : 'pie';
      return {
        ...common,
        kind,
        title: m.title,
        subtitle: m.subtitle ?? m.body[0],
        image: img(m.image),
        papeleria,
      };
    }

    case 'titular':
      return { ...common, kind, title: m.title };

    case 'lista':
      return {
        ...common,
        kind,
        title: m.title || undefined,
        intro: m.subtitle ?? (m.body.length ? m.body[0] : undefined),
        items: (m.items ?? []).map(toListItem),
      };

    case 'cita': {
      const text = m.quotes.find((q) => !/^[\p{L} ]+:\s*.+$/u.test(q)) ?? m.title;
      return { ...common, kind, text, source: m.eyebrow ?? m.meta.autor };
    }

    case 'foto':
      return {
        ...common,
        kind,
        image: img(m.image),
        text: m.title || undefined,
        position: m.meta.posicion === 'abajo' ? 'bottom' : 'top',
      };

    case 'rotulo':
      return { ...common, kind, label: m.title, body: richBody(m.tokens) };

    case 'agenda':
      return { ...common, kind, title: m.title || undefined, rows: (m.items ?? []).map(toAgendaRow) };

    case 'cierre': {
      /* El retrato sale del nombre. Quien escribe pone `> autor: Diana
         Yuste` y la foto aparece sola, sin subirla ni buscarla.

         Una segunda imagen en el bloque gana a la automática: hace falta
         para firmar una pieza con alguien de fuera del equipo, y la regla
         «lo explícito manda» evita tener que explicar por qué el sistema
         no deja hacer algo. */
      const autor = m.meta.autor ? resolverAutor(m.meta.autor) : undefined;
      const delEquipo = autor?.esRetrato ? { src: autor.foto, alt: autor.nombre } : undefined;
      return {
        ...common,
        kind,
        title: m.title,
        author: m.meta.autor,
        image: img(m.images[0]),
        avatar: img(m.images[1]) ?? delEquipo,
        /* `false` cuando hay autor pero no está en el equipo: el editor lo
           avisa y la tarjeta firma con el isotipo. */
        autorEnEquipo: autor ? autor.esRetrato : undefined,
      };
    }

    case 'texto':
    default:
      return {
        ...common,
        kind: 'texto',
        eyebrow: m.eyebrow,
        title: m.title || undefined,
        body: richBody(m.tokens),
      };
  }
}

export function compileSocial(md: string, canvas: CanvasId = 'carrusel'): SocialDeck {
  const sources = parse(md);
  const slides = sources.map((src, i) => buildSlide(parseBlock(src.tokens, i, sources.length)));

  /* El slug de la pieza es el primero que alguien declare. Las demás
     tarjetas lo heredan y cualquiera puede pisarlo con su propio
     `> slug: …`. Una pieza sin slug no pinta ninguno: es una firma, y
     firmar por defecto con algo que nadie eligió sería peor que no firmar. */
  const deckSlug = slides.find((s) => s.slug)?.slug;
  for (const s of slides) if (!s.slug) s.slug = deckSlug;

  /* El logo del cliente se hereda igual que el slug: una pieza hecha con
     alguien lo es de principio a fin, y obligar a repetirlo en cada tarjeta
     sería pedir que alguien se deje una. */
  const deckLogo = slides.find((s) => s.logo?.src)?.logo;
  for (const s of slides) if (!s.logo?.src) s.logo = deckLogo;

  return { slides, canvas, slug: deckSlug, logo: deckLogo, provenance: sources.map((_, i) => i) };
}
