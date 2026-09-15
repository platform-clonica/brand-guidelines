# DSMak_r — el generador de design systems de cliente

> Un diseñador introduce los parámetros de marca de un cliente y sale un design system completo:
> rampas de color con su contraste medido, escala tipográfica, espaciado, radios, sombras,
> breakpoints, retícula y los componentes base, listos para descargar como CSS, JSON y styleguide.
> Es la cuarta herramienta del workspace: DeckMak_r vende el proyecto, FormMak_r lo investiga,
> ReWrit_r escribe, y DSMak_r arranca la interfaz.

Estado: **definido** · pendiente de implementar.

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
| Entrada en el catálogo | Ya existe: id `dsmakr`, wordmark `{ before: 'DSMak', after: 'r' }`, posición cuarta. Cambia `href: null` por la ruta y `'Próximamente'` por `'Design systems'` | La tarjeta está apagada desde que se montó el dispatcher |
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

## Decisiones abiertas

| Pregunta | Alternativas | Recomendación |
|---|---|---|
| El cliente, ¿texto o relación? | `client text` espejo, como en `forms`; o `client_id uuid` contra la tabla `clients`, como en `decks` | `client text`. La tabla `clients` está vacía y su uso real es el de las presentaciones, con logo y correos de contacto por defecto. Atarse a ella ahora acopla dos herramientas sin ganar nada |
| Etiquetas | Reutilizar `TagInput` y `GalleryFilters` desde el primer día, o dejar la columna `tags` creada y vacía | Reutilizarlas. El coste es una línea y evita una migración cuando hagan falta |
| La navegación por pasos | El stepper del prototipo, o el split redimensionable del resto de tools | El stepper, sabiendo que Carlos puede querer cambiarlo al verlo funcionando. Por eso se construye como capa fina sobre el estado: el paso activo es un número en la URL o en el estado local, y ningún componente de paso conoce a los demás |
| Regeneración tras cambiar el motor | Avisar en la galería de los sistemas con `engine_version` antigua, o no avisar | Avisar en el editor, no en la galería. Enterarse al abrir es suficiente y no ensucia el listado |

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

RLS:

```sql
alter table public.design_systems enable row level security;

-- No hay superficie pública: anon no lee nada. Ninguna policy para anon, a propósito.
create policy "team reads"   on public.design_systems for select using (auth.role() = 'authenticated');
create policy "team writes"  on public.design_systems for insert with check (auth.role() = 'authenticated');
create policy "team updates" on public.design_systems for update using (auth.role() = 'authenticated');
create policy "team deletes" on public.design_systems for delete using (auth.role() = 'authenticated');
```

Las rutas usan `supabaseAuthServer()`, no `supabaseServer()`: sin policy para `anon`, la clave
pública no lee ni una fila.

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

Qué detecta la validación que el esquema no puede expresar por tipos: un color bloqueado que ya no
existe en la paleta, un breakpoint cuyo mínimo pisa al anterior, una retícula con menos columnas
que las que usa un componente configurado, y un `engine_version` distinto del actual.

## Interfaz

- **Galería** `/workspace/dsmak_r` — buscador sobre nombre, cliente y etiquetas. Filtros por estado
  y por etiqueta con `GalleryFilters`. Tarjeta con el nombre, el cliente, la fecha de edición y una
  tira con los colores principales del sistema. Estado vacío con el texto y el botón de crear.
  Acciones con `CardActions`: abrir, renombrar, duplicar, exportar, borrar con confirmación.
- **Editor** `/workspace/dsmak_r/[id]` — barra superior con el wordmark, el paso activo, el menú de
  usuario y el aviso de guardado. Cuatro pasos:
  1. Marca. Formulario a pantalla completa, es el paso con más campos.
  2. Fundamentos. Los tokens generados, con la previsualización viva al lado. Cada muestra se abre
     para editar, bloquear o regenerar la rampa.
  3. Componentes. Buscador y lista, con los ejes de cada componente y su anatomía.
  4. Entrega. Pestañas JSON, CSS y styleguide, con copiar y descargar.
  Panel de incidencias siempre accesible, con lo que devolvió `compileSystem`.
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
  lib/ds/engine.ts                          motor portado del prototipo: OKLCH, rampas, contraste,
                                            escala, espaciado, radios, sombras
  lib/ds/schema.ts                          Zod de brand, overrides, tokens y configs
  lib/ds/compile.ts                         compileSystem(row) → { ok, system, issues }
  lib/ds/components.ts                      catálogo de los 17 componentes y sus ejes
  lib/ds/export.ts                          tokens.json, tokens.css y styleguide HTML
  lib/ds/fonts.ts                           lista curada y construcción de la URL de Google Fonts
  lib/ds/api.ts                             cliente de /api/design-systems
  lib/ds/types.ts
  lib/ds/__tests__/                         engine, compile, export
  app/api/design-systems/route.ts           GET lista, POST crea
  app/api/design-systems/[id]/route.ts      GET, PATCH, DELETE
  app/workspace/dsmak_r/page.tsx            galería
  app/workspace/dsmak_r/[id]/page.tsx       editor
  components/ds/                            pasos, muestras de color, previsualización, panel de
                                            incidencias
  supabase/migrations/<ts>_create_design_systems.sql
  docs/features/ds-mak-r.md                 este documento

