# IMG_r · entrega 3 — informe de verificación

> Verificación de la entrega 3 contra `docs/features/img-r.md`: la sección «Entrega 3 — parrilla rediseñada y
> acciones en bloque» (checks 39–52 y G1–G14) y la no regresión. Plan: `docs/features/img-r-entrega-3-plan.md`.

**Cuándo y dónde.** 5 y 6 de octubre de 2026, con la rama `feat/img-r-entrega-3` y los bloques 1 a 4. La
verificación corrió en local, contra la base de datos y el Storage de siempre (`gcvzzpggpsnlwqnotfqv`, bucket
`deck-images`).

- **Servidor:** el `next dev` de :3000, que sirve esta rama.
- **Navegador:** la sesión de Carlos en un Chrome de depuración, controlado con puppeteer.
- **Contraste:** cada check se contrastó contra `images` y `storage.objects`, con SQL o desde la propia página con
  la sesión. No contra la pantalla.
- **Datos de prueba:**
  - **«prueba-e3-uno»:** tres etiquetas, la primera muy larga.
  - **«prueba-e3-dos»:** ya llevaba «luz».
  - **«prueba-e3-tres»:** no encaja con el estilo.
  - **«prueba-imgr-deck»** y **«prueba-imgr-form»**, para tener una imagen en uso en dos documentos.

**Resultado.** Los checks 39 a 52 pasan, G1 a G14 se cumplen y la no regresión está bien. No hay ningún fallo
abierto: lo que se encontró durante los bloques ya se corrigió dentro de ellos. Hay dos cosas sin probar: el
tope de 100 MB del ZIP, que solo cubren los tests, y el CSV de FormMak_r (ver *Observaciones*).

---

## Fallos

Ninguno abierto.

---

## Checks 39–52

| # | Resultado | Contraste |
|---|---|---|
| 39 | Pasa | La tarjeta de «prueba-e3-uno» no enseña el nombre. El botón de abrir lleva el `aria-label` «Abrir prueba-e3-uno». |
| 40 | Pasa | De sus tres etiquetas solo sale la primera, «una-etiqueta-muy-larga-que-no-cabe-en-la». Se corta con `text-overflow: clip` (el texto ocupa más que la caja) y sin «…». |
| 41 | Pasa | «ChatGPT Image 21 sept 2026, 19_00_36» enseña «2» y el aviso «En uso en 2 documentos»; «ChatGPT Image 1 oct 2026, 16_44_55», «1» y «En uso en 1 documento». `image_uses` da 2 y 1. |
| 42 | Pasa | «prueba-e3-tres», con el deck y el formulario de prueba: «2» y, a su derecha, la cruz en Burdeos. Los dos avisos son su descripción accesible. |
| 43 | Pasa | El selector pasa de opacidad 0 a 1 con el ratón encima. Con el teclado, Tab desde la tarjeta llega a «Seleccionar prueba-e3-dos», y Espacio la marca sin abrir ningún modal. |
| 44 | Pasa | Con tres seleccionadas y el filtro «pasillo», solo se ve «prueba-e3-uno» y la barra sigue diciendo «3 seleccionadas». |
| 45 | Pasa | «Añadir etiquetas» con «luz» a las tres; «prueba-e3-dos» ya la tenía. En `images`, las tres la tienen una sola vez, `search_text` la incluye, el resto de etiquetas no cambia y la fila que ya la tenía ni siquiera mueve su `updated_at`. |
| 46 | Pasa, como lo decidió Carlos | Ver abajo. |
| 47 | Pasa | «Eliminar» con dos libres y una en uso. La confirmación dice «Se borrarán 2 imágenes…» y «1 no se puede eliminar porque se usa en documentos…», con «2 doc. · prueba-e3-tres». Aviso: «2 imágenes eliminadas · 1 en uso no se ha tocado». En `images` desaparecen las dos filas, y en `storage.objects` no queda ningún objeto suyo. La de uso conserva fila, etiquetas, `updated_at` y sus tres objetos, y sigue seleccionada. |
| 48 | Pasa | `POST /api/images/bulk-delete` con «prueba-e3-tres» desde la consola: `200` con `deleted: []` y la imagen en `blocked`, con el deck y el formulario. Sus tres objetos siguen. |
| 49 | Pasa | «Descargar» con dos nuevas y una antigua («hub (1)»). Aviso: «Descargando 3 imágenes en un ZIP · 1 solo en versión ligera». El ZIP trae tres ficheros sin recomprimir. Los dos originales tienen el mismo md5 que sus objetos en Storage, y la antigua va en su versión ligera, también con el mismo md5. |
| 50 | Pasa | Con «Seleccionar las 60 visibles», 61 seleccionadas: «Puedes descargar hasta 50 imágenes a la vez.» y ninguna descarga. |
| 51 | Pasa | Con la selección en curso se abre el detalle y la barra queda velada debajo. Escape cierra el detalle y la selección sigue; otro Escape la anula. |
| 52 | Pasa | A 1440 px: márgenes de 32 px, seis columnas y 6 px de hueco. El contorno de la seleccionada sobresale 4 px y queda a 2 px de la vecina. Las galerías de DeckMak_r, FormMak_r y DSMak_r siguen con 4 columnas, 28 px de hueco y 1120 px de ancho. |

