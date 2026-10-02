# IMG_r · fase 1 — plan de implementación

> **Para quien lo ejecute:** se implementa por bloques (1 a 5) y se para al cerrar cada uno para que
> Carlos revise. Cada bloque cierra con `npm run test`, `npm run type-check` y `npm run build` limpios
> y un commit. Los pasos usan casillas (`- [ ]`).

**Objetivo.** Dar al banco de imágenes que ya comparten DeckMak_r y FormMak_r una pantalla de gestión
(`/workspace/img_r`), con nombre y etiquetas obligatorios, tres ficheros por imagen y borrado bloqueado
si la imagen está en uso, y pasar el popup de los dos editores a las mismas piezas.

**Arquitectura.** Misma tabla `images` y mismo bucket `deck-images`. La lógica que se puede probar en
node vive en `lib/images/` (nombres, filtro, subida, vista). Lo que decide la base de datos vive en
SQL: una función define «en uso» y la usan el listado, `usage` y `DELETE`. Las piezas de interfaz salen
a `components/images/` y las montan IMG_r y el popup.

**Stack.** Next 15 (app router), Supabase (Postgres + Storage, `supabaseAuthServer()`), estilos inline
con `components/deck/studio/ui.ts`, tests con `node --test --experimental-strip-types`.

**Contrato.** `docs/features/img-r.md` y `img-r-prototype.html`. Este plan argumenta desde ahí; quien
ejecute lee los tres.

**Estado de la base al redactar (2026-10-01, consultas de solo lectura).** 66 imágenes, 20 decks,
3 formularios. 80 objetos en `deck-images`, 14 de ellos huérfanos (ya conocidos). Las 66 filas tienen
`alt`, ninguna tiene `width`/`height`, todas son `source = 'upload'`. `set_updated_at()` existe.

---

## 0 · Lo que necesito que decidas antes de empezar

Cada punto tiene la norma o el dato que lo motiva y mi recomendación. Los marcados **⚑** chocan con la
definición o con la norma escrita; no los resuelvo por mi cuenta.

| # | Decisión | Dato o norma | Recomendación |
|---|---|---|---|
| D1 ⚑ | **La migración en dos pasos** | La definición dice «directa». Pero `name not null` rompe la subida del popup **en producción** desde que se aplica (bloque 1) hasta que se despliega el código nuevo: la versión desplegada inserta sin `name` y respondería 500. Pueden ser días | Bloque 1: columnas, relleno y todo lo demás, con `name` todavía nullable. Segundo fichero `…_images_name_not_null.sql`, que repite el relleno (idempotente) y pone `not null`: se aplica **justo después** del despliegue |
| D2 ⚑ | **Nombre de las antiguas desde `alt`, no desde la ruta** | Las 66 filas tienen `alt` = nombre original del fichero sin sanear. Difiere de la ruta en 48: `ChatGPT Image 20 ago 2026, 13_27_16` frente a `ChatGPT_Image_20_ago_2026__13_27_16`, `hub (1)` frente a `hub__1_` | `name = alt` recortado; si está vacío, la regla de la ruta de la definición |
| D3 ⚑ | **Valores de rejilla** | La definición fija mínimo 220 px y hueco 24. Las tres galerías (`DeckGallery`, `FormGallery`, `DsGallery`) usan 240 / 28, contenedor 1120 y relleno `40px 32px 64px`, y ninguna tiene cabecera fija (el prototipo sí). Mismo rol, dos valores | Los de las tres galerías y cabecera no fija. La proporción 4:3 de las fotos sí es propia y está justificada |
| D4 ⚑ | **Nombre del detalle en Serif 300 a 24 px** | `lib/typeScale.ts`: a 24 px cae en `title-sm` (20–32 px), que declara **solo peso 400**. `title` admite 300, pero empieza en 32 px | Serif 400 a 24 px (`title-sm`). La otra salida es Serif 300 a 32 px (`title`) |
| D5 ⚑ | **Búsqueda desde el tercer carácter** | Las tres galerías buscan desde el tercero (`SEARCH_MIN = 3`, copiado en tres ficheros: regla de hecho sin escribir). El prototipo busca desde el primero | 3, como las otras. Lo documento como hallazgo |
| D6 | **Quién subió la imagen** | `created_by` apunta a `auth.users`, que la sesión no lee por PostgREST. Hoy hay dos personas que han subido; las 13 cuentas tienen `full_name` | Función `public.team_member_names(uuid[])` `security definer`, ejecutable solo por `authenticated`, que devuelve `full_name` o, si falta, el correo. Reutilizable por otras tools |
| D7 | **Alcance de los cambios en `TagInput`** | Lo comparten DeckMak_r, FormMak_r y DSMak_r | Lista de sugerencias propia, etiqueta asociada, estado de error, desactivado y pegar «a, b» para todos (es el mismo gesto). Los **guiones** solo con la prop `normalize` que pasa IMG_r: cambiar la forma de las etiquetas de decks y formularios es otra decisión. Mantengo el aspecto actual de las fichas, no las oscuras del prototipo |
| D8 | **Avisos flotantes por encima de los modales** | `ToastProvider` existe, pero `.toast` tiene `z-index: 80` y el velo de los modales 90: el aviso «Revisa las imágenes marcadas» saldría debajo del velo | Subir `.toast` por encima de 90 en `globals.css`, tras comprobar que la web de marca no tiene capas entre 80 y 100. Duración: la del sistema (1600 ms), no la del prototipo (2400) |
| D9 | **Escape con modales apilados** | `useFocusTrap` registra un `keydown` por modal en `document`, sin pila: con dos modales abiertos, Escape cierra **los dos**, y el Tab del de abajo puede sacar el foco del de arriba. Pasa ya hoy con la galería y su confirmación de borrado. El detalle 40 lo prohíbe | Pila en el hook: solo el modal de arriba atiende Escape y Tab. Afecta a todos los modales del workspace, para bien; entra en la no regresión |
| D10 | **PNG transparente** | El lienzo es transparente y el JPEG lo pinta en **negro**. Ya pasa hoy con `optimizeImage()` | Rellenar de blanco (`Pure White`) antes de dibujar la ligera y la miniatura. El original no se toca |
| D11 | **Caché de los objetos nuevos** | Hoy `cacheControl: '3600'`. Las rutas nuevas son únicas y nunca se sobrescriben (la fase 2 sobrescribe con rutas nuevas) | Un año para los objetos nuevos. Las antiguas no cambian |
| D12 | **Copy nuevo que no está en el prototipo** | Se necesita para casos que el prototipo no cubre | Ver § 9.4. Los apruebas tal cual o los cambias |
| D13 | **Añadidos al modelo de datos que la definición no lista** | Hacen falta para buscar sin tildes, paginar sin saltos y declarar `edited` | Columna generada `search_text`, índice `(created_at desc, id desc)`, `check` en `source`, y cuatro funciones SQL (§ 1) |
| D14 | **Rama de partida** | Estás en `feat/design-sync`, con cambios sin commitear en `components/clock/*` y `.gitignore`. Clock_r no está en `origin/main` (última copia local), y IMG_r va detrás de `clockr` en el catálogo y en `toolIconAccents` | Rama `feat/img-r` desde `feat/design-sync` **después** de que commitees o guardes lo de Clock_r. Si prefieres partir de `main`, el catálogo y los tokens se rehacen al fusionar |
| D15 | **Papelera en el popup** | El prototipo no la tiene en el popup, pero el check 19 pide comprobar que desde el popup tampoco deja borrar | Se mantiene la papelera al pasar el ratón (`CardActions`), con el mismo flujo de borrado bloqueado que el detalle |
| D16 | **Cómo se hacen los checks manuales** | Piden sesión `@interactius.com` en el navegador. Yo no puedo iniciar sesión con Google | Abres un Chrome con `--remote-debugging-port` y tu sesión, y yo lo manejo con `puppeteer-core` (ya está en `devDependencies`). Si no, haces tú los clics y yo contrasto contra la base y `storage.objects` |

**Cuatro decisiones abiertas de la definición** y otros riesgos: § 11.

---

## 1 · Modelo de datos

### 1.1 Lo que encontré

