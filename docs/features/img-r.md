# IMG_r · banco de imágenes del equipo

> El equipo tiene un solo sitio donde subir, encontrar, descargar y borrar las imágenes que usa en
> su trabajo, cada una con nombre y etiquetas. Lo que se sube aquí aparece en los decks y en los formularios.
> No es un almacén nuevo: es la pantalla de gestión del banco que DeckMak_r y FormMak_r ya comparten.

Estado: **fase 1 y fase 2 implementadas** · entrega 3 definida, pendiente de implementar. La fase 2 añade la
edición con Gemini, las propuestas de nombre y etiquetas y el análisis de estilo. La tercera entrega, más pequeña,
es la **parrilla rediseñada y las acciones en bloque** (sección «Entrega 3»).

Prototipo: `img-r-prototype.html` en la raíz del repo, junto a `deck-prototype.html`. Publicado en
https://claude.ai/artifact/3uMePFsfmqiLpxTjvgdeKW. Es el contrato de interacción de las dos fases: el
interruptor «Fase 2» de la barra gris del prototipo enseña u oculta lo que añade la segunda.

## Fase 1: implementada

Rama `feat/img-r-fase-1`, octubre de 2026, sobre `main` y sin Clock_r, que sigue en desarrollo. El plan,
con las decisiones D1 a D16 y los cinco bloques, está en `docs/features/img-r-fase-1-plan.md`.

**Qué hay.**

- `/workspace/img_r` (galería) y `/workspace/img_r/[id]` (la galería con el detalle abierto). La tarjeta
  de IMG_r sale en `/workspace` detrás de DSMak_r, con acento magenta. Clock_r va delante cuando llegue a
  `main`, como dice *Decisiones*.
- La cabecera monta la foto del usuario con su menú (`UserMenu`), como las otras galerías de `main`.
- El popup de DeckMak_r y FormMak_r monta las mismas piezas (`components/images/`): la misma subida, la
  misma tarjeta, los mismos filtros y el mismo borrado bloqueado.
- API: `/api/images` (listado paginado y alta), `/api/images/tags`, `/api/images/[id]` (detalle, edición
  con control de versión y borrado, que responde `409` si la imagen está en uso) y `/api/images/[id]/usage`.
- Base de datos: `20261001100000_images_bank.sql`, aplicada el 1 de octubre de 2026 (66 filas antes y
  después, ninguna sin nombre).

**Lo que cambió respecto a esta definición** (decisiones aprobadas en el plan):

- D1: la migración va en dos pasos. `name not null` (M2) se aplica después de desplegar.
- D2: el nombre de las antiguas sale de `alt`, no de la ruta.
- D3: rejilla de 240 px con hueco de 28, como las otras galerías, y cabecera no fija.
- D4: el nombre del detalle va en Serif 400 a 24 px (`title-sm`).
- D5: la búsqueda empieza en el tercer carácter, como en las otras galerías.
- D6 y D13: columna `search_text` (nombre y etiquetas sin tildes) y funciones SQL `image_uses` (qué
  documentos usan una imagen) y `team_member_names` (quién la subió).
- D7: `TagInput` mejorado para todas las tools; los guiones en las etiquetas, solo en IMG_r.
- D8 y D9: los avisos salen por encima de los modales y, con modales apilados, Escape cierra solo el de arriba.
- D10 y D11: las variantes JPEG de un PNG transparente van sobre blanco y los ficheros nuevos se cachean un año.
- D15: la papelera se queda en el popup, con el mismo borrado bloqueado.

**Pendiente.**

- ~~Aplicar M2 justo después de desplegar.~~ Aplicada el 2 de octubre de 2026, tras el despliegue del PR #6:
  69 imágenes antes y después, las 3 que había sin nombre ya lo tienen, y `name` no admite nulos ni vacíos.
- Check A, el relleno de las miniaturas de las antiguas: lo tiene que lanzar Carlos, porque el script usa
  la clave `service_role`.
- Check B, el corte de red a mitad de una subida múltiple: sin verificar, porque requiere cortar la red.
- El icono de IMG_r es un borrador: falta que lo vea Alberto.

## Fase 2: implementada

Rama `feat/img-r-fase-2`, octubre de 2026, sobre `main` con la fase 1. El plan, con la prueba de Gemini y lo que
se decidió en cada parada, está en `docs/features/img-r-fase-2-plan.md`; la verificación, con sus fallos y
observaciones, en `docs/features/img-r-fase-2-informe.md`.

**Qué hay.**

- **Análisis de estilo y propuesta.**
  - Al subir, cada fila pide su propuesta de nombre y etiquetas y su veredicto, tres a la vez. El
    veredicto se guarda con la fila; la propuesta, solo con «Usar propuesta».
  - Va también en la subida del popup de DeckMak_r y FormMak_r, que es la misma pieza.
  - Las imágenes sin analizar tienen «Analizar estilo» en el detalle.
  - Las que no encajan llevan una cruz en la tarjeta, y la píldora «Estilo Interactius» deja solo las
    que encajan.
- **Editar con IA.**
  - Elección de prompt (Estándar o Personas) y de modelo, una indicación libre y 25 intentos por persona
    y mes.
  - Al guardar, «Guardar como copia» o «Sobrescribir» (solo si nadie la usa).
  - Comparar con el original manteniendo pulsado, y «Volver al original» (bloqueado si está en uso).
- **API.**
  - `/api/images/analyze` y `/api/images/[id]/analyze`.
  - `/api/images/[id]/edit`, `/api/images/[id]/edit/commit`, `/api/images/[id]/revert` y
    `/api/images/quota`.
  - El listado admite `style=si`.
- **Base de datos.** Las tres migraciones se aplicaron el 3 de octubre de 2026; siguen 69 imágenes y 51
  contadores.
  - `20261002120000_images_ai.sql`: las columnas de estilo y del prompt, y `peek_rate_limit` /
    `refund_rate_limit`.
  - `20261003100000_images_edit_model.sql`: la columna `edit_model`.
  - `20261003100100_purge_keeps_monthly.sql`.

**Lo que cambió respecto a esta definición** (decisiones de las paradas del plan):

- **Modelo, por decisión de Carlos (3 de octubre de 2026).**
  - Nano Banana 2 (`gemini-3.1-flash-image`) por defecto; Nano Banana Pro (`gemini-3-pro-image`), a
    elección de quien edita.
  - Nano Banana 2 pide 2K hasta 2048 px de lado y 4K por encima. Pro pide siempre 2K: en 4K tardó 45 s.
  - La fila guarda el modelo en `edit_model`, y el detalle lo enseña junto a «Prompt».
- **El veredicto lo calcula el código** (`lib/images/analyze/verdict.ts`) desde los seis criterios. En la
  prueba, el modelo dio «parcial» a una foto con 4 de 6 criterios fallidos.
- **La ligera y la miniatura de una edición se fabrican en el navegador** con `optimizeImage()`, como en la
  subida, y el servidor las copia a su sitio. Así no hace falta `sharp` en Netlify, que no se podía probar
  antes de producción.
- **Las claves de `style_checks`** son `film`, `dof`, `light`, `motion`, `not_stock` y `subject`; la tabla
  *Datos* decía `people`.
- **El mes de la cuota es el de Madrid.**
- **`peek_rate_limit` y `refund_rate_limit` solo aceptan la cuota de quien llama.**
- **`purge_rate_limits()`** ya no la puede ejecutar `anon`, y guarda tres meses las cuotas mensuales. Antes
  las borraba al día. Lo aprobó Carlos.
- **Sobrescribir dos veces** conserva como original previo el original de verdad.
- **Sobrescribir una antigua** guarda su ligera como original previo, sin moverla ni borrarla.
- **«Original previo»** dice «Guardado», sin medidas.
- **«Volver al original» en una imagen en uso: bloqueado**, como recomendaba *Decisiones abiertas*.
- **«Pasar» `evalText()`** es no tener incumplimientos duros: la longitud es una regla blanda.
- **Copy nueva:**
  - «Prueba con Nano Banana Pro: a veces edita fotos que este rechaza.», cuando Nano Banana 2 no devuelve
    imagen;
  - «No se puede volver al original: la usa deck «X». Cambia la imagen en ese documento y vuelve a
    intentarlo.»;
  - «No se ha podido guardar la edición. Vuelve a intentarlo.»;
  - «No se ha podido recuperar el original. Vuelve a intentarlo.»;
  - «Guardando».
- **Netlify corta cada petición a los 60 s y `maxDuration` no tiene efecto allí.** La llamada a Gemini
  lleva su propio corte a los 40 s, para devolver el intento antes del `504`.

**Pendiente.**

- `GEMINI_API_KEY` en las variables de Netlify (producción), con la facturación de Google activa.
- Check D (coste real en la consola de Google): `requiere Carlos`. El check C se verificó con un fallo real de
  Gemini durante la verificación.
- Las fotos de menores en el EEE: Google dice que no se pueden editar, pero solo en la página de vídeo.
  Está sin confirmar para estos modelos.

## Contexto

Las imágenes del equipo ya viven en un sitio: la tabla `images` y el bucket público `deck-images`,
con la API `/api/images` (listar y registrar), `/api/images/[id]` (borrar) y
`/api/images/[id]/usage` (qué decks y formularios la referencian por su URL en `md`). Se accede a
ellas solo desde el popup `components/deck/studio/ImageGallery.tsx`, que abren `DeckStudio` y
`FormStudio` (ver `docs/features/deck-image-gallery.md`).

Ese popup sirve para elegir una imagen dentro de un documento. No sirve para gestionar el banco, y
tiene cuatro carencias que esta tool resuelve:

- **No guarda el original.** `optimizeImage()` reduce a 1600 px y JPEG al 82 % antes de subir.
  Nadie puede descargar una foto en buena calidad.
- **No hay nombre ni etiquetas.** La tabla tiene `alt`, medidas, `source` y `prompt`. Con decenas de
  imágenes ya no se encuentra nada.
- **No hay buscador ni filtro**, ni un sitio para revisar el banco fuera de un documento.
- **El borrado avisa, pero deja borrar** una imagen en uso, y el documento se queda con la imagen rota.

La fase 2 añade lo que pidió Carlos al plantear la tool: aplicar a una imagen subida el estilo del
prompt de imagen de la guía (`getImagePrompt` en `lib/prompts.ts`). La API de Claude ve imágenes,
pero no genera ni edita píxeles, así que la edición necesita un modelo de imagen de otro proveedor.
Claude sí entra en la fase 2 para proponer el nombre y las etiquetas de cada imagen.

## Alcance

**Sí, fase 1:**

- Galería con buscador por nombre y etiqueta, filtro por etiquetas, filtro «Sin etiquetas» y carga por páginas.
- Subida de una o varias imágenes, cada una con **nombre obligatorio** y **al menos una etiqueta**,
  propia o común al lote. JPEG, PNG y WebP, hasta 25 MB.
- Se guardan tres ficheros por imagen: original, versión ligera de 1600 px y miniatura de 480 px.
- Detalle en modal con URL propia: datos, dónde se usa, descargar original, descargar versión
  ligera, editar nombre y etiquetas, eliminar.
- **Borrado bloqueado** si la imagen se usa en algún deck o formulario, con la lista de dónde. La
  regla vive en la API, no solo en la pantalla.
- Los popups de DeckMak_r y FormMak_r usan la misma subida, la misma tarjeta y el mismo filtro, así
  que también piden nombre y etiquetas.
