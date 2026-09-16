# DSMak_r — el generador de design systems de cliente

> Un diseñador introduce los parámetros de marca de un cliente y sale un design system completo:
> rampas de color con su contraste medido, escala tipográfica, espaciado, radios, sombras,
> breakpoints, retícula y los componentes base, listos para descargar como CSS, JSON y styleguide.
> Es la cuarta herramienta del workspace: DeckMak_r vende el proyecto, FormMak_r lo investiga,
> ReWrit_r escribe, y DSMak_r arranca la interfaz.

Estado: **implementado**. Fase 2 cerrada el 2026-09-16 en la rama `feat/dsmakr`, con los seis bloques
en verde (`test`, `type-check`, `lint` y `build`). Queda la verificación manual y subir la rama.

> **Qué cambió respecto a esta definición.** Lo que se movió está marcado en cada apartado. El detalle
> bloque a bloque, con los datos que lo justifican, está en [ds-mak-r-plan.md](ds-mak-r-plan.md):
> los diez hallazgos H1–H10 del análisis y lo que se decidió al implementar cada bloque.

## Contexto

El arranque de UI de cada proyecto se monta a mano: alguien elige un primario, improvisa una rampa
en Figma, decide una escala tipográfica a ojo y escribe un CSS inicial que nadie vuelve a revisar.
El resultado no es reproducible, el contraste se comprueba tarde o no se comprueba, y el cliente
recibe una hoja de estilos sin documentar.

DSMak_r no nace de un encargo concreto, como FormMak_r nació del formulario de Massimo Dutti: nace
de convertir ese trabajo repetido en herramienta. Hay un punto de partida real, eso sí: un
prototipo de Alberto, un HTML autocontenido con React empaquetado, con el asistente de cuatro pasos
ya resuelto y —lo que de verdad importa— **el motor de generación escrito y funcionando**. Este
documento define cómo ese prototipo entra en el workspace.

### Qué se hereda del prototipo, y qué no

El motor es determinista y no usa IA. Trabaja en espacio OKLCH: convierte el color de entrada,
construye la rampa 50→900, calcula el ratio de contraste de cada escalón con su nivel WCAG y el
color de texto recomendado, deriva los semánticos por desplazamiento de tono (success 152,
warning 88, error 27, info 254), arma la escala tipográfica modular con compresión de los pasos
altos, y resuelve espaciado, radios y sombras desde presets multiplicados por densidad. Eso se
porta casi tal cual a `lib/ds/`.

Lo que no se hereda: no hay persistencia de ningún tipo —los seis sistemas del panel son semilla
falsa generada en memoria—, el enlace para compartir es un `blob:` local que muere con la pestaña,
la interfaz mezcla inglés y castellano, el CSS del prototipo reescribe a mano una paleta parecida a
la de marca pero distinta, y la generación finge un progreso de 1,5 segundos con `setTimeout`
cuando el cálculo es instantáneo.

## Alcance

**Sí:**

- Galería de sistemas con buscador, filtro por estado y etiquetas, duplicar, renombrar, borrar.
- Paso 1, marca: nombre, cliente, logo claro y oscuro, modo claro/oscuro/ambos, color primario y
  secundario con derivación automática del resto, preset de neutros, armonización de semánticos,
  familias tipográficas, tamaño base, ratio de escala, preset de sombra, estilo de radio, unidad de
  espaciado, densidad, breakpoints y retícula.
- Paso 2, fundamentos: los tokens generados, editables muestra a muestra, con bloqueo por color y
  regeneración de la rampa alrededor de lo bloqueado.
- Paso 3, componentes: los 17 del prototipo (accordion, badge, button, checkbox, dropdown, input,
  link, modal, notification, pagination, radio, search, slider, switch, tags, toggle, tooltip), con
  sus ejes de variante, intención, tamaño y estado, su anatomía y sus propiedades editables.
- Paso 4, entrega: descarga de `tokens.json`, `tokens.css` y el styleguide como HTML autocontenido,
  y copiado al portapapeles bloque a bloque.
- Plantilla de partida con la marca Interactius, construida desde `lib/tokens.ts`.
- Aviso de contraste por debajo de AA en la muestra y en el styleguide exportado.
- Sello borrador/publicado, sin efecto técnico.

**No:**

- URL pública del styleguide. La entrega es por descarga. Abrir una superficie pública fija una URL
  que después no se puede mover, y hoy nadie la ha pedido.
- Importar tokens de fuera. Se crea desde parámetros o duplicando un sistema propio.
- Subir archivos de tipografía. Solo Google Fonts, por lista curada o por nombre libre.
- IA. El motor es determinista y así se queda en esta versión.
- Escribir nada en `content/`. El sistema de ficheros de producción es de solo lectura.

## Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Ruta | `/workspace/dsmak_r` y `/workspace/dsmak_r/[id]` | La convención de `deckmak_r` y `formmak_r` |
| Entrada en el catálogo | Hecho en el bloque 6: id `dsmakr`, wordmark `{ before: 'DSMak', after: 'r' }`, posición cuarta, `href: '/workspace/dsmak_r'` y descripción `'Design systems'` | La tarjeta estuvo apagada desde que se montó el dispatcher |
| Acceso | Sesión de equipo `@interactius.com`, `X-Robots-Tag: noindex, nofollow` | Lo aplica `middleware.ts` a todo `/workspace/*` |
| Fuente de verdad | `brand` y `overrides` en JSONB, validados con Zod | Un design system no es prosa. Ver el apartado siguiente |
| Tokens generados | Se guardan, con `engine_version` | Un sistema entregado a un cliente no cambia solo porque se afine el algoritmo |
| Idioma de la interfaz | Castellano, sin next-intl | El workspace es interno |
| Idioma del styleguide | Castellano, con los nombres técnicos de token en inglés | Lo lee un cliente; los tokens se usan en código |
| Persistencia | Tabla `design_systems` | Nueva. No se toca ninguna existente |
| Logo | Supabase Storage, bucket `deck-assets` | Ya se usa para los logos de las presentaciones. La fila guarda la ruta, no los bytes |
| Modelo de IA | No usa | El motor es determinista |
| Motor | `lib/ds/`, ejecutándose en el navegador | Respuesta inmediata al mover un control; el servidor solo persiste |
| Endpoint | `/api/design-systems`, dentro de `EDITOR_API` | El recurso en plural, como `/api/decks` y `/api/forms` |
| Guardado | Autoguardado a 1400 ms con `savingRef`, `beforeunload` y `ConfirmModal` | El mecanismo de DeckStudio y FormStudio, sin cambios |
| Estilos | Inline, con `components/deck/studio/ui.ts` y `lib/tokens.ts` | El CSS del prototipo se descarta entero |
| Tipografías | Lista curada de Google Fonts más campo libre | Lo que ya hace el prototipo |
| Permisos | Cualquiera del equipo edita y borra; `created_by` es rastro | Mismo criterio que `decks` y `forms` |

## Decisiones que estaban abiertas · **cerradas**

| Pregunta | Decisión | Cómo quedó |
|---|---|---|
| El cliente, ¿texto o relación? | `client text` | Espejo de `brand.client`, como en `forms`. La tabla `clients` sigue sin tocarse |
| Etiquetas | Desde el primer día | `TagInput` en el modal de metadatos y `FilterBar` en la galería, con filtro por cliente, etiqueta y estado |
| La navegación por pasos | Pasos | El paso activo es un número en el estado del editor, no en la URL, y ningún paso importa a otro. Con persistencia, los cuatro están disponibles desde el principio: el botón "Generar" del prototipo desaparece porque el cálculo es en vivo |
| Regeneración tras cambiar el motor | Avisar en el editor | Se abre en solo lectura con los tokens guardados y un aviso; "Regenerar" enseña antes cuántos valores cambian y cuáles (H4) |

Además, durante la implementación se cerraron siete decisiones que esta definición no había previsto
—la capa de `overrides`, el bloqueo por familia, el azar de "variar rampa", la versión del motor, los
pesos y la paleta de la plantilla, la concurrencia entre pestañas y el idioma de los componentes—.
Están en el plan, en H1–H7 y en los bloques 5b, 5c y 5d.

## Datos

Tabla `design_systems` — migración `supabase/migrations/<timestamp>_create_design_systems.sql`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | La URL del editor, estable |
| `public_id` | text unique | Se genera al crear. Hoy no hay URL pública: existe para no tener que migrar el día que la haya |
| `name` | text not null | Espejo de `brand.name` |
| `client` | text | Espejo, para buscar y filtrar |
| `status` | text not null default `'draft'` | `draft` o `published`. Sello interno, sin efecto técnico |
| `tags` | text[] not null default `'{}'` | Igual que en `decks` y `forms` |
| `brand` | jsonb not null | Los parámetros de entrada. Fuente de verdad |
| `overrides` | jsonb not null default `'{}'` | Ediciones manuales y bloqueos por token. Fuente de verdad |
| `tokens` | jsonb not null | Resultado del motor. Derivado, guardado para que no cambie solo |
| `configs` | jsonb not null default `'{}'` | Configuración por componente del paso 3 |
| `engine_version` | text not null | Versión del motor que produjo `tokens` |
| `logo_path` / `logo_dark_path` | text | Rutas en el bucket `deck-assets` |
| `created_at` / `updated_at` | timestamptz | Trigger `set_updated_at` |
| `created_by` | uuid references `auth.users(id)` | Rastro, no permiso. Igual que en el resto de tablas |

Qué manda si algo se desincroniza: mandan `brand` y `overrides`. `name` y `client` son espejo y se
re-derivan en cada guardado. `tokens` es derivado pero **no** se recalcula en silencio: si
`engine_version` no coincide con la del código, el editor lo dice y ofrece regenerar. Nadie
regenera por su cuenta un sistema ya entregado.

