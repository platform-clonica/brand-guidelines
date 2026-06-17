# Galería de imágenes reutilizables para decks

> **Estado (2026-06-17):** implementado en la branch `feature/deck-image-gallery`.
> BD: tabla `public.images` + bucket público `deck-images` (RLS MVP permisiva, igual que
> `decks`/`clients`). Capa de datos en `lib/decks/api.ts` (`uploadImage`, `publicImageUrl`,
> `listImages`, `registerImage`) + API `app/api/images/route.ts`. UI: `ImageGallery`
> (`components/deck/studio/`) abierta desde `ImageSlot` vía `ImageEditContext`. La selección
> se **persiste** escribiendo la URL en el markdown con `setBlockImage()` (`lib/deck/source.ts`).
> Pendiente futuro: generación de imágenes con IA (sección final).

## Contexto

Hoy, al editar un deck, cada imagen es un `ImageSlot` (`components/deck/ImageSlot.tsx`). Al hacer clic se crea al vuelo un `<input type="file">`, se optimiza el archivo en cliente con `optimizeImage()` (`lib/deck/optimizeImage.ts` → downscale a 1600px + JPEG 82%) y el resultado se guarda como **data URL base64 incrustada en el markdown** (`![alt](data:image/jpeg;base64,…)`), que a su vez se persiste entera en la columna `decks.md` de Supabase.

Dos problemas:
- **Sin reutilización:** cada imagen se sube de cero en cada slot. No hay forma de reaprovechar una imagen ya subida en otra slide u otro deck.
- **Markdown pesado:** las data URLs hinchan `decks.md` (cientos de KB por imagen), encarecen cada guardado/traducción y se duplican si la misma imagen aparece dos veces.

**Objetivo:** una **"Galería de Imágenes"** en popup. Al hacer clic en un `ImageSlot`, en vez del diálogo del sistema, se abre la galería: el usuario puede **elegir una imagen ya existente** o **subir una nueva**. Las imágenes se guardan en **Supabase Storage** y el markdown referencia su **URL pública** (no base64). En el futuro, la galería también permitirá **generar imágenes con IA** usando el prompt de imagen de la guía de estilos.

La infraestructura ya está casi lista: Supabase integrado (`lib/supabase/client.ts`), bucket `deck-assets` en uso para logos, y el patrón `uploadLogo()` / `publicLogoUrl()` (`lib/decks/api.ts:76-93`) es directamente reutilizable. El patrón de modal también existe (`components/deck/studio/Modal.tsx` + `LayoutGallery.tsx`).

## Decisiones

- **Alcance: galería global.** Una sola galería compartida (no hay auth todavía; MVP open access). Toda imagen subida aparece para todos. Coincide con el wireframe (rejilla plana).
- **Almacenamiento: mover a Supabase Storage.** `ImageSlot` deja de incrustar base64; sube el archivo a Storage y el markdown guarda la **URL pública**. Markdown ligero, imágenes reutilizables y compartibles.

## Recomendación (resumen)

Reutilizar al máximo lo que ya existe:
1. **Storage:** nuevo bucket público `deck-images` (o prefijo `images/` dentro de `deck-assets`), con funciones `uploadImage()` / `publicImageUrl()` calcadas de `uploadLogo()`.
2. **Listado:** tabla `images` en Supabase como índice de la galería (Storage no da metadatos cómodos para listar/ordenar). API `/api/images` (GET lista, POST registra).
3. **UI:** componente `ImageGallery` montado sobre el `Modal` existente, abierto desde `ImageSlot`.
4. **Optimización:** seguir usando `optimizeImage()` antes de subir (devuelve data URL → convertir a `Blob` para `upload()`), así controlamos peso y formato.

## Cambios

### 1. Storage + capa de datos — `lib/decks/api.ts`

- Añadir `uploadImage(file): Promise<{ path, url }>` espejo de `uploadLogo()` (`lib/decks/api.ts:76-87`): nombre saneado, ruta `images/${Date.now()}-${safe}`, bucket `deck-images`, `contentType` del archivo.
- Añadir `publicImageUrl(path)` espejo de `publicLogoUrl()`.
- Añadir `listImages()` y `registerImage(meta)` que pegan contra `/api/images`.

### 2. Tabla de índice + API — `app/api/images/route.ts` (nuevo) + migración

