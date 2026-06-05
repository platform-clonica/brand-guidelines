export type ColorToken = {
  name: string;
  hex: string;
  rgb: string;
  cmyk: string;
  /* Servicio asociado. Solo en colores de acento — cada acento identifica
     uno de los tres servicios canónicos de Interactius. */
  service?: { es: string; en: string; ca: string };
};

export const colorsBase: ColorToken[] = [
  { name: 'Dark',       hex: '#1C1A17', rgb: '28,26,23',    cmyk: '0,7,18,89' },
  { name: 'Pure White', hex: '#FFFFFF', rgb: '255,255,255', cmyk: '0,0,0,0'   },
  { name: 'Grey',       hex: '#E8E6E3', rgb: '232,230,227', cmyk: '0,1,2,9'   },
  { name: 'Warm Light', hex: '#F5F2ED', rgb: '245,242,237', cmyk: '0,1,3,4'   },
  { name: 'Warm Dark',  hex: '#E0DAD2', rgb: '224,218,210', cmyk: '0,3,6,12'  },
  { name: 'Ash',        hex: '#75706B', rgb: '117,112,107', cmyk: '0,4,9,54'  },
  { name: 'Ash Dark',   hex: '#46433F', rgb: '70,67,63',    cmyk: '0,4,10,73' },
];

export const colorsAccent: ColorToken[] = [
  { name: 'Opal',     hex: '#B0B5B0', rgb: '176,181,176', cmyk: '3,0,3,29',   service: { es: 'Pensamiento estratégico',  en: 'Strategic thinking',       ca: 'Pensament estratègic' } },
  { name: 'Bordeaux', hex: '#99335F', rgb: '153,51,95',   cmyk: '0,67,38,40', service: { es: 'Diseño de experiencias',   en: 'Experience design',        ca: 'Disseny d\'experiències' } },
  { name: 'Emerald',  hex: '#5999A6', rgb: '89,153,166',  cmyk: '46,8,0,35',  service: { es: 'Transformación cultural',  en: 'Cultural transformation',  ca: 'Transformació cultural' } },
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
  ca: 'No escrivim per demostrar el nostre pensament crític, sinó per activar el de qui ens llegeix. La nostra veu no busca l\'aplaudiment ni la complaença; busca moure el marc de la conversa. Ens posicionem com una mirada exploradora amb el rigor de qui sap on trepitja.',
} as const;

export const voiceAxes = [
  {
    id: 'directos-reflexivos',
    title: { es: 'Directos pero reflexivos', en: 'Direct yet reflective', ca: 'Directes però reflexius' },
    body: {
      es: 'Vamos al grano sin rodeos corporativos ni introducciones de relleno. Decimos las cosas de forma afilada, pero cada afirmación está sustentada en un criterio sólido.',
      en: 'We get to the point — no corporate detours, no filler intros. We say things sharply, but every assertion is backed by solid criteria.',
      ca: 'Anem al gra sense giragonses corporatives ni introduccions de farciment. Diem les coses de manera afilada, però cada afirmació se sustenta en un criteri sòlid.',
    },
  },
  {
    id: 'cercanos-profesionales',
    title: { es: 'Cercanos pero profesionales', en: 'Close yet professional', ca: 'Propers però professionals' },
    body: {
      es: 'Hablamos entre personas reales, no de corporación a corporación. El tono es accesible y humano (Tribu), pero mantiene la distancia justa que exige el rigor técnico.',
      en: 'We speak between real people, not corporation to corporation. The tone is accessible and human (Tribe), while keeping the precise distance technical rigour demands.',
      ca: 'Parlem entre persones reals, no de corporació a corporació. El to és accessible i humà (Tribu), però manté la distància justa que exigeix el rigor tècnic.',
    },
  },
  {
    id: 'criticos-constructivos',
    title: { es: 'Críticos pero constructivos', en: 'Critical yet constructive', ca: 'Crítics però constructius' },
    body: {
      es: 'Cuestionamos los supuestos del mercado y las soluciones evidentes, pero siempre desde la honestidad de proponer una hipótesis de trabajo superadora.',
      en: 'We question market assumptions and obvious solutions, but always from the honesty of proposing a better working hypothesis.',
      ca: 'Qüestionem els supòsits del mercat i les solucions evidents, però sempre des de l\'honestedat de proposar una hipòtesi de treball superadora.',
    },
  },
  {
    id: 'sobrios-sugerentes',
    title: { es: 'Sobrios pero sugerentes', en: 'Restrained yet suggestive', ca: 'Sobris però suggerents' },
    body: {
      es: 'Eliminamos el ruido visual y el adorno literario. La sofisticación reside en la precisión de la palabra elegida, no en la cantidad de texto.',
      en: 'We strip out visual noise and literary ornament. Sophistication lives in the precision of the chosen word, not in the volume of text.',
      ca: 'Eliminem el soroll visual i l\'ornament literari. La sofisticació rau en la precisió de la paraula triada, no en la quantitat de text.',
    },
  },
] as const;