- Migración de las imágenes existentes: nombre a partir del fichero; quedan sin etiquetas y sin original.

**Sí, fase 2:**

- **Editar con IA** con Gemini: uno de los dos prompts de imagen de la guía (estándar o personas), elegido
  solo según haya personas y cambiable, más una indicación libre opcional, con
  «Probar otra vez» dentro del mismo modal. 25 ediciones por persona y mes natural.
- Al guardar, la persona elige «Guardar como copia» o «Sobrescribir». No se puede sobrescribir una imagen en uso.
- Comparar con el original manteniendo pulsado, y «Volver al original» tras sobrescribir.
- **Propuesta de nombre y etiquetas** al subir, hecha por Claude. La persona la acepta con «Usar propuesta» o la ignora.
- **Análisis de estilo Interactius**, en la misma llamada que la propuesta: veredicto, motivo y seis
  criterios sacados del prompt de imagen de la guía. Informa, no bloquea. Se ve en la fila de subida,
  en el detalle, en un filtro y como cruz en las tarjetas que no encajan.

**No:**

- **Generar imágenes desde cero.** El documento de la galería de decks lo dejó previsto, pero no se
  pidió aquí. Si llega, es otra entrada del mismo adaptador de la fase 2.
- **Carpetas o colecciones.** Las etiquetas cubren la organización; las carpetas duplicarían el gesto.
- **Permisos por persona.** Todo el equipo gestiona todo, igual que en el resto del workspace.
- **Vídeo, SVG o PDF.** El banco es de fotografía e ilustración rasterizada.
- **Superficie pública.** IMG_r no tiene ninguna URL que salga del equipo. Las URLs de la versión ligera
  sí salen, dentro de los decks publicados, pero eso ya pasa hoy.

## Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Nombre y ruta | IMG_r · `/workspace/img_r` · detalle `/workspace/img_r/[id]` | Decidido por Carlos. El sufijo `Mak_r` no encaja: la tool gestiona, no fabrica |
| Entrada en el catálogo | id `imgr`, wordmark `{ before: 'IMG', after: 'r' }`, descripción «Banco de imágenes», detrás de `clockr` y delante de `socialmakr` | Las tools activas van antes que la apagada |
| Acento del icono | magenta `#EC4899` en `toolIconAccents` | Decisión de **Carlos**, octubre de 2026, con Alberto informado después. Aviso dado: queda cerca del coral de DeckMak_r (`#FF6B6B`) a 72 px. Alcance: `AppIcon.tsx` |
| Encaje | mismo banco que DeckMak_r y FormMak_r: tabla `images`, bucket `deck-images` | Un segundo almacén daría dos verdades, y lo subido aquí no aparecería en los decks |
| Acceso | sesión de equipo (`@interactius.com`), `noindex` | Lo da `middleware.ts` para todo `/workspace/*` |
| Permisos | cualquiera del equipo edita, borra y sobrescribe | Pedido por Carlos; RLS `authenticated` gestiona todo, como en las otras tablas |
| Fuente de verdad | la fila de `images` y sus objetos en Storage | No hay documento markdown: la tool no tiene editor ni compilador |
| Ficheros por imagen | original + ligera 1600 px + miniatura 480 px | Descarga en buena calidad sin hacer más pesados los decks, y una rejilla rápida |
| Dónde viven los originales | **en el mismo bucket público** `deck-images` | Decisión de Carlos. Riesgo asumido: quien tenga la URL descarga el original a tamaño completo |
| Formatos y tamaño | JPEG, PNG, WebP · 25 MB | También como `file_size_limit` y `allowed_mime_types` del bucket, no solo en la pantalla |
| Etiquetas | libres, con autocompletado (`TagInput`), en minúsculas y con guiones en lugar de espacios | No hay nadie para mantener una lista cerrada |
| Borrado en uso | bloqueado, con la lista de documentos; `409` en la API | Decisión de Carlos. Cambia el comportamiento actual del popup |
| Detalle | modal sobre la galería con URL propia | Se puede pasar el enlace a una imagen sin perder el scroll ni los filtros |
| Orden y carga | recientes primero, 60 por página, búsqueda y filtro en servidor | Aguanta un banco de miles de imágenes |
| Idioma de la interfaz | castellano, sin next-intl | El workspace es interno |
| Estilos | inline con `studio/ui.ts`, como el resto del studio | Mismo traje que las otras galerías |
| Prompt de edición (fase 2) | los dos de la guía, **estándar** y **personas**, completos. Se preselecciona según el análisis detecte personas; la persona puede cambiarlo. Si elige estándar con personas detectadas, se le avisa de que pueden desaparecer | Decisión de Carlos. Son los prompts que el equipo ya usa; el estándar sobre una foto con gente a veces es justo lo que se quiere |
| Edición (fase 2) | **Gemini** detrás de un adaptador; prompt de la guía + indicación libre | Claude no edita imágenes. Gemini por la salida en 4K. Precio y modelo exacto se revisan al empezar |
| Privacidad de la edición (fase 2) | sin aviso en la interfaz | Decisión de **Carlos**: herramienta interna. Las fotos se envían a Google para editarlas |
| Límite de edición (fase 2) | 25 por persona y mes natural; cuenta cada intento pedido; un fallo del proveedor no cuenta | Decisión de Carlos. Reutiliza `check_rate_limit` |
| Resultado de editar (fase 2) | la persona elige «Guardar como copia» o «Sobrescribir»; sobrescribir solo si no se usa | Ningún documento cambia sin que nadie lo sepa |
| Temporales de edición (fase 2) | `images/_tmp/`; cada petición de edición purga antes los de más de 24 h | Decisión de Carlos. Sin tarea programada nueva |
| Propuesta y estilo (fase 2) | una sola llamada a `claude-opus-5` al subir, structured outputs, `effort: 'low'` | La clave de Anthropic ya existe. Una llamada en vez de dos: misma espera, mismo coste |
| Análisis de estilo (fase 2) | informativo; al subir, bajo demanda en las que no lo tienen, y automático al guardar una edición; sin límite | Decisión de Carlos. En el banco hay fotos de equipo y eventos que no tienen por qué seguir la guía |
| Migración | directa, sin simulacro | Decisión de Carlos. El prompt exige un recuento antes y después |

## Decisiones abiertas

| Pregunta | Alternativas | Recomendación |
|---|---|---|
| Modelo de Gemini (fase 2) | Gemini 3 Pro Image · Nano Banana 2 (3.1 Flash Image) | **Resuelta** (3 de octubre de 2026): Nano Banana 2 por defecto y Pro a elección. Ver *Fase 2: implementada* |
| «Volver al original» en una imagen que ya se usa (fase 2) | bloquearlo, como sobrescribir · permitirlo y conservar los ficheros editados | **Bloquearlo** (así se implementó en la fase 2). Sobrescribir solo se permite si nadie la usa, pero alguien puede colocarla en un deck después. Volver al original borra los ficheros editados y ese deck se quedaría con la imagen rota. El prototipo lo deja hacer con un aviso: la implementación se separa de él en esto |
| Miniaturas de las imágenes antiguas | script de relleno con credenciales de servidor · se dejan sin miniatura y la tarjeta usa la versión ligera | Las dos cosas. El respaldo a la versión ligera hace falta siempre, por robustez. El script corre después y es `requiere Carlos`, porque necesita la clave `service_role` |
| Choque entre enlaces y botones de los modales | la norma cambia · cambian los modales del workspace | Lo decide **Alberto**. IMG_r usa enlaces en página y detalle, y los botones compartidos en los modales (ver *Marca*) |

## Datos

No hay tabla nueva. Migración `supabase/migrations/<timestamp>_images_bank.sql` sobre `public.images`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | ya existe; va en `/workspace/img_r/[id]` |
| `storage_path` | text | ya existe; el fichero de la **versión ligera** |
| `url` | text | ya existe; la URL pública de la ligera. Es la que va en el `md` de los decks y formularios, y la que mira `usage` |
| `name` | text **not null** | nuevo. La migración lo rellena para las antiguas y después pone `not null` |
| `tags` | text[] not null default `'{}'` | nuevo. Índice GIN. Vacío solo en imágenes antiguas: la API exige al menos una etiqueta al crear o editar |
| `original_path` | text null | nuevo. Null en las antiguas, que no tienen original |
| `original_bytes` | bigint null | nuevo. Para mostrar el peso sin pedirlo a Storage |
| `original_width` / `original_height` | int null | nuevo. `width` / `height` siguen siendo las de la ligera |
| `thumb_path` | text null | nuevo. Null ⇒ la tarjeta usa la ligera |
| `parent_id` | uuid null, FK a `images(id)` `on delete set null` | nuevo, fase 2. La imagen de la que sale una copia editada |
| `prior_original_path` | text null | nuevo, fase 2. El original anterior a sobrescribir; habilita «Volver al original» (un nivel) |
| `source` | text | ya existe: `upload` / `generated`. Se añade `edited` (fase 2) |
| `style_verdict` | text null, check `si` / `parcial` / `no` | nuevo, fase 2. Null ⇒ sin analizar |
| `style_checks` | jsonb null | nuevo, fase 2. `{ film, dof, light, motion, not_stock, people }`, cada uno `true` / `false` / `null` (no aplica) |
| `style_reason` | text null | nuevo, fase 2. Una o dos frases; null si no pasó `evalText()` |
| `style_analyzed_at` | timestamptz null | nuevo, fase 2 |
| `people_present` | boolean null | nuevo, fase 2. Lo devuelve el análisis; preselecciona el prompt de edición y decide el sexto criterio |
| `prompt_variant` | text null, check `standard` / `people` | nuevo, fase 2. El prompt de la guía con el que se hizo la edición |
| `prompt` | text null | ya existe. En fase 2 guarda la indicación libre usada |
| `created_by` | uuid | ya existe (`20260818100000_created_by_seam.sql`). El detalle muestra quién subió la imagen |
| `created_at` | timestamptz | ya existe |
| `updated_at` | timestamptz | **nuevo**, con el trigger `set_updated_at`. Hace falta para detectar el choque entre pestañas |

**Rutas en Storage**, bucket `deck-images`: `images/<id>/original.<ext>`, `images/<id>/light.jpg`,
`images/<id>/thumb.jpg`. Las antiguas siguen en `images/<timestamp>-<nombre>` y no se mueven, porque su URL está
dentro de decks publicados. Diverge de la convención `deck-assets/<tool>/<id>/` (ver *Divergencias*).

**Bucket.** La migración fija en `deck-images` el `file_size_limit` en 25 MB y `allowed_mime_types` en JPEG, PNG y WebP.
**[supuesto]** El bucket no tiene hoy esos límites: comprobarlo en la fase de análisis.

**RLS.** Sin cambios: `images_team` (`authenticated`, todo) y `anon` sin acceso a la tabla, de
`20260817121000_tighten_rls.sql`. Las políticas de Storage del bucket ya cubren insert, update,
delete y select para `authenticated`. Las rutas usan `supabaseAuthServer()`.

**Migración de las existentes.** `name` = nombre del fichero sin la ruta, sin la marca de tiempo inicial y sin extensión
(`images/1789503530988-BLANC_MAD_02-215.jpg` → `BLANC_MAD_02-215`). `tags` vacío. Original y miniatura en null.
Se aplica directa: el informe guarda el recuento de filas y de nombres vacíos antes y después.

**Qué no se toca:** `decks`, `forms` y su `md`. Ninguna URL que ya esté dentro de un documento cambia.

## Referentes y prototipo

