# IMG_r · banco de imágenes del equipo

> El equipo tiene un solo sitio donde subir, encontrar, descargar y borrar las imágenes que usa en
> su trabajo, cada una con nombre y etiquetas. Lo que se sube aquí aparece en los decks y en los formularios.
> No es un almacén nuevo: es la pantalla de gestión del banco que DeckMak_r y FormMak_r ya comparten.

Estado: **definido** · pendiente de implementar. Dos fases: banco (fase 1) y edición con IA (fase 2).

Prototipo: `img-r-prototype.html` en la raíz del repo, junto a `deck-prototype.html`. Publicado en
https://claude.ai/artifact/3uMePFsfmqiLpxTjvgdeKW. Es el contrato de interacción de la fase 1.

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

- Editar una imagen con un modelo externo: estilo de cámara de la guía más una indicación libre opcional.
- Al guardar, la persona elige «Guardar como copia» o «Sobrescribir». No se puede sobrescribir una imagen en uso.
- Comparar con el original y volver a él tras sobrescribir.
- Claude propone nombre y etiquetas al subir, y sirve también para etiquetar las imágenes antiguas.

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
| Edición (fase 2) | modelo externo detrás de un adaptador; estilo + indicación libre | Claude no edita imágenes. Ver *Decisiones abiertas* para el proveedor |
| Resultado de editar (fase 2) | la persona elige «Guardar como copia» o «Sobrescribir»; sobrescribir solo si no se usa | Ningún documento cambia sin que nadie lo sepa |
| Sugerencias (fase 2) | `claude-opus-5`, structured outputs, `effort: 'low'` | La clave de Anthropic ya existe |
| Migración | directa, sin simulacro | Decisión de Carlos. El prompt exige un recuento antes y después |

## Decisiones abiertas

| Pregunta | Alternativas | Recomendación |
|---|---|---|
| Proveedor de edición (fase 2) | Google: Gemini 3 Pro Image o Nano Banana 2, salida hasta 4K, unos 0,07 a 0,15 $ por imagen · OpenAI GPT Image: máscaras, salida hasta unos 1536 px, unos 0,01 a 0,13 $ · FLUX.2 Pro: unos 0,045 $ por imagen | **Gemini**, por la salida en 4K, que es la que mejor encaja con descargar en buena calidad. Precios de septiembre de 2026: revisarlos al empezar la fase 2. Ningún modelo devuelve la foto intacta |
| Miniaturas de las imágenes antiguas | script de relleno con credenciales de servidor · se dejan sin miniatura y la tarjeta usa la versión ligera | Las dos cosas. El respaldo a la versión ligera hace falta siempre, por robustez. El script corre después y es `requiere Carlos`, porque necesita la clave `service_role` |
| Ficheros temporales de la edición (fase 2) | el resultado vuelve al navegador · se guarda en `images/_tmp/` hasta que la persona elige | En `_tmp/`: una imagen 4K no cabe en la respuesta de una función de Netlify. Se limpia al guardar o descartar; lo que quede se purga aparte (ver *Pendiente*) |
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

FASE 2
  lib/images/edit/adapter.ts                      interfaz del proveedor y su implementación
  lib/images/edit/prompt.ts                       composición del prompt desde lib/prompts.ts
  app/api/images/[id]/edit/route.ts               edición → resultado en images/_tmp/
  app/api/images/[id]/edit/commit/route.ts        guardar como copia o sobrescribir · descartar
  app/api/images/[id]/revert/route.ts             volver al original
  app/api/images/suggest/route.ts                 nombre y etiquetas propuestos por Claude
  .env.example                                    IMAGE_EDIT_API_KEY (server-only, la usan edit y commit)
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

## IA (fase 2)

**Edición.** `POST /api/images/[id]/edit` con `{ instruction?: string }`.

- El prompt se compone en `lib/images/edit/prompt.ts` y no se escribe a mano. Lleva tres bloques:
  1. Una orden de retoque: conservar el contenido, las personas, el encuadre y la composición, y aplicar solo el tratamiento.
  2. El **estilo de cámara** de la guía: el cuerpo de `getImagePrompt()` sin el bloque `SUJETO`.
     Hay que exportar ese cuerpo por separado desde `lib/prompts.ts` sin cambiar el texto de ninguna
     de las dos variantes. La variante `people` la usa un cliente a diario y no se toca.
  3. La indicación libre de la persona, si hay, de 300 caracteres como máximo.
- La entrada es el original o, en las antiguas, la ligera. El resultado se guarda en
  `images/_tmp/<uuid>.jpg` y se devuelve una vista previa de 1600 px.
- El adaptador fija el proveedor y la resolución de salida. El detalle dice la resolución de la
  versión editada junto a su descarga, porque será menor que la de un original grande.
- `maxDuration = 60`. Si aparecen `504`, primero se baja la resolución pedida y luego se pasa a un trabajo
  asíncrono con consulta de estado. El modelo tarda entre 10 y 40 segundos **[supuesto]**.
- `IMAGE_EDIT_API_KEY` es server-only.

