/* Interactius Forms — la capa de metadatos de una página de formulario: compartir, indexar y GEO.

   Tres decisiones, y conviene no confundirlas:

   1. COMPARTIR (siempre activo). Título, descripción e imagen para que el enlace se despliegue
      bien en WhatsApp, Slack o LinkedIn. Esto no tiene nada que ver con buscadores: un enlace
      privado también se pega en un chat, y ahí el unfurl es lo único que se ve. Es el mismo
      criterio del visor de presentaciones (app/deck/[id]/view/page.tsx), que es `noindex` y aun
      así publica OG completo.

   2. INDEXAR (`indexable`, por defecto NO). Los formularios son enlaces privados de cliente
      (PRD §9, §10) y siguen naciendo `noindex, nofollow`. El interruptor levanta el noindex de
      una pieza concreta — una encuesta abierta, una convocatoria — y nada más.

   3. GEO (`ai_crawlers`, por defecto `block`). Qué pueden hacer los rastreadores de los motores
      generativos. Se emite como metaetiquetas por agente, que es la convención documentada para
      robots meta (`<meta name="googlebot" content="noindex">` y sus equivalentes) y la que
      declaran seguir GPTBot y compañía.

      Límite honesto: una metaetiqueta la lee quien decide leerla. El control duro de un
      rastreador es robots.txt o una regla en el borde, y ninguno de los dos puede depender del
      formulario concreto —el middleware no sabe qué formulario se está pidiendo sin consultar la
      base de datos en cada petición—. Esto es una declaración de intenciones legible por máquina,
      no un cortafuegos. */

import type { FormDraft } from './schema.ts';

export const SITE = 'https://brand.interactius.com';

/* Agentes de motores generativos con un token propio reconocido. La lista es la parte que
   envejece: se revisa cuando aparezca uno nuevo, no se adivina. */
export const AI_AGENTS = [
  'GPTBot',            // OpenAI — entrenamiento
  'OAI-SearchBot',     // OpenAI — búsqueda en ChatGPT
  'ChatGPT-User',      // OpenAI — navegación a petición del usuario
  'ClaudeBot',         // Anthropic — entrenamiento
  'Claude-Web',        // Anthropic — navegación
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',   // Gemini / Vertex, separado de Googlebot a propósito
  'Applebot-Extended',
  'CCBot',             // Common Crawl, del que beben casi todos
  'Bytespider',
  'meta-externalagent',
] as const;

/* La URL canónica del formulario: la slug si la tiene, el id opaco si no.
   Que sea canónica importa justo cuando hay dos caminos al mismo sitio, que es exactamente lo
   que introduce la slug. */
export function formPath(def: Pick<FormDraft, 'id' | 'slug'>): string {
  return `/forms/f/${def.slug ?? def.id}`;
}

export function formUrl(def: Pick<FormDraft, 'id' | 'slug'>): string {
  return `${SITE}${formPath(def)}`;
}

/* La descripción para compartir. Si el autor no escribió una, se compone la misma frase que ya
   usa el visor de presentaciones para su OG: no inventamos texto de marketing, solo decimos de
   quién es. Sin cliente, no hay descripción: mejor vacío que relleno. */
export function shareDescription(def: Pick<FormDraft, 'description' | 'client'>): string | undefined {
  const own = def.description?.trim();
  if (own) return own;
  return def.client?.trim() ? `Formulario para ${def.client.trim()}` : undefined;
}

/* Metaetiquetas por agente. Solo se emiten al BLOQUEAR: permitir es la ausencia de directiva,
   y una etiqueta `index, follow` por agente sería ruido sin efecto. */
export function aiCrawlerMeta(def: Pick<FormDraft, 'ai_crawlers'>): Record<string, string> {
  if (def.ai_crawlers !== 'block') return {};
  return Object.fromEntries(AI_AGENTS.map((a) => [a, 'noindex, nofollow, noarchive']));
}

/* Datos estructurados. Solo cuando el formulario es indexable: en una página `noindex` no los
   lee nadie y lo único que harían es publicar el nombre del cliente en el HTML de un enlace
   privado. `inLanguage` refleja el `lang="es"` que declara app/layout.tsx para todo /forms. */
export function formJsonLd(def: FormDraft): Record<string, unknown> | null {
  if (!def.indexable) return null;

  const description = shareDescription(def);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: def.title,
    ...(description ? { description } : {}),
    url: formUrl(def),
    inLanguage: 'es',
    isPartOf: { '@type': 'WebSite', name: 'Interactius', url: SITE },
    publisher: { '@type': 'Organization', name: 'Interactius', url: 'https://interactius.com' },
  };
}