**Referentes revisados.** Lightroom y Google Photos, por su documentación pública, sin cuenta.

| Aplicación | Qué se miró | Idea que se adopta | Coste |
|---|---|---|---|
| Lightroom · Google Photos | edición no destructiva y «Revertir» | El original no se toca nunca, y se guarda ya desde la fase 1 para que la 2 no pida otra migración | Una columna y un objeto más por imagen |
| Google Photos | «Guardar» frente a «Guardar como copia» | La persona elige al guardar la edición, y sobrescribir se bloquea si la imagen está en uso | Una pregunta más al guardar |
| Google Photos · Lightroom | mantener pulsado para ver el original · vista antes y después | Comparar con el original en el detalle de una imagen editada (fase 2) | Bajo |
| Lightroom | exportar el original o la versión editada | Dos descargas en el detalle | Bajo |

**Descartadas:** las copias virtuales y los ajustes guardados como instrucciones de Lightroom. Funcionan porque la
edición es paramétrica; la edición de un modelo de IA no lo es.

**Prototipo.** `img-r-prototype.html`, hecho en esta definición y validado por Carlos el 1 de octubre de
2026. Es HTML autocontenido con datos simulados. La barra gris inferior es del prototipo, no de la tool.

| # | Detalle del prototipo | Se implementa | Nota |
|---|---|---|---|
| 1 | Cabecera de galería del workspace: isotipo 20 px que enlaza a `/workspace`, `MarkDivider`, wordmark 22 px, `SearchField` centrado con lupa y «Buscar», «Cerrar sesión» a la derecha | Sí | Piezas de `components/studio/*` tal cual |
| 2 | Sin titular ni recuento sobre la rejilla | Sí | Igual que las otras galerías |
| 3 | Píldoras de filtro de `FilterBar`: blancas, 8/16 px, centradas, sin contador; varias etiquetas se combinan (Y) | Sí | |
| 4 | Píldora «Sin etiquetas» con borde discontinuo, que excluye las demás etiquetas | Sí | Variante nueva de `Pill`; se añade como prop, no como copia |
| 5 | «Quitar filtros» como enlace al final de la fila cuando hay búsqueda o filtro | Sí | |
| 6 | Primera celda «Subir imágenes»: borde de 2 px, «+», texto de formatos y límite, y «también puedes arrastrarlas aquí» | Sí | Mismo traje que «Crear design system» |
| 7 | Soltar archivos en cualquier punto de la galería abre la subida con esos archivos | Sí | |
| 8 | Tarjeta: miniatura 4:3, nombre, etiquetas con fondo blanco y borde cálido; «Sin etiquetas» discontinua y transparente | Sí | |
| 9 | Insignias sobre la miniatura: «En uso · N» oscura y «Solo versión ligera» clara | Sí | «En uso» necesita el recuento en el listado (ver *Interfaz*) |
| 10 | El nombre de las antiguas va en gris | Sí | |
| 11 | Leve zoom de la miniatura al pasar el ratón; sin animaciones con `prefers-reduced-motion` | Sí | |
| 12 | Estado vacío: «Aún no hay imágenes en el banco. Sube la primera con el botón de arriba: te pediremos un nombre y al menos una etiqueta para poder encontrarla después.» | Sí | |
| 13 | Sin resultados: «Ninguna imagen coincide con la búsqueda o con las etiquetas elegidas. Prueba con menos etiquetas o quita los filtros.» | Sí | |
| 14 | Cargando: tarjetas fantasma que laten y el texto «Cargando», sin puntos suspensivos | Sí | |
| 15 | Error de carga en Burdeos: «No se ha podido cargar el banco de imágenes. Recarga la página; si sigue fallando, avisa en el canal de herramientas.» | Sí | |
| 16 | Subida: zona de soltar con «elige archivos» como enlace; filas con miniatura, nombre de fichero y peso, «Quitar», campo de nombre y campo de etiquetas | Sí | |
| 17 | El nombre **empieza vacío**; el nombre del fichero solo aparece como pista, «Nombre: qué se ve en la imagen» | Sí | Para que nadie suba «IMG_4821» sin pensarlo |
| 18 | Con dos o más archivos aparece «Etiquetas para todas», con la pista «Se añaden a cada imagen. Cada una puede llevar además las suyas. Pulsa Intro o coma para añadir cada etiqueta.» | Sí | |
| 19 | Pista del campo de etiquetas vacío: «Por ejemplo: oficina, presentación, equipo» | Sí | Pedido por Carlos |
| 20 | Etiquetas: se añaden con Intro, coma o al salir del campo; sugerencias de las existentes por prefijo, sin tildes, navegables con flechas; Retroceso con el campo vacío quita la última; se normalizan a minúsculas con guiones | Sí | `TagInput` actual: comprobar que hace todo esto y completarlo si no |
| 21 | Debajo de cada fila, el resumen «Etiquetas: a, b, c» con las propias y las comunes | Sí | |
| 22 | Rechazos en Burdeos, uno por fichero: «x.gif: no es JPEG, PNG ni WebP.» · «x.jpg: pesa 31,2 MB y el límite es 25 MB.» | Sí | |
| 23 | Al pulsar Subir con datos incompletos: la fila dice «Falta el nombre.» o «Falta al menos una etiqueta, propia o común.», el campo se marca en Burdeos y un aviso flotante dice «Revisa las imágenes marcadas: falta nombre o etiqueta» | Sí | |
| 24 | El botón dice «Subir» o «Subir N imágenes», y durante la subida «Subiendo X de N»; cada fila pasa por «Subiendo» y «Subida» | Sí | |
| 25 | Durante la subida no se puede cerrar el modal (ni Escape ni Cancelar) ni tocar las filas | Sí | |
| 26 | Si una falla: la fila dice «No se pudo subir. Revisa la conexión y vuelve a pulsar Subir.», las buenas quedan subidas y el aviso es «N subidas · M con error»; al volver a pulsar solo se reintentan las fallidas | Sí | |
| 27 | Al terminar: se cierra, la rejilla muestra las nuevas primero, aviso «Imagen subida» o «N imágenes subidas» | Sí | |
| 28 | Detalle: imagen grande sobre fondo oscuro, nombre en Serif 300, etiquetas blancas, datos (Original: medidas y peso · Ligera: medidas y JPEG · Subida: fecha y persona) y «Se usa en» con tipo y nombre del documento, o «Ningún deck ni formulario la usa.» | Sí | |
| 29 | Acciones del detalle como enlaces con el hover-wipe: «Descargar original», «Descargar versión ligera», «Editar nombre y etiquetas», «Eliminar» en Burdeos | Sí | |
| 30 | En las antiguas no hay «Descargar original», y aparece la nota «Esta imagen se subió desde un deck antes de que existiera IMG_r. Solo se guardó la versión ligera de 1600 px: no hay original que descargar.» | Sí | |
| 31 | Descargar avisa con «Descargando el original · 14,2 MB» o «Descargando la versión ligera · JPEG 1600 px» | Sí, sin «(simulado)» | En el prototipo la descarga es simulada |
| 32 | Editar: «Nombre» con la pista «Lo que verá el equipo al buscar. Describe qué se ve, no el archivo.», «Etiquetas» con «Al menos una. Pulsa Intro o coma para añadirla. Se guardan en minúsculas.»; en las antiguas el nombre empieza vacío | Sí | |
| 33 | Errores de edición: «Ponle un nombre para poder guardarla.» · «Añade al menos una etiqueta.» | Sí | |
| 34 | Guardar los datos guarda de inmediato y avisa «Cambios guardados» | Sí | |
| 35 | Choque entre pestañas al guardar: «Alguien ha cambiado esta imagen desde otra pestaña mientras la editabas.», con los cambios del otro, y dos enlaces: «Guardar encima» y «Recargar» | Sí | El prototipo inventa los cambios; la tool muestra los reales |
| 36 | Borrar una imagen en uso: «No se puede eliminar», ««X» se usa en N documentos. Cambia la imagen en ellos y vuelve a intentarlo.», la lista y «Entendido» | Sí | |
| 37 | Borrar una que no se usa: «Se borrará «X», con su original y su versión ligera. Ningún deck ni formulario la usa. Esta acción no se puede deshacer.»; el botón pasa a «Eliminando» y avisa «Imagen eliminada» | Sí | |
| 38 | Popup de DeckMak_r: «Galería de imágenes», buscador, píldoras, «Subir imágenes» como enlace que abre la misma subida, rejilla seleccionable con borde oscuro, «Aceptar» apagado hasta elegir; tras subir queda seleccionada la primera nueva | Sí | Aplica también a FormMak_r |
| 39 | El popup muestra solo las ocho etiquetas más usadas | **No** | Se implementa con `FilterBar` completo, sin recorte. Un recorte fijo esconde etiquetas sin decir cuáles |
| 40 | Escape cierra el modal de arriba; clic fuera cierra; el foco vuelve a quien lo abrió | Sí | |

## Interfaz

- **Galería** `/workspace/img_r`. Cabecera de galería del workspace. `SearchField` busca por nombre
  y por etiqueta, sin distinguir tildes. `FilterBar` sin cliente ni estado, con etiquetas más
  «Sin etiquetas». La rejilla es `auto-fill` con mínimo 220 px y huecos de 24. La primera celda es la de subida.
  Carga 60 tarjetas y pide más al acercarse al final. Detalles 1 a 15 del prototipo.
- **Detalle** `/workspace/img_r/[id]`. La misma página de la galería con el modal abierto: entrar por
  esa URL pinta la galería y abre el detalle. Cerrar vuelve a `/workspace/img_r` sin recargar ni
  perder el scroll. Un id que no existe abre la galería con el aviso «Esa imagen ya no está en el banco.».
- **Subida.** El modal de los detalles 16 a 27. En el navegador se generan la ligera (`optimizeImage()`, 1600 px,
  JPEG 82 %) y la miniatura (480 px), y se suben los tres ficheros a `images/<id>/` con el id generado
  en el navegador. Después se registra la fila. Si falla el registro, se borran los tres objetos.
- **«En uso · N» en la rejilla.** Necesita el recuento en el listado, no una llamada por tarjeta. El
  listado lo devuelve calculado en servidor. **[supuesto]** Un `ilike` por imagen sobre `decks.md` y
  `forms.md` aguanta 60 por página; si no, se pasa a una función SQL. Se decide en la fase de análisis.
- **Superficie pública:** ninguna.
- **Diferencias con DeckMak_r / FormMak_r / DSMak_r.** No hay editor ni autoguardado: la tool solo
  tiene galería y modales. No hay duplicar: copiar una imagen no tiene sentido sin edición, y en la
  fase 2 «Guardar como copia» cubre ese caso.

## Guardado, concurrencia y ficheros

- **No hay autoguardado.** Cada acción guarda al pulsarla: subir, editar los datos, borrar y, en la
  fase 2, guardar la edición.
- **Dos pestañas.** `PATCH /api/images/[id]` recibe el `updated_at` que se leyó. Si no coincide,
  responde `409` con la fila actual, y el modal enseña los cambios del otro con «Guardar encima»
  (reenvía forzando) y «Recargar» (pinta la fila actual y descarta lo escrito). Las dos se verifican.
- **Borrado en uso.** `DELETE /api/images/[id]` consulta el uso antes de borrar. Si hay usos,
  devuelve `409` con la lista y no toca nada. La regla vive aquí para que el popup, IMG_r y cualquier
  cliente futuro digan lo mismo.