**Guardar.** `POST /api/images/[id]/edit/commit` con `{ tmp, mode: 'copy' | 'overwrite' | 'discard' }`.

- `copy`: fila nueva con `source = 'edited'`, `parent_id`, `prompt`, nombre «<nombre> (editada)» y las mismas etiquetas.
  Lleva sus tres ficheros propios.
- `overwrite`: solo si `usage` es cero; si no, `409`. El original pasa a `prior_original_path`, y se
  regeneran la ligera y la miniatura con **rutas nuevas** (la URL cambia, así que no hay caché vieja).
- `discard`: borra el temporal.

En la interfaz, «Sobrescribir» aparece apagado si la imagen está en uso, con la lista de dónde.
Las copias editadas ofrecen comparar con su original manteniendo pulsado, y las sobrescritas, «Volver al original».

**Sugerencias.** `POST /api/images/suggest` con la ligera, de unos 300 KB.

- `claude-opus-5`, `output_config.format` con `{ name: string, tags: string[] }` y `effort: 'low'`.
- El prompt incluye la lista de etiquetas que ya existen, para que elija primero entre ellas, y la regla
  de nombre: describir qué se ve, en 3 a 8 palabras, en castellano.
- Las reglas de puntuación y vocabulario salen de `lib/tokens.ts`. El nombre se audita con `evalText()`
  y, si no pasa, no se propone.
- La persona acepta, cambia o ignora. La sugerencia nunca se guarda sola.

## Marca

**Cómo cumple la interfaz.**

- **Copy.** El del prototipo pasó la revisión: sin `!` ni `¡`, sin `…` ni `...`, y sin raíces de
  `forbiddenVocabularyDetailed`. La pista de etiquetas usa «Por ejemplo:» en lugar de puntos suspensivos.
- **Tipografía.** Mono 400/500/600 y Serif 300 (el nombre del detalle). Sin cursiva.
- **Color.** Burdeos solo en errores, rechazos y «Eliminar», por su `uiRole`. El magenta solo en `AppIcon.tsx`.
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
- **Regla de hecho sin escribir.** Cuatro galerías comparten cabecera, `FilterBar` y primera celda de «Crear»,
  pero ese patrón solo está en el código y en comentarios. Propuesta aparte: documentarlo en `docs/features/`.

## Divergencias con las tools existentes

- **Borrado en uso bloqueado.** Hoy el popup deja borrar. Con IMG_r la regla cambia para todos, porque
  vive en la API. Entra en el alcance: es el mismo banco, y dos reglas sobre la misma fila serían el defecto
  «mismo rol, dos valores».
- **Rutas en Storage.** La convención del proyecto es `deck-assets/<tool>/<id>/`. IMG_r usa
  `deck-images/images/<id>/` porque hereda el banco. Mover las antiguas rompería URLs publicadas.
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
  - El prompt lleva el cuerpo de estilo y no lleva el bloque `SUJETO` de ninguna variante.
  - La indicación se recorta a 300 caracteres.
  - `getImagePrompt()` devuelve el mismo texto que antes, en las dos variantes y los tres idiomas.
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

**Fase 2** (cuando se implemente):

24. Edita una imagen sin indicación. La vista previa conserva a las personas y el encuadre.
25. «Guardar como copia» crea una fila con `source = 'edited'`, `parent_id`, el nombre «… (editada)» y tres objetos propios.
26. «Sobrescribir» está apagado en una imagen en uso. En una que no se usa, sobrescribe: `prior_original_path`
    está relleno y la `url` cambia. «Volver al original» la deja como estaba.
27. «Descartar» no deja nada en `images/_tmp/`.
28. La sugerencia propone un nombre que pasa `evalText()` y etiquetas que ya existen en el banco.

**No ejecutables sin ayuda**

| # | Check | Por qué |
|---|---|---|
| A | Relleno de miniaturas de las imágenes antiguas | `requiere Carlos`: el script usa la clave `service_role` |
| B | Error de red a mitad de una subida múltiple: las buenas quedan subidas y las fallidas se reintentan | `requiere cortar la red`. No se simula interceptando `fetch`; si no se puede cortar, queda sin verificar |

**No regresión**

- DeckMak_r: elegir imagen desde el popup, guardar, publicar, compartir y exportar a PDF con imágenes antiguas y nuevas.
- FormMak_r: elegir el fondo, guardar, publicar y responder.
- El visor público `/deck/<id>/view` sigue mostrando las imágenes antiguas, que no se han movido.
- El catálogo conserva su orden.

**Limpieza.** Se borran las imágenes «prueba-…», el deck y el formulario de prueba. El informe dice
qué queda y dónde, y se guarda como doc del proyecto Workplace con los fallos separados de las observaciones.

## Pendiente

- **Fase 2 completa**, empezando por revisar precios y elegir proveedor. La señal para ponerse es que
  el banco tenga uso real y se pida retocar fotos.
- **Purga de `images/_tmp/`.** Hace falta si quedan temporales por ediciones abandonadas. La señal es
  que haya objetos en `_tmp/` con más de un día.
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