- **El bucket ya tiene límites, y el supuesto de la definición es falso.**
  `20260817122000_tighten_storage.sql` fijó en `deck-images` **y** en `deck-assets` un
  `file_size_limit` de 10 MB y cinco tipos (`jpeg`, `png`, `webp`, `avif`, `svg+xml`). Verificado en
  remoto. La migración **cambia** esos valores solo en `deck-images`: 25 MB (26 214 400 bytes, el mismo
  MiB con el que el prototipo formatea «31,2 MB») y tres tipos. `deck-assets` no se toca: lleva logos SVG.
- `source` es `text` sin restricción: `edited` no necesita cambio de tipo. Propongo un `check` con los
  tres valores para que la fase 2 quede escrita en la base (las 66 filas son `upload`).
- `set_updated_at()` existe (`search_path` vacío, `new.updated_at = now()`). Se reutiliza.
- RLS y políticas de Storage: `images_team` y las cuatro `deck_images_*_team` para `authenticated`.
  Sin cambios.
- `app/api/images/[id]/route.ts` declara su propio `IMAGE_BUCKET = 'deck-images'` en vez de importarlo
  de `lib/storage/paths`. Se corrige al tocar el fichero.

### 1.2 Columnas

| Columna | Tipo | Paso | Notas |
|---|---|---|---|
| `name` | `text` | M1 nullable · M2 `not null` + `check (btrim(name) <> '')` | Relleno con `image_legacy_name(alt, storage_path)` (D2) |
| `tags` | `text[] not null default '{}'` | M1 | Índice GIN |
| `original_path` | `text` | M1 | Null en las antiguas |
| `original_bytes` | `bigint` | M1 | |
| `original_width` · `original_height` | `int` | M1 | `width`/`height` siguen siendo los de la ligera |
| `thumb_path` | `text` | M1 | Null ⇒ la tarjeta usa la ligera |
| `parent_id` | `uuid references images(id) on delete set null` | M1 | Fase 2. Sin índice hasta que haya copias |
| `prior_original_path` | `text` | M1 | Fase 2 |
| `updated_at` | `timestamptz not null default now()` | M1 | Se rellena con `created_at` **antes** de crear el trigger, para que las antiguas no amanezcan todas con la fecha de la migración |
| `search_text` | `text generated always as (public.image_search_text(name, tags)) stored` | M1 | **Nueva respecto a la definición (D13).** Nombre y etiquetas en minúsculas y sin tildes |

Más: `check (source in ('upload','generated','edited'))`, índice `images_created_at_id_idx
(created_at desc, id desc)` para la paginación por cursor, y trigger `images_set_updated_at before
update … execute function public.set_updated_at()`.

### 1.3 Funciones SQL

Todas con `set search_path = ''` y `revoke execute … from public, anon`; `grant execute` a `authenticated`.

| Función | Tipo | Para qué |
|---|---|---|
| `image_legacy_name(alt text, storage_path text) returns text` | `immutable` | El nombre de una antigua. La usan M1 y M2, así que la regla se escribe una vez |
| `image_search_text(name text, tags text[]) returns text` | `immutable` | `lower()` + `translate()` con un mapa explícito de tildes (`array_to_string` es `stable`, de ahí el envoltorio). El mismo mapa vive en `lib/images/filter.ts` y un test comprueba que los dos literales coinciden |
| `image_uses(p_ids uuid[]) returns table(image_id uuid, kind text, doc_id uuid, doc_name text)` | `stable`, `security invoker` | **La única definición de «en uso»** (§ 3) |
| `team_member_names(p_ids uuid[]) returns table(id uuid, name text)` | `stable`, `security definer` | Quién subió la imagen (D6) |

### 1.4 La migración de las existentes

1. Antes de aplicar: `select count(*) from images` → al informe del bloque 1.
2. M1 añade columnas, rellena `name`, `updated_at = created_at`, crea índices, funciones, trigger y
   `check`, y actualiza el bucket. Todo en una transacción.
3. Después: recuento, filas con `name` nulo o vacío, y comparación de los 66 nombres que produjo el SQL
   con los que da `legacyName()` en TypeScript. Así el test de `naming` deja de ser un espejo sin
   comprobar.
4. M2 (`not null`) queda escrito y **sin aplicar** hasta el despliegue (D1).

### 1.5 Qué no se toca

`decks`, `forms` y su `md`. Ningún objeto de `deck-images`: ni se mueve ni se renombra, y las rutas
`images/<timestamp>-<nombre>` se quedan. El bucket `deck-assets`. Las políticas RLS y de Storage.
`created_by`. El texto de `getImagePrompt()`. Los 14 huérfanos (limpiarlos es irreversible y va aparte).

---

## 2 · Ficheros por imagen

### 2.1 Las tres variantes

| Variante | Ruta en `deck-images` | Cómo se genera | Va en |
|---|---|---|---|
| Original | `images/<id>/original.<jpg\|png\|webp>` | El `File` tal cual, byte a byte (check 5 compara el `md5`) | `original_path` |
| Ligera | `images/<id>/light.jpg` | Lado largo 1600 px, JPEG 0,82. Nunca amplía | `storage_path` y `url` |
| Miniatura | `images/<id>/thumb.jpg` | Lado largo 480 px, JPEG 0,82 | `thumb_path` |

- Todo en el navegador. La imagen se decodifica **una vez** (`createImageBitmap(file, { imageOrientation:
  'from-image' })`) y se dibuja dos veces. Así un JPEG de 25 MB no se decodifica dos veces en un móvil.
- `optimizeImage()` conserva su firma y su comportamiento: extraigo de él el paso «escalar y codificar»
  a una función que devuelve `{ blob, width, height }`, y `optimizeImage` la llama. Su respaldo actual
  (si no hay contexto 2D devuelve el fichero original) **no** vale para la subida: ahí se lanza error.
- Relleno blanco antes de dibujar (D10).
- `id` = `crypto.randomUUID()` en el navegador, uno **por intento**.
- Las vistas previas de las filas usan `URL.createObjectURL()` y se revocan al quitar la fila o cerrar.
  El prototipo lee el fichero entero como data URL, que con varios de 25 MB es memoria de sobra.

### 2.2 Orden de subida y registro

Por imagen, una detrás de otra (como el prototipo: «Subiendo 2 de 5»):

1. Original. Es el más pesado y el que más probablemente falla, así que falla antes de que exista nada.
2. Ligera.
3. Miniatura.
4. `POST /api/images` con `id`, `name`, `tags`, medidas y peso.

Si falla cualquier paso, el navegador borra los objetos que **ese intento** llegó a subir. Si el borrado
también falla, queda el registro de huérfano en la consola, igual que hoy. El reintento usa un `id`
nuevo, así que un resto del intento anterior nunca choca con `upsert: false`.

El `POST` no se fía de la ruta que manda el navegador: recalcula las tres rutas desde el `id` y el tipo,
calcula la `url` pública en servidor, normaliza las etiquetas y comprueba con un `list('images/<id>')`
que los tres objetos existen. Si falta alguno, `400` y no hay fila. En las nuevas, `alt` guarda el mismo
texto que `name`, para que la columna no quede vacía a partir de ahora.

### 2.3 Borrar sin huérfanos

`DELETE /api/images/[id]`: comprueba el uso (§ 3), borra **primero la fila** y después
`[original_path, storage_path, thumb_path, prior_original_path]` sin los nulos. Las antiguas solo tienen
`storage_path`. Se comprueba cuántos objetos **confirma** Storage haber borrado, como ya hace
`DELETE /api/design-systems/[id]` (sin política de lectura, `remove()` respondía 200 y no borraba). Si
faltan, `console.error('[storage:images] huérfano', …)` con los que quedan.

---

## 3 · Concurrencia y reglas

### 3.1 Una sola definición de «en uso»

`public.image_uses(uuid[])` cruza cada imagen con `decks.md` y `forms.md` por `strpos(md, url) > 0`
(sin comodines que escapar) y devuelve una fila por documento: `kind` (`deck`/`form`), `doc_id` y
`doc_name` con la regla de hoy (`commercial_id`, si no el nombre del cliente, si no «Sin nombre»; el
título del formulario, si no «Sin título»).

