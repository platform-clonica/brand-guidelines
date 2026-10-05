# IMG_r · fase 2 — informe de verificación

> Verificación de la fase 2 contra `docs/features/img-r.md` (sección «Fase 2 — IA»: checks 24–38, F1–F30 y
> F2a–F2c) y la no regresión. Plan: `docs/features/img-r-fase-2-plan.md`.

**Cuándo y dónde.** 4 y 5 de octubre de 2026. La rama `feat/img-r-fase-2` corrió en local (`next dev`,
puerto 3005) contra la base de datos y el Storage de siempre (`gcvzzpggpsnlwqnotfqv`, bucket `deck-images`),
con la sesión de Carlos en un Chrome de depuración controlado con puppeteer. Cada check se contrastó contra
`images`, `rate_limits` y `storage.objects`: con SQL entre pasos, o desde la propia página con la sesión
(`peek_rate_limit` de la clave del mes, lista de `images/_tmp/`, filas de `images`). No contra la pantalla.

**Resultado.** Los checks 24 a 38 pasan. Dos fallos encontrados durante la verificación, los dos
corregidos en `9ba786e` y vueltos a comprobar. El check C se verificó con un fallo real de Gemini. Quedan
sin observar F22, F24 y el aviso de fallo de F27, porque necesitan un fallo o un veredicto que no se dio.

---

## Fallos

| Check | Qué se esperaba | Qué pasó | Estado |
|---|---|---|---|
| 25 · Marca del texto | `style_reason` relleno al subir con el veredicto | En «prueba-ventana» (veredicto «no») el motivo quedó a `null`. Causa: el prompt del análisis solo daba la forma canónica de cada palabra prohibida (`forbiddenVocabulary`, p. ej. «end-to-end»), pero `evalText()` audita la familia entera. El modelo escribía «nítida de extremo a extremo», el motivo no pasaba la auditoría ni en el reintento, y se guardaba sin motivo. En una prueba directa, 2 de 4 análisis de la misma foto lo perdían. | Corregido en `9ba786e`. El prompt lleva las 274 formas de las 46 familias (3,8 KB más; unos 6.700 tokens de entrada por análisis). Después: 6 de 6 motivos y nombres pasan `evalText()`, y la fila de subida de «prueba-ventana» enseña su motivo. Test: `el prompt lleva todas las formas del vocabulario prohibido…` |
| 31 · F9 | «Mantén pulsado para ver el original» enseña el original mientras se pulsa, con ratón, táctil y teclado | Con ratón y táctil se soltaba al instante. Al pulsar, el botón pasa a decir «Original» y encoge. El puntero queda fuera, el navegador lanza `pointerleave` y eso soltaba. Solo funcionaba pulsando en los primeros ~90 px del botón. Con teclado fallaba si el ratón estaba encima. En el bloque 3 solo se había probado con teclado y el ratón lejos. | Corregido en `9ba786e`. El botón captura el puntero, y cada gesto suelta solo con su propio final (`lib/images/hold.ts`): el puntero que pulsó, la tecla o perder el foco. Vuelto a probar en el detalle y en el modal con ratón en el centro y a 3/4, Espacio e Intro con el ratón encima, táctil, y táctil con el ratón encima. Tests: `lib/images/__tests__/hold.test.ts`. |

No queda ningún fallo abierto.

---

## Checks 24–38