/* Forbidden vocabulary con estructura tipada para eval automático.
   Cada entry: un concepto (root) + todas las formas que un LLM puede generar (family ES+EN).
   El eval engine usa `family` con regex word-boundary. La UI y los prompts usan
   `forbiddenVocabulary` (lista plana de términos canónicos para lectura humana). */

export type ForbiddenEntry = {
  root: string;
  family: readonly string[];
};

export const forbiddenVocabularyDetailed: readonly ForbiddenEntry[] = [
  // Núcleo histórico (v0)
  { root: 'innov',                  family: ['innovación','innovaciones','innovador','innovadora','innovadores','innovadoras','innovar','innovamos','innovate','innovates','innovating','innovation','innovations','innovative'] },
  { root: 'holist',                 family: ['holístico','holística','holísticos','holísticas','holistic','holistically'] },
  { root: 'disrupt',                family: ['disruptivo','disruptiva','disruptivos','disruptivas','disrupción','disruption','disruptive','disrupting','disrupt'] },
  { root: 'soluci',                 family: ['solución','soluciones','solution','solutions'] },
  { root: 'impacto',                family: ['impacto','impactos','impactar','impactamos','impactando','impact','impacts','impactful','impacting'] },
  { root: 'storytell',              family: ['storytelling','storyteller','storytellers','story-telling'] },
  { root: 'empoder',                family: ['empoderar','empoderamiento','empoderado','empoderada','empoderar','empower','empowerment','empowering','empowered'] },
  { root: 'mindset',                family: ['mindset','mindsets'] },
  { root: 'lider',                  family: ['líder','líderes','liderar','liderazgo','lideramos','leader','leaders','leading','leadership','lead'] },
  { root: 'sinergi',                family: ['sinergia','sinergias','synergy','synergies','synergistic'] },
  { root: '360',                    family: ['360','360º','360 grados','360-degree','360-grados'] },
  { root: 'revoluc',                family: ['revolucionario','revolucionaria','revolucionarios','revolucionarias','revolucionar','revolutionary','revolution','revolutionise','revolutionize','revolutionizing'] },
  { root: 'caso-exito',             family: ['caso de éxito','casos de éxito','success story','success stories','success case','case study'] },

  // Tics estratégicos / transformación
  { root: 'transform',              family: ['transformación','transformaciones','transformacional','transformador','transformadora','transformative','transformation','transforming','transformational'] },
  { root: 'ecosistema',             family: ['ecosistema','ecosistemas','ecosystem','ecosystems'] },
  { root: 'framework',              family: ['framework','frameworks'] },
  { root: 'journey',                family: ['journey','journeys','customer journey','user journey','journey del usuario','journey del cliente','viaje del usuario','viaje del cliente'] },
  { root: 'propuesta-valor',        family: ['propuesta de valor','propuestas de valor','propuesta única de valor','value proposition','value props','unique value proposition','uvp'] },
  { root: 'engagement',             family: ['engagement','engaging','engaged','engager'] },
  { root: 'stakeholder',            family: ['stakeholder','stakeholders','grupos de interés'] },
  { root: 'accionable',             family: ['accionable','accionables','actionable','actionables'] },
  { root: 'agil',                   family: ['ágil','ágiles','agile','agile-first','agility'] },
  { root: 'agnostico',              family: ['agnóstico','agnóstica','agnósticos','agnósticas','agnostic'] },
  { root: 'escalable',              family: ['escalable','escalables','escalabilidad','scalable','scalability'] },
  { root: 'valor-anadido',          family: ['valor añadido','valor agregado','added value','value-add','value-added','value add'] },
  { root: 'co-creacion',            family: ['co-creación','cocreación','co-crear','co-create','co-creation','cocreate','cocreation','co-creating'] },
  { root: 'diferencial',            family: ['diferencial','diferenciales','differentiator','differentiators'] },
  { root: 'data-driven',            family: ['data-driven','basado en datos','basada en datos','data driven','datadriven','data-led'] },
  { root: 'human-centric',          family: ['human-centric','human centric','centrado en el usuario','centrado en la persona','user-centric','user centric','people-centric'] },
  { root: 'end-to-end',             family: ['end-to-end','end to end','de extremo a extremo','extremo a extremo','endtoend'] },
  { root: 'experiencia-memorable',  family: ['experiencia memorable','experiencias memorables','memorable experience','memorable experiences','experiencia única','unique experience'] },
  { root: 'palanca',                family: ['palanca','palancas','palanca de cambio','palancas de crecimiento','lever','levers','growth lever','growth levers'] },
  { root: 'adn-marca',              family: ['adn de marca','adn de la marca','adn de empresa','brand dna','brand-dna'] },
  { root: 'partner-estrategico',    family: ['partner estratégico','partners estratégicos','strategic partner','strategic partners','strategic partnership'] },
  { root: 'vanguardia',             family: ['de vanguardia','a la vanguardia','vanguardista','cutting-edge','cutting edge','state-of-the-art','state of the art'] },
  { root: 'next-gen',               family: ['next-gen','next gen','next generation','nueva generación','siguiente generación','next-generation'] },
  { root: 'best-in-class',          family: ['best-in-class','best in class','el mejor de su clase','best-of-breed','best of breed'] },
  { root: 'world-class',            family: ['world-class','world class','de clase mundial'] },
  { root: 'maximiz',                family: ['maximizar','maximizamos','maximización','maximize','maximises','maximise','maximised','maximized','maximising','maximizing'] },
  { root: 'desbloquear',            family: ['desbloquear potencial','desbloquear valor','desbloquear el potencial','desbloquear el valor','unlock potential','unlock value','unlocking potential','unlocking value'] },
  { root: 'impulsar',               family: ['impulsar el cambio','impulsar el crecimiento','impulsar valor','impulsar la transformación','drive change','drive growth','driving change','driving growth'] },
  { root: 'abrazar-cambio',         family: ['abrazar el cambio','abrazamos el cambio','embrace change','embracing change'] },
  { root: 'expertise',              family: ['expertise'] },
  { root: 'de-la-mano',             family: ['de la mano','de la mano de','de la mano con','hand-in-hand','hand in hand'] },
  { root: 'punto-inflexion',        family: ['punto de inflexión','puntos de inflexión','inflection point','tipping point'] },
  { root: 'roadmap',                family: ['roadmap','roadmaps','hoja de ruta','hojas de ruta'] },
];

