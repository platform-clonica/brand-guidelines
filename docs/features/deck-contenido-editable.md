# Todo el contenido de las slides, editable en el markdown (y traducible)

## Context

El generador de decks compila markdown → `Slide` tipado → componentes de layout. Hoy **no todo el
contenido vive en el markdown**: cuatro páginas de marca (manifiesto, equipo, clientes, aceptación)
se declaran con un marcador vacío (`[ly: manifiesto]`, etc.) en las plantillas, y su copy canónico
vive como constantes `DEFAULT_*` dentro de los componentes React. Además, varias etiquetas/antetítulos
se pintan hardcodeados aunque el texto equivalente ya esté en el markdown (`Contexto`, `El reto`,
`Presupuesto`, `Condiciones`, la etiqueta de hitos del Gantt).

Consecuencias: el usuario **no puede editar** ese texto desde el editor, y la **traducción no lo toca**
(el traductor solo ve el markdown, `app/api/translate/route.ts`). Objetivo: que el 100% del *texto de
contenido* de cada slide salga del markdown, con una estructura clara y comprensible, manteniendo el
diseño visual idéntico (UI Kit / `deck.css`).

**Decisiones del usuario:**
- Alcance = solo **contenido**. Queda como mobiliario fijo (fuera): Chrome `2026`/`Interactius`, números
  de página, glifo `◆`, y las etiquetas estructurales de Roadmap (`Fase 01`, `¿Qué hacemos?`) y `Total`.
- El copy de marca de los componentes se **mantiene como fallback** (los 3 decks ya guardados en Supabase
  tienen estos bloques vacíos y deben seguir renderizando su copy). Compatibilidad total, sin migración.

La estrategia es: **(A)** rellenar las plantillas con el copy canónico inline (editable + traducible),
**(B)** endurecer el prompt de traducción para no romper las claves estructurales, y **(C)** pintar desde
el markdown las etiquetas que hoy están hardcodeadas, siempre con `?? DEFAULT` como respaldo.

## Convención de markdown (por layout)

Todas las páginas siguen el modelo existente: 1 bloque (`---`) = 1 slide, primera línea `[ly: marcador]`.

- **Manifiesto** (`[ly: manifiesto]`): `# título` + párrafo de subtítulo. Énfasis con barras:
  `/ palabra /` (barra-espacio … espacio-barra) → `<span class="emph">/ palabra /</span>`.
  Ej: `# Ayudamos a las organizaciones en momentos de / transformación / a decidir con criterio.`
- **Equipo** (`[ly: equipo]`): párrafos (uno por línea), `**negrita**` admitida, + `![alt](img)`.
- **Clientes** (`[ly: clientes]`): `![alt](img)` (solo el `alt` es traducible).
- **Aceptación** (`[ly: aceptacion]`): `# título` + líneas clave:valor + `![Firma](img)`:
  `nombre:`, `cargo:`, `empresa:`, `nif:`, `direccion:` (una sola línea), `aviso:`, `cta:`.
- **Contexto** / **El reto**: el antetítulo en MAYÚSCULAS (`CONTEXTO` / `EL RETO`) ya presente se
  **renderiza** como eyebrow (hoy se usa solo para detección y se descarta).
- **Presupuesto**: el `## Presupuesto` y el `### Condiciones` ya presentes se renderizan como título y
  etiqueta (hoy hardcodeados). `Total` se queda fijo (decisión de alcance).
- **Gantt**: la etiqueta de la fila de hitos sale de la propia clave `hitos <etiqueta>:`
  (`hitos cliente:` → "Cliente"). El `hitos` se mantiene verbatim.

## Implementación

### Fase A — Rellenar plantillas (sin código; mayor impacto) · `lib/deck/templates.ts`
Sustituir en la plantilla **COMERCIAL** los 4 bloques de marca vacíos por el copy canónico, copiándolo
verbatim de las constantes `DEFAULT_*` de los componentes usando las convenciones de arriba:
- `[ly: manifiesto]` → título (con `/ transformación /`) + subtítulo (`Manifesto.tsx` `DEFAULT_TITLE`/`DEFAULT_SUB`).
- `[ly: equipo]` → 5 párrafos (incl. el `**…**`) + `![Equipo Interactius](/presentaciones/team.png)` (`Team.tsx`).
- `[ly: clientes]` → `![Clientes de Interactius](/presentaciones/clients.png)` (`Clients.tsx`).
- `[ly: aceptacion]` → `# Aprobación del presupuesto` + claves del firmante + `aviso:` + `cta:` +
  `![Firma](/presentaciones/sign.png)` (`Acceptance.tsx` `DEFAULT_*`).
`INFORME`/`GENERICA` no llevan páginas de marca → sin cambios.

### Fase B — Endurecer traducción · `app/api/translate/route.ts`
Ajustar `systemPrompt()` (hoy dice "translate Label: value labels", lo que rompería las claves):
- **Claves de aceptación verbatim, valores traducidos**: mantener exactamente `nombre:`, `cargo:`,
  `empresa:`, `nif:`, `direccion:`, `aviso:`, `cta:`; traducir solo lo que va tras los dos puntos.
- **Firmante = nombres propios**: no traducir valores de `nombre`/`empresa`/`nif`/`direccion`. Sí traducir
  `cargo`/`aviso`/`cta`.