Qué no se toca: `decks`, `forms`, `responses`, `clients`, `images`, `signatures`, `rate_limits`.
Del bucket `deck-assets` solo se escribe bajo un prefijo propio, `ds/<id>/`.

RLS — **cambió respecto a esta definición**: las cuatro políticas con `auth.role() = 'authenticated'`
se sustituyeron por la forma que ya usa el repo (`20260817121000_tighten_rls.sql` y `forms`), una
política para el equipo más el `revoke`. El efecto es el mismo y evita dos formas para el mismo rol:

```sql
alter table public.design_systems enable row level security;

-- No hay superficie pública: anon no tiene nada que leer.
create policy design_systems_team on public.design_systems
  for all to authenticated using (true) with check (true);

-- No es redundante: Supabase concede todos los privilegios a `anon` en cada tabla nueva de `public`,
-- y esto es lo que decide si la tabla queda abierta si alguien desactiva la RLS un momento.
revoke all on public.design_systems from anon;
```

Las rutas usan `supabaseAuthServer()`, no `supabaseServer()`: sin policy para `anon`, la clave
pública no lee ni una fila. Comprobado en producción: con la clave anónima, la petición REST devuelve
401 `permission denied for table design_systems`.

## Formato del documento

No hay markdown, y esta es la única ruptura deliberada con el patrón del repo. DeckMak_r y
FormMak_r guardan `md` porque hay una persona escribiendo un texto: el `md` es del autor y por eso
se guarda aunque no compile, y por eso las ediciones del frontmatter van por líneas. Aquí no hay
autor de texto. Lo que el diseñador manipula son parámetros numéricos y muestras de color, todo a
través de controles. Un `.md` intermedio sería una gramática inventada para un documento que nadie
va a escribir ni a leer a mano.

Lo que sí se conserva es la propiedad que hace útil a aquel patrón: **la validación no lanza**.

```
compileSystem(row) → { ok, system, issues }
```

`lib/ds/schema.ts` define con Zod 4 el esquema de `brand`, `overrides`, `tokens` y `configs`.
`compileSystem` valida, rellena con los valores por defecto lo que falte, y devuelve incidencias
con la ruta del campo en vez de reventar. Una fila guardada por una versión anterior se abre
igual: lo que no encaje se anota como incidencia y se muestra en el panel del editor, tal como
DeckStudio muestra las suyas.

Qué detecta la validación que el esquema no puede expresar por tipos: un ajuste manual que apunta a
un token que ya no existe, un breakpoint cuyo mínimo pisa al anterior, un nombre de familia reservado
o que no sirve para CSS, y un `engine_version` distinto del actual.

**Cambió respecto a esta definición.** La comprobación de "una retícula con menos columnas que las
que usa un componente configurado" se retiró: ninguno de los 17 componentes usa columnas de retícula,
así que era código muerto (H8). En su lugar se avisa de lo que sí pasa, que el styleguide cruza
breakpoints y retícula **por nombre** y renombrar uno sin el otro deja la tabla con huecos. Se añadió
también la reparación de la configuración de componentes contra el catálogo actual: un eje, una
opción de anatomía o una propiedad que ya no existen se reponen y se anotan con su ruta.

## Interfaz

- **Galería** `/workspace/dsmak_r` — buscador sobre nombre, cliente y etiquetas. Filtros por estado
  y por etiqueta con `GalleryFilters`. Tarjeta con el nombre, el cliente, la fecha de edición y una
  tira con los colores principales del sistema. Estado vacío con el texto y el botón de crear.
  Acciones con `CardActions`: abrir, renombrar, duplicar, exportar, borrar con confirmación.
- **Editor** `/workspace/dsmak_r/[id]` — barra superior con el wordmark, el paso activo, el aviso de
  guardado y el sello borrador/publicado. Cuatro pasos:
  1. Marca. Formulario a pantalla completa, es el paso con más campos: identidad y logos, modo,
     familias de color con nombre validado, tipografía con pesos por rol, forma y espacio,
     breakpoints y retícula.
  2. Fundamentos. Los tokens generados, con la previsualización viva al lado. Cada muestra se abre
     para retocarla, y cada familia se puede bloquear o variar su rampa. Lo retocado a mano lleva ●.
  3. Componentes. Lista con buscador a la izquierda y, a la derecha, el componente elegido:
     previsualización por su primer eje, ejes, anatomía, propiedades y nota de implementación.
  4. Entrega. Pestañas JSON, CSS y styleguide, con copiar bloque a bloque y descargar.
  Panel de incidencias al pie, con lo que devolvió la validación; pulsar una lleva al paso donde está
  el campo.

  **Cambió respecto a esta definición**: la cabecera lleva `LogoutButton`, no `UserMenu`. La foto de
  usuario solo está en el dispatcher; si va a llegar a las galerías, es un cambio para las tres
  herramientas a la vez. Y la regeneración de la rampa "alrededor de lo bloqueado" no se construyó:
  el bloqueo congela la familia entera (H2), y regenerar alrededor de una muestra fijada es un
  algoritmo nuevo, no un port.
