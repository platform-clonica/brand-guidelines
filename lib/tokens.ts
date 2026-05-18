export type ColorToken = {
  name: string;
  hex: string;
  rgb: string;
  cmyk: string;
};

export const colorsBase: ColorToken[] = [
  { name: 'Dark',       hex: '#1C1A17', rgb: '28,26,23',    cmyk: '0,7,18,89' },
  { name: 'Pure White', hex: '#FFFFFF', rgb: '255,255,255', cmyk: '0,0,0,0'   },
  { name: 'Grey',       hex: '#E8E6E3', rgb: '232,230,227', cmyk: '0,1,2,9'   },
  { name: 'Warm Light', hex: '#F5F2ED', rgb: '245,242,237', cmyk: '0,1,3,4'   },
  { name: 'Warm Dark',  hex: '#E0DAD2', rgb: '224,218,210', cmyk: '0,3,6,12'  },
];

export const colorsAccent: ColorToken[] = [
  { name: 'Opal',       hex: '#B0B5B0', rgb: '176,181,176', cmyk: '3,0,3,29'   },
  { name: 'Bordeaux',   hex: '#99335F', rgb: '153,51,95',   cmyk: '0,67,38,40' },
  { name: 'Emerald',    hex: '#5999A6', rgb: '89,153,166',  cmyk: '46,8,0,35'  },
];

export const typography = {
  brand: {
    family: 'IBM Plex Mono',
    role: 'Tipografía de marca',
    weights: [400, 500, 600],
    italics: false,
    notes: 'Uso preferente de pesos Regular y Semibold para destacados. Evitar el uso de cursiva.',
    download: 'https://fonts.google.com/specimen/IBM+Plex+Mono',
  },
  contrast: {
    family: 'IBM Plex Serif',
    role: 'Tipografía de contraste',
    weights: [300, 400],
    italics: false,
    notes: 'Uso preferente de pesos Light y Regular para destacados. Evitar el uso de cursiva.',
    download: 'https://fonts.google.com/specimen/IBM+Plex+Serif',
  },
} as const;

/* ───────────────────────────── Voice / verbal identity ─────────────────────────────
   Hard layer of brand identity for AI ingestion. Mirrors what is published in the
   Tono de marca section. Any change here propagates to /llms.txt and /api/brand.json. */

export const voicePrinciple = {
  es: 'No escribimos para demostrar nuestro pensamiento crítico, sino para activar el de quien nos lee. Nuestra voz no busca el aplauso ni la complacencia; busca mover el marco de la conversación. Nos posicionamos como una mirada exploradora con el rigor de quien sabe dónde pisa.',
  en: "We don't write to display our critical thinking, but to activate the reader's. Our voice doesn't seek applause or complacency; it aims to shift the frame of the conversation. We position ourselves as an exploratory perspective with the rigour of someone who knows where they stand.",
} as const;

export const voiceAxes = [
  {
    id: 'directos-reflexivos',
    title: { es: 'Directos pero reflexivos', en: 'Direct yet reflective' },
    body: {
      es: 'Vamos al grano sin rodeos corporativos ni introducciones de relleno. Decimos las cosas de forma afilada, pero cada afirmación está sustentada en un criterio sólido.',
      en: 'We get to the point — no corporate detours, no filler intros. We say things sharply, but every assertion is backed by solid criteria.',
    },
  },
  {
    id: 'cercanos-profesionales',
    title: { es: 'Cercanos pero profesionales', en: 'Close yet professional' },
    body: {
      es: 'Hablamos entre personas reales, no de corporación a corporación. El tono es accesible y humano (Tribu), pero mantiene la distancia justa que exige el rigor técnico.',
      en: 'We speak between real people, not corporation to corporation. The tone is accessible and human (Tribe), while keeping the precise distance technical rigour demands.',
    },
  },
  {
    id: 'criticos-constructivos',
    title: { es: 'Críticos pero constructivos', en: 'Critical yet constructive' },
    body: {
      es: 'Cuestionamos los supuestos del mercado y las soluciones evidentes, pero siempre desde la honestidad de proponer una hipótesis de trabajo superadora.',
      en: 'We question market assumptions and obvious solutions, but always from the honesty of proposing a better working hypothesis.',
    },
  },
  {
    id: 'sobrios-sugerentes',
    title: { es: 'Sobrios pero sugerentes', en: 'Restrained yet suggestive' },
    body: {
      es: 'Eliminamos el ruido visual y el adorno literario. La sofisticación reside en la precisión de la palabra elegida, no en la cantidad de texto.',
      en: 'We strip out visual noise and literary ornament. Sophistication lives in the precision of the chosen word, not in the volume of text.',
    },
  },
] as const;

