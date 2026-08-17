/* ReWrit_r — las opciones del ajuste de tono, en una sola tabla declarativa.

   Mismo patrón que lib/workspace/catalog.ts: añadir un perfil es UNA entrada aquí, no tocar
   maquetación. La UI pinta `label` y `desc`; `hint` no se ve nunca — es la instrucción que
   viaja al modelo (lib/rewriter/prompt.ts).

   El workspace es una herramienta interna en castellano, así que las etiquetas no pasan por
   next-intl. El idioma de SALIDA del texto es otra cosa, y sí se elige: `OutputLang`. */

export type PresetId =
  | 'cliente'
  | 'equipo'
  | 'disculpa'
  | 'seguimiento'
  | 'mala-noticia'
  | 'comercial';

/** Idioma del texto reescrito. `auto` ⇒ el mismo del borrador. */
export type OutputLang = 'auto' | 'es' | 'ca' | 'en';
export type LengthId = 'corto' | 'igual' | 'desarrollado';

/** Formato de la pieza. Eje ortogonal al perfil: el perfil dice a quién, el tipo dice en qué. */
export type TextType = 'correo' | 'mensaje' | 'presentacion' | 'documento';

export type Preset = {
  id: PresetId;
  label: string;
  desc: string;
  /** Instrucción real para el modelo. No se muestra en la interfaz. */
  hint: string;
};

export const PRESETS: Preset[] = [
  {
    id: 'cliente',
    label: 'Cliente',
    desc: 'Formal y cuidado',
    hint: 'Profesional y respetuoso, sin distancia fría. Cuida la relación de largo plazo.',
  },
  {
    id: 'equipo',
    label: 'Equipo',
    desc: 'Directo',
    hint: 'Cercano y eficiente. Va al grano, con el tono de confianza de quien comparte contexto.',
  },
  {
    id: 'disculpa',
    label: 'Disculpa',
    desc: 'Cálido',
    hint: 'Reconoce el error con sinceridad, sin excusas largas. Propone una salida concreta.',
  },
  {
    id: 'seguimiento',
    label: 'Seguimiento',
    desc: 'Ligero',
    hint: 'Recuerda con amabilidad, sin sonar insistente ni pasivo-agresivo. Facilita la respuesta.',
  },
  {
    id: 'mala-noticia',
    label: 'Mala noticia',
    desc: 'Claro y respetuoso',
    hint: 'Honesto y empático. No esconde el mensaje detrás de rodeos, pero cuida el impacto.',
  },
  {
    id: 'comercial',
    label: 'Comercial',
    desc: 'Cercano',
    hint: 'Genera interés desde la honestidad, sin venta agresiva ni promesas que no podamos sostener.',
  },
];

export type TextTypeOption = {
  id: TextType;
  label: string;
  /** Instrucción estructural que viaja al prompt. No se muestra en la interfaz. */
  hint: string;
  /** Solo el correo lleva línea de asunto. Condiciona el prompt, no la interfaz. */
  hasSubject: boolean;
  /* Fuente única de la regla de longitud: relaja la frase mínima en el prompt Y suprime
     `length:under_min` al puntuar (lib/rewriter/lengthPolicy.ts). Si estos dos usos se
     separaran, la herramienta pediría un titular y luego le bajaría la nota por serlo. */
  allowFragments: boolean;
};

export const TEXT_TYPES: TextTypeOption[] = [
  {
    id: 'correo',
    label: 'Correo',
    hint: 'Es un correo electrónico: lleva asunto, saludo inicial y despedida. Cuerpo en párrafos cortos separados por líneas en blanco.',
    hasSubject: true,
    allowFragments: false,
  },
  {
    id: 'mensaje',
    label: 'Mensaje',
    hint: 'Es un mensaje de chat (Slack, WhatsApp, LinkedIn): sin asunto, sin saludo formal y sin despedida. Una o dos frases, directo, como se escribe a alguien con quien ya estás hablando.',
    hasSubject: false,
    allowFragments: true,
  },
  {
    id: 'presentacion',
    label: 'Presentación',
    hint: 'Es texto para una diapositiva: titulares y frases sueltas, no prosa. Fragmentos sin verbo son correctos. Sin saludo, sin despedida y sin párrafos corridos.',
    hasSubject: false,
    allowFragments: true,
  },
  {
    id: 'documento',
    label: 'Documento',
    hint: 'Es texto para web o documento: prosa continua organizada en secciones, sin saludo ni despedida. No es correspondencia, nadie lo firma.',
    hasSubject: false,
    allowFragments: false,
  },
];

export const LANGS: { id: OutputLang; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'es', label: 'ES' },
  { id: 'ca', label: 'CA' },
  { id: 'en', label: 'EN' },
];

export const LENGTHS: { id: LengthId; label: string }[] = [
  { id: 'corto', label: 'Más corto' },
  { id: 'igual', label: 'Igual' },
  { id: 'desarrollado', label: 'Desarrollado' },
];

/* Los dos ejes van de 1 a 5. La etiqueta visible sale de estas escalas; la que viaja al
   modelo es la de prompt.ts, más explícita. */
export const AXIS_MIN = 1;
export const AXIS_MAX = 5;

export const FORMALITY_SCALE = ['informal', 'cercano', 'medio', 'formal', 'muy formal'] as const;
export const WARMTH_SCALE = ['sobrio', 'templado', 'equilibrio', 'cálido', 'muy cálido'] as const;

/* ─── Contrato del endpoint (/api/rewrite) ─── */

export type RewriteRequest = {
  draft: string;
  context: string;
  textType: TextType;
  preset: PresetId;
  formality: number;
  warmth: number;
  lang: OutputLang;
  length: LengthId;
  brandVoice: boolean;
};

export type RewriteResult = {
  subject: string;
  body: string;
  changes: string[];
};

/* ─── Validación. El endpoint es la frontera: nada de lo que llega es de fiar. ─── */

export function isPresetId(v: unknown): v is PresetId {
  return typeof v === 'string' && PRESETS.some((p) => p.id === v);
}

export function isTextType(v: unknown): v is TextType {
  return typeof v === 'string' && TEXT_TYPES.some((t) => t.id === v);
}

/** El tipo por defecto es el correo: lo que la herramienta hacía antes de existir este eje. */
export function textTypeOrDefault(v: unknown): TextType {
  return isTextType(v) ? v : 'correo';
}

export function textTypeOption(id: TextType): TextTypeOption {
  /* El `!` es seguro: `id` está tipado contra la propia tabla. */
  return TEXT_TYPES.find((t) => t.id === id)!;
}

export function isOutputLang(v: unknown): v is OutputLang {
  return typeof v === 'string' && LANGS.some((l) => l.id === v);
}

export function isLengthId(v: unknown): v is LengthId {
  return typeof v === 'string' && LENGTHS.some((l) => l.id === v);
}

/** Fuera de rango o no numérico ⇒ el centro de la escala. */
export function clampAxis(v: unknown): number {
  const n = typeof v === 'number' ? Math.round(v) : Number.NaN;
  if (!Number.isFinite(n)) return 3;
  return Math.min(AXIS_MAX, Math.max(AXIS_MIN, n));
}