- El paso activo no es una pantalla distinta: es un número sobre el mismo estado. Ningún paso
  importa a otro, para que reordenarlos o pasar a un split sea cambiar el contenedor.
- **Superficie pública**: no hay. Lo que sale de la herramienta sale como archivo.
- **Previsualización**: contenedor propio con las variables `--ds-*` del sistema generado. No hay
  iframe: el prefijo `--ds-` no colisiona con nada del workspace. Las tipografías del cliente se
  cargan con un `<link>` aparte, generado a partir de las familias elegidas.

Diferencias deliberadas con DeckMak_r y FormMak_r, y su motivo:

| Diferencia | Motivo |
|---|---|
| Sin `md` ni compilador de texto | No hay texto de autor. El equivalente es el esquema Zod, que tampoco lanza |
| Pasos en vez de split | No hay panel de escritura a la izquierda. El split existe allí para ver el texto y el resultado a la vez |
| Sin visor público | La entrega es un archivo, no un enlace |

## Ficheros

```
NUEVO
  lib/ds/engine/                            el motor, un módulo por pieza: color, contrast, ramp,
                                            semantic, derive, presets, generate, overrides, surfaces,
                                            resolve, warnings, version e index (composeTokens)
  lib/ds/schema.ts                          Zod de brand, overrides, tokens y configs
  lib/ds/compile.ts                         compileSystem(row) → { ok, system, issues, engineMismatch }
  lib/ds/components.ts                      catálogo de los 17 componentes, sus ejes y sus props
  lib/ds/configs.ts                         ediciones del paso 3
  lib/ds/edit.ts live.ts steps.ts diff.ts preview.ts    lógica del editor, sin React
  lib/ds/delivery.ts                        nombre y contenido de los tres ficheros de la entrega
  lib/ds/export/json.ts css.ts styleguide.ts
  lib/ds/fonts.ts escape.ts template.ts gallery.ts mirror.ts
  lib/ds/server.ts                          lo que deciden las rutas, testeable en node
  lib/ds/api.ts types.ts
  lib/ds/__tests__/                         23 ficheros, uno por módulo, más el fixture golden
  lib/hooks/useAutosave.ts autosaveCore.ts  el autoguardado compartido, con sus tests
  lib/storage/logos.ts paths.ts             subida de logos con prefijo y nombres de bucket
  app/api/design-systems/route.ts           GET lista, POST crea o duplica
  app/api/design-systems/[id]/route.ts      GET, PATCH (409 si otra pestaña guardó) y DELETE
  app/workspace/dsmak_r/page.tsx            galería
  app/workspace/dsmak_r/[id]/page.tsx       editor
  components/ds/                            galería (DsGallery, DsCard, DsMetaModal, DsExportModal),
                                            editor (DsStudio, DsToolbar, controls, labels, Swatch),
                                            download y styleguideHtml
  components/ds/steps/                      BrandStep, FoundationsStep, ComponentsStep, DeliveryStep
  components/ds/preview/Preview.tsx         previsualización viva del paso 2
  components/ds/previews/                   los 17 renders, agrupados por familia, más shared e index
  supabase/migrations/20260915212500_create_design_systems.sql
  docs/features/ds-mak-r-plan.md            el plan de implementación, bloque a bloque

MODIFICADO
  lib/workspace/catalog.ts                  entrada `dsmakr`: href y descripción
  lib/workspace/__tests__/catalog.test.ts   la ruta de dsmakr, el orden y el guiño del wordmark
  middleware.ts                             /api/design-systems en EDITOR_API
  package.json                              globs de test: lib/ds/__tests__ y lib/hooks/__tests__
  docs/features/urls-workspace.md           las dos rutas nuevas
  components/studio/Wordmark.tsx            + DsLogo
  components/studio/GalleryFilters.tsx      FilterBar gana el filtro por estado, con prop opcional
  components/studio/CardActions.tsx         + iconos de renombrar y exportar
  components/studio/IssuesPanel.tsx         movido desde components/forms/maker y generalizado
  components/deck/DeckStudio.tsx            pasa a useAutosave
  components/forms/maker/FormStudio.tsx     pasa a useAutosave y al IssuesPanel compartido
  lib/decks/api.ts                          reexporta uploadLogo desde lib/storage/logos.ts
```

`.env.example`: ninguna variable nueva. No hay modelo, no hay clave, y Storage ya está configurado.

`lib/auth/legacyRoutes.ts`: sin cambios. No se mueve nada que ya existiera.

## Qué se reutiliza en vez de duplicar

Tal cual, sin tocar: `BrandMark`, `MarkDivider`, `LogoutButton`, `SearchField`, `TagInput`,
`Modal` y `ConfirmModal`; los estilos de `components/deck/studio/ui.ts`; `lib/supabase/server.ts` con
`supabaseAuthServer`, `requireUser` y `dbFail`; `lib/auth/team.ts`; el trigger `set_updated_at`.