**Check 46.** Se lee como «ningún cambio se pierde sin que la persona lo vea», como decidió Carlos en el plan:

- Se abre «Editar nombre y etiquetas» de «prueba-e3-tres» y se cambia el nombre sin guardar.
- Desde otro cliente, `PATCH /api/images/bulk` añade «silla». Es la misma llamada que hace la barra de selección.
- Al guardar sale «Alguien ha cambiado esta imagen desde otra pestaña mientras la editabas. Sus cambios: etiqueta
  añadida: silla.», con «Guardar encima» y «Recargar». La tabla conserva «silla».
- Tras «Recargar», se vuelve a escribir el nombre y se guarda: quedan el nombre nuevo y «silla».
- Al revés (primero se guarda el nombre y después se añade «lampara»), se conservan los dos sin aviso.

La prueba se hizo con una sola pestaña del navegador y la otra pestaña como llamada a la API. Con dos pestañas
de puppeteer, la segunda se cerraba sola en el Chrome de pruebas; es un fallo del arnés, no de la app.

---

## Fidelidad al contrato (G1–G14)

| | Resultado |
|---|---|
| G1 | Pasa (check 39). Los esqueletos de carga tampoco llevan nombre. |
| G2 | Pasa (check 40). «Sin etiquetas» va sobre Warm Light con borde discontinuo. |
| G3 | Pasa. Ninguna tarjeta dice «Solo versión ligera»; el detalle de una antigua no cambia. |
| G4 | Pasa (checks 41 y 42). Plaquitas de 22 px: el número en Dark con cifras tabulares, y la cruz en Warm Light sobre Burdeos. |
| G5 | Pasa, con el cambio del plan. Los avisos abren hacia abajo, alineados a la derecha, con el ratón. Son la descripción accesible del botón de abrir (`aria-describedby`), y con el foco del teclado salen los dos apilados. |
| G6 | Pasa. El selector se ve con el ratón, con el foco, en cuanto hay una seleccionada y siempre en táctil (`hover: none`, comprobado con la emulación táctil de Chrome). |
| G7 | Pasa (check 52). |
| G8 | Pasa (checks 43 y 51). |
| G9 | Pasa, con los cambios del plan. «Eliminar» va en el color de la barra; la barra está a 24 px del borde y debajo del velo de los modales; los avisos flotantes salen por encima de ella. |
| G10 | Pasa (check 45). Si se envía vacío, sale «Añade al menos una etiqueta.». Con una imagen llena: «Etiquetas añadidas a 2 imágenes · 1 ya tenía 10 etiquetas». |
| G11 | Pasa (checks 49 y 50). El tope de 100 MB solo lo comprueban los tests (`bulkCopy.test.ts`): el banco no tiene originales que lleguen. |
| G12 | Pasa (checks 47 y 48). «Eliminar N» en Burdeos pasa a «Eliminando», con los dos botones apagados. Si todas están en uso: «No se puede eliminar». |
| G13 | Pasa (check 44). «Seleccionar las N visibles» añade las cargadas y conserva las que el filtro esconde. |
| G14 | Pasa (check 52). |