| # | Resultado | Contraste |
|---|---|---|
| 24 | Pasa | Las dos filas muestran «Proponiendo nombre y etiquetas» latiendo, y a los 9 s la propuesta y el veredicto. Los nombres propuestos pasan `evalText()` (si no, no se proponen). Ninguna etiqueta existía todavía: el banco no tenía ninguna (las 69 antiguas tienen `tags = '{}'`). Con las de esas dos subidas ya en el banco, una tercera foto propuso `arquitectura-interior`, `espacio-de-trabajo` y `vidrio`, que ya existían, más `recepcion`. Esa tercera no se subió. |
| 25 | Pasa tras el arreglo | «Usar propuesta» rellena el nombre y las cinco etiquetas. En `images`: `style_verdict = 'no'`, `style_checks` con las seis claves, `style_analyzed_at` y `people_present = false`; `style_reason` vacío por el fallo de arriba. |
| 26 | Pasa | Fila `prueba-equipo-personas`, etiqueta `prueba-imgr` (no la propuesta), `style_verdict = 'parcial'` con motivo. Tres objetos bajo `images/<id>/`. |
| 27 | Pasa | Cruz de 22 × 22 px en Burdeos (`#99335F`) sobre placa Warm Light, abajo a la derecha de la imagen. Aviso «Esta imagen no encaja en nuestras guidelines» con hover y al llegar con Tab. La «parcial» no lleva marca. En el detalle, banner plegado (`aria-expanded=false`); al pulsarlo, los seis criterios con «Sí» o «No» y la flecha girada 180°. La píldora pasa de 60 tarjetas a 0 y oculta la que no encaja. |
| 28 | Pasa | Antigua `massimo-dutti-hombre-oton-o-invierno-2019-…`: «Esta imagen aún no se ha analizado.», «Analizando la imagen», «Encaja en parte con nuestro estilo». En la fila, `style_verdict`, `style_checks`, `style_reason` y `style_analyzed_at` rellenos. Restaurada después, `updated_at` incluido. |
| 29 | Pasa | Sin personas: «Estándar», «Elegido porque no hay personas en la foto.». Con personas: «Personas», «Elegido porque hay personas en la foto.»; al elegir «Estándar», «Con este prompt, el modelo puede quitar a las personas de la foto.» en Burdeos. Contador «Te quedan 25 de 25» = `peek_rate_limit` (0) = `/api/images/quota`. |
| 30 | Pasa | Versión 1 en 18–21 s, 2528 × 1686 px: mismas personas y mismo encuadre. Contador de 25 a 24 (`peek` 1). Un objeto nuevo en `images/_tmp/`. |
| 31 | Pasa tras el arreglo | Ver *Fallos*. |
| 32 | Pasa | «más cálida, con la luz de la ventana algo más marcada» (53 / 300): «Versión 2 · 2528 × 1686 px» en 16 s, contador a 22, `peek` 3. |
| 33 | Pasa | «Copia guardada» y se abre el detalle de la copia. Fila con `source = 'edited'`, `parent_id`, `prompt` (la indicación), `prompt_variant = 'people'`, `edit_model = 'fast'`, «prueba-equipo-personas (editada)», tres objetos propios y estilo analizado («parcial», con motivo). En `_tmp` no queda ni el temporal guardado ni el de la versión 1 (se descarta al guardar). |
| 34 | Pasa | En uso en el deck de prueba: «Sobrescribir» apagado y «No se puede sobrescribir: la usa deck «prueba-imgr-deck». Guárdala como copia.». `POST …/edit/commit` con `overwrite`, el cuerpo completo y los tres temporales: `409` con `uses: [deck prueba-imgr-deck]`. Storage de la imagen, sin cambios. |
| 35 | Pasa | Sobrescribir: `prior_original_path = …/original.jpg`, `url` nueva (`light-798ea9a5.jpg`), `source = 'edited'`, y sin `light.jpg` ni `thumb.jpg` viejos. «Volver al original»: `original.jpg` es el mismo objeto (mismo eTag), y la ligera y la miniatura nuevas tienen los mismos bytes que las de antes (mismo eTag), con nombre nuevo (`light-7c7ed9a9.jpg`, por la regla de rutas nuevas). `prior_original_path`, `prompt_variant` y `edit_model` vuelven a `null`, y `source` a `upload`. |
| 36 | Pasa | Con la imagen en el deck de prueba, «Volver al original» abre «No se puede volver al original: la usa deck «prueba-imgr-deck». Cambia la imagen en ese documento y vuelve a intentarlo.», con la lista y «Entendido». |
| 37 | Pasa | «Descartar»: «Edición descartada», vuelve al original y `_tmp` queda sin el temporal. Un temporal subido a mano y envejecido 25 h en `storage.objects` desapareció con la siguiente edición. Cerrar con un resultado sin guardar manda el descarte y borra el resultado, la ligera y la miniatura. El intento cuenta (`peek` no baja). |
| 38 | Pasa | Con `count = 25`: «Has llegado a las 25 ediciones de este mes. El contador se reinicia el 1 de noviembre.» en Burdeos y «Aplica el estilo» apagado. `POST …/edit`: `429` con `exhausted: true`; el contador sigue en 25 (suma y devuelve). Devuelto a su valor después. |