**Cambió respecto a esta definición**: `UserMenu` no se usa —las galerías llevan `LogoutButton`, y la
foto solo está en el dispatcher— y tres piezas que se daban por intocables necesitaron un cambio
pequeño: `Wordmark` gana `DsLogo`, `FilterBar` gana el filtro por estado con una prop opcional (que
DeckMak_r y FormMak_r no pasan) y `CardActions` gana los iconos de renombrar y exportar.

Las dos extracciones a compartido, **hechas**:

- **El mecanismo de autoguardado.** Estaba escrito dos veces, en DeckStudio y en FormStudio. Ahora
  vive en `lib/hooks/useAutosave.ts`, con las decisiones puras en `lib/hooks/autosaveCore.ts` y sus
  tests en node, y las tres herramientas lo usan. Para DSMak_r ganó dos cosas que las otras no
  activan: `paused`, para no guardar mientras hay errores de validación, y el estado `conflict`.
- **La subida de logo a Storage.** `lib/storage/logos.ts` recibe el prefijo; `lib/decks/api.ts` la
  reexporta y DeckMak_r no cambió ni una línea de llamada. DSMak_r la llama con `ds/<id>/`. Los
  nombres de bucket salieron a `lib/storage/paths.ts`, sin `'use client'`: una constante importada de
  un módulo cliente no llega como valor a un Route Handler.
- **Y una tercera que no estaba prevista:** `IssuesPanel` se movió a `components/studio/` y se
  generalizó. Cada editor dice adónde lleva cada incidencia: FormMak_r a una línea, DSMak_r a un paso.

Se escribe nuevo, con su justificación: el motor, el esquema, los exportadores y la interfaz de los
cuatro pasos. No hay nada equivalente en el repo.

## IA

No aplica. El motor es determinista: los mismos parámetros dan los mismos tokens, sin latencia, sin
coste y sin clave. Queda anotado en Pendiente lo que costaría añadir una entrada por descripción de
marca.

## Marca — avisos

1. **Pesos tipográficos.** El prototipo carga IBM Plex Serif e IBM Plex Mono con
   `wght@400;500;600;700`, y su styleguide usa Serif 600 en los titulares. `lib/tokens.ts` declara
   Serif `[300, 400]` y Mono `[400, 500, 600]`, con `italics: false` en ambas. **Decidido:** el
   chrome de la herramienta usa los pesos canónicos; la previsualización carga los que pida el
   sistema del cliente, porque esa tipografía no es de Interactius.
2. **Paleta escrita a mano.** El CSS del prototipo define `--paper:#F4F1EA` y `--ink:#26241F`,
   cercanos pero distintos de `Warm Light #F5F2ED` y `Dark #1C1A17` de `lib/tokens.ts`.
   **Decidido:** se descarta ese CSS entero.
3. **Puntos suspensivos.** `punctuationRules.noEllipsis` los evita. El prototipo los usa en los
   marcadores de posición. **Decidido:** se quitan también ahí.
4. **Botón con relleno.** La norma de marca pide el CTA como enlace subrayado. El workspace ya no
   la cumple: `components/deck/studio/ui.ts` define `btn` con fondo `#1C1A17` y DeckMak_r lo usa en
   toda la barra. **Hallazgo:** es una regla que el chrome interno se saltó sin que nadie lo
   escribiera. DSMak_r hereda el precedente y no lo reabre. Si alguien quiere cerrarlo, se cierra
   en `lib/tokens.ts` y para las tres herramientas a la vez, no aquí.
5. **El acento de la herramienta.** `toolIconAccents` ya asigna a `dsmakr` el cian `#00D1FF`,
   compartido con ReWrit_r por decisión de Alberto. El alcance declarado allí es estricto:
   `components/workspace/AppIcon.tsx` y nada más. No entra en la interfaz de la herramienta.
6. **Los tres acentos de marca** —Opal, Burdeos, Esmeralda— identifican servicios y no se usan aquí
   como decoración. Burdeos sigue siendo el color de alerta del sistema, y es el que marca el aviso
   de contraste por debajo de AA.
7. **Lo que genera la herramienta no es marca Interactius.** Las rampas, las tipografías y los
   radios que salen son del cliente. Las normas de este repo mandan sobre el chrome y sobre el
   texto del styleguide, no sobre los valores generados. [supuesto] La plantilla de partida con la
   marca Interactius es la única excepción, y sus valores se leen de `lib/tokens.ts`, no se copian.
8. **La plantilla Interactius chocaba con dos reglas duras, y por eso se diseñó aparte** (H6). El
   motor fijaba los pesos por rol a 700 y 600, que con IBM Plex Serif se sale de los `[300, 400]` de
   `lib/tokens.ts`: `brand` ganó `weights` por rol y la plantilla los lee de ahí. Y como el motor
   necesita primario y secundario, roles que la marca no tiene, la plantilla usa Dark y Ash Dark, sin
   Opal ni Esmeralda; el único acento que entra es **Burdeos en `error`**, que es su rol de interfaz
   declarado. La escala tipográfica de la plantilla es la del motor: **sigue pendiente de Alberto**
   decidir si se fija a los peldaños de `lib/typeScale.ts`.
