# Generador de presentaciones — arquitectura

> Documento técnico del subsistema de decks. Para la **sintaxis de autor** (cómo escribir
> una presentación) consulta [presentaciones-md-guia.md](presentaciones-md-guia.md).

## 1. Qué es

Un compilador que convierte **Markdown → deck de diapositivas 16:9** de forma totalmente **determinista**: sin IA en runtime, sin servidor, sin dependencias nuevas. El mismo Markdown produce siempre el mismo deck. Vive en [lib/deck/](../lib/deck/) (lógica) y [components/deck/](../components/deck/) (UI/render), y se expone en la ruta `/[locale]/presentaciones`.

## 2. Pipeline

```
Markdown
   │  parse()        lib/deck/parse.ts      → SlideSource[] (tokens)
   ▼
SlideSource[]
   │  classify()     lib/deck/classify.ts   → Slide[] (modelo tipado)
   ▼
Slide[]
   │  compileDeck()  lib/deck/index.ts      → Deck (+ inyecciones comerciales)
   ▼
Deck
   │  <DeckRenderer> components/deck/        → React + CSS (escala a viewport)
   ▼
DeckStudio  →  PDF (window.print) · URL compartible (base64url)
```

| Etapa | Archivo | Responsabilidad |
|-------|---------|-----------------|
| Parse | [lib/deck/parse.ts](../lib/deck/parse.ts) | Tokeniza el Markdown: separa slides por `---`, clasifica líneas en tokens (`h`, `caps`/eyebrow, `p`, `quote`, `ul`, `image`, `fence`). |
| Classify | [lib/deck/classify.ts](../lib/deck/classify.ts) | Aplica reglas de prioridad para asignar a cada slide un tipo (`kind`). |
| Blocks | [lib/deck/blocks.ts](../lib/deck/blocks.ts) | Parsers especializados: `parseGantt()` y `parseBudget()`. |
| Theme | [lib/deck/theme.ts](../lib/deck/theme.ts) | Asigna tema dark/light por rol, respetando overrides explícitos. |
| Compile | [lib/deck/index.ts](../lib/deck/index.ts) | `compileDeck(md, type)`: orquesta todo e inyecta páginas comerciales. |
| Types | [lib/deck/types.ts](../lib/deck/types.ts) | Unión discriminada `Slide` y tipos auxiliares. |
| Image | [lib/deck/optimizeImage.ts](../lib/deck/optimizeImage.ts) | Reescala imágenes en cliente (≤1600 px, JPEG 0.82) a data URL. |

## 3. Clasificación de slides

`classify()` resuelve el tipo por **prioridad** (la primera que encaja gana):

1. **Gantt** — si hay un bloque ` ```gantt ` (gana aunque el título sea "Roadmap").
2. **Keywords comerciales** — por eyebrow o encabezado:
   - `CONTEXTO` → `contexto` (versión larga si el texto ≥150 car.)
   - `EL RETO` → `elreto` (imagen + título)
   - `Objetivos` → `objetivos` (lista numerada + imagen)
   - `Roadmap` (sin gantt) → `roadmapPhases` (fases con subtítulos y viñetas)
   - `Presupuesto` → `budget` (tabla + condiciones)
3. **Cover** — H1 en posición 0 con subtítulo, cliente o imagen.
4. **Closing** — última posición con "Gracias" o una URL.
5. **Statement** — eyebrow + heading, sin contenido estructurado.
6. **Columns** — heading + 2 o más subencabezados `###`.
7. **Bullets** — heading + lista.
8. **Split** — heading + imagen + párrafo.
9. **Paragraph** — fallback.

**Override de tema:** añade `{dark}` o `{warm-light}` al final de un encabezado para forzar el tema de esa diapositiva.

## 4. Layouts (17)

Implementados en [components/deck/layouts/](../components/deck/layouts/) y mapeados por [DeckRenderer](../components/deck/DeckRenderer.tsx).