- **Borrar sin huérfanos.** Primero la fila, luego los objetos: original, ligera, miniatura y, si
  existe, `prior_original_path`. Se mantiene el orden y el registro de huérfanos de
  `app/api/images/[id]/route.ts`. Las antiguas solo tienen su `storage_path`.
- **Duplicar:** no aplica en la fase 1. En la fase 2, «Guardar como copia» crea una fila y tres
  objetos propios en `images/<id nuevo>/`, nunca una referencia a los del original.
- **Se sirve desde donde se guardó:** miniatura, ligera y original desde su URL pública de Storage. La descarga
  usa el parámetro `download` de Supabase, con el nombre de la imagen como nombre de fichero.

## Ficheros

```
NUEVO
  app/workspace/img_r/page.tsx                    galería
  app/workspace/img_r/[id]/page.tsx               galería con el detalle abierto
  components/images/ImageBank.tsx                 la galería de IMG_r
  components/images/ImageUploadModal.tsx          subida compartida (IMG_r y popups)
  components/images/ImageCard.tsx                 tarjeta compartida
  components/images/ImageFilters.tsx              búsqueda y etiquetas sobre SearchField y FilterBar
  components/images/ImageDetailModal.tsx          detalle, descarga, editar datos, borrar
  components/images/ImageMetaModal.tsx            nombre y etiquetas, con el choque entre pestañas
  lib/images/naming.ts                            nombre desde fichero, normalización de etiquetas
  lib/images/filter.ts                            búsqueda sin tildes, filtro por etiquetas, «Sin etiquetas»
  lib/images/upload.ts                            validación de tipo y peso, rutas, miniatura
  lib/images/__tests__/*.test.ts
  supabase/migrations/<ts>_images_bank.sql
  img-r-prototype.html
  docs/features/img-r.md

MODIFICADO
  app/api/images/route.ts                         GET paginado con q, tags, untagged y recuento de uso · POST con name, tags y rutas
  app/api/images/[id]/route.ts                    PATCH (datos, con updated_at) · DELETE con 409 si está en uso
  lib/decks/types.ts                              ImageRecord e ImageCreateInput con los campos nuevos
  lib/decks/api.ts                                uploadImage por id y por variante · listImages con parámetros · updateImage
  components/deck/studio/ImageGallery.tsx         usa ImageUploadModal, ImageCard e ImageFilters; borrado bloqueado
  components/studio/GalleryFilters.tsx            Pill admite la variante discontinua de «Sin etiquetas»
  components/workspace/AppIcon.tsx                icono de IMG_r
  lib/workspace/catalog.ts                        entrada `imgr`
  lib/workspace/__tests__/catalog.test.ts         orden y ruta
  lib/tokens.ts                                   acento magenta en toolIconAccents, con su nota
  package.json                                    lib/images/__tests__ en el glob de tests
  docs/features/urls-workspace.md                 las dos rutas nuevas
  docs/features/deck-image-gallery.md             nota: el banco se gestiona desde IMG_r

FASE 2 · NUEVO (lo que se implementó; el plan lo argumenta)
  supabase/migrations/20261002120000_images_ai.sql            columnas de estilo y prompt · peek_rate_limit · refund_rate_limit
  supabase/migrations/20261003100000_images_edit_model.sql    edit_model
  supabase/migrations/20261003100100_purge_keeps_monthly.sql  la purga no vacía las cuotas mensuales ni la ejecuta anon
  lib/images/edit/models.ts                       Nano Banana 2 y Pro, y el tamaño que se pide (también en el navegador)
  lib/images/edit/adapter.ts                      Gemini por fetch, con corte a los 40 s (solo servidor)
  lib/images/edit/prompt.ts                       prompt de edición desde lib/prompts.ts
  lib/images/edit/files.ts                        temporales, rutas de sobrescribir, qué se borra al sobrescribir y al volver
  lib/images/edit/dimensions.ts                   medidas de un JPEG o PNG por su cabecera
  lib/images/edit/server.ts                       cuota y purga de temporales (solo servidor)
  lib/images/edit/persist.ts                      copiar a su sitio, borrar y analizar el resultado (solo servidor)
  lib/images/analyze/prompt.ts                    prompt de propuesta y estilo desde lib/prompts.ts y lib/tokens.ts
  lib/images/analyze/schema.ts                    esquema Zod y JSON Schema de la salida
  lib/images/analyze/verdict.ts                   el veredicto desde los seis criterios
  lib/images/analyze/result.ts                    evalText, etiquetas y columnas de estilo
  lib/images/analyze/server.ts                    la llamada a Claude (solo servidor)
  lib/images/quota.ts                             clave mensual en hora de Madrid, restantes, día de reinicio
  lib/images/bankTags.ts                          las etiquetas del banco, para las píldoras y el prompt
  lib/images/limit.ts                             tres análisis a la vez
  app/api/images/analyze/route.ts                 propuesta + estilo de una imagen aún sin subir (ligera en base64)
  app/api/images/[id]/analyze/route.ts            «Analizar estilo» de una imagen del banco
  app/api/images/[id]/edit/route.ts               edición → resultado en images/_tmp/ (purga antes los de >24 h)
  app/api/images/[id]/edit/commit/route.ts        copia · sobrescribir · descartar; analiza el estilo del resultado
  app/api/images/[id]/revert/route.ts             volver al original
  app/api/images/quota/route.ts                   ediciones que le quedan a quien pregunta
  components/images/AiEditModal.tsx               el modal «Editar con IA»
  components/images/StyleVerdict.tsx              caja «Encaja», banner desplegable «No encaja» / «Encaja en parte»
  components/images/HoldToCompare.tsx             «Mantén pulsado para ver el original», ratón, táctil y teclado
  lib/images/__tests__/{styleCriteria,verdict,analyze,quota,limit,editPrompt,editModels,editFiles,dimensions}.test.ts

FASE 2 · MODIFICADO
  lib/prompts.ts                                  los seis criterios citan su línea; ningún texto cambia (import de tokens relativo)
  lib/__tests__/prompts.test.ts                   la salida de getImagePrompt() congelada en sus seis combinaciones
  lib/decks/types.ts · lib/decks/api.ts           columnas nuevas; análisis, edición, cuota y volver al original
  lib/images/filter.ts · lib/images/view.ts       filtro de estilo; datos y descargas de editadas y sobrescritas
  lib/images/client.ts                            la ligera para analizar y las variantes de una edición
  components/images/ImageUploadModal.tsx          propuesta y veredicto por fila
  components/images/ImageCard.tsx                 cruz con aviso si no encaja
  components/images/ImageFilters.tsx              píldora «Estilo Interactius» (FilterBar admite varias píldoras especiales)
  components/images/ImageDetailModal.tsx          bloque de estilo, edición, comparar, volver al original
  components/images/ImageBank.tsx                 abrir la imagen de origen y la copia guardada
  app/api/images/route.ts · [id]/route.ts         filtro por estilo, estilo al registrar, imagen de origen en el detalle
  .env.example                                    GEMINI_API_KEY (server-only; la usa edit)
```

`middleware.ts` **no cambia**: `/api/images` ya está en `EDITOR_API` y las rutas nuevas cuelgan de ella.
Las páginas quedan cubiertas por la protección de `/workspace/*`.

## Qué se reutiliza en vez de duplicar

- `components/studio/*`: `BrandMark`, `MarkDivider`, `Wordmark`, `SearchField` y `FilterBar`, `TagInput`, `LogoutButton`.
- `Modal`, `ConfirmModal` y los estilos de `components/deck/studio/ui.ts`.
- `optimizeImage()` para la ligera, y la misma función con `maxEdge = 480` para la miniatura.
- `IMAGE_BUCKET` de `lib/storage/paths`, `supabaseAuthServer()`, `requireUser()`, `dbFail()`.
- La consulta de uso de `app/api/images/[id]/usage/route.ts`: se extrae a una función en servidor que
  usan `usage`, `DELETE` y el listado, para que haya una sola definición de «en uso».
- **Se extrae a compartido**: la subida, la tarjeta y el filtro salen de `ImageGallery.tsx` a
  `components/images/`. El popup y IMG_r los montan sin copiarlos.

## Fase 2 — IA

Parte de la fase 1 implementada. El prototipo, con «Fase 2» activado, es el contrato.

### Edición con Gemini

**Prompt.** Se compone en `lib/images/edit/prompt.ts` y no se escribe a mano. Lleva tres bloques:

1. Una orden de retoque: es una edición de una foto existente, no una generación. Conservar el encuadre y la
   composición, y aplicar el tratamiento. Con la variante `people`, conservar también a las personas.
2. El prompt de la guía **completo**, `getImagePrompt('es', variant)`, con `variant` = `standard` o `people`.
   Se usa tal cual: **no se cambia su texto**, porque el equipo y un cliente lo usan a diario.
3. La indicación libre de la persona, si hay, de 300 caracteres como máximo.

**Variante.** Se preselecciona con `people_present` del análisis: con personas, `people`; sin personas,
`standard`; sin análisis, `standard` con un aviso para revisarla. La persona la cambia antes de aplicar.
Se guarda en `prompt_variant` de la imagen resultante.

**`POST /api/images/[id]/edit`** con `{ variant: 'standard' | 'people', instruction?: string }`.

1. Comprueba la cuota con `check_rate_limit('imgr-edit:<user_id>:<AAAA-MM>', 25, 2678400)`. La clave
   lleva el mes, así que el contador empieza de cero el día 1 sin tocar la función. Si no cabe, `429`.
2. Purga los objetos de `images/_tmp/` de más de 24 horas.
3. Llama al adaptador con el original (o la ligera, en las antiguas) y guarda el resultado en
   `images/_tmp/<uuid>.jpg`. Devuelve `{ tmp, previewUrl, width, height, remaining }`.
4. Si el proveedor falla, llama a `refund_rate_limit(key)`, que resta uno, y responde con error: el
   intento no cuenta. La función es nueva, `security definer`, y solo resta si el contador es mayor que cero.

`maxDuration = 60`. Si aparecen `504`, primero se baja la resolución pedida y luego se pasa a un trabajo
asíncrono con consulta de estado. **[supuesto]** El modelo tarda entre 10 y 40 segundos.

**`POST /api/images/[id]/edit/commit`** con `{ tmp, mode: 'copy' | 'overwrite' | 'discard', instruction? }`.

- `copy`: fila nueva con `source = 'edited'`, `parent_id`, `prompt`, nombre «<nombre> (editada)», las
  mismas etiquetas y sus tres ficheros propios en `images/<id nuevo>/`.
- `overwrite`: solo si el uso es cero; si no, `409`. El original pasa a `prior_original_path`, y se
  regeneran la ligera y la miniatura con **rutas nuevas** (la URL cambia, así que no hay caché vieja).
  Se borran la ligera y la miniatura anteriores.
- `discard`: borra el temporal.
- `copy` y `overwrite` analizan el estilo del resultado antes de responder, con la misma llamada que el análisis bajo demanda.

**`POST /api/images/[id]/revert`**: solo si el uso es cero (ver *Decisiones abiertas*). Recupera
`prior_original_path`, regenera la ligera y la miniatura, borra los ficheros editados y vuelve a analizar el estilo.

**`GET /api/images/quota`**: `{ remaining, resetsOn }`. Lee el contador con `peek_rate_limit(key)`, una
función nueva de solo lectura, porque `check_rate_limit` suma al leer.

### Propuesta de nombre y etiquetas, y análisis de estilo