9. **Idioma de los componentes.** Los valores de los ejes (Primary, Hover, Solid) se quedan en
   inglés: son vocabulario técnico, el que usará quien implemente. Los nombres de eje y la anatomía
   van en castellano, opciones incluidas; el prototipo mezclaba "Derecha" con "Top".

## Verificación

**Automática** — 427 tests en verde con `npm test`, más `type-check`, `lint` y `build` limpios. En
`lib/ds/__tests__/`, uno por módulo:

- **Motor** — `color`, `contrast`, `ramp`, `semantic`, `generate`, `overrides`, `warnings` y un
  `golden` contra un fixture: si el algoritmo cambia sin subir `ENGINE_VERSION`, falla. Determinismo,
  monotonía de las rampas, el hex de entrada dentro de su rampa, y los niveles WCAG en 3 / 4,5 / 7.
- **Validación** — `compile`: una fila válida no da incidencias; una corrupta devuelve incidencias
  con la ruta y **no lanza**; `engine_version` distinto se señala; los componentes se reparan contra
  el catálogo.
- **Editor** — `edit`, `configs`, `live`, `steps`, `diff`, `preview`: los ajustes manuales, las
  familias que se renombran llevándose lo suyo, qué bloquea el guardado y a qué paso lleva cada
  incidencia.
- **Entrega** — `export` y `delivery`: una variable `--ds-` por token y ninguna repetida, el JSON con
  su forma y su fecha inyectada, y el styleguide escapando nombre, notas y familia tipográfica.
- **Fuera de `lib/ds`** — `autosaveCore` (backoff y conflicto), `gallery`, `server`, `mirror`,
  `template`, `fonts`, `components` y `catalog`.

Y dos comprobaciones fuera del repo, en node, que no caben como test unitario: los 17 renders en
**9.272 combinaciones** sin excepciones, y el styleguide completo en cuatro casos, con los 17
componentes pintados y todo escapado.

**Manual** — la lista completa, en orden, está abajo. Incluye las diez de esta definición.

## Verificación manual, paso a paso

Las 36 comprobaciones que quedan, en el orden en el que conviene hacerlas. Las diez de la definición
original están repartidas por sus apartados y marcadas con **(def N)**.

**A · Acceso y catálogo**

1. En `/workspace`, la tarjeta DSMak_r aparece encendida, cuarta, con su icono cian y sin el cartel
   de "Próximamente" **(def 3)**.
2. Sin sesión, `/workspace/dsmak_r` redirige a `/workspace/login?next=/workspace/dsmak_r` **(def 1)**.
3. Con una cuenta que no sea `@interactius.com`, lo mismo **(def 2)**.

**B · Galería**

4. Crear un sistema desde cero y otro con la plantilla Interactius, con nombre, cliente y etiquetas.
5. La tarjeta enseña la tira de color, el cliente y la fecha. El buscador y los filtros por cliente,
   etiqueta y estado dejan lo que toca.
6. Renombrar un sistema desde la tarjeta: cambia el nombre sin abrirlo y sin tocar sus tokens.
7. Duplicar uno con logo: la copia nace como borrador, con su propio `public_id` y su propia copia
   del logo **(def 10)**.
8. Exportar desde la tarjeta: bajan `tokens.json`, `tokens.css` y el `styleguide.html`.
9. Borrar un sistema con logo y comprobar en Supabase que el fichero no se queda huérfano en
   `deck-assets/ds/<id>/` **(def 7)**.

**C · Editor: guardado y concurrencia**

10. Abrir un sistema: se ve el paso 1 con sus valores, y sale "Guardado ✓" tras el primer cambio.
11. Crear uno, cerrar la pestaña sin tocar nada más y volver a abrirlo: está guardado **(def 4)**.
12. Abrir el mismo sistema en dos pestañas, cambiar algo en las dos y comprobar el modal de conflicto
    con sus dos salidas, "Recargar" y "Guardar encima" **(def 5)**.
13. Cortar la red, editar, y ver tres reintentos y "Error · reintentar". Volver a dar red y reintentar.
14. Con cambios sin guardar, volver a la galería (sale el modal) y recargar la página (sale el aviso
    del navegador).

**D · Paso 1, Marca, y paso 2, Fundamentos**

15. Cambiar el color primario y ver el paso 2 y la previsualización al día.
16. Retocar una muestra (aparece ●), bloquear esa familia, cambiar el primario en el paso 1 y
    comprobar que la familia bloqueada no se mueve **(def 6)**.
17. "Variar rampa" en una familia, recargar la página y comprobar que sale la misma rampa.
18. Solapar dos breakpoints: el panel da error, la barra dice "Sin guardar · corrige los errores" y
    pulsar la incidencia lleva al paso 1.
19. Poner un primario muy claro, `#DDDDDD`: el aviso de contraste sale bajo el campo, en el panel y en
    las muestras afectadas **(def 9, la parte del editor)**.