| Layout | Origen | Descripción |
|--------|--------|-------------|
| `Cover` | Markdown | Portada: logo, título, subtítulo, cliente, imagen de fondo |
| `Statement` | Markdown | Eyebrow + titular serif grande |
| `Bullets` | Markdown | Título + viñetas (soporta **negrita**) |
| `Columns` | Markdown | Título + columnas numeradas (01, 02, 03…) |
| `Split` | Markdown | Imagen a un lado + texto al otro |
| `Paragraph` | Markdown | Eyebrow + párrafo serif (fallback) |
| `Gantt` | Markdown (fence) | Diagrama de barras con semanas, filas e hitos de cliente |
| `Budget` | Markdown (keyword) | Tabla de partidas + total + condiciones |
| `Contexto` | Markdown (keyword) | Texto de contexto (corto o largo) |
| `ElReto` | Markdown (keyword) | Imagen + "El reto" + título |
| `Objetivos` | Markdown (keyword) | Lista numerada + imagen |
| `RoadmapPhases` | Markdown (keyword) | Fases 01, 02… con descripción y tareas |
| `Closing` | Markdown | Cierre: wordmark + "Gracias" + URL |
| `Manifesto` | **Inyectado** | Página de marca (modo comercial) |
| `Team` | **Inyectado** | Equipo (modo comercial) |
| `Clients` | **Inyectado** | Clientes (modo comercial) |
| `Acceptance` | **Inyectado** | Firma/aprobación tras cada `Budget` (modo comercial) |

### Inyecciones comerciales

`compileDeck(md, type)` acepta un `type`. Con `type === 'comercial'` (por defecto en el editor):

- tras la portada se insertan **Manifesto · Team · Clients**;
- tras cada slide de **Budget** se inserta **Acceptance**.

Con tipo `informe` o `genérica` no se inyecta nada.

## 5. Bloques de datos

### Gantt (`parseGantt`)

```
semanas: 8                       # nº de columnas (default 8)
Diagnóstico: 1                   # barra en la semana 1
Discovery: 2-3                   # rango
Volumetría: 4-8
Kick Off: 0.5                    # medias semanas con .5 en cualquier extremo
hitos cliente: 1, 3, 5, 8        # marcadores
```

Los colores de las barras rotan por la paleta de acento (opal → bordeaux → emerald).

### Presupuesto (`parseBudget`)

```
## Presupuesto
- Análisis Heurístico: 3.315 €   # separadores válidos: : — – |
- Benchmark: 3.770 €
### Condiciones
- Pago a 30 días.
- IVA aparte.
```

Autosuma de partidas en formato es-ES (miles `.`, decimales `,`). Si hay un total explícito, gana sobre la autosuma. Las condiciones son opcionales; si faltan, se usa el texto estándar de Interactius.

## 6. Editor (DeckStudio) y render

[DeckStudio](../components/deck/DeckStudio.tsx) es una interfaz partida: editor de Markdown a la izquierda, vista previa a la derecha.

- **Selector de tipo** — comercial / informe / genérica (controla las inyecciones).
- **Generar** — recompila con el Markdown actual.
- **Descargar PDF** — `window.print()`; el CSS de print pagina a 16:9, una diapositiva por hoja.
- **Copiar URL** — codifica el Markdown en **base64url** (UTF-8 safe) en el hash `#view=1&md=…`; al abrirlo se carga el deck **sin editor** (modo cliente).
- **ToneReport** — panel que audita el texto reutilizando `evalText()` de [lib/eval.ts](../lib/eval.ts) (lista roja, longitud de frase, puntuación).

Piezas de soporte en [components/deck/](../components/deck/):

- `DeckRenderer.tsx` — mapea `Slide → componente` y escala el deck al viewport (ratio sobre 1280×720).
- `Chrome.tsx` — mobiliario de marca en slides interiores (filete, pestaña "2026 · Interactius", número de página).
- `ImageSlot.tsx` — slot de imagen editable: click → file picker → `optimizeImage()` → data URL. En modo viewer es imagen plana.
- `inline.tsx` — parser inline de `**negrita**`, seguro frente a inyección.
- `viewer.ts` — `ViewerContext` (booleano) que distingue editor de vista cliente.
- `deck.css` — variables de tema, layout de slide y reglas de print.

