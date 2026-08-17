# ReWrit_r — reescritura de correos y textos

> Pegas un borrador, ajustas el tono, y sale el texto reescrito con la voz de marca aplicada.
> Tercera herramienta del workspace, junto a DeckMak_r y FormMak_r.

Estado: **implementado**.

## Contexto

El manual ya sabía explicar la voz — los cuatro ejes, la lista roja, la matriz de sustitución — y
ya sabía auditarla (`/api/eval`). Lo que no había era nada que la **aplicara** a un texto concreto.
El salto de "leer las reglas" a "escribir un correo que las cumpla" seguía siendo manual, y en la
práctica se hacía copiando el prompt del manual a un chat suelto.

ReWrit_r cierra ese hueco dentro del workspace: mismo login, mismo chrome, misma fuente de verdad.

## Alcance

**Sí:** un borrador, un contexto opcional, cuatro tipos de texto, seis perfiles de tono, dos ejes
(formalidad y calidez), longitud, idioma de salida, y un interruptor para desactivar la voz de
marca. Devuelve asunto (solo en correo), cuerpo, qué cambió y la puntuación del eval.

**No:** historial, plantillas guardadas, envío de correo, edición del resultado en la propia
herramienta. Se copia y se pega donde toque.

## Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Ruta | `/workspace/rewrit_r` | Herramienta interna: mismo sitio y mismo login que las otras dos |
| El prompt se compone, no se escribe | desde `lib/tokens.ts` | Tocar la lista roja en tokens cambia lo que exige la herramienta, sin editarla |
| Idioma de la interfaz | castellano, sin next-intl | El workspace es interno; el trilingüe es de la web pública |
| Idioma del texto | `auto` \| es \| ca \| en | Es otra cosa que el idioma de la interfaz, y sí se elige |
| Tipo de texto | correo · mensaje · presentación · documento | Eje ortogonal al perfil: el perfil dice *a quién*, el tipo dice *en qué formato*. Cambia asunto, saludo, despedida y fragmento contra prosa |
| Tipo sin `auto` | por defecto `correo` | El idioma de un borrador puede sorprender; el tipo no. Con `auto`, el asunto y la nota de voz dependerían de una decisión del modelo que habría que devolver en el esquema |
| Una sola tabla para el tipo | `TEXT_TYPES` en `options.ts` | La regla que viaja al prompt y la que aplica el eval salen de la misma entrada. Hay un test que lo asserta |
| Longitud, por regla | `under_min` se suprime en mensaje y presentación; `over_max` se mantiene en los cuatro | El ejemplo aprobado `deck-cover` tiene frases de 21–22 palabras: suprimir el techo contradiría material aprobado |
| Formato de salida | structured outputs (`output_config.format`) | La API impone el esquema: no hay backticks que limpiar ni JSON a medias |
| Modelo | `claude-opus-5`, `effort: 'low'` | Un correo es corto con restricciones duras. Esfuerzo bajo mantiene la latencia lejos del 504 que ya mordió en `/api/translate` |
| Auditoría del resultado | `evalText()`, el motor de `/api/eval` | Se comprueba la salida contra las reglas en vez de confiar en el modelo |
| Estilos | inline, como el resto del studio | La pantalla ya es interactiva entera; no gana nada sacando el hover a CSS |

## Ficheros

```
NUEVO
  lib/rewriter/options.ts                  perfiles, ejes, idiomas, longitudes y validadores
  lib/rewriter/prompt.ts                   el system prompt, compuesto desde lib/tokens.ts
  lib/rewriter/__tests__/prompt.test.ts    la voz sale de los tokens, no de una copia
  app/api/rewrite/route.ts                 endpoint; exige sesión vía EDITOR_API
  app/workspace/rewrit_r/page.tsx          server component: metadata + la app
  components/rewriter/Rewriter.tsx         la herramienta

  lib/rewriter/lengthPolicy.ts             la regla de longitud por tipo, pura y testeable

MODIFICADO
  lib/eval.ts                              exports aditivos: isLengthViolation, scoreFor, hardFailFor
  app/api/eval/manual/route.ts             consume la rúbrica en vez de recalcularla a mano
  lib/workspace/catalog.ts                 entrada `rewritr` (antes de la deshabilitada)
  lib/workspace/__tests__/catalog.test.ts  orden de `tools` y ruta real
  middleware.ts                            /api/rewrite en EDITOR_API
  package.json                             el glob de tests incluye lib/rewriter
  docs/features/urls-workspace.md          la tabla de URLs
  .env.example                             ANTHROPIC_API_KEY la usan dos rutas, no una
```

## El prompt

`buildRewriterPrompt()` es una función pura. Compone seis bloques:

1. **Rol** — editor de textos de Interactius.
2. **Formato de la pieza** — el `hint` del tipo elegido: asunto sí o no, saludo y despedida sí o
   no, fragmento contra prosa.
