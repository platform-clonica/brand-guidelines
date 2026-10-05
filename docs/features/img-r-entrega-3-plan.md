# IMG_r · entrega 3 — plan

> Plan corto de la entrega 3: solo lo que `docs/features/img-r.md` no decide o lo que cambio. Donde el
> documento ya lo decide y no cambio nada, no lo repito. Contrato: sección «Entrega 3 — parrilla rediseñada y
> acciones en bloque» (G1–G14, checks 39–52) e `img-r-prototype.html`.

**Estado (5 de octubre de 2026):** plan aprobado con las cuatro decisiones de abajo. Paso 0 hecho (`96c1369
docs(imgr): prompt de la entrega 3 sin Clock_r`); bloque 1 en curso.

**Rama.** `feat/img-r-entrega-3`, desde `main` en `6fe1244`, con las fases 1 y 2 ya fusionadas (#6 y #7).
Sin Clock_r: Clock_r vive en `feat/clockr` y esta rama no toca ninguno de sus ficheros.

**Decisiones de Carlos (5 de octubre de 2026):**

1. **La cruz del popup:** con el aspecto de G4 (placa Burdeos, cruz clara), abajo a la derecha (§ 1).
2. **El ZIP:** como mucho 50 imágenes y 100 MB (§ 6).
3. **Etiquetas:** 10 por imagen como máximo, en todo IMG_r (`TAGS_MAX`, antes 20): subida, «Editar nombre y
   etiquetas» y «Añadir etiquetas» en bloque. Al añadir en bloque, se añaden mientras quepan y se avisa (§ 4).
4. **Check 46:** «ningún cambio se pierde sin que la persona lo vea» (riesgo 2).

## 1 · Tarjeta (G1–G8)

**Una sola pieza, como hoy.** `ImageCard` sigue con sus dos variantes. La de IMG_r (`bank`) se rehace y
recibe `selected`, `selecting` y `onToggle`; la del popup (`pick`) no los usa. No se duplica el componente.

**Estructura de `bank`.** Un envoltorio `position: relative` con tres hermanos, en este orden de Tab:

1. El botón de abrir, con `aria-label` «Abrir <nombre>». Dentro, la miniatura 4:3 y la primera etiqueta.
2. El selector, un `button` con `role="checkbox"`, `aria-checked` y `aria-label` «Seleccionar <nombre>».
3. Las marcas de arriba a la derecha.

No hay ningún botón dentro de otro (G8). Pulsar la imagen abre el detalle también con una selección en curso.

**Contenido.**

- **G1:** sin nombre debajo. El nombre sigue en el `aria-label` y en la búsqueda. Los esqueletos de carga
  pierden su línea de «Cargando».
- **G2:** la primera etiqueta va dentro de la imagen, abajo a la izquierda, con fondo blanco y borde Warm Dark,
  `white-space: nowrap`, `text-overflow: clip` y `max-width: calc(100% - 50px)`, como el prototipo. Sin
  etiquetas, «Sin etiquetas» sobre Warm Light con borde discontinuo.
- **G3:** fuera la insignia «Solo versión ligera». La nota sigue en el detalle.
- **G4:** el número de usos en una plaquita Dark de 22 px con cifras tabulares, y a su derecha, si no encaja,
  la cruz en Warm Light sobre plaquita Burdeos. **Sustituye a F28:** la cruz de abajo a la derecha sale de esta
  variante.
- **G5:** tooltips que abren hacia abajo, alineados a la derecha. «En uso en 1 documento», «En uso en N
  documentos» y «Esta imagen no encaja en nuestras guidelines».
- **G6:** el selector, de 20 px dentro de una zona de 26 px, se ve en cuatro casos:
  - al pasar el ratón por la tarjeta;
  - con foco;
  - con la rejilla en modo selección (una clase en la rejilla en cuanto hay una marcada);
  - siempre con `@media (hover: none)`.
- **G7:** contorno Dark de 2 px a 2 px de la miniatura. Con el hueco de 6 px no llega a la tarjeta de al lado
  (check 52). Dos seleccionadas juntas solapan sus contornos dentro del hueco, no sobre la otra imagen.

**El popup (`pick`) no cambia:** nombre debajo, borde de tinta al elegir y la papelera arriba a la derecha al
pasar el ratón. **Decisión 1:** la cruz de «no encaja» toma el aspecto de G4 (placa Burdeos con cruz clara),
pero se queda abajo a la derecha, porque arriba está la papelera. Mismo rol, misma marca.

## 2 · Rejilla (G14)

Solo en `ImageBank`:

- **Ancho:** fuera el `maxWidth: 1120`. Margen lateral de 16 px, y de 32 px desde 700 px. Va como clase en
  `images.css`, porque un estilo en línea no admite la media query.
- **Columnas:** `minmax(min(100%, 220px), 1fr)`, con 6 px de hueco.
- **Abajo:** 120 px de margen, para que la barra de acciones no tape la última fila.

La cabecera, la fila de filtros y la tarjeta de «Subir imágenes» no cambian. Las galerías de DeckMak_r,
FormMak_r y DSMak_r y la rejilla del popup no montan `ImageBank`, así que no se enteran.

## 3 · Selección (G13)

**Dónde vive.** En `ImageBank`, como un `Map<id, ImageListItem>`, no solo los ids. Las acciones necesitan el
nombre, los usos, si es antigua y las rutas, también de las que el filtro actual esconde. La lógica va en
funciones puras en `lib/images/selection.ts`: marcar, seleccionar las visibles, quitar las que desaparecen y
refrescar las que cambian.

**Qué la mantiene.** Vive fuera de `useImageList`, así que sobrevive a filtros, búsqueda y páginas. No va en
la URL.

**Qué la vacía:**

- «Anular selección».
- Escape sin ningún modal abierto. Hace falta `modalStack.isEmpty()`, que hoy no existe. Con un modal
  abierto, Escape lo cierra a él y la selección sigue (check 51).

**Qué la recorta.** Salen las imágenes que desaparecen del banco: borradas en bloque, borradas desde el
detalle, las que el detalle da por perdidas y las que el servidor diga que ya no existen. Cuando una cambia
(detalle o etiquetas en bloque), se actualiza su copia en la selección.

**«Seleccionar las N visibles».** N son las cargadas en la rejilla con el filtro actual. Con el scroll
infinito, no son todas las del banco que coinciden. Se oculta si ya están todas.

## 4 · Barra y modales (G9–G12)

**Barra.**

- Fija abajo y centrada, fondo Dark, texto Warm Light, Mono 500 a 12 px, separadores en Warm Light al 30 %.
- `role="region"`, con `aria-label` «Acciones sobre la selección».
- Textos: «N seleccionada» o «N seleccionadas», «Añadir etiquetas», «Descargar», «Eliminar», «Seleccionar las
  N visibles» y «Anular selección».
- **«Eliminar» va en el color de la barra**, como dice el documento. El rosa `#E7A9C2` del prototipo no está
  en la paleta.

**Dos cambios sobre el prototipo:**

- **Posición:** 24 px por encima del borde. El prototipo la pone a 52 px para dejar sitio a su barra gris de
  simulación.
- **Capa:** queda por debajo de los modales (`z-index` 80, frente al 90 de su fondo). En el prototipo va
  encima (95), y con el detalle abierto se podría pulsar «Eliminar» por detrás.

**G10 · Añadir etiquetas.**

- Modal con `TagInput`, que sugiere las etiquetas del banco.
- Ayuda «Pulsa Intro o coma para añadir cada etiqueta.» y, si se envía vacío, «Añade al menos una etiqueta.».
- Botones «Cancelar» y «Añadir». Mientras guarda, «Añadiendo» (copy nueva).
- Aviso final «Etiquetas añadidas a N imágenes».
- **Singular, copy nueva:** con una sola imagen, el prototipo dice «las 1 imágenes». Propongo «Se añaden a la
  imagen seleccionada. Las etiquetas que ya tiene no cambian.» y «Etiquetas añadidas a 1 imagen».
- **Decisión 3, el tope baja a 10 etiquetas por imagen** (`TAGS_MAX`, antes 20), en todo IMG_r. En bloque
  se añaden mientras quepan y se avisa: «Etiquetas añadidas a N imágenes · M ya tenían 10 etiquetas» (copy
  nueva). Hoy ninguna imagen tiene etiquetas, así que no afecta a nada existente.

**G11 · Descargar.** Ver § 6.

**G12 · Eliminar.** Los textos son los del prototipo:

- Título «Eliminar imágenes».
- «Se borrará 1 imagen, con su original y su versión ligera.» o «Se borrarán N imágenes, con sus originales y
  sus versiones ligeras.», seguido de «Esta acción no se puede deshacer.», que es lo que ya dice el borrado de
  una sola.
- Si alguna está en uso: «M no se pueden eliminar porque se usan en documentos. Cambia la imagen en ellos y
  vuelve a intentarlo.», con la lista «N doc. · nombre».
- Botón «Eliminar N», con `btnDanger` en Burdeos. Pasa a «Eliminando» y el modal no se cierra mientras borra.
- Aviso final «N imágenes eliminadas · M en uso no se han tocado» («1 imagen eliminada» en singular).
- Si todas están en uso: «No se puede eliminar», la lista y «Entendido».

El modal cuenta los usos que trae la lista, pero manda el servidor: si alguien colocó una entretanto, el aviso
final dice lo que pasó de verdad.

**Las antiguas.** El borrado de una sola quita «con su original y su versión ligera» cuando la imagen es
antigua, porque no tiene original. En bloque aplico la misma regla: si todas las que se borran son antiguas,
el texto acaba en «imágenes.», sin la coletilla. Si hay mezcla, se queda el texto del documento.

## 5 · Endpoints

**Migración `20261005120000_images_bulk_tags.sql`, aditiva.** Solo una función nueva, `add_image_tags(p_ids
uuid[], p_tags text[])`:

- Es `security invoker`, así que la RLS de `images` vale igual que en el `PATCH` de una. Se revoca de `anon`.
- Une en cada fila sus etiquetas con las nuevas que no tenga, en el orden en que llegan, hasta `TAGS_MAX` (10). Devuelve
  las filas.
- La unión se hace con la fila que hay en ese momento, así que no pisa el cambio de otra pestaña.
- `search_text` es una columna generada de nombre y etiquetas: se mantiene sola.
- `updated_at` se mueve con su disparador.

**`PATCH /api/images/bulk`** con `{ ids, addTags }`.

- Sesión, de 1 a 200 uuid sin repetir, y etiquetas normalizadas con `normalizeTags`, como en la subida. Al
  menos una.
- Responde `{ rows, missing, full }`: `missing` son las que ya no existen y `full` las que se quedaron sin
  hueco.

**`POST /api/images/bulk-delete`** con `{ ids }`.

- Lee las filas y sus usos con `imageUses(sb, ids)`, en una sola llamada.
- Borra las libres con `.delete().in('id', libres)`, y después sus objetos con `objectPaths`, incluido
  `prior_original_path`. Comprueba lo que Storage confirma, como el `DELETE` de una.
- Responde `{ deleted, blocked: [{ id, uses }], missing }`.
- **Sin duplicar la regla:** el borrado de fila y ficheros sale del `DELETE` de una a
  `lib/images/remove.ts`, y lo usan los dos.
- La carrera de colocar una imagen entre la comprobación y el borrado es la misma que en el borrado de una,
  y ya se aceptó en la fase 1.

## 6 · Decisiones abiertas de la entrega 3

**ZIP: en el navegador, con `fflate`** (0.8.3, MIT), como recomienda el documento.

- Los originales se bajan uno a uno de su URL pública; de las antiguas, la ligera.
- Van con `Zip` y `ZipPassThrough`, sin volver a comprimir, porque JPEG, PNG y WebP ya lo están. Los trozos
  se juntan en un `Blob`, que se descarga como `imagenes-interactius-AAAA-MM-DD.zip`.
- Cada fichero se nombra con `downloadName()`, igual que la descarga de una. Si se repite un nombre, se le
  añade « (2)».
- **Tope de 50.** Con más, «Descargar» avisa «Puedes descargar hasta 50 imágenes a la vez.» (copy nueva) y
  no descarga.
- **Decisión 2, un tope de 100 MB.** 50 originales de hasta 25 MB serían 1,25 GB en memoria del navegador.
  El peso se suma desde `original_bytes` (la ligera, en las antiguas) antes de empezar; si pasa de 100 MB,
  avisa y no descarga (copy nueva, en el bloque 3).
- **Si falla un fichero:** se reintenta una vez. Si vuelve a fallar, el ZIP sale sin él y el aviso añade
  «· M no se han podido descargar» (copy nueva). Si fallan todos: «No se ha podido preparar el ZIP. Vuelve a
  intentarlo.» (copy nueva).

**Más acciones en bloque: ninguna.** Lo dice el documento.

## 7 · Contrato: lo que no se implementa tal cual

| # | Qué cambia | Por qué |
|---|---|---|
| F28 en el popup | Placa de G4 abajo a la derecha (decisión 1) | Arriba a la derecha está la papelera |
| G5 | Los textos van como `aria-describedby` del botón de abrir, y los tooltips salen también con el foco del teclado | En el prototipo, el `aria-label` va en un `span` sin rol, que los lectores no anuncian, y el tooltip solo sale con el ratón. Es lo que ya hace F29 |
| G9 | 24 px desde abajo, y por debajo de los modales | Lo de 52 px es por la barra de simulación del prototipo; encima de los modales se podría pulsar por detrás |
| G10 | Singular, «Añadiendo» y tope de 10 (decisión 3) | El prototipo dice «las 1 imágenes» y no conoce `TAGS_MAX` |
| G11 | Aviso del tope, tope de peso (decisión 2) y fallos de bajada | El prototipo simula la descarga |
| G12 | «Esta acción no se puede deshacer.» y singular | Del prototipo y del borrado de una |
| G13 | «Visibles» son las cargadas | Scroll infinito |

El resto de G1–G14, según documento.

## 8 · Ficheros y tests

**Nuevos:**
- `supabase/migrations/20261005120000_images_bulk_tags.sql`;
- `app/api/images/bulk/route.ts` y `app/api/images/bulk-delete/route.ts`;
- `lib/images/bulk.ts` (validación, textos con su singular, nombres del ZIP y topes);
- `lib/images/selection.ts`, `lib/images/remove.ts` y `lib/images/zip.ts`;
- `components/images/BulkBar.tsx`, `BulkTagsModal.tsx` y `BulkDeleteModal.tsx`.

**Cambian:**
- `ImageCard.tsx`, `ImageBank.tsx` e `images.css`;
- `app/api/images/[id]/route.ts`, porque el `DELETE` pasa a usar `remove.ts`;
- `lib/hooks/modalStack.ts`, que gana `isEmpty()`;
- `lib/decks/api.ts`, con `bulkAddTags` y `bulkDelete`;
- `package.json`, con `fflate`;
- `docs/features/img-r.md`.

**Tests:**
- `lib/images/__tests__/bulk.test.ts`: ids (de 1 a 200, uuid, sin repetir), etiquetas, textos en singular y
  plural, nombres del ZIP sin repetir y con la ligera en las antiguas, y los dos topes.
- `lib/images/__tests__/selection.test.ts`.
- `lib/hooks/__tests__/modalStack.test.ts`, ampliado con `isEmpty()`.
- El glob de `package.json` ya cubre `lib/images/__tests__` y `lib/hooks/__tests__`.
- La función SQL se comprueba contra la tabla en los checks 45 y 46.

## 9 · Choques con `lib/tokens.ts`, `lib/typeScale.ts` o `CLAUDE.md`

- **Burdeos**, solo como alerta (`uiRole`): la placa de la cruz y el botón de confirmar el borrado. El
  «Eliminar» de la barra no va en Burdeos ni en el rosa del prototipo.
- **Transparencias:** Warm Light al 30 % en los separadores y al 80 % en los enlaces de la barra. Son
  transparencias de un token, no colores nuevos; vienen del prototipo.
- **Tamaños:** Mono de 10 a 12 px, como el resto de la interfaz del workspace (`studio/ui.ts`). Fuera de la
  escala web de 7 peldaños, igual que las otras tools. Ningún valor nuevo.
- **Copy:** sin «!», sin «…» (la etiqueta se corta con `clip`) y sin vocabulario prohibido de ninguna familia.
  La copy nueva va marcada arriba para que la apruebes.
- **G14 se aparta a propósito de las otras galerías.** Ya está en «Divergencias».

## Riesgos

1. **Memoria del ZIP.** Resuelto con el tope de 100 MB (decisión 2).
2. **Check 46.** Añadir etiquetas en bloque mueve `updated_at`. La pestaña que tiene abierto «Editar nombre y
   etiquetas» verá el choque al guardar, con las etiquetas nuevas.
   - «Recargar» las conserva.
   - «Guardar encima» las sustituye por su lista y las pierde.
   - El check se lee como «ningún cambio se pierde sin que la persona lo vea» (decisión 4). Es la regla de
     concurrencia de la fase 1.
3. **La barra en móvil** ocupa dos o tres líneas. Los 120 px de margen abajo lo cubren.
4. **Encontrar una imagen sin ver su nombre** depende de la búsqueda y del detalle. Es lo que pediste en G1.