20. Subir un logo claro y otro oscuro y verlos en la previsualización en los dos modos.
21. Renombrar una familia añadida con un nombre inválido (`Mi Color`, `error`) y con uno válido.

**E · Paso 3, Componentes**

22. Buscar "bot", elegir Button y ver la previsualización por variante, con la elegida marcada.
23. Cambiar la talla a LG: la previsualización crece y sale ● en la lista. Volver a MD quita la ●.
24. Fijar Padding X a 40, pasar por SM, MD y LG y comprobar que se queda en 40. "Restablecer" lo
    devuelve al calculado.
25. Dropdown en estado Open y Search en Typing: el menú y el autocompletado se ven enteros.
26. Escribir una nota, recargar y comprobar que sigue. Con modo "ambos", el selector claro/oscuro
    repinta el lienzo.

**F · Paso 4, Entrega**

27. Pestaña JSON: se ve el principio y el aviso de cuántos caracteres faltan. "Copiar" pega lo
    esperado y "Descargar .json" baja el fichero entero, que abre bien en un editor.
28. Pestaña CSS: copiar un bloque, copiar todo y descargar. El fichero trae `--ds-error-600` además
    de `--ds-error-50`.
29. Descargar el styleguide, abrirlo **sin conexión** y comprobar que se ve entero salvo las
    tipografías de Google **(def 8)**.
30. Dentro del styleguide: cambiar variante, tamaño y estado de un componente con sus botones, buscar
    por nombre, y comprobar que el aviso de contraste del primario aparece arriba **(def 9, la parte
    de la entrega)**.
31. Con un sistema de modo "ambos", descargar el styleguide en claro y en oscuro y comparar.

**G · Motor antiguo**

32. En un sistema de prueba, `update design_systems set engine_version = '0' where id = …`. Al abrirlo
    está en solo lectura; "Regenerar" enseña cuántos valores cambian; al confirmar se guarda y vuelve
    a `engine_version = '1'`.
33. Antes de regenerarlo, comprobar que el paso 4 deja descargar los tres ficheros con los tokens
    guardados, y que el paso 3 deja recorrer la lista sin poder editar.

**H · Que no se haya roto lo que ya estaba** (el autoguardado es ahora compartido)

34. FormMak_r: escribir y ver "Guardado", publicar y editar metadatos, y ver el guardado inmediato.
35. DeckMak_r: escribir y ver "Guardado", y probar Compartir URL y Descargar PDF con cambios sin
    guardar.
36. En las dos, cortar la red y comprobar los tres reintentos y el botón de reintentar.

## Pendiente

Lo que dejó la implementación, de más a menos concreto:

- **La escala tipográfica de la plantilla Interactius**, pendiente de Alberto: la del motor
  (modular, base × ratio) o los peldaños de `lib/typeScale.ts` fijados por override (H6).
- **Logos huérfanos al sustituir.** Cambiar o quitar un logo deja el fichero anterior en
  `deck-assets/ds/<id>/`. Borrar el sistema sí limpia la ruta vigente. Haría falta borrar el anterior
  tras un guardado confirmado.
- **Una incidencia de `configs.<componente>` lleva al paso 3, pero no abre ese componente.**
- **El styleguide pesa ~293 KB** porque pinta todas las combinaciones de ejes, hasta 120 por
  componente. El corte está en `MAX_VARIANTS`.
- **No hay previsualización del styleguide** antes de descargarlo.
- **Etiquetas con anglicismos** en la anatomía y en las propiedades ("Layout", "Footer fijo",
  "Padding X"). Se dejaron como vocabulario técnico.
- **Regenerar la rampa alrededor de una muestra bloqueada** (lo que la definición pedía en el paso 2).
  Hoy el bloqueo congela la familia entera.

Y lo que ya estaba previsto aquí:

- **URL pública del styleguide.** La señal: un cliente pidiendo un enlace vivo en vez de un
  archivo. El `public_id` ya está guardado para eso.
- **Importar un JSON de tokens.** La señal: alguien queriendo retomar en la herramienta un sistema
  hecho fuera. Implica validar con Zod una entrada ajena y decidir qué se hace con lo que no encaje.
- **IA para proponer la paleta desde una descripción de marca.** Un campo de texto que devuelva
  primario, secundario y familias con structured outputs, y de ahí en adelante el motor determinista
  como está. Costaría un endpoint, la composición del prompt desde `lib/tokens.ts` y la entrada en
  `EDITOR_API`.
- **Tipografías propias o de pago.** La señal: el primer cliente con tipografía corporativa que no
  esté en Google Fonts.
- **Los tres pasos de la interfaz.** Si al usarla el stepper no funciona, el cambio a split debería
  ser contenedor y no reescritura. Si resulta que sí lo es, el diseño de los pasos estaba mal
  planteado.

---

## Prompt para Claude Code