- **Gantt**: en `hitos <etiqueta>:` mantener `hitos`, traducir `<etiqueta>`; traducir las etiquetas de fila
  (`Diagnóstico:`…) conservando verbatim lo que va tras los dos puntos (un valor, un rango o una
  lista de tramos separados por comas); la unidad (`semanas:`) ya se traduce.
- **Énfasis manifiesto**: conservar las barras ` / … / `, traducir la palabra interior.
- (Ya cubierto: `[ly:` verbatim, `> cliente:` verbatim, URLs/importes/números verbatim.)

### Fase C — Pintar desde el markdown (código, con fallback)
- `components/deck/inline.tsx`: añadir regla ` / … / ` → `<span className="emph">/ $1 /</span>`, compuesta con
  `**negrita**`. Anclar con espacios alrededor para no capturar barras normales (URLs, `2ª/Planta`, fechas).
- `lib/deck/types.ts` (campos opcionales): `gantt.milestoneLabel?`, `contexto.eyebrow?`, `elreto.eyebrow?`,
  `budget.title?`, `budget.conditionsLabel?`.
- `lib/deck/classify.ts`: `buildSlide` contexto/elreto → `eyebrow: caps?.text`; budget → pasar `title` (texto
  del `## `) y la etiqueta de condiciones.
- `lib/deck/blocks.ts`: `parseGantt` captura `milestoneLabel` de `hitos <etiqueta>:`; `parseBudget` devuelve
  además `title` y `conditionsLabel` (el texto del `### Condicion…` que ya localiza por índice).
- Componentes (render desde campo, `?? DEFAULT`): `Contexto.tsx` `{slide.eyebrow ?? 'Contexto'}`;
  `ElReto.tsx` `{slide.eyebrow ?? 'El reto'}`; `Gantt.tsx` `{slide.milestoneLabel ?? 'Cliente'}`;
  `Budget.tsx` `{title ?? 'Presupuesto'}` / `{conditionsLabel ?? 'Condiciones'}` — **ojo: `Budget` recibe
  props sueltas** (`DeckRenderer.tsx:21`), hay que pasar los nuevos props en esa llamada.
- Sin cambios de código: `Manifesto`/`Team`/`Clients`/`Acceptance` (ya leen sus campos; se nutren por plantilla).
- `lib/deck/catalog.ts`: afinar el texto de `slots` (manifiesto "con / énfasis /", equipo "**negrita**").
- `docs/presentaciones-md-guia.md`: documentar las convenciones nuevas y **corregir el §8 obsoleto**
  ("páginas automáticas") que contradice el modelo 1:1.

## Afectaciones / impacto
- **Decks guardados (3)**: seguros. Todo cambio mantiene `?? DEFAULT`; bloques vacíos → campos `undefined`
  → mismo render que hoy. Sin migración. Revisar que la regla ` / … / ` no capture barras existentes en su md.
- **Traducción**: el punto crítico es claves-verbatim/valores-traducidos. Tras el cambio, `kvLines()` sigue
  casando `nombre:` etc. y `parseGantt` sigue parseando. Mitigación: test de ida y vuelta (traducir → recompilar
  → mismas `kind`, firmante y claves intactos).
- **Inferencia (`detectKind`)**: irrelevante con marcadores. `classify()` usa el marcador primero; la inferencia
  por palabra (`CONTEXTO`, `EL RETO`…) solo corre sin marcador. La traducción preserva `[ly:` → la `kind` es
  estable aunque el eyebrow se traduzca. (Decks legacy sin marcador ya romperían hoy; no hay regresión.)
- **Duplicación**: cada deck nuevo lleva el copy de marca inline (snapshot). Es el trade-off correcto para que
  sea editable/traducible; el componente sigue siendo la fuente para bloques vacíos y el fallback de decks viejos.
- **Fuera de alcance** (confirmado): Chrome `2026`/`Interactius`, números de página, `◆`, `Fase 0N`,
  `¿Qué hacemos?`, `Total`, y el footer del cover (`Cover.tsx`) — siguen como mobiliario fijo.

## Verificación
- **Tests unitarios nuevos** (`lib/deck/__tests__`): `inline` (` / palabra / ` → emph; bold+emph; URL/`2ª` NO
  capturados); `parseGantt` (`hitos cliente:` → `milestoneLabel:'Cliente'`); `parseBudget` (`title`/`conditionsLabel`);
  `buildSlide` (eyebrow contexto/elreto; firmante de aceptación completo).
- **Round-trip de compilación**: `compileDeck(TEMPLATES.comercial)` → `kinds` esperadas y
  `manifesto.title` con "transformación", `team.paragraphs.length===5`, `acceptance.signer.name` set,
  `gantt.milestoneLabel==='Cliente'`, `budget.title==='Presupuesto'`.
- **Round-trip de traducción**: traducir la plantilla → recompilar y comprobar `[ly:` intactos, claves de
  aceptación presentes (firmante no vacío), nombre/empresa/nif/dirección sin traducir, `hitos` intacto,
  importes intactos, barras de énfasis preservadas, y `kind` idénticas antes/después.
- **Build + suite**: `npm test`, `npm run type-check` (el `switch` exhaustivo sobre `Slide['kind']` sigue
  cubierto al ser campos opcionales) y comprobar que la llamada a `Budget` con props nuevas compila.
- **Manual**: abrir un deck nuevo en `/deck`, ver que manifiesto/equipo/clientes/aceptación muestran el copy
  desde el markdown y son editables; traducir a inglés/català y verificar estructura + firmante intactos.
```