---

## No regresión

- **DeckMak_r.** Deck de prueba con «prueba-e3-tres» y una antigua, elegidas desde el popup.
  - Guardado.
  - En el editor, en el visor de «Compartir URL» y en la impresión (`?print=1` llama a `print()`) cargan la
    ligera de la nueva y la antigua.
  - En el popup, la cruz de la que no encaja tiene el aspecto de G4 y está abajo a la derecha, con el nombre
    debajo; la rejilla del popup no cambia.
- **FormMak_r.** Formulario de prueba con «prueba-e3-tres» de fondo.
  - El `md` lleva su ligera.
  - Se guarda y se publica, y la página pública enseña el fondo.
  - El CSV no se probó: ver *Observaciones*.
- **Subida, detalle, estilo y edición con IA.**
  - La subida de tres pide propuesta y veredicto por fila y guarda nombre, etiquetas y estilo.
  - El detalle de «prueba-e3-tres» enseña sus datos, dónde se usa y «No encaja con nuestro estilo».
  - «Editar con IA» con Nano Banana 2 da «Versión 1 · 1856 × 2278 px» en 22 s. «Sobrescribir» está apagado,
    con «No se puede sobrescribir: la usan deck «prueba-imgr-deck» y formulario «prueba-imgr-form». Guárdala
    como copia.».
  - «Descartar» avisa «Edición descartada» y el temporal desaparece de `images/_tmp/`.

---

## Observaciones

1. **El equipo usó el banco durante la verificación.** Entre el principio y el final aparecieron:
   - dos subidas, «Pajaretes» y «Mujer smartphone», ya con etiquetas;
   - un deck, «Gamificación para la adherencia en suscripci…»;
   - una respuesta a otro formulario;
   - un intento más en la cuota de «Editar con IA» de Carlos.

   Por eso el estado final no coincide en números con el inicial, aunque no queda nada de las pruebas. La cuota
   se devolvió a 7, su valor justo antes de mi edición.
2. **El CSV de FormMak_r no se probó.** FormMak_r solo enseña «CSV (N)» con respuestas. Una respuesta de prueba
   no se puede borrar después, porque el MCP de Supabase no deja ejecutar `DELETE`. La entrega 3 no toca
   FormMak_r.
3. **El tope de 100 MB del ZIP solo lo cubren los tests.** Hoy ninguna selección real de 50 imágenes llega a
   100 MB.
4. **«Descartar» manda el borrado del temporal sin esperar.** A los 1,5 s el temporal seguía en la lista; un
   momento después ya no estaba. Es lo esperado, y la purga de 24 horas queda de red.
5. **«Seleccionar las N visibles» cuenta las cargadas** (páginas de 60), no todas las del banco que coinciden con
   el filtro.
6. **La página de IMG_r pesa 6 kB más** (de 200 a 206 kB): `fflate`, la barra y los modales.
7. **Siguen las dos filas de la verificación de la fase 2** que el MCP no deja borrar: la respuesta de prueba y
   el contador `form-submit:::1`. El SQL está en `img-r-fase-2-informe.md`.
8. **Copy nueva para aprobar.** La lista completa está en `img-r.md`, «Entrega 3: implementada».

---

## Limpieza

Borrado:
- las tres imágenes «prueba-e3-…», con todos sus objetos;
- el deck «prueba-imgr-deck»;
- el formulario «prueba-imgr-form», sin respuestas;
- el temporal de la edición descartada.

Restaurado: la cuota de «Editar con IA» de Carlos, en 7.

Estado final:
- ninguna imagen ni deck de prueba, ningún temporal en `images/_tmp/`;
- ninguna fila de `rate_limits` creada por estas pruebas.