`lib/images/usage.ts` (solo servidor) la envuelve: `imageUses(sb, ids) → Map<id, ImageUse[]>`. La usan:

| Consumidor | Qué hace con ella |
|---|---|
| `GET /api/images` | `use_count` de cada tarjeta, en **una** llamada para las 60 |
| `GET /api/images/[id]` | La lista «Se usa en» del detalle |
| `GET /api/images/[id]/usage` | Igual que hoy (`{ count, uses }`), ahora delegando |
| `DELETE /api/images/[id]` | La regla que bloquea |

### 3.2 `PATCH /api/images/[id]`

Cuerpo `{ name, tags, expectedUpdatedAt }`. Valida nombre no vacío, al menos una etiqueta tras
normalizar y los máximos (§ 6, `lib/images/upload.ts`). Actualiza con `.eq('id').eq('updated_at',
expectedUpdatedAt)`, el mismo patrón que `design_systems`.

| Resultado | Respuesta | En la interfaz |
|---|---|---|
| Coincide | `200` con la fila | «Cambios guardados» |
| La fila ya no existe | `404` | «Esa imagen ya no está en el banco.» |
| Otro guardó antes | `409` con `{ error, current }` (la fila entera) | El panel del detalle 35 con los cambios reales |

Las dos salidas del choque:

- **«Guardar encima»** reenvía con `expectedUpdatedAt = current.updated_at`. Fuerza sobre **esa** versión,
  la que la persona acaba de ver; si una tercera pestaña guarda entre medias, vuelve a salir el choque.
  Nunca es una escritura a ciegas.
- **«Recargar»** pinta `current` en el detalle, descarta lo escrito y avisa «Recargada con los cambios de
  la otra pestaña» (texto del prototipo).

El cliente no necesita una clase de error: la llamada devuelve `{ ok: true, row } | { ok: false,
conflict: row }`.

### 3.3 `DELETE /api/images/[id]` con `409`

`requireUser`, id válido, lee la fila, llama a `imageUses`. Con usos: `409` con `{ error, uses }` y no
toca nada. Sin usos: § 2.3. El popup, IMG_r y cualquier cliente futuro reciben la misma respuesta.

Ventana conocida: entre la comprobación y el borrado alguien podría colocar la imagen en un documento.
Son milisegundos; lo acepto y lo dejo escrito.

---

## 4 · Listado

### 4.1 `GET /api/images`

Parámetros `q`, `tags` (separadas por comas), `untagged=1`, `cursor`, `limit` (por defecto y como máximo 60).

- **Orden** `created_at desc, id desc`. **Paginación por cursor** (`created_at` + `id`), no por
  desplazamiento: si alguien sube mientras otra persona baja por la rejilla, el desplazamiento repetiría
  tarjetas. Se piden 61 para saber si hay más. Respuesta `{ items, nextCursor }`.
