/* Tipos del lienzo social.
   ─────────────────────────────────────────────────────────────────────────
   Deliberadamente separado de `lib/deck/types.ts`. El motor de markdown sí
   se comparte (`parse` y `parseBlock` se importan del deck), pero los
   layouts y el lienzo no: el deck está en producción, sus URLs circulan
   entre clientes, y un cambio pensado para redes no puede llegar hasta él
   por accidente. */

export type Theme = 'dark' | 'light';

/* Relleno de fondo de una tarjeta. Los cuatro primeros son neutros de marca.

   `opal` es el único acento admitido como fondo, y entra por dos motivos
   que se sostienen a la vez: lo usa un carrusel ya publicado, y el sistema
   permite los acentos **como relleno** siempre que la tinta de encima dé
   contraste (Opal con texto oscuro lo da; como color de letra no lo daría).

   Burdeos y Esmeralda NO están aquí. Burdeos es el color de alerta de la
   interfaz y Esmeralda identifica un servicio: pintar una tarjeta entera de
   ese color diría algo que el contenido casi nunca quiere decir. Si hiciera
   falta, se declara en `lib/tokens.ts` primero. */
export type Background = 'warm-light' | 'warm-dark' | 'white' | 'opal';

export type ImageRef = { src?: string; alt?: string; alignY?: number };

/* Un elemento de lista numerada: el `lead` va en negrita y el resto sigue
   en la misma línea. `- **Sin confianza no hay conversión.** Permisos…` */
export type ListItem = { lead?: string; text: string };

/* Fila de agenda: lo que pasa y cuándo. `- Obertura i icebreaker | 09:00` */
export type AgendaRow = { label: string; time?: string };

export type RichNode =
  | { t: 'p'; text: string }
  | { t: 'ul'; items: ListItem[] }
  | { t: 'quote'; text: string };

type SlideVariant =
  /* Portada: foto a sangre, imagotipo arriba o abajo a la izquierda, slug
     enfrente, titular serif grande y subtítulo mono. */
  | { kind: 'portada'; theme: Theme; title: string; subtitle?: string; image?: ImageRef }
  /* Un titular serif y nada más. El layout que más se repite en los seis
     carruseles publicados. */
  | { kind: 'titular'; theme: Theme; title: string }
  /* Titular serif + cuerpo mono. El caballo de batalla. */
  | { kind: 'texto'; theme: Theme; eyebrow?: string; title?: string; body: RichNode[] }
  /* Titular + lista numerada con filete entre elementos. */
  | { kind: 'lista'; theme: Theme; title?: string; intro?: string; items: ListItem[] }
  /* Cita a toda tarjeta, en serif a tamaño `title`. */
  | { kind: 'cita'; theme: Theme; text: string; source?: string }
  /* Foto a sangre, con texto serif opcional encima. */
  | { kind: 'foto'; theme: Theme; image?: ImageRef; text?: string; position?: 'top' | 'bottom' }
  /* Cuerpo mono arriba, rótulo serif grande abajo. */
  | { kind: 'rotulo'; theme: Theme; label: string; body: RichNode[] }
  /* Programa de una sesión: qué y a qué hora, con filetes. */
  | { kind: 'agenda'; theme: Theme; title?: string; rows: AgendaRow[] }
  /* Cierre: la llamada a leer el artículo, con la firma y el retrato. */
  | { kind: 'cierre'; theme: Theme; title: string; author?: string; image?: ImageRef; avatar?: ImageRef };

/* `bg`, `slug` y `logo` son ortogonales al layout, así que viajan en
   intersección: estrechar por `kind` sigue funcionando y ningún layout
   necesita declararlos. */
export type Slide = SlideVariant & {
  bg?: Background;
  /** Texto de la esquina. `/Miradas/`, `/Eventos/`, `/Summer Fest/`… Libre. */
  slug?: string;
  /** Logotipo co-marca del pie, enfrente del slug. Ruta a un archivo. */
  logo?: ImageRef;
};

export type SlideKind = Slide['kind'];

/* ───────────────────────────── Lienzos ─────────────────────────────
   Todos comparten ancho 1080. No es un detalle de implementación: es lo
   que permite que haya **una sola escala tipográfica**. Una tarjeta de
   carrusel y un post horizontal se ven con el mismo ancho en el feed, así
   que el texto tiene que medir lo mismo en los dos.

   La exportación sale a ×2 (2160 de ancho), que es exactamente el tamaño
   al que Interactius ya exporta: el carrusel más reciente mide 2160×2700. */
export type CanvasId = 'carrusel' | 'post';

export type CanvasSpec = {
  id: CanvasId;
  nombre: string;
  w: number;
  h: number;
  ratio: string;
  uso: string;
};

export const CANVASES: Record<CanvasId, CanvasSpec> = {
  carrusel: {
    id: 'carrusel',
    nombre: 'Carrusel',
    w: 1080,
    h: 1350,
    ratio: '4:5',
    uso: 'Carrusel de LinkedIn e Instagram. El formato vertical que más ocupa en el feed.',
  },
  post: {
    id: 'post',
    nombre: 'Post horizontal',
    w: 1080,
    h: 608,
    ratio: '16:9',
    /* 1080×608 es 1,776, y el 16:9 exacto sería 1,778. La desviación es del
       0,08 %, invisible, y a cambio el alto es par: exportado a ×2 da
       2160×1216 sin medio píxel suelto. */
    uso: 'Post suelto, cabecera de artículo, miniatura de vídeo.',
  },
};

/** Factor de exportación. 1080 → 2160, que es a lo que ya se exporta hoy. */
export const EXPORT_SCALE = 2;

export type SocialDeck = {
  slides: Slide[];
  canvas: CanvasId;
  /** Slug por defecto de toda la pieza; cada tarjeta puede pisarlo. */
  slug?: string;
  /** `provenance[i]` es el bloque de markdown que produjo la tarjeta i. */
  provenance?: (number | null)[];
};