**`POST /api/images/analyze`** con la ligera de una imagen todavía sin subir (base64, unos 300 KB), y
**`POST /api/images/[id]/analyze`** para una del banco. Las dos usan el mismo prompt y el mismo esquema.

- `claude-opus-5`, `output_config.format`, `effort: 'low'`. Salida:
  `{ name, tags[], people_present, style: { verdict: 'si' | 'parcial' | 'no', reason, checks: { film, dof, light, motion, not_stock, subject } } }`.
- **Criterios.** Salen de los dos prompts de imagen de la guía y viven junto a ellos en `lib/prompts.ts`, con un
  test que los ata a sus líneas. Si alguien cambia un prompt, el test obliga a revisar los criterios.
  Los cinco primeros salen del cuerpo común; el sexto, del bloque de sujeto de la variante que toca:
  1. Película analógica: grano fino y color tipo Portra (`film`).
  2. Poca profundidad de campo (`dof`).
  3. Luz natural, lateral o difusa (`light`).
  4. Movimiento o barrido sutil (`motion`).
  5. Lejos de la estética de banco de imágenes (`not_stock`).
  6. `subject`. Con personas, del prompt `people`: «Personas sin posar, sin mirar a cámara ni sonreír de forma
     corporativa». Sin personas, del prompt `standard`: «El sujeto es el espacio, los objetos o la luz, sin
     figuras humanas».
- **Veredicto.** `si` si cumple todos los que aplican; `no` si falla la mayoría; `parcial` en el resto. La
  regla la aplica el modelo y queda escrita en el prompt. **[supuesto]** Se revisa con fotos reales en el análisis.
- **Nombre y etiquetas.** El prompt incluye las etiquetas que ya existen, para que elija primero entre
  ellas, y la regla de nombre: describir qué se ve, en 3 a 8 palabras, en castellano.
- **Marca del texto.** Las reglas de puntuación y vocabulario salen de `lib/tokens.ts`. El nombre y el motivo
  se auditan con `evalText()`. Si el nombre no pasa, no se propone. Si el motivo no pasa, se reintenta una
  vez y, si sigue sin pasar, se guarda el veredicto con los criterios y sin motivo.
- **Al subir**, la propuesta y el veredicto se piden por fila en cuanto existe la ligera, tres a la vez
  como máximo. El veredicto se guarda con la fila al subir. La propuesta nunca se guarda sola: solo entra si
  la persona pulsa «Usar propuesta».
- Es un juicio visual, no una medida: no ve la velocidad de obturación real, solo si hay barrido. Dos
  análisis de una imagen dudosa pueden no coincidir. La interfaz lo presenta como orientación.

### Contrato de interacción de la fase 2

| # | Detalle del prototipo | Se implementa | Nota |
|---|---|---|---|
| F1 | En el detalle, «Editar con IA» como enlace, junto a las demás acciones | Sí | |
| F2 | Modal «Editar con IA»: imagen a la izquierda; a la derecha, «Prompt de la guía», «Indicación, opcional», el contador y las acciones. Sin texto explicativo del estilo ni aviso de privacidad | Sí | Pedido por Carlos: menos texto |
| F2a | «Prompt de la guía»: segmentos «Estándar» y «Personas» con el traje de `seg` / `segOn` de `studio/ui.ts`, preseleccionados según `people_present`. Bajo ellos: «Elegido porque hay personas en la foto.» o «Elegido porque no hay personas en la foto.»; sin análisis, «Esta imagen aún no se ha analizado: revisa el prompt antes de aplicar.» | Sí | |
| F2b | Estándar elegido con personas detectadas: «Con este prompt, el modelo puede quitar a las personas de la foto.» en Burdeos. No bloquea | Sí | |
| F2c | Los segmentos no se pueden cambiar mientras edita | Sí | |
| F3 | Indicación: área de texto, pista «Por ejemplo: más cálida, quita el cartel del fondo», ayuda «Describe el retoque con tus palabras.» y contador «0 / 300» | Sí | |
| F4 | Contador: «Te quedan N de 25 ediciones este mes. Cada intento cuenta.» | Sí | Desde `GET /api/images/quota` |
| F5 | Límite agotado: «Has llegado a las 25 ediciones de este mes. El contador se reinicia el 1 de <mes>.» en Burdeos, y el botón apagado | Sí | |
| F6 | Botón principal «Aplica el estilo» | Sí | |
| F7 | Mientras edita: «Editando. Puede tardar hasta 40 segundos.» latiendo bajo la imagen; no se puede cerrar el modal (ni Cancelar ni Escape) ni tocar la indicación | Sí | |
| F8 | Resultado: la imagen se sustituye y debajo aparece «Versión N · <ancho> × <alto> px» | Sí | |
| F9 | «Mantén pulsado para ver el original»: mientras se pulsa, la imagen vuelve al original y el botón dice «Original». Funciona con ratón, táctil y teclado (Espacio o Intro) | Sí | Mismo componente en el modal y en el detalle |
| F10 | «Probar otra vez» y «Descartar» como enlaces; descartar avisa «Edición descartada» y vuelve al original | Sí | |
| F11 | «Guardar como copia» (relleno) y «Sobrescribir» (contorno) | Sí | |
| F12 | En uso: «Sobrescribir» apagado, con «No se puede sobrescribir: la usa deck «X» y formulario «Y». Guárdala como copia.» | Sí | |
| F13 | Sin uso: «Sobrescribir cambia esta imagen y guarda el original para poder volver a él.» | Sí | |
| F14 | Copia guardada: aviso «Copia guardada» y se abre el detalle de la copia | Sí | |
| F15 | Sobrescrita: aviso «Imagen sobrescrita. El original queda guardado» | Sí | |
| F16 | Fallo: «No se ha podido editar la imagen. Este intento no cuenta para tu límite. Vuelve a intentarlo en un momento.» en Burdeos, y el contador no baja | Sí | `refund_rate_limit` |
| F17 | Cerrar con un resultado sin guardar lo descarta sin preguntar; el intento cuenta | Sí | |
| F18 | Detalle de una editada: «Editada» en lugar de «Original», «Sale de» con enlace a la imagen de origen, «Prompt» (Estándar o Personas), «Indicación» si la hubo, «Descargar editada» y la nota «La versión editada sale a N px de lado como máximo, aunque el original fuera más grande.» | Sí | |
| F19 | Detalle de una sobrescrita: «Original previo», «Descargar original previo» y «Volver al original» | Sí | |
| F20 | «Volver al original» pide confirmación: «X» recupera el original que tenía antes de sobrescribirla, y la versión editada se borra; aviso «Original recuperado» | Sí, con cambio | Si la imagen está en uso, la implementación lo bloquea con la lista de documentos. El prototipo deja hacerlo con un aviso |
| F21 | Subida: bajo cada fila, «Proponiendo nombre y etiquetas» latiendo; después «Propuesta: «nombre» · etiquetas» con «Usar propuesta», que rellena el nombre y añade las etiquetas | Sí | |
| F22 | Fallo de la propuesta: «No se ha podido proponer. Escribe tú el nombre y las etiquetas.» | Sí | |
| F23 | Estilo en la fila de subida: la misma pieza que en el detalle, en tamaño compacto | Sí | `StyleVerdict` |
| F24 | Si encaja: caja blanca con borde, check y «Encaja con nuestro estilo». No se despliega | Sí | |
| F25 | Si no encaja: banner blanco con borde, cruz en círculo en Burdeos, «No encaja con nuestro estilo» y flecha. Al pulsarlo se despliegan el motivo y los seis criterios con «Sí» o «No»; el sexto cambia según haya personas; la flecha gira | Sí | `aria-expanded` |
| F26 | Si encaja en parte: el mismo banner, con un guion en gris en lugar de la cruz, y «Encaja en parte con nuestro estilo» | Sí | No es un error: sin Burdeos |
| F27 | Detalle sin análisis: «Esta imagen aún no se ha analizado.» y «Analizar estilo»; durante el análisis, «Analizando la imagen»; si falla, aviso «No se ha podido analizar la imagen. Vuelve a intentarlo.» | Sí | |
| F28 | Tarjeta de una imagen que no encaja: cruz en Burdeos sobre plaquita clara de 22 px en la esquina inferior derecha. Las que encajan, o encajan en parte, no llevan marca | Sí | |
| F29 | Al pasar sobre la cruz, tooltip «Esta imagen no encaja en nuestras guidelines», también al llegar a la tarjeta con el teclado | Sí | También como `aria-label` |
| F30 | Píldora «Estilo Interactius» en la fila de filtros: muestra solo las que encajan | Sí | |

**Descartado durante el prototipo:** el imagotipo de Interactius como sello de «encaja», con placa y
sin ella, y un check en las tarjetas que encajan. El imagotipo a 20 px se perdía en las esquinas oscuras,
y un filete añadido al logo choca con las guidelines. Carlos prefirió marcar solo lo que no encaja.

## Marca

**Cómo cumple la interfaz.**

- **Copy.** El del prototipo pasó la revisión: sin `!` ni `¡`, sin `…` ni `...`, y sin raíces de
  `forbiddenVocabularyDetailed`. La pista de etiquetas usa «Por ejemplo:» en lugar de puntos suspensivos.
- **Tipografía.** Mono 400/500/600 y Serif 300 (el nombre del detalle). Sin cursiva.
- **Color.** Burdeos solo en errores, rechazos, «Eliminar», el límite agotado y la cruz de «No encaja»,
  por su `uiRole` de alerta. «Encaja en parte» va en gris porque no es un error. El magenta solo en `AppIcon.tsx`.
- **CTA.** Las acciones de página y de detalle son enlaces con el hover-wipe canónico.
- La implementación toma los tamaños de `lib/typeScale.ts` y de `studio/ui.ts`, no del prototipo.

**Lo que la tool guarda** son fotos del equipo y de los proyectos, no piezas de marca. Las imágenes no
se auditan contra `lib/tokens.ts`.

**Avisos:**

- **Enlaces frente a botones.** La norma pide enlaces subrayados como CTA, y los modales del workspace
  (`ConfirmModal`, `btn` de `studio/ui.ts`) usan botones rellenos. IMG_r sigue el patrón compartido en los
  modales. Lo decide **Alberto**: o cambia la norma para los modales del workspace, o cambian los modales,
  en todas las tools a la vez.
- **Acento magenta y coral.** El magenta queda cerca del coral de DeckMak_r. Lo decidió Carlos sabiéndolo,
  y la nota lo deja escrito para que Alberto pueda revocarlo.
- **Desviaciones heredadas.** El `Wordmark` en Mono 700 y `colors.brick` se usan tal cual, sin tocarlos.
- **«Guidelines» en la interfaz.** El tooltip lo pidió Carlos con esa palabra. No está en el vocabulario
  prohibido; si Alberto prefiere «guía», es un cambio de una cadena.
- **Regla de hecho sin escribir.** Cuatro galerías comparten cabecera, `FilterBar` y primera celda de «Crear»,
  pero ese patrón solo está en el código y en comentarios. Propuesta aparte: documentarlo en `docs/features/`.

## Divergencias con las tools existentes

- **Borrado en uso bloqueado.** Hoy el popup deja borrar. Con IMG_r la regla cambia para todos, porque
  vive en la API. Entra en el alcance: es el mismo banco, y dos reglas sobre la misma fila serían el defecto
  «mismo rol, dos valores».
- **Rutas en Storage.** La convención del proyecto es `deck-assets/<tool>/<id>/`. IMG_r usa
  `deck-images/images/<id>/` porque hereda el banco. Mover las antiguas rompería URLs publicadas.