- **Búsqueda sin tildes.** `q` se recorta y, si llega al mínimo (D5), se pliega con `foldSearch()` y se
  busca con `ilike` sobre `search_text` (escapando `%`, `_` y `\`). Mira nombre y etiquetas.
- **Etiquetas en Y.** `contains('tags', tags)`: el operador `@>`, que usa el índice GIN.
- **«Sin etiquetas».** `eq('tags', '{}')`, y anula `tags`: es excluyente también en servidor.
- **Recuento de uso.** Una llamada a `image_uses` con los ids de la página.

### 4.2 `GET /api/images/tags` (nuevo)

`{ tags: [{ tag, count }], untagged }`, ordenadas por uso y luego alfabéticamente, como el prototipo.
Alimenta las píldoras y las sugerencias de `TagInput`. Se calcula en TypeScript (`tagFacets()`, con test)
sobre la columna `tags` de todas las filas: con miles de imágenes son decenas de KB. Se vuelve a pedir
tras subir, editar o borrar.

### 4.3 ¿Aguanta el `ilike` por imagen?

**No lo recomiendo, y no por la base sino por las peticiones.** Hoy `usage` hace dos consultas por imagen
(decks y formularios) a través de PostgREST. Para 60 tarjetas serían 120 peticiones HTTP por página desde
la función de Netlify. La función SQL hace lo mismo en una.

Medido el 2026-10-01 con `explain analyze`: cruzar las 66 imágenes con los 20 decks son 1 320
comparaciones y **29 ms**. Extrapolado (unos 22 µs por comparación con el tamaño medio actual del `md`),
una página de 60 aguanta bien hasta unos 300 documentos (~400 ms). La señal para el siguiente paso, una
tabla de referencias mantenida por trigger, es que el listado pase de medio segundo.

---

## 5 · Interacción: los 40 detalles, uno a uno

Todos los textos entre comillas se implementan **literalmente**.

| # | Se implementa | Cómo |
|---|---|---|
| 1 | Sí | `BrandMark` 20 px → `/workspace` («Ir a la landing de aplicaciones»), `MarkDivider`, `ImgLogo` 22 px, `SearchField` centrado (etiqueta «Buscar imágenes por nombre o etiqueta», texto «Buscar»), `LogoutButton`. Cabecera no fija si se aprueba D3 |
| 2 | Sí | Sin titular ni recuento |
| 3 | Sí | Píldoras de `FilterBar` tal cual (blancas, 8/16, centradas, sin contador). Y en servidor con `@>` |
| 4 | Sí | `Pill` gana la prop `dashed`; `FilterBar` gana `special` para «Sin etiquetas». Solo aparece si hay alguna sin etiquetas. Pulsarla limpia las etiquetas y pulsar una etiqueta la apaga |
| 5 | Sí | Enlace «Quitar filtros» con el subrayado canónico al final de la fila, si hay búsqueda o filtro (`FilterBar` gana `trailing`) |
| 6 | Sí | Primera celda: borde 2 px tinta, 4:3, «+» en Mono **400** 40 px, «Subir imágenes» 500 11 px y «JPEG, PNG o WebP · hasta 25 MB · también puedes arrastrarlas aquí» 400 10 px ceniza |
| 7 | Sí | `dragover`/`drop` en la ventana, solo si lo arrastrado son ficheros. Abre la subida con ellos o los añade a la abierta. Mientras sube, se ignoran (detalle 25) |
| 8 | Sí | `ImageCard` en variante `bank`: miniatura 4:3 con filete cálido y fondo `Grey`, nombre, etiquetas blancas con borde cálido, «Sin etiquetas» discontinua y transparente |
| 9 | Sí | «En uso · N» oscura si `use_count > 0`; «Solo versión ligera» clara si no hay `original_path` |
| 10 | Sí | Nombre en ceniza si no hay original |
| 11 | Sí | Zoom 1,03 en 0,4 s con la curva de la casa; nada con `prefers-reduced-motion`. Va en `components/images/images.css` porque un estilo inline no admite `:hover` en un hijo ni `@media` |
| 12 | Sí | «Aún no hay imágenes en el banco. Sube la primera con el botón de arriba: te pediremos un nombre y al menos una etiqueta para poder encontrarla después.» Si la primera página llega vacía **sin** filtros |
| 13 | Sí | «Ninguna imagen coincide con la búsqueda o con las etiquetas elegidas. Prueba con menos etiquetas o quita los filtros.» |
| 14 | Sí | Cinco tarjetas fantasma que laten y «Cargando» |
| 15 | Sí | «No se ha podido cargar el banco de imágenes. Recarga la página; si sigue fallando, avisa en el canal de herramientas.» en Burdeos, `role="alert"`. El mismo texto si falla la carga de una página siguiente |
| 16 | Sí | Zona de soltar (borde discontinuo ceniza, fondo blanco; al arrastrar encima, borde tinta y fondo `Grey`): «Arrastra aquí las imágenes o» + enlace «elige archivos» + «JPEG, PNG o WebP · hasta 25 MB cada una». Filas con vista previa, «nombre.jpg · 3,1 MB», enlace «Quitar», nombre y etiquetas |
| 17 | Sí | El nombre empieza vacío con la pista «Nombre: qué se ve en la imagen». El nombre del fichero solo aparece en la línea de la fila. Etiqueta oculta «Nombre de x.jpg» |
| 18 | Sí | Con dos o más filas, «Etiquetas para todas» y «Se añaden a cada imagen. Cada una puede llevar además las suyas. Pulsa Intro o coma para añadir cada etiqueta.» |
| 19 | Sí | «Por ejemplo: oficina, presentación, equipo» mientras el campo no tenga etiquetas |
| 20 | Sí | Con `TagInput` completado (§ 7.3) |
| 21 | Sí | «Etiquetas: a, b, c», comunes y propias sin repetir, en ceniza |
| 22 | Sí | «x.gif: no es JPEG, PNG ni WebP.» · «x.jpg: pesa 31,2 MB y el límite es 25 MB.», una línea por fichero, en Burdeos. El bucket lo vuelve a imponer |
| 23 | Sí | «Falta el nombre.» o «Falta al menos una etiqueta, propia o común.» en la fila, el campo en Burdeos y el aviso «Revisa las imágenes marcadas: falta nombre o etiqueta». No sube ninguna |
| 24 | Sí | «Subir» · «Subir N imágenes» (cuenta las pendientes) · «Subiendo X de N». Cada fila: «Subiendo» y «Subida» |
| 25 | Sí | Mientras sube, el `onClose` del modal no hace nada (Escape, clic fuera y «Cancelar»), y filas, campos, «Quitar», «elige archivos» y la zona de soltar quedan desactivados |
| 26 | Sí | «No se pudo subir. Revisa la conexión y vuelve a pulsar Subir.» en la fila; las buenas aparecen ya en la rejilla; al volver a pulsar solo van las fallidas. Aviso con el plural corregido (§ 9.4) |
| 27 | Sí | Se cierra, las nuevas entran primero (si cumplen el filtro activo), se recargan las píldoras, «Imagen subida» o «N imágenes subidas» |
| 28 | Sí | Detalle en dos columnas desde 820 px: imagen ligera sobre `Dark`, nombre en Serif (D4), etiquetas blancas, datos (Original: medidas y peso o «No se guardó» · Ligera: medidas y JPEG · Subida: fecha y persona) y «Se usa en» con «Deck» o «Formulario» y el nombre, o «Ningún deck ni formulario la usa.». Las antiguas no tienen medidas: se leen de la imagen cargada |
| 29 | Sí | «Descargar original», «Descargar versión ligera», «Editar nombre y etiquetas» y «Eliminar» (Burdeos) como enlaces con `.hover-wipe-underline` |
| 30 | Sí | Sin «Descargar original» y con la nota «Esta imagen se subió desde un deck antes de que existiera IMG_r. Solo se guardó la versión ligera de 1600 px: no hay original que descargar.» |
| 31 | Sí | «Descargando el original · 14,2 MB» · «Descargando la versión ligera · JPEG 1600 px», sin «(simulado)». La descarga es la URL pública con `?download=<nombre>.<ext>` |
| 32 | Sí | «Nombre» con «Lo que verá el equipo al buscar. Describe qué se ve, no el archivo.» · «Etiquetas» con «Al menos una. Pulsa Intro o coma para añadirla. Se guardan en minúsculas.» En las antiguas el nombre empieza vacío con el actual como pista |
| 33 | Sí | «Ponle un nombre para poder guardarla.» · «Añade al menos una etiqueta.» |
| 34 | Sí | Guardar llama a `PATCH` y avisa «Cambios guardados» |
| 35 | Sí | «Alguien ha cambiado esta imagen desde otra pestaña mientras la editabas.», los cambios **reales** del `409` y los enlaces «Guardar encima» y «Recargar» |
| 36 | Sí | «No se puede eliminar», ««X» se usa en N documentos. Cambia la imagen en ellos y vuelve a intentarlo.» (con la variante singular del prototipo: «en un documento… en él»), la lista y «Entendido». Sale por la comprobación previa o por un `409` |
| 37 | Sí | «Se borrará «X», con su original y su versión ligera. Ningún deck ni formulario la usa. Esta acción no se puede deshacer.» (las antiguas, sin «con su original y su versión ligera», como el prototipo). El botón pasa a «Eliminando» y se desactiva; aviso «Imagen eliminada»; la URL vuelve a `/workspace/img_r` |
| 38 | Sí | Popup: «Galería de imágenes» (hoy «Galería de Imágenes»), buscador, píldoras, enlace «Subir imágenes» que abre la misma subida, rejilla seleccionable con borde oscuro, «Aceptar» apagado hasta elegir y la primera nueva seleccionada tras subir. Igual en FormMak_r |
| 39 | **No** | Lo que dice la definición: `FilterBar` completo, sin recorte |
| 40 | Sí | Pila de modales en `useFocusTrap` (D9). Clic fuera y devolución del foco ya los da `Modal` |

**Lo que el prototipo hace y la tabla no recoge:**

- Popup sin resultados: «Ninguna imagen coincide.» Sí.
- Aviso tras «Recargar»: sí (§ 3.2).
- Pie del detalle con «Cerrar» (botón fantasma): sí.
- Cabecera fija: no, si se aprueba D3.
- Buscador del popup con la pista «Buscar por nombre o etiqueta»: uso `SearchField`, que dice «Buscar».
  Es la pieza compartida; si quieres la pista del prototipo, `SearchField` gana una prop `placeholder`.
- Fichas de etiqueta oscuras dentro del campo: no, se mantiene el aspecto de `TagInput` (D7).

**Lo que añado y el prototipo no tiene:** un id que no existe abre la galería con «Esa imagen ya no está
en el banco.» (de la definición), y el plural y el cero del aviso de subida (§ 9.4).

**Rutas.** `/workspace/img_r` y `/workspace/img_r/[id]` montan el mismo `ImageBank`; la segunda le pasa
el id. Abrir el detalle hace `history.pushState` a `/workspace/img_r/<id>` (Next 15 sincroniza
`usePathname` sin navegar, así que no se remonta nada ni se pierde el scroll). Cerrar vuelve atrás si el
detalle lo abrió la galería, o hace `replaceState` si se entró por el enlace. Atrás y Adelante del
navegador abren y cierran el detalle. El detalle pide la imagen a `GET /api/images/[id]`, porque puede no
estar en las páginas cargadas.

---

## 6 · Arquitectura de ficheros

★ = no está en la lista de la definición.

### Nuevos

| Fichero | Rol |
|---|---|
| `app/workspace/img_r/page.tsx` | Galería. `metadata`: título «IMGr», `noindex` |
| `app/workspace/img_r/[id]/page.tsx` | Galería con el detalle abierto. Título «IMGr · Imagen» |
| `app/api/images/tags/route.ts` ★ | Píldoras y sugerencias (§ 4.2) |
| `components/images/ImageBank.tsx` | La galería: cabecera, filtros, rejilla, carga por páginas, soltar ficheros, URL del detalle |
| `components/images/ImageUploadModal.tsx` | La subida, compartida por IMG_r y el popup. Devuelve los registros creados |
| `components/images/ImageCard.tsx` | Tarjeta en dos variantes: `bank` (insignias y etiquetas) y `pick` (seleccionable, solo nombre) |
| `components/images/ImageFilters.tsx` | `FilterBar` con etiquetas, «Sin etiquetas» y «Quitar filtros». El buscador lo coloca cada contenedor (cabecera o popup) |
| `components/images/useImageList.ts` ★ | Estado de filtro, espera de 250 ms al teclear, páginas, píldoras y recarga. Lo comparten la galería y el popup, que si no lo duplicarían |
| `components/images/ImageDetailModal.tsx` | Detalle, descargas, editar, borrar |
| `components/images/ImageMetaModal.tsx` | Nombre y etiquetas, con el choque entre pestañas |
| `components/images/ImageDeleteModal.tsx` ★ | Los dos modales de borrado (bloqueado y confirmación). Los usan el detalle y el popup |
| `components/images/images.css` ★ | Solo movimiento: zoom, latido de las fantasmas y `prefers-reduced-motion` |
| `lib/images/naming.ts` | Nombre de las antiguas, normalización de etiquetas, nombre de descarga, texto de los cambios ajenos |
| `lib/images/filter.ts` | Plegado sin tildes, texto de búsqueda, filtro, conmutadores de píldoras, parámetros del listado, cursor, píldoras |
| `lib/images/upload.ts` | Tipos y peso, rutas de las variantes, lote válido, textos del botón y del aviso, validación de `POST` y `PATCH`. Sin SDK: lo importan el navegador, los Route Handlers y los tests |
| `lib/images/view.ts` ★ | Lo que la tarjeta y el detalle derivan de una fila: antigua o no, fuente de la miniatura, líneas de datos, enlaces de descarga. Es lo que más fácil se rompe con las antiguas, y así tiene test |
| `lib/images/client.ts` ★ | Solo navegador: decodificar, generar las variantes y subir una imagen entera con su limpieza |
| `lib/images/usage.ts` ★ | Solo servidor: envoltorio de `image_uses` |
| `lib/uuid.ts` ★ | `isUuid`. Ya hay dos copias (`lib/ds/server.ts`, `lib/clock/server.ts`); en vez de una tercera, se extrae y las dos lo reexportan sin cambiar su comportamiento |
| `lib/hooks/modalStack.ts` ★ | La pila de modales, pura, para `useFocusTrap` (D9) |
| `lib/images/__tests__/{naming,filter,upload,view}.test.ts` | § 10 |
| `lib/hooks/__tests__/modalStack.test.ts` ★ | § 10 |
| `lib/__tests__/studioColors.test.ts` ★ | Los colores de `studio/ui.ts` coinciden con `lib/tokens.ts` |
| `supabase/migrations/<ts>_images_bank.sql` | M1 |
| `supabase/migrations/<ts>_images_name_not_null.sql` ★ | M2, tras el despliegue (D1) |
| `img-r-prototype.html` · `docs/features/img-r.md` | Ya existen sin commitear; entran en el primer commit |

### Modificados

| Fichero | Cambio |
|---|---|
| `app/api/images/route.ts` | `GET` paginado con `q`, `tags`, `untagged`, cursor y `use_count` · `POST` con `id`, `name`, `tags`, rutas y medidas, validado |
| `app/api/images/[id]/route.ts` | `GET` ★ con `uses` y quién subió · `PATCH` · `DELETE` con `409`. Importa `IMAGE_BUCKET` |
| `app/api/images/[id]/usage/route.ts` | Delega en `imageUses` |
| `lib/decks/types.ts` | `ImageRecord` con los campos nuevos y `source` con `edited`; `ImageCreateInput`, `ImageUpdateInput`, `ImageListItem`, `ImageDetail`; `ImageUse` con `id` |
| `lib/decks/api.ts` | `uploadImageObject`, `removeImageObjects`, `listImages(params)`, `listImageTags`, `getImage`, `updateImage`; `deleteImage` distingue el `409`. Se quita el `uploadImage` de rutas con marca de tiempo |
| `lib/deck/optimizeImage.ts` ★ | Extrae el paso «escalar y codificar» con medidas; `optimizeImage` igual por fuera |
| `components/deck/studio/ImageGallery.tsx` | Reescrito sobre las piezas compartidas (§ 7.2). Misma firma: `DeckStudio` y `FormStudio` no cambian |
| `components/studio/GalleryFilters.tsx` | `Pill` con `dashed`; `FilterBar` con `special`, `trailing` y `marginBottom`, y deja de devolver `null` si solo hay «Sin etiquetas» |
| `components/studio/TagInput.tsx` | § 7.3 |
| `components/studio/Wordmark.tsx` ★ | `ImgLogo`, como `DsLogo` y `ClockLogo` |
| `components/deck/studio/ui.ts` ★ | `colors` gana `bordeaux`, `grey` y `ashDark` (espejo de `lib/tokens.ts`, con test); `btnDanger` usa `colors.bordeaux` |
| `lib/hooks/useFocusTrap.ts` ★ | Solo el modal de arriba atiende Escape y Tab (D9) |
| `app/globals.css` ★ | `z-index` de `.toast` (D8) |
| `lib/ds/server.ts` · `lib/clock/server.ts` ★ | Reexportan `isUuid` de `lib/uuid.ts` |
| `components/workspace/AppIcon.tsx` | Icono `imgr` |
| `lib/workspace/catalog.ts` · `lib/workspace/__tests__/catalog.test.ts` | Entrada `imgr` |
| `lib/tokens.ts` | Acento magenta |
| `package.json` | Glob de tests |
| `docs/features/urls-workspace.md` · `docs/features/deck-image-gallery.md` · `docs/features/img-r.md` | § 8 y estado |

---

## 7 · Reutilización

### 7.1 Tal cual

`BrandMark`, `MarkDivider`, `Wordmark` (vía `ImgLogo`), `SearchField`, `LogoutButton`, `CardActions` (la
papelera del popup), `Modal`, `ConfirmModal` (confirmación de borrado), los estilos de `studio/ui.ts`
(`btn`, `btnGhost`, `btnDanger`, `label`, `input`, `field`, `cardTitle`, `colors`), `ToastProvider` y
`useToast`, la clase `.hover-wipe-underline` de `globals.css`, `IMAGE_BUCKET` de `lib/storage/paths`,
`supabaseAuthServer()`, `requireUser()`, `dbFail()`, `json()` de `publicApi.ts`, `set_updated_at()`, y el
patrón de concurrencia y de borrado comprobado de `app/api/design-systems/[id]/route.ts`.

### 7.2 Qué sale de `ImageGallery.tsx` y cómo queda el popup

| Hoy en `ImageGallery.tsx` | Pasa a |
|---|---|
| `onFile`: optimiza, sube una variante, registra con `alt` | `ImageUploadModal` + `lib/images/client.ts` |
| La celda con `background-image` y borde de selección | `ImageCard` variante `pick` |
| La carga de la lista entera | `useImageList` (con búsqueda, píldoras y páginas) |
| `deleteMessage()` y el `ConfirmModal` que deja borrar en uso | `ImageDeleteModal`, que bloquea. El texto viejo se va, y con él «⚠», «Comprobando…», «Cargando…» y «Subiendo…» |

El popup después: `Modal` «Galería de imágenes» de 960 px; fila con `SearchField` y el enlace «Subir
imágenes»; `ImageFilters` completo; rejilla de `ImageCard` `pick` (150 px, huecos de 12, scroll propio,
carga la página siguiente al acercarse al final); papelera al pasar el ratón con el borrado bloqueado
(D15); error en Burdeos; pie «Cancelar» / «Aceptar». Mismas props `onSelect(url)` y `onClose`, y `url`
sigue siendo la de la **ligera** (check 22).

### 7.3 Qué le falta a `TagInput` para el detalle 20

| Requisito | Hoy | Cambio |
|---|---|---|
| Intro, coma o salir del campo | Sí | — |
| Retroceso con el campo vacío quita la última | Sí | — |
| Minúsculas | Sí | — |
| Guiones en lugar de espacios | No | Prop `normalize`; IMG_r pasa `normalizeTag` (D7) |
| Sugerencias por prefijo | No: `<datalist>` nativo, el navegador decide (Chrome busca por subcadena) | Lista propia bajo el campo, máximo 6, como el prototipo |
| Sugerencias sin tildes | No | Con `foldSearch()` |
| Navegables con flechas | Solo como las pinta el sistema | ↑ ↓ e Intro sobre la marcada; `combobox` / `listbox` / `aria-activedescendant` |
| Pegar «a, b» | Crea una etiqueta «a, b» | Se parte por comas |
| Etiqueta asociada al campo | No: `<label>` sin `htmlFor` | `id` propio |
| Campo en Burdeos | No existe | Prop `invalid` |
| Desactivado durante la subida | No existe | Prop `disabled` |
| Pista solo sin etiquetas | Siempre la misma | Igual que el prototipo |

---

## 8 · Catálogo, acento, URLs

**`lib/workspace/catalog.ts`**, entre `clockr` y `socialmakr`:

```ts
{ id: 'imgr', label: 'IMGr', group: 'tools', href: '/workspace/img_r',
  description: 'Banco de imágenes', wordmark: { before: 'IMG', after: 'r' } },
```

`label` sigue el patrón de `DSMakr` y `Clockr` (el wordmark sin el guión bajo). La prueba de que la ruta
replica el wordmark ya cuadra: `IMG_r` → `img_r`. El test: `imgr` en el orden de `tools`
(`… 'clockr', 'imgr', 'socialmakr'`) y su `href` en «las herramientas que ya existen».

**`lib/tokens.ts`**, detrás de `clockr`, con su nota:

```ts
/* IMG_r, octubre de 2026. Decisión de CARLOS, con Alberto informado después; queda anotada así para
   que él pueda revocarla sin reconstruir el porqué. Aviso dado y asumido: a 72 px el magenta queda
   cerca del coral de DeckMak_r (#FF6B6B). Alcance: AppIcon.tsx y nada más. */
{ app: 'imgr', hex: '#EC4899', note: 'Magenta — la imagen y el revelado' },
```

El texto de `note` es propuesta mía; cámbialo si quieres.

**`components/workspace/AppIcon.tsx`.** No hay arte del icono en la definición. Propongo un borrador con
la gramática de los otros cinco (lienzo 400, trazo 6, `square`/`miter`, tres capas): `Opal` para una
foto trasera desplazada, `Dark` para la foto delantera con su horizonte y `#EC4899` para el sol y una
etiqueta, con relleno al 0,15. Queda pendiente de que lo vea Alberto, como el resto de iconos. La tarjeta
de la home y el menú `ToolsMenu` salen solos del catálogo.

**`docs/features/urls-workspace.md`**, detrás de las filas de Clock_r:

| URL | Qué es |
|---|---|
| `/workspace/img_r` | Banco de imágenes: galería, subida, búsqueda y filtros |
| `/workspace/img_r/[id]` | La galería con el detalle de una imagen abierto (modal con URL propia) |

**`docs/features/deck-image-gallery.md`**, nota al principio: desde octubre de 2026 el banco se gestiona
en IMG_r (`docs/features/img-r.md`), el popup monta las piezas de `components/images/` y el borrado de
una imagen en uso está bloqueado.

**`middleware.ts` no cambia. Confirmado:**

- `/workspace/img_r` y `/workspace/img_r/<id>` caen en la rama de `/workspace/*`: sesión de equipo,
  redirección a `/workspace/login?next=…` y `X-Robots-Tag: noindex, nofollow`.
- `/api/images`, `/api/images/tags`, `/api/images/<id>` y `/usage` cuelgan de `/api/images`, que ya
  está en `EDITOR_API`. Los handlers llaman además a `requireUser()`.
- El `matcher` excluye las rutas con punto; ninguna ruta nueva lo tiene (los ids son uuid).
- Las descargas van directas a Supabase Storage y no pasan por el middleware.

---

## 9 · Cumplimiento de marca de la interfaz

### 9.1 Copy

Pasé los 75 textos del prototipo y de la definición por `evalText()` de `lib/eval.ts`: **cero**
violaciones de vocabulario prohibido o de puntuación. La regla de longitud (15 a 22 palabras) no aplica a
microcopy, y `evalText` ya la trata como blanda (`hardFail` solo cuenta vocabulario y puntuación). El
copy nuevo de § 9.4 pasa por la misma prueba en el bloque en que entre.

### 9.2 Tipografía

- Mono 400/500/600 y nada más. El «+» de la primera celda va en **400**, como en `DsGallery`.
- Serif solo en el nombre del detalle, con el peso de D4. Sin cursiva.
- Tamaños: los de `studio/ui.ts` para el cromo (10, 11, 12 y 13 px), como en las otras tools. Las
  etiquetas y las insignias, a 10 px (`caption`).
- `Wordmark` en Mono 700 y `colors.brick`: desviaciones conocidas, se usan tal cual.

### 9.3 Color y CTA

- Ningún hex en los componentes: todo sale de `studio/ui.ts`, que gana `bordeaux`, `grey` y `ashDark`
  como espejo de `lib/tokens.ts`. Un test vigila que coincidan, que es la protección que le falta a la
  duplicación de tokens que ya documenta `CLAUDE.md`.
- Burdeos solo en errores, rechazos, campos inválidos, el panel del choque y «Eliminar». Es su `uiRole`.
- Magenta solo en `AppIcon.tsx`.
- **CTA como enlace** con `.hover-wipe-underline` en página y detalle: «Quitar filtros», las cuatro
  acciones del detalle, «elige archivos», «Quitar», «Subir imágenes» del popup, «Guardar encima» y
  «Recargar». La primera celda es una tarjeta-botón, el mismo traje que «Crear design system». En los
  modales, los botones compartidos, hasta que decida Alberto (§ 11).

### 9.4 Copy nuevo que necesito que apruebes (D12)

| Caso | Texto propuesto |
|---|---|
| Subida con fallos, una buena | «1 subida · N con error» (el prototipo diría «1 subidas») |
| Subida con fallos, ninguna buena | «No se ha subido ninguna · N con error» |
| Fichero que no se puede decodificar | «x.jpg: no se ha podido leer la imagen. Prueba con otro archivo.» |
| Cambios ajenos en el choque | «Sus cambios: nombre «X»; etiquetas añadidas: a, b; etiquetas quitadas: c.» (solo las partes que cambien) |
| Nombre de descarga | El nombre de la imagen sin `/ \ : * ? " < > \|`, con su extensión |

### 9.5 Lo que vi de paso y no toco

No entra en el alcance, pero la norma pide decirlo:

- `DeckGallery.tsx:190` y `FormGallery.tsx:169`: el «+» en **Mono 300**; Mono admite 400/500/600.
  `DsGallery` ya lo corrigió.
- `components/rewriter/Rewriter.tsx:444`: **Serif 500**; Serif admite 300/400.
- Puntos suspensivos en las pistas de `DeckMetaModal` («(recruitment, 2024…)») y `FormMetaModal`
  («(taller, prework…)»).
- `SEARCH_MIN = 3` copiado en tres galerías sin estar escrito como norma.
- El patrón de galería del workspace (cabecera, `FilterBar`, primera celda, rejilla) solo vive en el
  código. La definición ya lo deja como propuesta aparte.

---

## 10 · Plan de tests

Glob de `package.json`: se añade `lib/images/__tests__/*.test.ts` al final del script `test`.
`lib/hooks/__tests__` y `lib/__tests__` ya están en el glob.

| Test | Invariante |
|---|---|
| `naming.test.ts` · `legacyName` | Prefiere `alt` (D2); sin `alt`, quita `images/`, la marca de tiempo y la extensión y conserva `_` y `-`; nunca devuelve vacío |
| `naming.test.ts` · `normalizeTags` | Minúsculas, recorte, espacios a un solo guion, sin guiones en los bordes, conserva tildes, parte por comas, sin duplicados ni vacías, en el orden de entrada, con máximos |
| `naming.test.ts` · `downloadName` | Quita los caracteres prohibidos en ficheros, conserva tildes, añade la extensión |
| `naming.test.ts` · `describeChanges` | Nombre, añadidas y quitadas, con el texto exacto de § 9.4; vacío si no hay cambios |
| `filter.test.ts` · `foldSearch` | «PASILLO», «presentación», «Ç», «ñ», «à» y «ü» se pliegan; búsqueda sin tildes |
| `filter.test.ts` · mapa de tildes | Los literales de `translate()` de la migración son exactamente `FOLD_FROM` y `FOLD_TO`: la búsqueda del servidor y la del cliente no se pueden separar sin que falle un test |
| `filter.test.ts` · `matchesFilter` | Mira nombre y etiquetas; varias etiquetas en Y; «Sin etiquetas» excluye las demás y gana si llegan las dos |
| `filter.test.ts` · conmutadores | Una etiqueta apaga «Sin etiquetas» y al revés; «Quitar filtros» lo limpia todo |
| `filter.test.ts` · `parseListQuery` | Búsqueda por debajo del mínimo se ignora; etiquetas normalizadas; `untagged` anula `tags`; `limit` entre 1 y 60; cursor dañado ⇒ primera página |
| `filter.test.ts` · cursor y `escapeLike` | Ida y vuelta del cursor; `%`, `_` y `\` escapados |
| `filter.test.ts` · `tagFacets` | Recuentos, orden por uso y luego alfabético, recuento de las que no tienen etiquetas |
| `upload.test.ts` · `validateFile` | Acepta JPEG, PNG y WebP; rechaza GIF, SVG y HEIC con «x.gif: no es JPEG, PNG ni WebP.»; rechaza **más de** 25 MiB con «x.jpg: pesa 31,2 MB y el límite es 25 MB.»; 25 MiB justos pasan, igual que en el bucket |
| `upload.test.ts` · `formatBytes` | KB por debajo de 1 MB, coma decimal y un decimal en MB |
| `upload.test.ts` · `variantPaths` | `images/<id>/original.<ext>`, `light.jpg`, `thumb.jpg`; extensión por tipo; rechaza un id que no es uuid |
| `upload.test.ts` · lote | Cada fila necesita nombre y una etiqueta propia o común; los motivos exactos; las subidas ya hechas no cuentan; etiquetas efectivas sin duplicados |
| `upload.test.ts` · textos | «Subir», «Subir N imágenes», «Subiendo X de N», y los avisos en singular, plural y cero |
| `upload.test.ts` · `validateCreateInput` / `validateUpdateInput` | Rutas que no corresponden al id, nombre vacío, sin etiquetas, peso por encima del límite y falta de `expectedUpdatedAt` dan `400` con su motivo |
| `view.test.ts` | Una antigua: sin «Descargar original», «No se guardó», miniatura = ligera, nombre en ceniza, medidas de la ligera desconocidas. Una nueva: tres variantes, peso y medidas del original |
| `modalStack.test.ts` | Solo el de arriba atiende Escape; al cerrar uno de en medio, el de arriba sigue siéndolo; vacía no atiende nada |
| `catalog.test.ts` | `imgr` existe, va detrás de `clockr` y delante de `socialmakr`, `href` `/workspace/img_r` |
| `studioColors.test.ts` | `dark`, `warmLight`, `warmDark`, `ash`, `grey`, `ashDark` y `bordeaux` de `studio/ui.ts` son los hex de `lib/tokens.ts` |

**No se prueba en node, y se cubre así:** las funciones SQL (consultas tras la migración y checks 4, 10, 11,
12, 18 a 21), el lienzo (check 5 con el `md5`) y los componentes (checks y fidelidad).

---

## 11 · Riesgos y decisiones abiertas

### 11.1 Las cuatro de la definición

| Pregunta | Mi recomendación |
|---|---|
| Proveedor de edición (fase 2) | De acuerdo con **Gemini**, de forma provisional y revisando precios al empezar la fase 2. La fase 1 no depende de ello: solo deja `edited`, `parent_id`, `prior_original_path` y `prompt` |
| Miniaturas de las antiguas | **Las dos cosas**, como dice la definición. El respaldo a la ligera entra ya en la fase 1 (`view.ts`, con test). El script (check A, `requiere Carlos`) puede escribir en `images/<id>/thumb.jpg` aunque la ligera antigua viva en otra ruta: no mueve nada y deja la convención nueva |
| Temporales de la edición (fase 2) | De acuerdo con **`images/_tmp/`**. El bucket ya le impondrá 25 MB y los tres tipos, que valen para un JPEG 4K |
| Enlaces frente a botones en modales | Es de **Alberto**. La fase 1 hace lo que dice la definición y no cambia nada compartido por esto |

### 11.2 Riesgos

| Riesgo | Mitigación |
|---|---|
| Subidas rotas en producción entre la migración y el despliegue | D1 |
| La base de desarrollo es la de producción | Datos «prueba-…», borrado al final y recuento antes y después |
| Entre el bloque 2 y el 3, la subida del popup antiguo da `400` en la rama (el `POST` ya exige nombre y etiquetas) | No se despliega entre bloques; el bloque 3 la sustituye |
| `TagInput` y `useFocusTrap` los usan las otras tools | Entran en la no regresión: metadatos de deck, formulario y design system, confirmaciones del editor de decks |
| Rejilla pesada mientras no haya miniaturas de las antiguas (66 ligeras de unos 300 KB) | `loading="lazy"` y el script del check A |
| El recuento de uso crece con el número de documentos | § 4.3: la señal es medio segundo por página |
| Una imagen se borra mientras está en un documento abierto **sin guardar** en otra pestaña | La comprobación solo ve lo guardado. Lo dejo escrito; no tiene arreglo barato |
| El límite global de subida del proyecto (ajuste del panel de Supabase, no del bucket) por debajo de 25 MB | No se lee por SQL. Lo comprueba una subida real de unos 24 MB en el bloque 4, además del check 7 |
| Precisión para la fase 2: un nombre de 3 a 8 palabras **nunca** pasa `evalText()` entero, porque la regla de longitud pide 15 | «Pasa `evalText()`» debe leerse como «sin `hardFail`». Conviene escribirlo así en la definición |

---

## Restricciones globales

- Castellano en toda la interfaz, sin next-intl.
- Nada de valores de marca a mano: salen de `lib/tokens.ts`, `lib/typeScale.ts` y `studio/ui.ts`.
- No se mueve ni se renombra ningún objeto que ya exista en `deck-images`.
- No se toca el texto de `getImagePrompt()` en `lib/prompts.ts`.
- `Wordmark` en Mono 700 y `colors.brick` se dejan como están.
- Sin `!`, `¡`, `…` ni `...`; sin raíces de `forbiddenVocabularyDetailed`.
- Mono 400/500/600, Serif 300/400, sin cursiva. Burdeos solo como alerta. Magenta solo en `AppIcon.tsx`.
- JPEG, PNG y WebP, hasta 25 MB. Recientes primero, 60 por página, búsqueda y filtro en servidor.
- Rama nueva antes de tocar código. Un commit por bloque, tras `npm run test && npm run type-check &&
  npm run build` limpios.

## Puntos de revisión

Los cinco fallos que los tests de node no cubren y que más daño harían a quien use la tool:

1. **Corte de red a mitad de un lote:** las buenas quedan, las fallidas se reintentan y no quedan
   huérfanos. Es el check B (`requiere cortar la red`): no se simula.
2. **Dos pestañas guardando la misma imagen:** las dos salidas, contrastadas en la tabla (check 17).
3. **Una imagen antigua en tarjeta y detalle:** sin medidas, sin miniatura y sin original (`view.test.ts`
   y check 15).
4. **Entrar por el enlace de una imagen que no está en la primera página, o que ya no existe** (check 13 y
   el aviso «Esa imagen ya no está en el banco.»).
5. **Teclado con modales apilados** en el popup dentro de DeckMak_r: Escape cierra solo el de arriba y el
   foco vuelve a quien lo abrió (`modalStack.test.ts` y detalle 40).

---

## Implementación por bloques

### Bloque 1 · Migración, tipos y `lib/images/`

**Ficheros.** Crear `supabase/migrations/<ts>_images_bank.sql`, `supabase/migrations/<ts>_images_name_not_null.sql`,
`lib/images/{naming,filter,upload,view}.ts`, `lib/uuid.ts` y sus tests. Modificar `lib/decks/types.ts`,
`lib/ds/server.ts`, `lib/clock/server.ts` y `package.json`.

**Produce:**

- `naming.ts`: `legacyName(alt: string | null, storagePath: string): string` ·
  `normalizeTag(raw: string): string` · `normalizeTags(raw: readonly string[]): string[]` ·
  `downloadName(name: string, ext: string): string` ·
  `describeChanges(opened: ImageMeta, current: ImageMeta): string` · `NAME_MAX`, `TAG_MAX`, `TAGS_MAX`.
- `filter.ts`: `FOLD_FROM`, `FOLD_TO`, `SEARCH_MIN`, `foldSearch(t: string): string`,
  `searchText(name: string, tags: string[]): string`, `type ImageFilter = { q: string; tags: string[]; untagged: boolean }`,
  `matchesFilter`, `toggleTag`, `toggleUntagged`, `clearFilter`, `isFiltered`, `parseListQuery(p: URLSearchParams): ListQuery`,
  `encodeCursor`, `decodeCursor`, `escapeLike`, `tagFacets(rows: { tags: string[] }[]): TagFacets`.
- `upload.ts`: `ACCEPTED_TYPES`, `MAX_BYTES`, `validateFile(f: { name: string; type: string; size: number }): string | null`,
  `formatBytes(n: number): string`, `variantPaths(id: string, mime: string): VariantPaths`,
  `effectiveTags(common: string[], own: string[]): string[]`, `rowProblem(...)`, `uploadButtonLabel(...)`,
  `uploadSummary(done: number, failed: number): string`, `validateCreateInput(body: unknown)`, `validateUpdateInput(body: unknown)`.
- `view.ts`: `isLegacy(row)`, `thumbSrc(row)`, `factLines(row, lightNatural?)`, `downloads(row)`.
- `types.ts`: `ImageRecord`, `ImageCreateInput`, `ImageUpdateInput`, `ImageListItem`, `ImageDetail`, `ImageUse`, `ImageSource`,
  y `ImageMeta = { name: string; tags: string[] }`, que usa `describeChanges`.

- [ ] Crear la rama (D14) y commitear `docs/features/img-r.md`, `img-r-prototype.html` y este plan.
- [ ] Añadir `lib/images/__tests__/*.test.ts` al glob de `package.json`.
- [ ] Por cada módulo: escribir su test, verlo fallar con `npm run test`, implementar, verlo pasar.
- [ ] `lib/uuid.ts`, y `lib/ds/server.ts` y `lib/clock/server.ts` reexportándolo; los tests de ds y clock siguen verdes.
- [ ] Tipos en `lib/decks/types.ts`.
- [ ] Escribir M1 y M2. El test del mapa de tildes ya los lee.
- [ ] Recuento de `images` antes. Aplicar M1 con la herramienta de migraciones de Supabase. Recuento
      después, filas con `name` nulo o vacío, bucket, trigger, permisos de las funciones y comparación de
      los 66 nombres con `legacyName()`. Todo al informe del bloque.
- [ ] `npm run test && npm run type-check && npm run build`. Commit `feat(imgr): migración del banco, tipos y lib/images (bloque 1)`.
- [ ] **Parar** y entregar el informe.

### Bloque 2 · API

**Ficheros.** Crear `lib/images/usage.ts`, `app/api/images/tags/route.ts`. Modificar `app/api/images/route.ts`,
`app/api/images/[id]/route.ts`, `app/api/images/[id]/usage/route.ts` y `lib/decks/api.ts`.

**Consume** los validadores y el cursor del bloque 1. **Produce:**
`imageUses(sb, ids: string[]): Promise<Map<string, ImageUse[]>>` · las respuestas de § 3 y § 4 ·
`listImages(p: Partial<ImageFilter> & { cursor?: string }): Promise<{ items: ImageListItem[]; nextCursor: string | null }>` ·
`listImageTags(): Promise<TagFacets>` · `getImage(id): Promise<ImageDetail>` ·
`updateImage(id, input): Promise<{ ok: true; row: ImageRecord } | { ok: false; conflict: ImageRecord }>` ·
`deleteImage(id): Promise<{ ok: true } | { ok: false; uses: ImageUse[] }>` ·
`uploadImageObject(path, blob, contentType)` · `removeImageObjects(paths)`.

- [ ] `usage.ts` y `/usage` delegando; misma respuesta que hoy.
- [ ] `GET /api/images` paginado y `GET /api/images/tags`.
- [ ] `GET /api/images/[id]` con `uses` y quién subió.
- [ ] `POST` con validación, recálculo de rutas y `url`, y comprobación de los tres objetos.
- [ ] `PATCH` con `updated_at`: `200`, `404`, `409` con la fila.
- [ ] `DELETE` con `409` y borrado comprobado de todas las variantes.
- [ ] Cliente en `lib/decks/api.ts`.
- [ ] Prueba con `curl` sin sesión: todo `401`. Las de sesión van en el bloque 4.
- [ ] `npm run test && npm run type-check && npm run build`. Commit `feat(imgr): API del banco (bloque 2)`. **Parar.**

### Bloque 3 · Piezas compartidas y popup

**Ficheros.** Crear `components/images/{ImageUploadModal,ImageCard,ImageFilters,ImageDeleteModal}.tsx`,
`components/images/useImageList.ts`, `components/images/images.css`, `lib/images/client.ts`,
`lib/hooks/modalStack.ts` y su test, `lib/__tests__/studioColors.test.ts`. Modificar
`components/deck/studio/ImageGallery.tsx`, `components/studio/{GalleryFilters,TagInput}.tsx`,
`components/deck/studio/ui.ts`, `lib/hooks/useFocusTrap.ts`, `lib/deck/optimizeImage.ts` y `app/globals.css`.

**Produce:** `uploadToBank(file: File, meta: { name: string; tags: string[] }): Promise<ImageRecord>` ·
`<ImageUploadModal initialFiles? allTags onClose onUploaded(records)>` · `<ImageCard variant item selected? onOpen>` ·
`<ImageFilters filter facets onChange>` · `useImageList(initial?)` · `<ImageDeleteModal image onClose onDeleted>`.

- [ ] Pila de modales: test, implementación y `useFocusTrap` usándola.
- [ ] `ui.ts` con los tres colores y su test.
- [ ] `GalleryFilters` y `TagInput` (§ 7.3).
- [ ] `optimizeImage.ts` y `client.ts`.
- [ ] Las piezas de `components/images/`.
- [ ] `ImageGallery` reescrito sobre ellas.
- [ ] `.toast` por encima del velo (D8).
- [ ] Copy nuevo por `evalText`.
- [ ] En DeckMak_r y FormMak_r: elegir, subir con nombre y etiquetas, quedar seleccionada, aceptar, y
      ver que el borrado de una imagen en uso queda bloqueado. Metadatos de deck, formulario y design
      system con el `TagInput` nuevo.
- [ ] `npm run test && npm run type-check && npm run build`. Commit `feat(imgr): piezas compartidas y popup del banco (bloque 3)`. **Parar.**

### Bloque 4 · Galería y detalle de IMG_r

**Ficheros.** Crear `app/workspace/img_r/page.tsx`, `app/workspace/img_r/[id]/page.tsx`,
`components/images/{ImageBank,ImageDetailModal,ImageMetaModal}.tsx`. Modificar `components/studio/Wordmark.tsx`.

- [ ] `ImgLogo`.
- [ ] `ImageBank`: cabecera, filtros, rejilla, cursor, fantasmas, vacíos, error y soltar ficheros.
- [ ] Detalle con URL propia, descargas y nota de las antiguas.
- [ ] `ImageMetaModal` con el choque.
- [ ] Recorrer los detalles 1 a 37 y 40 contra el prototipo, en local con sesión (D16).
- [ ] Subida real de unos 24 MB (límite global, § 11.2).
- [ ] `npm run test && npm run type-check && npm run build`. Commit `feat(imgr): galería y detalle (bloque 4)`. **Parar.**

### Bloque 5 · Catálogo, acento, icono y documentos

**Ficheros.** Modificar `lib/workspace/catalog.ts` y su test, `lib/tokens.ts`, `components/workspace/AppIcon.tsx`,
`docs/features/urls-workspace.md`, `docs/features/deck-image-gallery.md` y `docs/features/img-r.md` (estado).

- [ ] Test del catálogo primero, después la entrada.
- [ ] Acento con su nota e icono.
- [ ] Documentos.
- [ ] `npm run test && npm run type-check && npm run build`. Commit `feat(imgr): IMG_r entra en el catálogo del workspace (bloque 5)`. **Parar.**

### Fase 3 · Cierre y verificación

- [ ] `docs/features/img-r.md`: «fase 1 implementada», las decisiones que se movieron (D1 a D16) y los pendientes reales.
- [ ] Checks 1 a 23, fidelidad (1 a 40) y no regresión, con datos «prueba-…», contrastados contra la base y `storage.objects`.
- [ ] Checks A y B, **pendientes**, sin simular.
- [ ] Borrar los datos de prueba y decir qué queda y dónde.
- [ ] Informe con los fallos separados de las observaciones, como doc del proyecto Workplace.
- [ ] M2 se aplica tras el despliegue a producción, con su recuento.
- [ ] Este plan pasa a `docs/features/` al terminar.