export const forbiddenVocabulary = [
  'innovación', 'innovador', 'holístico', 'disruptivo', 'soluciones',
  'impacto (sin contexto)', 'storytelling', 'empoderamiento', 'mindset',
  'líderes', 'sinergia', '360', 'revolucionario', 'caso de éxito',
] as const;

export const substitutionMatrix = [
  {
    forbidden: 'Innovación / Innovador',
    replaceWith: { es: 'Sustituir por la solución o el cambio técnico real que se está proponiendo.', en: 'Replace with the actual technical solution or change being proposed.' },
  },
  {
    forbidden: 'Holístico / 360',
    replaceWith: { es: 'Sustituir por "contexto integrado", "análisis de sistema" o describir las variables que conviven.', en: 'Replace with "integrated context", "system analysis" or describe the variables that coexist.' },
  },
  {
    forbidden: 'Disruptivo',
    replaceWith: { es: 'Describir el impacto o la anomalía sin usar el adjetivo.', en: 'Describe the impact or anomaly without using the adjective.' },
  },
  {
    forbidden: 'Soluciones / Casos de éxito',
    replaceWith: { es: 'Hablar de "resultados", "hipótesis validadas" o "dirección estratégica".', en: 'Speak of "results", "validated hypotheses" or "strategic direction".' },
  },
  {
    forbidden: 'Empoderar / Mindset / Sinergia',
    replaceWith: { es: 'Eliminar por completo. Usar lenguaje directo: "capacitar", "criterio de equipo", "colaboración".', en: 'Remove entirely. Use direct language: "enable", "team criterion", "collaboration".' },
  },
] as const;

export const punctuationRules = {
  noExclamation: {
    es: 'Queda estrictamente prohibido el uso de signos de exclamación (¡ !). El énfasis se logra mediante el argumento, nunca alterando la puntuación.',
    en: 'The use of exclamation marks (!) is strictly forbidden. Emphasis is achieved through argument, never by altering punctuation.',
  },
  noEllipsis: {
    es: 'Evitar los puntos suspensivos (…) como recurso retórico. Las frases terminan con un punto firme.',
    en: 'Avoid ellipses (…) as a rhetorical device. Sentences end with a firm full stop.',
  },
} as const;

export const sentenceLength = { min: 15, max: 22, unit: 'words' } as const;

export const logoMinSize = {
  print: '10 mm de altura mínima',
  digital: '20 píxeles de altura mínima',
} as const;

export const brand = {
  name: 'Interactius',
  wordmark: 'interactīus',
  tagline: { es: 'Actitud liminal', en: 'Liminal attitude' },
  version: 'v1',
  versionDate: '2026-05',
  concept: {
    es: 'El Macrón ortográfico sobre la ī indica la vocal larga y la pronunciación correcta del logotipo. La marca utiliza este recurso como juego gráfico y dinámico.',
    en: 'The orthographic Macron over the ī marks the long vowel and the correct pronunciation of the logotype. The brand uses it as a graphic and dynamic device.',
  },
  visualUniverse: {
    es: 'Fotografía conceptual que captura el movimiento, la ambigüedad y la pausa. Representación de lo liminal: el espacio de transición y el concepto del Entre (el vacío con significado).',
    en: 'Conceptual photography that captures movement, ambiguity and pause. A representation of the liminal: the space of transition and the concept of the In-between (the void with meaning).',
  },
};