- **Rejilla de IMG_r a pantalla completa y con 6 px de hueco (entrega 3, G14).** Las otras galerías del
  workspace limitan el ancho y usan 240 px con 28 de hueco, y la fase 1 lo copió (D3). Carlos lo cambió el
  2 de octubre de 2026: en un banco de fotos importa ver muchas imágenes a la vez, y las tarjetas ya no
  llevan texto debajo que necesite aire. Solo afecta a IMG_r; el popup de los decks y las otras galerías
  no cambian, y no se propone retrofit.
- **Concurrencia por `updated_at` en `images`.** La tabla no lo tenía. DeckMak_r y FormMak_r ya
  gestionan sus documentos con su propio mecanismo y no cambian.

## Verificación

**Automática**

- `lib/images/__tests__/naming.test.ts` comprueba lo siguiente:
  - El nombre desde la ruta antigua: quita la marca de tiempo y la extensión, y conserva guiones y guiones bajos.
  - La normalización de etiquetas: minúsculas, espacios a guiones, sin duplicados y sin vacías.
- `lib/images/__tests__/filter.test.ts` comprueba lo siguiente:
  - La búsqueda no distingue tildes y mira nombre y etiquetas.
  - Varias etiquetas se combinan en Y.
  - «Sin etiquetas» excluye las demás.
- `lib/images/__tests__/upload.test.ts` comprueba lo siguiente:
  - Acepta JPEG, PNG y WebP y rechaza el resto, con el mensaje exacto.
  - Rechaza a partir de 25 MB, con el peso formateado.
  - Las rutas siguen el formato `images/<id>/{original,light,thumb}`.
  - El lote es válido solo si cada imagen tiene nombre y al menos una etiqueta, propia o común.
- Fase 2, `lib/images/__tests__/editPrompt.test.ts` comprueba lo siguiente:
  - Con `standard`, el prompt lleva `getImagePrompt('es', 'standard')` completo; con `people`, el de personas,
    y la orden de conservar a las personas solo aparece con `people`.
  - La indicación se recorta a 300 caracteres.
  - `getImagePrompt()` devuelve el mismo texto que antes, en las dos variantes y los tres idiomas.
- Fase 2, `lib/images/__tests__/styleCriteria.test.ts`: los cinco primeros criterios apuntan a líneas del
  cuerpo común; el sexto, a la del bloque de sujeto de cada variante. Si un prompt cambia, el test falla.
- Fase 2, `lib/images/__tests__/analyze.test.ts`: el esquema acepta una salida válida y rechaza
  veredictos o claves desconocidas; el prompt incluye las etiquetas existentes y las reglas de puntuación de `lib/tokens.ts`.
- Fase 2, `lib/images/__tests__/quota.test.ts`: la clave lleva año y mes, el 31 de un mes y el 1 del
  siguiente dan claves distintas, y la fecha de reinicio es el día 1 del mes siguiente.
- `lib/workspace/__tests__/catalog.test.ts`: `imgr` existe, va detrás de `clockr` y delante de `socialmakr`, y su `href` es `/workspace/img_r`.
- `npm run test`, `npm run type-check` y `npm run build` limpios.

**Manual.** Los checks se hacen en local con sesión `@interactius.com`, contra la base de datos de
siempre. Las imágenes de prueba llevan el nombre «prueba-…» y se borran al terminar.

1. Sin sesión, `/workspace/img_r` y `/workspace/img_r/<id>` redirigen a `/workspace/login?next=…`.
2. La tarjeta de IMG_r aparece en `/workspace` detrás de Clock_r, con el icono magenta y «Banco de imágenes».
3. Las respuestas de `/workspace/img_r` llevan `X-Robots-Tag: noindex, nofollow`.
4. La migración se ha aplicado. En `images`, todas las filas tienen `name` no vacío y el recuento coincide
   con el de antes. Las antiguas tienen `tags = '{}'` y `original_path`, `thumb_path` y `updated_at` coherentes.
   El informe incluye los dos recuentos.
5. Sube «prueba-pasillo.jpg» de unos 10 MB con nombre y dos etiquetas. En la tabla, la fila tiene `name`,
   `tags`, `original_bytes`, las medidas del original y las tres rutas. En `storage.objects` hay tres
   objetos bajo `images/<id>/`. El `md5` del original descargado coincide con el del fichero subido.
6. Sube un GIF y un JPEG de 30 MB. Los dos se rechazan con su mensaje y no aparece ningún objeto nuevo en Storage.
7. Intenta subir directamente al bucket un fichero de 30 MB con la sesión del equipo, desde la consola
   del navegador con el cliente de Supabase. Storage lo rechaza.
8. Sube tres imágenes a la vez con una etiqueta común y una propia en una de ellas. Cada fila acaba con las etiquetas esperadas.
9. Deja una sin nombre y pulsa Subir. Aparece «Falta el nombre.», el aviso flotante, y no se sube ninguna.
10. Busca «pasillo», luego «PASILLO» y luego una etiqueta con tilde escrita sin tilde. Las tres búsquedas encuentran la imagen.
11. Filtra por dos etiquetas: solo salen las imágenes que llevan las dos. «Sin etiquetas» solo muestra las antiguas sin etiquetar.
12. Con más de 60 imágenes, al bajar se cargan más, sin repetidas ni saltos (contrastado con el recuento de la tabla).
13. Abre el detalle. La URL pasa a `/workspace/img_r/<id>`. Recargar con esa URL abre la galería con el
    mismo detalle. Cerrar devuelve a `/workspace/img_r` con el scroll intacto.
14. Descarga el original y la ligera. Los ficheros pesan lo que dice el detalle y llevan el nombre de la imagen.
15. Abre una imagen antigua. No aparece «Descargar original» y sí la nota de que solo hay versión ligera.
16. Edita el nombre y las etiquetas. En la tabla cambian `name`, `tags` y `updated_at`.
17. Abre la misma imagen en dos pestañas. Guarda en la B y después en la A: la A muestra el choque con los
    cambios de la B. «Recargar» deja en la tabla lo de B. Repite y pulsa «Guardar encima»: queda lo de A.
18. Coloca «prueba-pasillo» en un deck de prueba y en un formulario de prueba. La tarjeta muestra «En uso · 2».
    Eliminar desde IMG_r muestra «No se puede eliminar» con los dos documentos, y la fila y los objetos siguen ahí.
19. Lo mismo desde el popup de DeckMak_r: tampoco deja borrar.
20. `DELETE /api/images/<id>` de esa imagen desde la consola del navegador responde `409` con la lista.
21. Quita la imagen del deck y del formulario y elimínala. En la tabla no está la fila y en `storage.objects`
    no queda ningún objeto bajo `images/<id>/`.
22. En el popup de DeckMak_r, sube una imagen nueva: pide nombre y etiquetas, queda seleccionada y,
    al aceptar, el `md` del deck lleva la URL de la ligera, no la del original.
23. El popup de FormMak_r hace lo mismo con la imagen de fondo.

**Fidelidad al prototipo.** Se recorre la tabla de detalles del 1 al 40, uno por uno. Hay que
comprobar con especial cuidado las pistas exactas (17, 18 y 19), los mensajes de error (22, 23 y 33),
los textos del botón durante la subida (24) y que el modal no se puede cerrar mientras sube (25).

**Fase 2**

24. Sube «prueba-ventana.jpg». La fila muestra «Proponiendo nombre y etiquetas» y después la propuesta y
    el veredicto. El nombre propuesto pasa `evalText()` y al menos una etiqueta ya existe en el banco.
25. «Usar propuesta» rellena el nombre y añade las etiquetas. Sube: en la tabla, `style_verdict`,
    `style_checks`, `style_reason` y `style_analyzed_at` están rellenos.
26. Sube otra imagen sin usar la propuesta: se guarda el nombre que escribiste y el veredicto, no la propuesta.
27. En una imagen que no encaja, la tarjeta lleva la cruz y el tooltip; el detalle muestra el banner
    plegado, y al pulsarlo, el motivo y los seis criterios. La píldora «Estilo Interactius» la oculta.
28. En una antigua, «Analizar estilo» rellena las cuatro columnas de estilo de su fila.
29. Abre «Editar con IA» en una foto con personas y en otra sin ellas. Cada una preselecciona su prompt y lo
    explica. En la de personas, elegir «Estándar» muestra el aviso en Burdeos. El contador coincide con
    `peek_rate_limit` de tu clave del mes.
30. «Aplica el estilo» sin indicación: la vista previa conserva a las personas y el encuadre, y el contador
    baja en uno. Hay un objeto nuevo en `images/_tmp/`.
31. «Mantén pulsado para ver el original» funciona con el ratón y con la barra espaciadora.
32. «Probar otra vez» con una indicación: el contador baja otra vez y aparece «Versión 2».
33. «Guardar como copia»: fila nueva con `source = 'edited'`, `parent_id`, `prompt`, `prompt_variant`, el nombre «… (editada)»,
    tres objetos propios y el estilo analizado. El temporal ya no está.
34. En una imagen en uso, «Sobrescribir» está apagado y `POST …/edit/commit` con `overwrite` responde `409`.
35. En una que no se usa, «Sobrescribir»: `prior_original_path` relleno, `url` distinta y sin objetos
    viejos de ligera ni miniatura. «Volver al original» la deja como estaba en la tabla y en Storage.
36. Coloca esa imagen en un deck de prueba: «Volver al original» queda bloqueado con la lista.
37. «Descartar» y cerrar con un resultado sin guardar no dejan temporales nuevos. Un temporal de más de
    24 horas desaparece en la siguiente edición de cualquiera (crea uno a mano con fecha antigua para probarlo).
38. Con el contador de tu clave puesto a 25 en `rate_limits`, el modal muestra el mensaje de límite y
    `POST …/edit` responde `429`. Devuelve el contador a su valor al terminar.

**No ejecutables sin ayuda**

| # | Check | Por qué |
|---|---|---|
| A | Relleno de miniaturas de las imágenes antiguas | `requiere Carlos`: el script usa la clave `service_role` |
| B | Error de red a mitad de una subida múltiple: las buenas quedan subidas y las fallidas se reintentan | `requiere cortar la red`. No se simula interceptando `fetch`; si no se puede cortar, queda sin verificar |
| C | Fallo real del proveedor de edición: el intento no cuenta (F16) | Solo se verifica si Gemini falla de verdad o con una clave inválida en local, que es `requiere Carlos` para cambiarla. No se simula interceptando `fetch` |
| D | Coste real por edición contra la consola de Google | `requiere Carlos`: la consola es de su cuenta |

**No regresión**

- DeckMak_r: elegir imagen desde el popup, guardar, publicar, compartir y exportar a PDF con imágenes antiguas y nuevas.
- FormMak_r: elegir el fondo, guardar, publicar y responder.
- El visor público `/deck/<id>/view` sigue mostrando las imágenes antiguas, que no se han movido.
- El catálogo conserva su orden.

**Limpieza.** Se borran las imágenes «prueba-…», el deck y el formulario de prueba. El informe dice
qué queda y dónde, y se guarda como doc del proyecto Workplace con los fallos separados de las observaciones.

## Entrega 3 — parrilla rediseñada y acciones en bloque

Parte de las fases 1 y 2 implementadas. Cambia la tarjeta de la galería y añade selección múltiple. Salió
de revisar el prototipo el 2 de octubre de 2026; el prototipo actual es el contrato.