- Tabla `images`: `id` (uuid), `storage_path` (text), `url` (text), `alt` (text, nullable), `width`/`height` (int, nullable), `source` (`upload` | `generated`, default `upload`), `prompt` (text, nullable — para futuras imágenes IA), `created_at`.
- RLS permisiva (igual que `decks`, comentario "MVP open access" en `lib/supabase/server.ts`).
- `GET /api/images` → lista ordenada por `created_at desc`. `POST /api/images` → registra una fila tras subir a Storage.

### 3. Componente galería — `components/deck/studio/ImageGallery.tsx` (nuevo)

- Sobre `Modal` (`components/deck/studio/Modal.tsx`, ancho ~960px), título "Galería de Imágenes".
- Cabecera con botón **Subir** arriba a la derecha (estilo `btn` de `studio/ui.ts`) que dispara el `<input type="file">` (lógica actual de `ImageSlot.pick`), pasa por `optimizeImage()`, sube vía `uploadImage()`, registra con `registerImage()` y refresca la rejilla.
- **Rejilla scrollable** de miniaturas (`listImages()`), `background-image` con la URL pública. Clic en una miniatura → la selecciona.
- Botón **Aceptar** abajo a la derecha: confirma la selección y cierra (`onSelect(url)`).
- Estados de carga/error reutilizando el patrón de `DeckMetaModal` ("Subiendo…").

### 4. Conectar `ImageSlot` a la galería — `components/deck/ImageSlot.tsx`

- Sustituir `pick()` (abre diálogo de sistema) por abrir `ImageGallery` (estado `galleryOpen`).
- `onSelect(url)` → `setSrc(url)` con la **URL pública** (no data URL). El resto del flujo (escribir en markdown, persistir) no cambia: ahora `![alt](https://…/deck-images/…)`.
- En `viewer` mode sigue siendo imagen plana no editable.

### 5. CSS — `components/deck/deck.css`

- Estilos de la rejilla de miniaturas y estados hover (reutilizar tokens/patrón de `.imgslot`).

## Funcionalidad futura: generación de imágenes con IA

La galería está diseñada para incorporar **generación de imágenes desde el prompt de la guía de estilos**:

- **Prompt base ya existe:** `IMAGE_PROMPT_ES` en `lib/prompts.ts:58-96` (fotografía editorial analógica, "actitud liminal", Kodak Portra, etc.). Es la directiva de imagen corporativa de Interactius, ya expuesta en `/llms.txt` y `/api/brand.json`.
- **UI prevista:** en `ImageGallery`, junto a "Subir", un campo de prompt + botón **Generar**. El usuario describe la escena; se concatena con `IMAGE_PROMPT_ES` para forzar el estilo de marca.
- **Backend previsto:** ruta `/api/images/generate` (nueva) que llama a un modelo de imagen (p. ej. Gemini / un proveedor de image-gen; Claude no genera imágenes), siguiendo el patrón de `/api/translate` (`app/api/translate/route.ts`) para leer la API key del entorno.
- **Persistencia:** la imagen generada se sube al mismo bucket `deck-images` y se registra en la tabla `images` con `source = 'generated'` y el `prompt` usado, de modo que aparece en la galería como una más y queda trazada.
- Esto encaja con la posición del proyecto como "brand manual AI-ready": la galería se convierte en el punto donde la guía de estilos produce activos visuales coherentes con la marca.

## Verificación

1. **Subir + reutilizar:** abrir un deck, clic en una imagen → se abre la galería. Subir una imagen nueva → aparece en la rejilla y queda seleccionable. Elegirla → la slide muestra la imagen. Abrir otra slide (u otro deck), abrir la galería → la misma imagen está disponible para reutilizar.
2. **Markdown ligero:** tras elegir una imagen, comprobar en el editor que el markdown contiene una **URL** `![alt](https://…/deck-images/…)` y **no** un blob base64. Guardar y confirmar que `decks.md` queda pequeño.
3. **Storage:** verificar en Supabase que el archivo está en el bucket `deck-images` y que hay fila en la tabla `images`.
4. **Visor/compartir:** abrir `/deck/:id/view` → las imágenes (ahora URLs públicas) se ven igual; el PDF/print las incluye.
5. `npm run build` y los tests de `lib/deck/__tests__/` siguen verdes.

## Notas de implementación

- Antes de empezar, **crear una rama nueva** (la actual es `feature/deck-export-visor`).