---

## Fidelidad al contrato (F1–F30, F2a–F2c)

| | Resultado |
|---|---|
| F1 | Pasa. «Editar con IA» como enlace, junto a las demás acciones. |
| F2 | Pasa. Imagen a la izquierda; a la derecha «Prompt de la guía», «Modelo» (añadido el 3 de octubre), «Indicación, opcional», contador y acciones. Sin texto del estilo ni aviso de privacidad. |
| F2a | Pasa. Segmentos con `seg` y `segOn` de `studio/ui.ts` (Dark y Warm Light al activar, Ash en reposo). Los tres textos, incluido «Esta imagen aún no se ha analizado: revisa el prompt antes de aplicar.» en una antigua. |
| F2b | Pasa. En Burdeos, no bloquea. |
| F2c | Pasa. Segmentos apagados mientras edita. |
| F3 | Pasa. Pista, ayuda y «0 / 300». |
| F4 | Pasa. Coincide con `peek_rate_limit`. |
| F5 | Pasa. Check 38. |
| F6 | Pasa. |
| F7 | Pasa. «Editando. Puede tardar hasta 40 segundos.» latiendo. Escape y Cancelar no cierran; indicación apagada. |
| F8 | Pasa. |
| F9 | Pasa tras el arreglo. |
| F10 | Pasa. «Descartar» en Burdeos, como en el prototipo. |
| F11 | Pasa. «Guardar como copia» relleno, «Sobrescribir» contorno. |
| F12 | Pasa (solo con un deck; no se probó deck y formulario a la vez). |
| F13 | Pasa. |
| F14 | Pasa. |
| F15 | Pasa. «Imagen sobrescrita. El original queda guardado». |
| F16 | Pasa, con un fallo real (check C). |
| F17 | Pasa. |
| F18 | Pasa. «Editada», «Sale de» (abre la de origen en la galería), «Prompt», «Modelo», «Indicación», «Descargar editada» y la nota. Ver observación 3. |
| F19 | Pasa. |
| F20 | Pasa, con el cambio aprobado (bloqueado si está en uso). Confirmación y «Original recuperado». |
| F21 | Pasa. |
| F22 | Sin observar: ningún análisis falló. |
| F23 | Pasa. |
| F24 | Sin observar: ninguno de los diez análisis por la interfaz dio «si». |
| F25 | Pasa. |
| F26 | Pasa. Guion en Ash Dark, sin Burdeos. |
| F27 | Pasa, salvo el aviso de fallo, que no se dio. |
| F28 | Pasa. |
| F29 | Pasa. Para lectores de pantalla va como `aria-describedby` de la tarjeta, no como `aria-label`. |
| F30 | Pasa. |

---

## No regresión

- **DeckMak_r.** Deck de prueba con una imagen nueva del banco (su ligera) y una antigua, elegidas desde
  el popup. Guardado: el `md` de `decks` lleva la URL de la ligera, no la del original. Con «Compartir URL»,
  el visor enseña la nueva en la portada, y la impresión (`?print=1` llama a `print()`) carga las dos.
- **FormMak_r.** Formulario de prueba con fondo elegido desde el popup (la copia editada). El `md` lleva la
  ligera; se publica; la página pública enseña el fondo a 1600 px; la respuesta entra en `responses`.
- **Visor público.** Las imágenes antiguas se ven y no se han movido.
- **Catálogo.** Sin cambios en la fase 2 (`lib/workspace/` no se toca): deckmak_r, formmak_r, rewrit_r,
  dsmak_r e img_r.
- **Subida.** «Subir 2 imágenes», «Subiendo 1 de 2», «Subiendo 2 de 2» y «2 imágenes subidas», como en la
  fase 1.

---

## Checks que no se ejecutan sin ayuda

- **C · Fallo real del proveedor.** Verificado sin simular. Al editar una copia ya editada, Gemini devolvió
  una respuesta sin imagen («blocked», sin motivo) a los 44 s. El modal mostró F16 en Burdeos y la pista
  de Nano Banana Pro. El contador no bajó (`rate_limits` siguió en 6). Si prefieres repetirlo con una clave
  inválida, sigue en tu lista.
