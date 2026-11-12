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

export type RichNode =
  | { t: 'p'; text: string }
  | { t: 'ul'; items: ListItem[] }
  | { t: 'quote'; text: string };

type SlideVariant =
  /* Portada: foto a sangre, titular serif grande y subtítulo mono.

     `papeleria` dice dónde va la marca, y es la pieza que da variedad entre
     series sin inventar diseños nuevos:
       'pie'      imagotipo horizontal abajo, slug enfrente  (Miradas)
       'cabecera' imagotipo girado arriba, logo o slug enfrente
                  (evento, workshop, Barcelona Design Week) */
  | {
      kind: 'portada';
      theme: Theme;
      title: string;
      subtitle?: string;
      image?: ImageRef;
      papeleria?: 'pie' | 'cabecera';
    }
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
  /* Cuerpo de texto en serif, sin titular. El mismo papel que la
     diapositiva `paragraph` del deck: un párrafo que razona en vez de
     informar, así que no lleva titular que lo resuma. */
  | { kind: 'parrafo'; theme: Theme; body: RichNode[] }
  /* Cierre: la llamada a leer el artículo, con la firma y el retrato. */
  | {
      kind: 'cierre';
      theme: Theme;
      title: string;
      author?: string;
      image?: ImageRef;
      avatar?: ImageRef;
      /** `false` = hay firma pero no es nadie del equipo. El editor lo avisa. */
      autorEnEquipo?: boolean;
    };

/* `bg`, `slug` y `logo` son ortogonales al layout, así que viajan en
   intersección: estrechar por `kind` sigue funcionando y ningún layout
   necesita declararlos. */
export type Slide = SlideVariant & {
  bg?: Background;
  /* Foto de fondo en un layout que no la lleva de serie (titular, texto,
     lista, cita, rótulo, agenda). Sustituye al relleno plano: donde hay
     foto, el color de fondo no pinta nada.

     Es ortogonal al layout a propósito: cualquier tarjeta puede llevarla
     sin que su componente se entere, igual que pasa con `bg`. */
  fondo?: ImageRef;
  /* Exposición de la foto, de 0 a 100. 100 es la foto tal cual, con el
     velo normal del layout; por debajo se va oscureciendo.

     Solo baja, nunca sube. El velo normal es lo que garantiza que el texto
     se lea encima de cualquier foto (ver `.scrim.full` en social.css), así
     que dejar subirlo sería dejar publicar una tarjeta ilegible. Bajar no
     tiene ese riesgo: cuanto más oscuro, más se lee. */
  exposicion?: number;
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

/* Factor de exportación. A 1, el PNG sale al tamaño exacto del lienzo:
   1080×1350 el carrusel y 1080×608 el post.

   Estuvo a 2 porque el carrusel más reciente que había publicado
   Interactius mide 2160×2700. Decisión de Martina del 10/11/2026: a 1.
   Los otros cinco carruseles de referencia miden 1080×1350, que es
   además la medida nativa de LinkedIn e Instagram.

   El cambio no pierde nitidez por sí solo: a 1 el texto se rasteriza
   exactamente a la resolución del lienzo, sin reescalar nada. A 2 el
   resultado es algo más fino en pantallas densas, a cambio de que la red
   social lo redimensione y lo vuelva a comprimir al subirlo. */
export const EXPORT_SCALE = 1;

export type SocialDeck = {
  slides: Slide[];
  canvas: CanvasId;
  /** Slug por defecto de toda la pieza; cada tarjeta puede pisarlo. */
  slug?: string;
  /** Logo de cliente por defecto; se hereda igual que el slug. */
  logo?: ImageRef;
  /** `provenance[i]` es el bloque de markdown que produjo la tarjeta i. */
  provenance?: (number | null)[];
};