## 7. Tests

Suite en [lib/deck/__tests__/](../lib/deck/__tests__/), ejecutable con `npm run test` (`node --test` con TypeScript nativo):

| Test | Cubre |
|------|-------|
| `parse.test.ts` | Separación de slides, detección de eyebrow, listas, imágenes, fences |
| `classify.test.ts` | Asignación de tipo por cada regla, budget/condiciones |
| `blocks.test.ts` | `parseGantt` (rangos, medias semanas), `parseBudget` (autosuma) |
| `theme.test.ts` | Tema por defecto y override |
| `compile.test.ts` | Deck completo e inyecciones comerciales |

Fixture de referencia: [fixtures/sample.md](../lib/deck/__tests__/fixtures/sample.md) → secuencia esperada `['cover', 'elreto', 'bullets', 'columns', 'gantt', 'closing']`.

## 8. Propiedades de diseño

- **Determinista**: sin IA en runtime; salida reproducible.
- **Sin dependencias nuevas**: usa `node:test` y APIs nativas (canvas, `createImageBitmap`, Web Animations).
- **Tipado**: la unión discriminada `Slide` evita estados imposibles.
- **Print-first**: PDF 16:9 una diapositiva por página.
- **Compartible sin backend**: el deck viaja entero en la URL (base64url).

## 9. Retícula

Sistema espacial del deck. Vive aquí y no en `lib/tokens.ts`: es la implementación de **este**
producto, no doctrina de marca — las brand guidelines valen para cualquier pieza, esto solo para
las presentaciones. Los valores están declarados como custom properties al principio de
`components/deck/deck.css`; esta tabla es la referencia humana. **Si cambias uno, cámbialo aquí.**

Todos los px son absolutos sobre el lienzo fijo; el deck se escala entero con `--s`.

| Concepto | Valor | Dónde |
|---|---|---|
| Lienzo | 1280 × 720 | fijo, no responsive |
| Márgenes de página | 108 izq · 108 der · 64 arriba · **56 abajo** | `--ml --mr --mt --mb` |
| Gutter | 48 (mitad 24 como padding interior de tarjeta) | — |
| Banda vertical de texto | 64 → 656 (592 de alto) | `FitText centerTop` |
| Foto lateral: ancho | 430 | `--img-w` |
| Foto lateral: hueco al texto | 96 | `--img-gap` |
| Foto lateral: inset izquierdo | 64 | `--img-inset` |
| Columna de texto del split | 582 (cuerpo a 580) | derivada |

Tres reglas que no se leen en los números y conviene no redescubrir a base de romperlas:

1. **La banda 64–656 es de rol, no de layout.** Todo layout de tipo «antetítulo + cuerpo» —`split`,
   `paragraph`, `contexto`— centra su bloque ahí dentro con `FitText`. Así el texto queda a media
   altura sea cual sea su longitud, y dos slides seguidas no bailan. Un layout nuevo de ese rol se
   suma a la banda; no se inventa la suya.

2. **La foto derecha sangra al borde; la izquierda va metida 64.** No es un descuido: a la
   izquierda están el filete vertical y la pestaña, y la foto no puede pisarlos. A la derecha, una
   franja blanca pegada al borde no es aceptable (decisión de Alberto, 2026-07-31). No "arregles"
   esta asimetría metiendo la foto derecha — ya se probó y se revirtió.

3. **La columna de texto se ancla a `--img-inset` por los DOS lados**, aunque la foto derecha
   sangre. Por eso mide 582 en las dos variantes y el bloque de texto no salta entre slides
   seguidas. El precio, asumido: el hueco foto↔texto es 96 por la izquierda y 160 por la derecha.
   Con la foto sangrando no se pueden tener las tres medidas iguales — algo tiene que absorber esos
   64px, y se decidió que lo absorba el hueco y no la columna.