**Qué sustituye.** Los detalles 8, 9 y 10 del contrato de la fase 1, y F28 y F29 de la fase 2, en lo que
toca a la tarjeta, y la decisión D3 de la fase 1 (rejilla de 240 px con hueco de 28) en lo que toca a la
rejilla de IMG_r. El detalle de la imagen no cambia.

| # | Detalle del prototipo | Se implementa | Nota |
|---|---|---|---|
| G1 | La tarjeta es solo la miniatura 4:3: sin nombre debajo. El nombre sigue en el `aria-label` («Abrir <nombre>») y en la búsqueda | Sí | Pedido por Carlos |
| G2 | Solo la primera etiqueta, dentro de la imagen, abajo a la izquierda, con fondo blanco y borde cálido. Sin etiquetas: «Sin etiquetas» sobre fondo claro. Si no cabe, se corta sin puntos suspensivos | Sí | `text-overflow: clip`, por `punctuationRules.noEllipsis` |
| G3 | Sin la insignia «Solo versión ligera» en la tarjeta. La nota sigue en el detalle | Sí | |
| G4 | Arriba a la derecha, en fila y en este orden: el número de usos (plaquita oscura de 22 px, cifras tabulares) y, si no encaja, la cruz (plaquita Burdeos con la cruz en claro) | Sí | |
| G5 | Tooltips que abren hacia abajo, alineados a la derecha: número → «En uso en N documento» / «En uso en N documentos»; cruz → «Esta imagen no encaja en nuestras guidelines». Los dos textos también como `aria-label` | Sí | |
| G6 | Arriba a la izquierda, un selector redondo de 20 px: borde oscuro sobre fondo claro; marcado, relleno oscuro con un punto claro. Se ve al pasar el ratón por la tarjeta, con foco, en cuanto hay una seleccionada y siempre en pantallas táctiles | Sí | Es una casilla de verificación con aspecto redondo: `role="checkbox"`, `aria-label` «Seleccionar <nombre>». Un radio solo permitiría una |
| G7 | Tarjeta seleccionada: contorno oscuro de 2 px separado 2 px de la imagen | Sí | |
| G8 | Pulsar el selector marca o desmarca sin abrir el detalle; pulsar la imagen abre el detalle, también con una selección en curso | Sí | El selector y la imagen son dos botones hermanos, no uno dentro de otro |
| G9 | Con al menos una seleccionada, barra fija abajo y centrada, fondo oscuro: «N seleccionada(s)», «Añadir etiquetas», «Descargar», «Eliminar», «Seleccionar las N visibles» (solo si no lo están todas) y «Anular selección». Escape anula la selección si no hay ningún modal abierto | Sí, con cambio | En el prototipo «Eliminar» va en un rosa que no está en la paleta. Se implementa en el mismo color que el resto de la barra; el aviso de peligro está en la confirmación |
| G10 | «Añadir etiquetas»: modal con «Se añaden a las N imágenes seleccionadas. Las etiquetas que ya tienen no cambian.», `TagInput`, «Añade al menos una etiqueta.» si se envía vacío, y aviso «Etiquetas añadidas a N imágenes» | Sí | |
| G11 | «Descargar»: un ZIP con los originales; las antiguas van en versión ligera, y el aviso lo dice: «Descargando N imágenes en un ZIP · M solo en versión ligera» | Sí | Ver *Decisiones abiertas de la entrega 3* |
| G12 | «Eliminar»: borra solo las que no se usan. Confirmación «Se borrará 1 imagen, con su original y su versión ligera.» / «Se borrarán N imágenes, con sus originales y sus versiones ligeras.», más la lista de las que no se pueden borrar y por qué. Botón «Eliminar N» en Burdeos, que pasa a «Eliminando». Aviso final «N imágenes eliminadas · M en uso no se han tocado». Si todas están en uso: «No se puede eliminar» con la lista | Sí | La regla de uso se vuelve a comprobar en servidor |
| G13 | La selección sobrevive a cambiar de filtro o de búsqueda; las que desaparecen del banco salen de la selección | Sí | Selección en memoria de la página, no en la URL |
| G14 | La galería ocupa todo el ancho de la pantalla, sin ancho máximo, con el margen lateral de la página (16 px en móvil, 32 px desde 700 px). Columnas de 220 px como mínimo y **6 px** de hueco entre imágenes. La cabecera y la fila de filtros no cambian | Sí | Divergencia deliberada con las otras galerías: ver *Divergencias* |

**Endpoints.**

- `PATCH /api/images/bulk` con `{ ids, addTags }`. Añade con una unión de arrays en SQL, así que no pisa
  cambios de otra pestaña y no necesita control de versión. Normaliza las etiquetas igual que la subida y
  mantiene `search_text` (D6). Máximo 200 ids.
- `POST /api/images/bulk-delete` con `{ ids }`. Calcula el uso de cada una con `image_uses` (D13), borra las
  libres (fila y todos sus objetos) y devuelve `{ deleted, blocked: [{ id, uses }] }`. Máximo 200 ids.

**Decisiones abiertas de la entrega 3**

| Pregunta | Alternativas | Recomendación |
|---|---|---|
| Cómo se genera el ZIP | en el navegador, con `fflate`, bajando los originales de sus URLs públicas · en una función del servidor | **En el navegador.** Una función de Netlify no puede devolver más de unos 6 MB, y diez originales pasan de 100 MB. Los originales ya son públicos, así que no hace falta servidor. Tope de 50 imágenes por descarga, con aviso si se supera. `fflate` es una dependencia nueva y pequeña |
| Más acciones en bloque | «Aplica el estilo» · «Quitar etiqueta» · «Analizar estilo» | **Ninguna por ahora.** Aplicar el estilo en bloque gasta el cupo de 25 al mes de golpe. Quitar etiqueta y analizar se añaden si se piden |

**Verificación de la entrega 3**

39. La tarjeta no muestra el nombre; el lector de pantalla anuncia «Abrir <nombre>».
40. Una imagen con tres etiquetas muestra solo la primera; una etiqueta larga se corta sin «…».
41. Una imagen usada en dos documentos muestra «2» arriba a la derecha y el tooltip «En uso en 2 documentos»; con uno, «documento».
42. Una imagen que no encaja muestra la cruz a la derecha del número, y su tooltip.
43. El selector aparece al pasar el ratón; con teclado, se llega a él con Tab y se marca con Espacio, sin abrir el detalle.
44. Selecciona tres, filtra por una etiqueta que deja fuera una de ellas: la barra sigue diciendo «3 seleccionadas».
45. «Añadir etiquetas» a tres imágenes, una de las cuales ya tenía esa etiqueta: en la tabla, las tres la tienen una sola vez, `search_text` la incluye y no ha cambiado ninguna otra etiqueta.
46. Edita una imagen en otra pestaña mientras añades etiquetas en bloque: no se pierde ninguno de los dos cambios.
47. «Eliminar» con dos libres y una en uso: en la tabla y en `storage.objects` desaparecen las dos libres con todos sus objetos; la usada sigue igual.
48. `POST /api/images/bulk-delete` con un id en uso desde la consola: lo devuelve en `blocked` y no lo toca.
49. «Descargar» tres imágenes, una antigua: el ZIP tiene tres ficheros, los originales completos (`md5` igual al de Storage) y la ligera de la antigua.
50. Con 51 seleccionadas, «Descargar» avisa del tope y no descarga.
51. Escape anula la selección; con un modal abierto, Escape cierra el modal y la selección sigue.
52. A 1440 px de ancho, la galería llega a los márgenes de la página y caben seis columnas; el hueco entre imágenes mide 6 px. El contorno de una tarjeta seleccionada no toca a la de al lado. Las galerías de DeckMak_r, FormMak_r y DSMak_r no cambian.


## Pendiente

- **Analizar en lote las imágenes antiguas.** Hoy es bajo demanda. La señal es que el filtro «Estilo
  Interactius» se use y deje fuera fotos buenas solo porque nadie las analizó.
- **Mover los originales a un bucket privado con enlace firmado.** La señal es cualquier imagen sensible,
  como una foto de cliente o de personas que no han dado permiso fuera del equipo.
- **Documentar el patrón de galería del workspace** y llevar a Alberto la decisión sobre enlaces y botones.

---

## Prompt para Claude Code