- **D · Coste real por edición.** Pendiente: la consola de Google es tuya. En esta verificación hubo 8
  llamadas a Gemini: 7 devolvieron imagen (cinco a 2K y dos a 4K) y 1 bloqueada. También unos 20 análisis
  con Claude.

---

## Observaciones

1. **El banco no tiene etiquetas.** Las 69 imágenes antiguas tienen `tags = '{}'`, así que las primeras
   propuestas inventan todas sus etiquetas. Quien suba primero fija el vocabulario.
2. **Ninguna foto ha dado «si».** En diez análisis por la interfaz salieron cinco «parcial» y cinco «no»,
   incluidas dos fotos ya retocadas con Gemini. Hoy la píldora «Estilo Interactius» deja la galería
   vacía, y su texto de vacío habla de «búsqueda» y «etiquetas», no del estilo. Si los criterios son
   demasiado estrictos, se verá al analizar en lote.
3. **Gemini agranda las fotos pequeñas.** Una foto de 1600 px sale a 2528 px y pasa de 226 KB a 2,6 MB.
   Editar una ya editada cruza los 2048 px y pide 4K: 1304 × 1600 → 1856 × 2278 → 3712 × 4556. Esa fue la
   edición que tardó 44 s y falló, cerca del corte de 60 s de Netlify. La nota de F18 («sale a 2528 px de
   lado como máximo, aunque el original fuera más grande») no encaja cuando el original era más pequeño.
4. **«Volver al original» en una copia sobrescrita** conserva «Sale de», pero borra «Prompt», «Modelo» e
   «Indicación», aunque el original recuperado también salió de una edición.
5. **Un análisis mueve `updated_at`.** Si alguien tiene abierto «Editar nombre y etiquetas» mientras otra
   pestaña analiza, verá el choque de concurrencia con nada que mostrar.
6. **Foco del banner.** Al abrirlo con el teclado, el contorno de foco tapa la primera línea de los
   criterios: el cuerpo no tiene margen arriba.
7. **La subida del popup de DeckMak_r y FormMak_r también analiza.** Es la misma pieza; está documentado,
   pero cada imagen subida desde un deck gasta un análisis.
8. **Copy nueva sin aprobar:**
   - «Guardando»;
   - «No se ha podido guardar la edición. Vuelve a intentarlo.»;
   - «No se ha podido recuperar el original. Vuelve a intentarlo.»;
   - «Prueba con Nano Banana Pro: a veces edita fotos que este rechaza.»;
   - el texto de «Volver al original» bloqueado.
9. **«Original previo»** dice «Guardado», sin medidas (decidido en el bloque 3).
10. **Fotos de menores en el EEE:** sin confirmar para estos modelos. Gemini en Tier 1 tiene topes de gasto
    por proyecto; conviene mirarlos con el check D.
11. **Previo a esta fase.** Estas cuatro no son de la fase 2 y no las he tocado:
    - En FormMak_r, «Publicar» mezcla `border` y `borderColor` y React avisa en la consola (`FormToolbar.tsx`, PR #4).
    - El modal de borrar formulario dice «Sus 1 respuesta se conserva».
    - Los deploy previews de Netlify y el job `verify` de GitHub fallan en cada PR porque faltan los secretos `NEXT_PUBLIC_SUPABASE_*`.
    - La cabecera de DsGallery en producción enseña una fila con LogoutButton.

---

## Limpieza

Borrado:
- las tres imágenes de prueba (y sus 9 objetos, incluida la copia);
- el deck `prueba-imgr-deck`;
- el formulario `prueba-imgr-form`;
- el temporal huérfano de una tanda que corrió con el servidor caído.

Restaurado:
- la imagen antigua analizada en el check 28, con columnas de estilo a `null` y su `updated_at` original;
- mi cuota del mes, `count = 0`.

Estado final, igual que al empezar:
- `images` tiene 69 filas, ninguna analizada ni tocada;
- `storage.objects` tiene 83 objetos y ninguno en `_tmp`;
- hay 19 decks y 3 formularios.

**Queda, porque el MCP de Supabase no deja ejecutar `DELETE`:**

```sql
-- La respuesta del formulario de prueba (borrar el formulario conserva sus respuestas).
delete from responses where id = '247f0639-1f58-4056-b517-fce633b45696';
-- El contador de envíos de formulario desde localhost que crearon esas pruebas.
delete from rate_limits where key = 'form-submit:::1';
```