/* Lista plana de términos canónicos (un display por entry) — para lectura humana,
   /llms.txt, /api/brand.json y el master prompt. Mantiene la forma del export
   original para no romper consumidores. */
export const forbiddenVocabulary: readonly string[] = forbiddenVocabularyDetailed.map(
  (e) => e.family[0],
);

export const substitutionMatrix = [
  {
    forbidden: 'Innovación / Innovador',
    replaceWith: { es: 'Sustituir por la solución o el cambio técnico real que se está proponiendo.', en: 'Replace with the actual technical solution or change being proposed.', ca: 'Substituir per la solució o el canvi tècnic real que s\'està proposant.' },
  },
  {
    forbidden: 'Holístico / 360',
    replaceWith: { es: 'Sustituir por "contexto integrado", "análisis de sistema" o describir las variables que conviven.', en: 'Replace with "integrated context", "system analysis" or describe the variables that coexist.', ca: 'Substituir per "context integrat", "anàlisi de sistema" o descriure les variables que conviuen.' },
  },
  {
    forbidden: 'Disruptivo',
    replaceWith: { es: 'Describir el impacto o la anomalía sin usar el adjetivo.', en: 'Describe the impact or anomaly without using the adjective.', ca: 'Descriure l\'impacte o l\'anomalia sense fer servir l\'adjectiu.' },
  },
  {
    forbidden: 'Soluciones / Casos de éxito',
    replaceWith: { es: 'Hablar de "resultados", "hipótesis validadas" o "dirección estratégica".', en: 'Speak of "results", "validated hypotheses" or "strategic direction".', ca: 'Parlar de "resultats", "hipòtesis validades" o "direcció estratègica".' },
  },
  {
    forbidden: 'Empoderar / Mindset / Sinergia',
    replaceWith: { es: 'Eliminar por completo. Usar lenguaje directo: "capacitar", "criterio de equipo", "colaboración".', en: 'Remove entirely. Use direct language: "enable", "team criterion", "collaboration".', ca: 'Eliminar per complet. Fer servir llenguatge directe: "capacitar", "criteri d\'equip", "col·laboració".' },
  },
] as const;