MODIFICADO
  lib/workspace/catalog.ts                  entrada `dsmakr`: href y descripción
  lib/workspace/__tests__/catalog.test.ts   el caso que hoy afirma href === null
  middleware.ts                             /api/design-systems en EDITOR_API
  package.json                              el glob de tests incluye lib/ds/__tests__
  docs/features/urls-workspace.md           las dos rutas nuevas
```

`.env.example`: ninguna variable nueva. No hay modelo, no hay clave, y Storage ya está configurado.

`lib/auth/legacyRoutes.ts`: sin cambios. No se mueve nada que ya existiera.

## Qué se reutiliza en vez de duplicar

Tal cual, sin tocar: `components/studio/Wordmark`, `UserMenu`, `LogoutButton`, `BrandMark`,
`TagInput`, `GalleryFilters`, `CardActions`; `Modal` y `ConfirmModal`; los estilos de
`components/deck/studio/ui.ts`; `lib/supabase/server.ts` con `supabaseAuthServer`, `requireUser` y
`dbFail`; `lib/auth/team.ts`; el trigger `set_updated_at`.

A extraer a compartido, porque lo van a usar dos herramientas:

- **El mecanismo de autoguardado.** Hoy está escrito dos veces, en DeckStudio y en FormStudio, con
  el mismo debounce, el mismo `savingRef` y el mismo `beforeunload`. Con DSMak_r serían tres.
  Sale a un hook, `lib/hooks/useAutosave.ts`, y las dos existentes pasan a usarlo. Es el caso de
  libro de "mismo rol, dos valores".
- **La subida de logo a Storage.** `lib/decks/api.ts` sube al bucket `deck-assets` con una ruta
  propia. Se extrae la función de subida, se le pasa el prefijo, y DSMak_r la llama con `ds/<id>/`.

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

## Verificación

**Automática** — `lib/ds/__tests__/`, añadido al glob de `package.json`:

- `engine.test.ts` — determinismo: los mismos parámetros producen exactamente los mismos tokens.
  Rampas: cada escalón 50→900 es monótono en luminosidad. Contraste: el ratio y el nivel AA/AAA
  coinciden con la fórmula WCAG para pares conocidos. Bloqueos: regenerar respeta lo bloqueado.
- `compile.test.ts` — un `brand` válido pasa sin incidencias; uno corrupto devuelve incidencias con
  la ruta del campo y **no lanza**; una fila con `engine_version` anterior se abre y se señala.
- `export.test.ts` — el CSS declara una variable por token con el prefijo `--ds-`; el JSON mantiene
  su forma y sus metadatos; el styleguide escapa el nombre del sistema y las notas del usuario
  antes de inyectarlos en el HTML.
- `lib/workspace/__tests__/catalog.test.ts` — la entrada `dsmakr` con su nueva ruta, y el orden de
  las tarjetas. El caso que hoy afirma `href === null` hay que cambiarlo, no borrarlo.
- `npm run type-check` y `npm run build` limpios.

**Manual**

1. Sin sesión, `/workspace/dsmak_r` redirige a `/workspace/login?next=/workspace/dsmak_r`.
2. Con una cuenta que no sea `@interactius.com`, lo mismo.
3. La tarjeta aparece encendida en `/workspace`, cuarta, con su icono cian.
4. Crear un sistema, cerrar la pestaña sin tocar nada más, volver a abrirlo: está guardado.
5. Cambiar un color con el editor abierto en otra pestaña y comprobar que el autoguardado no pisa
   lo que la otra escribió sin avisar.
6. Bloquear un color, regenerar, y comprobar que sigue exactamente donde estaba.
7. Subir un logo, borrar el sistema, y comprobar que el archivo no se queda huérfano en el bucket.
8. Descargar el styleguide, abrirlo sin conexión, y comprobar que se ve entero salvo las
   tipografías de Google.
9. Poner un primario que no llegue a AA sobre el fondo claro y comprobar que el aviso sale en la
   muestra y en el styleguide.
10. Duplicar un sistema y comprobar que el duplicado no comparte ni logo ni `public_id`.

## Pendiente

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