```markdown
Trabajas en `interactius-brandguidelines` (repo `platform-clonica/brand-guidelines`). Vamos a
construir DSMak_r, la cuarta herramienta del workspace: un generador de design systems de cliente.
La definición completa está en `docs/features/ds-mak-r.md`: léela primero, es el contrato.

Hay un prototipo de partida, un HTML autocontenido con React empaquetado que trae el motor de
generación ya escrito y funcionando. Te lo paso aparte. No es código para copiar: es la referencia
del algoritmo y del recorrido de cuatro pasos. Todo lo que tiene de persistencia, de chrome y de
idioma se descarta.

## Fase 1 — análisis y plan. NO escribas código todavía.

Estudia la implementación de referencia —FormMak_r para el par galería/editor y la persistencia,
DeckStudio para el mecanismo de autoguardado— y el prototipo, y devuelve un plan que cubra:

1. **Modelo de datos** — la tabla `design_systems` con sus columnas, RLS y trigger, la migración, y
   qué tablas existentes NO se tocan. Incluye qué se guarda en el bucket `deck-assets` y bajo qué
   prefijo.
2. **Esquema y validación** — el Zod de `brand`, `overrides`, `tokens` y `configs`, y cómo
   `compileSystem(row) → { ok, system, issues }` valida sin lanzar. Aquí no hay markdown ni
   compilador de texto, y el documento explica por qué: comprueba que lo entiendes antes de seguir.
3. **El motor** — qué se porta del prototipo a `lib/ds/engine.ts`, qué se reescribe y qué se tira.
   Señala cualquier cosa del algoritmo que no entiendas del todo en vez de portarla a ciegas.
4. **Arquitectura de ficheros** — la lista de archivos nuevos y modificados, con su rol.
5. **Reutilización** — qué se usa tal cual de `components/studio/*`, `components/deck/studio/ui.ts`
   y `lib/supabase/*`; y las dos extracciones a compartido que pide la definición: el hook de
   autoguardado, que hoy está duplicado en DeckStudio y FormStudio, y la subida de logo a Storage.
   Dime cómo migras las dos herramientas existentes al hook sin romperlas.
6. **Middleware, catálogo y URLs** — los cambios exactos en `middleware.ts`,
   `lib/workspace/catalog.ts`, su test, y `docs/features/urls-workspace.md`. Confirma que no hace
   falta ninguna variable nueva en `.env.example`.
7. **Plan de tests** — qué invariante cubre cada test y el cambio en el glob de `package.json`.
8. **Riesgos y decisiones abiertas** — las cuatro que la definición deja abiertas, con tu
   recomendación para cada una.

Si algo de la definición choca con `lib/tokens.ts`, `lib/typeScale.ts` o `CLAUDE.md`, dilo en esta
fase con la norma en la mano. No lo resuelvas por tu cuenta.

**Gate: no escribas ni una línea de código hasta que apruebe el plan.**

## Fase 2 — implementación

Por bloques, en este orden, parando a que revise entre bloques:

1. **Motor y esquema** — `lib/ds/engine.ts`, `schema.ts`, `compile.ts`, `components.ts`,
   `export.ts`, `fonts.ts`, con sus tests. Sin interfaz y sin base de datos. Al cerrar este bloque
   quiero poder llamar al motor desde un test y ver los tokens.
2. **Datos** — migración, RLS, trigger, tipos.
3. **API** — `/api/design-systems` y `/api/design-systems/[id]`, con `supabaseAuthServer()` y
   `requireUser()`, más la entrada en `EDITOR_API`.
4. **Galería** — `/workspace/dsmak_r`, con buscador, filtros, tarjeta, estado vacío y acciones.
5. **Editor** — `/workspace/dsmak_r/[id]`, los cuatro pasos, el autoguardado extraído a hook y
   aplicado también a DeckStudio y FormStudio, y el panel de incidencias.
6. **Cierre técnico** — catálogo, test del catálogo, `urls-workspace.md`.

Reglas mientras implementas:
- Castellano en toda la interfaz del workspace, sin next-intl. Sin puntos suspensivos, tampoco en
  los marcadores de posición.
- Nada de valores de marca a mano: salen de `lib/tokens.ts`. El CSS del prototipo no se porta.
- El chrome usa IBM Plex Serif en 300/400 y IBM Plex Mono en 400/500/600, sin cursiva. Los pesos
  que carga la previsualización son los del sistema del cliente y no siguen esa norma.
- La validación nunca lanza: devuelve incidencias.
- `tokens` no se recalcula en silencio. Si `engine_version` no coincide, se avisa y se ofrece
  regenerar.
- Fuera la barra de progreso falsa del prototipo.
- El paso activo es un número sobre el mismo estado; ningún paso importa a otro.
- `npm run test`, `npm run type-check` y `npm run build` limpios al cerrar cada bloque.

## Fase 3 — cierre

Actualiza `docs/features/ds-mak-r.md` con lo que cambió respecto a la definición: estado a
**implementado**, decisiones que se movieron y por qué, pendientes reales. Lista después los pasos
de verificación manual que me tocan a mí, incluidos los diez de la definición.
```