export const punctuationRules = {
  noExclamation: {
    es: 'Queda estrictamente prohibido el uso de signos de exclamación (¡ !). El énfasis se logra mediante el argumento, nunca alterando la puntuación.',
    en: 'The use of exclamation marks (!) is strictly forbidden. Emphasis is achieved through argument, never by altering punctuation.',
    ca: 'Queda estrictament prohibit l\'ús de signes d\'exclamació (¡ !). L\'èmfasi s\'aconsegueix mitjançant l\'argument, mai alterant la puntuació.',
  },
  noEllipsis: {
    es: 'Evitar los puntos suspensivos (…) como recurso retórico. Las frases terminan con un punto firme.',
    en: 'Avoid ellipses (…) as a rhetorical device. Sentences end with a firm full stop.',
    ca: 'Evitar els punts suspensius (…) com a recurs retòric. Les frases acaben amb un punt ferm.',
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
  tagline: { es: 'Actitud liminal', en: 'Liminal attitude', ca: 'Actitud liminal' },
  version: 'v1',
  versionDate: '2026-05',
  concept: {
    es: 'El Macrón ortográfico sobre la ī indica la vocal larga y la pronunciación correcta del logotipo. La marca utiliza este recurso como juego gráfico y dinámico.',
    en: 'The orthographic Macron over the ī marks the long vowel and the correct pronunciation of the logotype. The brand uses it as a graphic and dynamic device.',
    ca: 'El Macró ortogràfic sobre la ī indica la vocal llarga i la pronunciació correcta del logotip. La marca utilitza aquest recurs com a joc gràfic i dinàmic.',
  },
  visualUniverse: {
    es: 'Fotografía conceptual que captura el movimiento, la ambigüedad y la pausa. Representación de lo liminal: el espacio de transición y el concepto del Entre (el vacío con significado).',
    en: 'Conceptual photography that captures movement, ambiguity and pause. A representation of the liminal: the space of transition and the concept of the In-between (the void with meaning).',
    ca: 'Fotografia conceptual que captura el moviment, l\'ambigüitat i la pausa. Representació d\'allò liminal: l\'espai de transició i el concepte de l\'Entre (el buit amb significat).',
  },
};

/* ─── Few-shot examples (capa pedagógica para LLMs y humanos) ───
   v0 redactado desde la matriz dura. Iterar conforme se aprueben piezas reales.
   Cubre 5 formatos en approved y 5 tipos de violación en rejected.
   Todas las frases con verbo respetan sentenceLength.min/max (15-22 palabras). */

export type FewShotExampleStatus = 'approved' | 'rejected';
export type FewShotExampleFormat =
  | 'headline'
  | 'lead'
  | 'social-post'
  | 'email-intro'
  | 'deck-cover';

export type FewShotExample = {
  id: string;
  format: FewShotExampleFormat;
  status: FewShotExampleStatus;
  text: { es: string; en: string; ca: string };
  rationale: { es: string; en: string; ca: string };
  violations?: readonly string[];
  rewrite?: { es: string; en: string; ca: string };
};

export const examples: readonly FewShotExample[] = [
  {
    id: 'headline-landing',
    format: 'headline',
    status: 'approved',
    text: {
      es: 'Trabajamos en el espacio que existe entre la decisión obvia y la decisión que aún nadie ha defendido.',
      en: "We work in the space between the obvious decision and the decision no one has defended yet.",
      ca: 'Treballem en l\'espai que existeix entre la decisió òbvia i la decisió que encara ningú no ha defensat.',
    },
    rationale: {
      es: 'Encarna la actitud liminal sin nombrarla. Sintaxis directa de 18 palabras, vocabulario propio, ningún término de la lista roja.',
      en: 'Embodies the liminal attitude without naming it. Direct syntax at 17 words, distinctive vocabulary, no red-list terms.',
      ca: 'Encarna l\'actitud liminal sense anomenar-la. Sintaxi directa de 18 paraules, vocabulari propi, cap terme de la llista vermella.',
    },
  },
  {
    id: 'lead-servicio',
    format: 'lead',
    status: 'approved',
    text: {
      es: 'Diseñamos servicios para empresas que ya no creen que la claridad nace de añadir más capas a un proceso. Cada proyecto empieza preguntando qué pieza del sistema sostiene realmente la conversación con quien decide.',
      en: 'We design services for companies that no longer believe clarity comes from adding more layers to a process. Every project begins by asking which piece of the system actually carries the conversation with whoever decides.',
      ca: 'Dissenyem serveis per a empreses que ja no creuen que la claredat neix d\'afegir més capes a un procés. Cada projecte comença preguntant quina peça del sistema sosté realment la conversa amb qui decideix.',
    },
    rationale: {
      es: 'Dos frases en rango (19 y 15 palabras) con tono crítico-constructivo. Sin lista roja, posicionamiento ideológico antes que descripción de servicios.',
      en: 'Two sentences in range (18 and 17 words) with a critical-constructive tone. No red-list terms, ideological positioning rather than service description.',
      ca: 'Dues frases en rang (19 i 15 paraules) amb to crític-constructiu. Sense llista vermella, posicionament ideològic abans que descripció de serveis.',
    },
  },
  {
    id: 'social-post-linkedin',
    format: 'social-post',
    status: 'approved',
    text: {
      es: 'La mayoría de procesos de diseño no fallan por falta de creatividad, fallan por exceso de consenso temprano. Decidir antes de tiempo no acelera el proyecto: atasca el siguiente cruce de criterio donde había algo importante que escuchar. El trabajo de un diseñador con criterio empieza por defender la duda durante el tiempo que esa duda merece.',
      en: "Most design processes don't fail for lack of creativity, they fail from too much consensus too early. Deciding ahead of time doesn't speed the project up: it jams the next crossing of criterion that was actually worth hearing. A designer with judgement starts by defending the doubt for as long as that doubt deserves.",
      ca: 'La majoria de processos de disseny no fallen per falta de creativitat, fallen per excés de consens primerenc. Decidir abans d\'hora no accelera el projecte: encalla el següent encreuament de criteri on hi havia alguna cosa important a escoltar. La feina d\'un dissenyador amb criteri comença per defensar el dubte durant el temps que aquell dubte mereix.',
    },
    rationale: {
      es: 'Tres frases en rango (18, 20, 19) que defienden una hipótesis incómoda. Cercano-profesional, sin signos prohibidos, sin léxico de consultora.',
      en: 'Three sentences in range (17, 21, 16) defending an uncomfortable hypothesis. Close-professional, no banned punctuation, no consultancy lexicon.',
      ca: 'Tres frases en rang (18, 20, 19) que defensen una hipòtesi incòmoda. Proper-professional, sense signes prohibits, sense lèxic de consultora.',
    },
  },
  {
    id: 'email-intro-cliente',
    format: 'email-intro',
    status: 'approved',
    text: {
      es: 'Antes de proponer cualquier alcance, nos interesa entender cómo decide hoy el equipo y qué fricción concreta justifica abrir esta conversación. Lo que enviemos después dependerá menos de plantillas internas y más de la respuesta a esas dos preguntas.',
      en: 'Before we propose any scope, we want to understand how your team decides today and what specific friction justifies opening this conversation. Whatever we send next will depend less on internal templates and more on the answer to those two questions.',
      ca: 'Abans de proposar cap abast, ens interessa entendre com decideix avui l\'equip i quina fricció concreta justifica obrir aquesta conversa. El que enviem després dependrà menys de plantilles internes i més de la resposta a aquestes dues preguntes.',
    },
    rationale: {
      es: 'Marca distancia técnica desde la primera línea: invierte el orden habitual (entender antes que proponer). Dos frases en 21 y 18 palabras.',
      en: 'Sets technical distance from the first line: inverts the usual order (understand before proposing). Two sentences at 22 and 19 words.',
      ca: 'Marca distància tècnica des de la primera línia: inverteix l\'ordre habitual (entendre abans que proposar). Dues frases en 21 i 18 paraules.',
    },
  },
  {
    id: 'deck-cover',
    format: 'deck-cover',
    status: 'approved',
    text: {
      es: 'La estrategia de un servicio no se redacta, se prueba el día en que alguien tiene que defender una decisión incómoda.\n\nDiagnóstico de criterios y arquitectura de decisión preparado para [Cliente] como base de la propuesta presentada en mayo de 2026.',
      en: "A service strategy isn't written, it gets tested the day someone in the room has to defend an uncomfortable decision out loud.\n\nCriteria diagnostic and decision architecture prepared for [Client] as the basis of the proposal delivered in May 2026.",
      ca: 'L\'estratègia d\'un servei no es redacta, es prova el dia en què algú ha de defensar una decisió incòmoda.\n\nDiagnòstic de criteris i arquitectura de decisió preparat per a [Client] com a base de la proposta presentada el maig de 2026.',
    },
    rationale: {
      es: 'Titular fuerte (21 palabras) que activa criterio en lugar de declararlo. Bajada formal completa como frase, no como etiqueta.',
      en: 'A sharp title (22 words) that activates judgement rather than declaring it. A full-sentence subtitle, not a label.',
      ca: 'Titular fort (21 paraules) que activa criteri en lloc de declarar-lo. Baixada formal completa com a frase, no com a etiqueta.',
    },
  },
  {
    id: 'rejected-multi-forbidden',
    format: 'headline',
    status: 'rejected',
    text: {
      es: 'Diseñamos soluciones innovadoras y holísticas para empresas líderes que buscan un impacto disruptivo y revolucionario en su sector.',
      en: 'We design innovative, holistic solutions for leading companies seeking disruptive impact and revolutionary momentum in their sector.',
      ca: 'Dissenyem solucions innovadores i holístiques per a empreses líders que busquen un impacte disruptiu i revolucionari en el seu sector.',
    },
    violations: [
      'forbidden:soluciones',
      'forbidden:innovadoras',
      'forbidden:holísticas',
      'forbidden:líderes',
      'forbidden:impacto',
      'forbidden:disruptivo',
      'forbidden:revolucionario',
    ],
    rationale: {
      es: 'Acumula siete términos de la lista roja en una sola frase. Suena a folleto genérico de consultora de los años 2010.',
      en: 'Stacks seven red-list terms in a single sentence. Reads like a generic consultancy brochure from the 2010s.',
      ca: 'Acumula set termes de la llista vermella en una sola frase. Sona a fullet genèric de consultora dels anys 2010.',
    },
    rewrite: {
      es: 'Diseñamos servicios para equipos que necesitan rediscutir las decisiones que su industria da por descontadas.',
      en: 'We design services for teams that need to re-question the decisions their industry takes for granted.',
      ca: 'Dissenyem serveis per a equips que necessiten rediscutir les decisions que la seva indústria dóna per descomptades.',
    },
  },
  {
    id: 'rejected-length-over',
    format: 'lead',
    status: 'rejected',
    text: {
      es: 'En interactīus diseñamos servicios pensando en cada detalle del recorrido completo del usuario desde el momento exacto en que descubre la marca hasta que decide volver, asegurando que cada paso intermedio refleje una atención obsesiva al criterio del cliente final, sin perder el espíritu de la marca.',
      en: "At interactīus we design services thinking carefully about every detail of the user's complete journey from the precise moment they discover the brand until they decide to return, making sure each intermediate step reflects an obsessive attention to the final client's criterion without losing the spirit of the brand.",
      ca: 'A interactīus dissenyem serveis pensant en cada detall del recorregut complet de l\'usuari des del moment exacte en què descobreix la marca fins que decideix tornar, assegurant que cada pas intermedi reflecteixi una atenció obsessiva al criteri del client final, sense perdre l\'esperit de la marca.',
    },
    violations: ['length:over_max'],
    rationale: {
      es: 'Una única frase de 47 palabras: rompe el techo de sentenceLength (22) y diluye la idea principal en aposiciones sucesivas.',
      en: 'A single 48-word sentence: breaks the sentenceLength ceiling (22) and dilutes the core idea across successive appositions.',
      ca: 'Una única frase de 47 paraules: trenca el sostre de sentenceLength (22) i dilueix la idea principal en aposicions successives.',
    },
    rewrite: {
      es: 'En interactīus diseñamos servicios cuidando cada paso del recorrido del usuario, desde el primer contacto hasta el retorno. Cada decisión intermedia refleja el criterio del cliente final sin diluir el carácter de la marca durante el proceso.',
      en: "At interactīus we design services caring for every step of the user's journey, from first contact to return. Every intermediate decision reflects the final client's criterion without diluting the brand's character along the way.",
      ca: 'A interactīus dissenyem serveis tenint cura de cada pas del recorregut de l\'usuari, des del primer contacte fins al retorn. Cada decisió intermèdia reflecteix el criteri del client final sense diluir el caràcter de la marca durant el procés.',
    },
  },
  {
    id: 'rejected-exclamation',
    format: 'email-intro',
    status: 'rejected',
    text: {
      es: '¡Bienvenido a interactīus! Creemos firmemente en transformar la manera en que las marcas conversan con sus audiencias…',
      en: 'Welcome to interactīus! We firmly believe in transforming the way brands talk to their audiences…',
      ca: 'Benvingut a interactīus! Creiem fermament en transformar la manera com les marques conversen amb les seves audiències…',
    },
    violations: ['punctuation:exclamation', 'punctuation:ellipsis'],
    rationale: {
      es: 'Combina exclamación y puntos suspensivos en dos frases. Rompe ambas reglas de puntuación y suena complaciente desde la primera palabra.',
      en: 'Combines an exclamation mark and ellipsis in two sentences. Breaks both punctuation rules and reads complacent from the first word.',
      ca: 'Combina exclamació i punts suspensius en dues frases. Trenca ambdues regles de puntuació i sona complaent des de la primera paraula.',
    },
    rewrite: {
      es: 'Damos la bienvenida a interactīus como un sistema de criterio antes que como un proyecto cerrado de diseño. Creemos que las marcas necesitan reaprender la manera en que conversan con quien decide su existencia.',
      en: 'We welcome interactīus as a system of criterion before treating it as a finished design project. We believe brands need to relearn the way they speak with whoever decides their existence.',
      ca: 'Donem la benvinguda a interactīus com un sistema de criteri abans que com un projecte tancat de disseny. Creiem que les marques necessiten reaprendre la manera com conversen amb qui decideix la seva existència.',
    },
  },
  {
    id: 'rejected-aplauso',
    format: 'social-post',
    status: 'rejected',
    text: {
      es: 'Ha sido un absoluto honor acompañar a este increíble equipo que ha demostrado un compromiso ejemplar con cada hito del proyecto.',
      en: 'It has been an absolute honour to accompany this incredible team that has shown exemplary commitment to every milestone of the project.',
      ca: 'Ha estat un absolut honor acompanyar aquest increïble equip que ha demostrat un compromís exemplar amb cada fita del projecte.',
    },
    violations: ['voice:aplauso'],
    rationale: {
      es: 'Cumple la lista roja y la longitud pero busca aplauso: "absoluto honor", "increíble", "ejemplar". Viola el principio de voz.',
      en: 'Passes the red list and length but seeks applause: "absolute honour", "incredible", "exemplary". Violates the voice principle.',
      ca: 'Compleix la llista vermella i la longitud però busca aplaudiment: "absolut honor", "increïble", "exemplar". Viola el principi de veu.',
    },
    rewrite: {
      es: 'El equipo cumplió cada hito sin necesitar refuerzos retóricos, lo que hace que la lectura del proyecto sea más honesta.',
      en: "The team hit every milestone without needing rhetorical reinforcement, which makes the project's reading more honest.",
      ca: 'L\'equip va complir cada fita sense necessitar reforços retòrics, cosa que fa que la lectura del projecte sigui més honesta.',
    },
  },
  {
    id: 'rejected-consultora-generica',
    format: 'lead',
    status: 'rejected',
    text: {
      es: 'Acompañamos a organizaciones complejas en procesos de cambio cultural, desde la definición estratégica hasta la activación operativa en la estructura.',
      en: 'We accompany complex organisations through cultural change processes, from strategic definition to operational activation at every level of the structure.',
      ca: 'Acompanyem organitzacions complexes en processos de canvi cultural, des de la definició estratègica fins a l\'activació operativa en l\'estructura.',
    },
    violations: ['voice:generic-consultancy'],
    rationale: {
      es: 'El caso más peligroso: pasa todos los filtros automáticos pero podría ser de McKinsey. Léxico institucional vacío, cero posicionamiento.',
      en: 'The most dangerous case: passes every automated filter but could be McKinsey. Empty institutional lexicon, zero positioning.',
      ca: 'El cas més perillós: passa tots els filtres automàtics però podria ser de McKinsey. Lèxic institucional buit, zero posicionament.',
    },
    rewrite: {
      es: 'Trabajamos con organizaciones donde cualquier cambio cultural depende de quién en la estructura está dispuesto a defenderlo cuando incomode.',
      en: 'We work with organisations where any cultural change depends on who in the structure will defend it when it becomes uncomfortable.',
      ca: 'Treballem amb organitzacions on qualsevol canvi cultural depèn de qui dins l\'estructura està disposat a defensar-lo quan incomodi.',
    },
  },
];