```markdown
Trabajas en `interactius-brandguidelines` (repo `platform-clonica/brand-guidelines`). Vamos a
construir IMG_r, el banco de imágenes del workspace. La definición completa está en
`docs/features/img-r.md`: léela primero, es el contrato. El prototipo de interacción está en
`img-r-prototype.html`.

IMG_r no crea un almacén nuevo: es la pantalla de gestión del banco que ya comparten DeckMak_r y
FormMak_r (tabla `images`, bucket `deck-images`, `/api/images`, `components/deck/studio/ImageGallery.tsx`).
Esta entrega es la **fase 1**. La fase 2 (edición con IA y sugerencias) está definida, pero no se
implementa ahora: solo hay que dejar la tabla preparada (`parent_id`, `prior_original_path`, `source = 'edited'`).

## Fase 1 — análisis y plan. NO escribas código todavía.

Estudia la galería actual (`ImageGallery.tsx`, `app/api/images/**`, `lib/decks/api.ts`,
`lib/decks/types.ts`, `lib/deck/optimizeImage.ts`) y la galería de DSMak_r (`components/ds/DsGallery.tsx`)
como referencia de cabecera, filtros y rejilla. Devuelve un plan que cubra:

1. **Modelo de datos.** Las columnas nuevas de `images`, el trigger `set_updated_at`, los límites del
   bucket (comprueba si ya los tiene), la migración de las imágenes existentes y qué NO se toca (`decks`, `forms`, rutas antiguas).
2. **Ficheros.** Las tres variantes por imagen y su ruta, generadas en el navegador. El orden de subida y
   registro, y qué se borra si falla. El borrado sin huérfanos con todas las variantes.
3. **Concurrencia y reglas.** `PATCH` con `updated_at` y sus dos salidas, y `DELETE` con `409` si está en uso.
   Una sola función en servidor que define «en uso», compartida por `usage`, `DELETE` y el listado.
4. **Listado.** Paginación, búsqueda sin tildes, filtro por etiquetas y «Sin etiquetas», y el recuento de uso
   por imagen. Dime si el `ilike` por imagen aguanta 60 por página o si propones una función SQL.
5. **Interacción.** Recorre `img-r-prototype.html` y la tabla de 40 detalles de la definición. Confirma uno
   a uno que se implementan, incluidos los pequeños: pistas, mensajes exactos, textos del botón durante la
   subida, modal bloqueado mientras sube. Si alguno no se va a implementar, dilo ahora.
6. **Arquitectura de ficheros.** Lista de ficheros nuevos y modificados, con su rol.
7. **Reutilización.** Qué se usa tal cual. Qué sale de `ImageGallery.tsx` a `components/images/` (subida, tarjeta,
   filtro) y cómo queda el popup después. Qué le falta a `TagInput` respecto al detalle 20.
8. **Catálogo, acento, URLs.** Los cambios exactos en `lib/workspace/catalog.ts`, `toolIconAccents` de
   `lib/tokens.ts` (magenta `#EC4899`, con la nota de que lo decidió Carlos), `AppIcon.tsx` y
   `docs/features/urls-workspace.md`. Confirma que `middleware.ts` no necesita cambios.
9. **Cumplimiento de marca de la interfaz.** Copy contra `lib/tokens.ts` (sin `!`, sin `…`, sin vocabulario
   prohibido por raíz), pesos y escala tipográfica, y CTA como enlace en página y detalle.
10. **Plan de tests.** Qué invariante cubre cada test, y el glob de `package.json` con `lib/images/__tests__`.
11. **Riesgos y decisiones abiertas.** Las cuatro de la definición, con tu recomendación para cada una, y cualquier otra que encuentres.

Si algo de la definición choca con `lib/tokens.ts`, `lib/typeScale.ts` o `CLAUDE.md`, dilo en esta
fase con la norma en la mano. No lo resuelvas por tu cuenta.

**Gate: no escribas ni una línea de código hasta que apruebe el plan.**

## Fase 2 — implementación

Por bloques, en este orden. Para entre bloques para que revise:

1. Migración y tipos, y `lib/images/` (naming, filter, upload) con sus tests. Antes de aplicar la migración,
   guarda el recuento de filas de `images`; después, el recuento y las filas con `name` vacío.
2. API: listado paginado, `POST` con los campos nuevos, `PATCH` con `updated_at` y `DELETE` con `409`.
3. Componentes compartidos en `components/images/` y el popup `ImageGallery` pasado a ellos, con el
   borrado bloqueado. En este bloque DeckMak_r y FormMak_r tienen que seguir funcionando.
4. La galería y el detalle de IMG_r en `/workspace/img_r` y `/workspace/img_r/[id]`.
5. Catálogo, acento, icono, `urls-workspace.md`, nota en `deck-image-gallery.md`, y estado de
   `docs/features/img-r.md`.

Reglas mientras implementas:

- Castellano en toda la interfaz, sin next-intl.
- Nada de valores de marca a mano: salen de `lib/tokens.ts`, `lib/typeScale.ts` y `studio/ui.ts`.
- No muevas ni renombres ningún objeto que ya exista en `deck-images`: sus URLs están dentro de decks publicados.
- No toques el texto de `getImagePrompt()` en `lib/prompts.ts`.
- Las desviaciones conocidas (`Wordmark` en Mono 700, `colors.brick`) se dejan como están.
- `npm run test`, `npm run type-check` y `npm run build` limpios al cerrar cada bloque.

## Fase 3 — cierre y verificación

Actualiza `docs/features/img-r.md`: estado **fase 1 implementada**, decisiones que se movieron y
pendientes reales. Después ejecuta la verificación manual de la definición (checks 1 a 23, fidelidad
al prototipo y no regresión) con datos «prueba-…», y contrasta contra la base de datos y
`storage.objects`, no contra la pantalla. Borra los datos de prueba y entrégame el informe con los
fallos separados de las observaciones. Marca los checks A y B como pendientes: no los simules.
```

---

## Prompt para Claude Code · fase 2

```markdown
IMG_r · fase 2 (IA). Repo `brand-guidelines`, rama `feat/img-r-fase-2`, desde `main` con la fase 1 fusionada.
No uses `feat/img-r`: lleva Clock_r.

**Contrato:** `docs/features/img-r.md`, sección «Fase 2 — IA» (detalles F1–F30 y F2a–F2c, checks 24–38),
y `img-r-prototype.html` con el interruptor «Fase 2» activado. Lo que ya existe está en «Fase 1:
implementada» y en `docs/features/img-r-fase-1-plan.md`. El documento manda: léelo, no te lo repito aquí.

**Paso 0.** `git status`. Commitea solo `docs/features/img-r.md` e `img-r-prototype.html` como
`docs(imgr): definicion de la fase 2 y la entrega 3`. El resto de cambios del árbol no son tuyos: no los toques.

## 1 · Plan, sin código

Devuélveme un plan corto con **solo lo que el documento no decide o lo que vas a cambiar**:

1. **Gemini:** modelo, precio vigente, resolución, latencia y uso de datos de la API de pago. Prueba 2 o 3
   fotos reales del banco y enséñame el resultado antes de fijar el modelo.
2. **Prompts:** cómo usas `getImagePrompt()` en sus dos variantes y declaras los seis criterios a su lado
   **sin cambiar ningún texto**.
3. **Migración:** columnas nuevas, `peek_rate_limit` y `refund_rate_limit`. Confirma que es aditiva.
4. **Latencia:** cómo evitas los 504 y qué haces si aparecen.
5. **Contrato:** de F1–F30 y F2a–F2c, solo los que no vayas a implementar tal cual, con el motivo.
6. **Decisión abierta** de «Volver al original» en una imagen en uso: tu recomendación.
7. **Ficheros y tests**, con el glob de `package.json`.
8. **Choques** con `lib/tokens.ts`, `lib/typeScale.ts` o `CLAUDE.md`.

**Para aquí hasta que apruebe el plan.**

## 2 · Implementación

Cuatro bloques. Un commit por bloque (`feat(imgr): <qué> (bloque N)`) y paras entre bloques:

1. Migración, exportaciones de `lib/prompts.ts`, criterios, esquema y cuota, con sus tests. Aplica la
   migración solo si es aditiva.
2. Análisis: los dos endpoints `analyze`, `StyleVerdict`, propuesta y veredicto en la subida, bloque de
   estilo en el detalle, cruz con tooltip y píldora del filtro.
3. Edición: adaptador de Gemini, `edit`, `commit`, `revert`, `quota`, `AiEditModal` con el selector de
   prompt, `HoldToCompare` y el detalle de las editadas y sobrescritas.
4. `.env.example` con `GEMINI_API_KEY` y `docs/features/img-r.md` al día.

Antes de cada commit, en limpio y en este orden: `npm run type-check`, `npm test`, `npm run lint`,
`npm run eval:content`, `npm run build`. Si algo falla, no commitees. `git add` con rutas explícitas,
nunca `-A`.

Reglas: castellano sin next-intl; el texto de `getImagePrompt()` no se toca; las claves son server-only;
los valores de marca salen de `lib/tokens.ts`, `lib/typeScale.ts` y `studio/ui.ts`.

## 3 · Verificación y PR

- Ejecuta los checks 24–38, la fidelidad a F1–F30 y F2a–F2c y la no regresión, con datos «prueba-…».
  Contrasta contra `images`, `rate_limits` y `storage.objects`, no contra la pantalla.
- Deja las cuotas como estaban y borra los datos de prueba. Los checks C y D quedan pendientes, sin simular.
- Entrégame el informe con los fallos separados de las observaciones.
- Abre el PR a `main`, o actualiza el de la fase 1 si sigue abierto. Debe decir:
  - qué entra;
  - la migración y su orden;
  - `GEMINI_API_KEY` en Netlify, y en los secretos de GitHub Actions si el build la necesita;
  - los checks que me necesitan a mí;
  - el plan de vuelta atrás.
- **No mergees.**
```

---

## Prompt para Claude Code · entrega 3

```markdown
IMG_r · entrega 3 (parrilla y acciones en bloque). Repo `brand-guidelines`, rama `feat/img-r-entrega-3`,
creada desde `main` con las fases 1 y 2 fusionadas (PR #6 y #7). Nada de Clock_r: la rama no sale de
`feat/img-r` ni de `feat/clockr`, y la entrega no toca ningún fichero de Clock_r.

**Contrato:** `docs/features/img-r.md`, sección «Entrega 3 — parrilla rediseñada y acciones en bloque»
(detalles G1–G14, checks 39–52), e `img-r-prototype.html`. Lo que ya existe está en «Fase 1: implementada» y
«Fase 2: implementada», con sus planes e informes en `docs/features/`. El documento manda en el qué; este
prompt manda en el cómo (git, paradas, PR). Si chocan, pregúntame.

**Paso 0.** Commitea solo `docs/features/img-r.md` como `docs(imgr): prompt de la entrega 3 sin Clock_r`.

## 1 · Plan, sin código

Devuélveme un plan corto en `docs/features/img-r-entrega-3-plan.md`, con **solo lo que el documento no decide
o lo que vas a cambiar**:

1. **Tarjeta (G1–G8):** dos botones hermanos (abrir y seleccionar), marcas arriba a la derecha, primera
   etiqueta dentro de la imagen y tooltips con teclado y lector de pantalla. Qué pasa con la cruz de F28 y
   F29, que G4 sustituye. Qué cambia en el popup de DeckMak_r y FormMak_r, que usan la misma tarjeta sin
   selección múltiple: cómo se desactiva sin duplicar el componente.
2. **Rejilla (G14):** ancho completo y 6 px de hueco solo en IMG_r, sin tocar las otras galerías ni el popup.
3. **Selección (G13):** dónde vive el estado, cómo sobrevive a filtros y paginación, y cómo se limpia.
4. **Barra y modales (G9–G12):** los textos exactos, y «Eliminar» sin ningún color fuera de `lib/tokens.ts`.
5. **Endpoints:** `PATCH /api/images/bulk` y `POST /api/images/bulk-delete`. La unión de etiquetas en SQL
   manteniendo `search_text`, el uso comprobado en servidor con `image_uses`, el borrado sin huérfanos
   (también `prior_original_path`) y el tope de 200 ids. Si hace falta migración, confirma que es aditiva.
6. **Decisiones abiertas de la entrega 3** (ZIP y más acciones en bloque): tu recomendación. Si el ZIP va en el
   navegador: la dependencia, el tope de 50 y qué pasa si falla la bajada de un fichero.
7. **Contrato:** de G1–G14, solo los que no vayas a implementar tal cual, con el motivo.
8. **Ficheros y tests**, con el glob de `package.json`.
9. **Choques** con `lib/tokens.ts`, `lib/typeScale.ts` o `CLAUDE.md`. La copy nueva, sin `!`, sin `…` y sin
   vocabulario prohibido de ninguna familia.

**Para aquí hasta que apruebe el plan.**

## 2 · Implementación

Cuatro bloques. Un commit por bloque (`feat(imgr): <qué> (bloque N)`) y paras entre bloques:

1. Endpoints en bloque, con sus tests, y la migración si hace falta. Aplícala solo si es aditiva.
2. Tarjeta nueva, rejilla a pantalla completa y selección, sin romper los popups de DeckMak_r y FormMak_r.
3. Barra de acciones, modales y descarga.
4. `docs/features/img-r.md` al día.

Antes de cada commit, en limpio y en este orden: `npm run type-check`, `npm test`, `npm run lint`,
`npm run eval:content`, `npm run build`. Si algo falla, no commitees. `git add` con rutas explícitas,
nunca `-A`.

En cada parada, tres líneas: qué entra en el commit, el resultado de los cinco comandos y qué debo mirar yo
antes de que sigas.

Reglas: castellano sin next-intl; los valores de marca salen de `lib/tokens.ts`, `lib/typeScale.ts` y
`studio/ui.ts`; ninguna galería que no sea la de IMG_r cambia.

## 3 · Verificación y PR

- Ejecuta los checks 39–52, la fidelidad a G1–G14 y la no regresión, con datos «prueba-…». La no regresión:
  - DeckMak_r y FormMak_r siguen eligiendo, guardando, publicando y exportando;
  - la subida, el detalle, el análisis de estilo y la edición con IA siguen como estaban.
  Contrasta contra `images` y `storage.objects`, no contra la pantalla.
- Borra los datos de prueba y deja como estaban las filas que toques.
- Entrégame el informe con los fallos separados de las observaciones. Guárdalo junto al plan en
  `docs/features/`.
- Abre el PR a `main`. Debe decir:
  - qué entra;
  - la migración, si la hay;
  - la dependencia nueva, si la hay;
  - los checks que me necesitan a mí;
  - el plan de vuelta atrás.
- **No mergees.**
```