3. **Ajuste de tono** — el `hint` del perfil elegido, más las etiquetas de los dos ejes.
4. **Idioma y longitud**.
5. **Contexto**, solo si el usuario escribió alguno.
6. **Voz de marca** — principio, longitud de frase, puntuación, cuatro ejes, lista roja en JSON y
   matriz de sustitución. Todo importado de `lib/tokens.ts`.

El bloque 6 se escribe en el idioma de salida cuando está fijado: los tokens ya son trilingües,
así que sale gratis. Con `auto` va en castellano, que es el idioma de la marca.

Con la voz desactivada, el bloque 6 se sustituye por una línea que pide un tono profesional
genérico. El test comprueba que entonces **no** viaja ninguna palabra de la lista roja.

### La unión entre el prompt y el eval

`allowFragments`, en la entrada de `TEXT_TYPES`, gobierna dos cosas a la vez: la línea de longitud
de frase que viaja en el bloque 6, y el descarte de `length:under_min` al puntuar el resultado
(`lib/rewriter/lengthPolicy.ts`). **Es deliberado que sea un solo campo.** Si se separaran, la
herramienta podría pedir un titular y después bajarle la nota por ser un titular. Hay un test que
recorre los cuatro tipos y assertá que las dos caras se mueven juntas.

La política **no toca `over_max`** ni cambia `hardFail` — las violaciones de longitud ya eran
blandas. Lo único que corrige es el número: antes un mensaje de chat impecable sacaba ~50/100, y
eso enseña a ignorar el indicador.

## Verificación

**Automática**

- `lib/rewriter/__tests__/prompt.test.ts` — procedencia de la voz, perfiles, ejes, idioma,
  contexto condicional y validadores. Y del tipo: diferencial exhaustivo (cada tipo da un prompt
  distinto), procedencia del `hint`, exclusividad, regla del asunto, coherencia prompt↔eval y tope
  de tamaño del prompt.
- `lib/rewriter/__tests__/lengthPolicy.test.ts` — la forma corta deja de penalizar solo donde
  corresponde, el techo de 22 palabras aguanta en los cuatro tipos, y la rúbrica compartida
  (`scoreFor`/`hardFailFor`) mantiene las fórmulas que antes estaban inline.
- `lib/workspace/__tests__/catalog.test.ts` — la entrada nueva y el orden de las tarjetas.
- `npm run type-check` y `npm run build` limpios.

**Manual** (requiere `ANTHROPIC_API_KEY`)

1. Sin sesión, `/workspace/rewrit_r` → redirige a `/workspace/login?next=…`.
2. La tarjeta ReWrit_r aparece en `/workspace`, tercera de Tools.
3. Un borrador con "sinergia" o "innovador" sale reescrito sin esas palabras.
4. Un borrador con exclamaciones sale sin ellas, y el eval marca 100.
5. Con la voz desactivada, el resultado ya no respeta la lista roja — y el eval lo señala.
6. Idioma `EN` sobre un borrador en castellano devuelve inglés.
7. `POST /api/rewrite` sin cookie de sesión → 401 del middleware.
8. El mismo borrador en los cuatro tipos da cuatro salidas distintas.
9. En `mensaje` no aparece el bloque "Asunto", y copiar no antepone líneas en blanco.
10. Un mensaje corto y correcto ya no saca ~50/100.
11. Una frase de 40 palabras sigue penalizando también en `presentacion`.

## Pendiente

- **Latencia en Netlify.** `maxDuration = 60`, pero el gateway puede cortar antes. Si aparecen
  504 con borradores largos, el orden de los diales es: bajar `MAX_DRAFT`, o pasar la ruta a
  streaming como `/api/translate`.
- **Sin historial.** Cada reescritura se pierde al recargar. Si acaba haciendo falta, el sitio
  natural es Supabase, como el resto del workspace.
- **Few-shot en el prompt.** Los 10 `examples` de `lib/tokens.ts` no los consume ningún prompt del
  repo. Entrega aparte, y con un giro: los `approved` son ejemplos de *generación*, forma
  equivocada para una herramienta que reescribe; los `rejected` traen `text` + `rewrite`, que son
  pares entrada→salida de esta tarea exacta. Además son v0 sintéticos por declaración propia
  (`tokens.ts:254`).
- **El `type` muerto de `/api/eval`.** `app/api/eval/route.ts:12` documenta `copy|headline|lead`
  sin implementar: otro vocabulario de formato en competencia con `TEXT_TYPES` y con
  `FewShotExampleFormat`. Reconciliarlos es una tarea propia.
- **Dictado por voz.** Analizado y decidido (Chrome/Edge, Web Speech API, hook con motor
  intercambiable para poder pasar a transcripción en servidor sin tocar la interfaz).
