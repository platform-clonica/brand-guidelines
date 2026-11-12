# Social Maker

Editor de imágenes para redes. Markdown a la izquierda, tarjetas a la derecha, descarga en PNG.

- **Ruta:** `/workspace/socialmak_r` (detrás de login, como el resto del workspace).
- **Cromo:** el del workspace, no uno propio. Ver «La barra es la de la casa» más abajo.
- **Catálogo:** la herramienta ya estaba declarada en `lib/workspace/catalog.ts` como
  «Próximamente»; ahora apunta a su ruta.

---

## Qué comparte con el Deck Maker y qué no

Comparte el **motor de markdown**, y es deliberado: quien sabe escribir un deck sabe escribir un
carrusel sin aprender nada nuevo.

| Se importa tal cual | De dónde |
|---|---|
| Troceado y tokenizado del markdown | `lib/deck/parse.ts` |
| Modelo canónico de un bloque | `lib/deck/model.ts` (`parseBlock`, `BlockModel`) |
| Negrita y saltos dentro de línea | `components/deck/inline.tsx` |
| Viudas y compuestos en titulares | `lib/deck/typeset.ts` |
| Texto líquido que nunca desborda | `components/deck/FitText.tsx` |
| Cromo del editor (botones, segmentos) | `components/deck/studio/ui.ts` |

**No comparte los layouts ni el CSS.** El deck está en producción y sus URL circulan entre
clientes: un cambio pensado para redes no puede llegar hasta él por accidente.

---

## El lienzo

Dos formatos, **ambos de 1080 px de ancho**. Eso no es un detalle de implementación: es lo que
permite que haya **una sola escala tipográfica**. Una tarjeta de carrusel y un post horizontal se
ven con el mismo ancho en el feed, así que el texto tiene que medir lo mismo en los dos.

| Lienzo | Exportado | Ratio |
|---|---|---|
| Carrusel | 1080×1350 | 4:5 |
| Post horizontal | 1080×608 | 16:9 |

**Se exporta al tamaño exacto del lienzo.** Es la medida nativa de LinkedIn e Instagram y la de
cinco de los seis carruseles de referencia.

Estuvo a ×2 (2160×2700) porque el carrusel más reciente mide eso. Decisión de Martina del
10/11/2026: a ×1. El cambio no pierde nitidez por sí solo, el texto se rasteriza exactamente a la
resolución del lienzo sin reescalar nada; a ×2 el resultado es algo más fino en pantallas densas a
cambio de que la red social lo redimensione y lo vuelva a comprimir al subirlo.

El factor vive en una constante (`EXPORT_SCALE`), así que la descarga suelta, el `.zip` y la
etiqueta del editor dicen siempre lo mismo.

El post es 1,776 en lugar del 1,778 exacto. La desviación es del 0,08 %, invisible, y a cambio el
alto es par y la exportación no deja medio píxel suelto.

**Margen 56 px por los cuatro lados.** Medido sobre los PNG de los seis carruseles publicados y
constante en los seis. 56/1080 = 5,2 % del ancho.

---

## La escala tipográfica

Vive en `lib/social/typeScale.ts` y se espeja en `components/social/social.css` como `--s-*`.

**La regla: los titulares serif se quedan en la escala tal cual; el resto corre a ×2,25.**

No es un gusto. Se midió el ancho de tinta de cadenas concretas sobre los PNG publicados y se
buscó qué tamaño las reproduce con la fuente real en el navegador:

| Cadena del diseño | Rol | px derivado |
|---|---|---|
| «La abundancia de» | titular | 96 |
| «No definir el problema real» | elemento de lista | 57 |
| «Por Martina Gentile» | firma del autor | 49 |
| «/Miradas/» | slug | 38 |
| «En un entorno saturado de…» | cuerpo mono | 40 |

El titular cae exactamente en el peldaño `display` de la escala, así que ahí no hay nada que
tocar. El resto pide subir, y 2,25 es el factor que lleva el cuerpo mono de 18 a 40,5. Redondeado
da **40 / 36 / 22**.

La primera versión usaba ×2 y se quedaba corta: el imagotipo salía a 26 px cuando mide 41 en los
diseños, y el pie entero iba descompensado. **El error fue estimar en lugar de medir.**

> **Pendiente de Alberto.** Esto *extiende* la norma, no la contradice: familias, pesos y la
> prohibición de la cursiva se respetan enteras. Pero un multiplicador de lienzo es una decisión
> de sistema y le toca a él confirmarla o cambiarla.

### El imagotipo tiene una sola medida

**48 px de alto**, que con la proporción del SVG (3131×404) dan 372 de ancho. Un logo que cambia
de tamaño según la tarjeta deja de ser un logo.

Los diseños de referencia lo tienen a **41** (317×41, idéntico en los dos carruseles de Miradas,
al píxel; verificado exportando una tarjeta y midiendo la tinta igual que en el original). Sube a
48 junto con el peldaño `title-sm`, **por decisión de Martina**: en el feed los veía pequeños.

Importante: **sube el peldaño entero, no solo el slug.** Si la esquina creciera sola acabaría
gritando más que el contenido, que es justo lo que no debe hacer la papelería. El imagotipo y el
slug guardan la proporción 0,85 que tienen en los diseños, así que si uno sube, sube el otro.

El pie (`--foot-h`) mide lo que mide el imagotipo, y el slug comparte fila.

---

## Los nueve layouts

Salen de lo que los seis carruseles publicados repiten de verdad. Ninguno está inventado «por si
acaso»: un layout que nadie usa es una papeleta para que alguien lo use mal.

| Marcador | Qué es |
|---|---|
| `portada` | Foto a sangre, titular serif abajo, subtítulo mono |
| `titular` | Un titular serif y nada más |
| `texto` | Titular opcional + cuerpo en mono |
| `lista` | Titular + elementos numerados con filete |
| `cita` | Cita entre comillas, firma pequeña debajo. El pensado para el post horizontal |
| `imagen` | Imagen a sangre con texto encima, arriba o abajo, o sin texto |
| `parrafo` | Cuerpo de texto en serif, sin titular. El de los carruseles de Insights |
| `cierre` | Llamada a leer, firma y retrato en la esquina |

El titular del cierre va al peldaño **`super` (192)** y no al `display` del resto: es el único
texto de la tarjeta, medido 182 en la pieza publicada, y 192 es el peldaño que la escala ya tiene
declarado para «una palabra o un titular muy corto». Es también el único titular **sin ligado de
viuda**: a ese tamaño, atar la última palabra corta a la anterior crea una tirada que no cabe en
la caja y deja una palabra suelta en la línea de antes, que es justo el defecto que la regla
quería evitar.

Las plantillas de arranque son cuatro: **Miradas**, **Insights**, **Evento** y **Libre**. Las dos
primeras llevan la papelería al pie; evento, en cabecera.

Hubo una quinta, **workshop**, que se retiró el 12/11/2026: era la de evento con otro slug, y dos
plantillas que solo se diferencian en una palabra no son dos plantillas. El slug es texto libre,
así que un carrusel de workshop se escribe poniendo `/Knowledge/`.

También se retiró el layout **`agenda`** (filas de «qué | cuándo»), porque no se usa. `[ly: agenda]`
sigue aceptándose como alias de `lista` para que un bloque ya escrito no se quede sin pintar.

### Miradas e Insights no son lo mismo

| | Miradas | Insights |
|---|---|---|
| Qué es | Presenta un artículo del blog | Un concepto que merece contarse, **sin artículo detrás** |
| Slug | `/Miradas/` | `/Insights/` |
| Cómo cierra | Tarjeta de **cierre**: «Artículo completo en nuestro blog», con firma y retrato | **Sin cierre.** Remata con la pregunta que deja abierta |

Que un Insight no lleve cierre no es un descuido: **no tiene adónde mandar.** Poner la llamada a
leer sería prometer un artículo que no existe.

Su ritmo alterna razonamiento y dato: párrafo serif sobre oscuro para pensar en voz alta, titular
más cuerpo mono sobre claro para asentar lo concreto.

> **Una desviación observada en los diseños de Insights.** Las tarjetas oscuras de referencia usan
> **negro puro `#000000`**, no el oscuro de marca `#1C1A17`. Es plano y exacto, no un artefacto de
> compresión. La plantilla usa el token de marca.

### Cada plantilla trae su ritmo de fondos

En un feed, tres carruseles seguidos con los mismos layouts se leen como el mismo carrusel. La
variedad no hace falta buscarla en diseños nuevos (un layout que se usa una vez es un layout que
el siguiente usará mal) sino en el **orden de los fondos**, que no cuesta nada y cambia el
carácter de la pieza entera.

| Plantilla | Ritmo | Qué dice |
|---|---|---|
| Miradas | Oscuro · claros encadenados · un oscuro que corta · cierre | El claro domina y el oscuro puntúa: es una pieza para leer |
| Evento | Plano · foto · plano · foto | Lo que se cuenta pasó en un sitio, y el sitio se ve |

El ritmo vive en el markdown de la plantilla, **no en código**: quien parte de ella lo hereda y
puede romperlo a mano en cualquier tarjeta. Un ritmo que no se pudiera romper sería una cárcel, no
un punto de partida.

**El cierre no lleva pie.** El retrato ocupa la esquina donde iría el slug, y así es en las dos
piezas publicadas que lo llevan: su pie es la firma a la izquierda y el retrato a la derecha. La
firma va en **serif**, que es el papel que el sistema reserva a la tipografía de contraste.

El retrato es un **cuadrado de 330 al margen de página**, no pegado al borde: respetar el mismo
margen que todo lo demás es lo que lo integra en la retícula en vez de dejarlo colgando. Sin
retrato no se pinta nada; se probó a poner el isotipo y a este tamaño era un bloque de 330 px
dominando la tarjeta.

Añadir uno es una entrada en `lib/social/catalog.ts` más su componente y su regla CSS.

### Un bloque vacío no es una tarjeta

Pasa al borrar una del medio y dejarse el separador. Lo que salía era una tarjeta en blanco que se
exportaba igual que las demás: **un PNG vacío dentro del carrusel**. Ahora el compilador la salta,
y `provenance` apunta al bloque real para que clicar una tarjeta siga llevando el cursor a su
sitio.

### Un titular nunca va debajo del texto pequeño ni pegado al pie

Regla de Martina del 12/11/2026, y tiene consecuencias de sistema, no de plantilla.

**Se retiró el layout `rotulo`** (cuerpo mono arriba, titular serif grande abajo). Esa colocación
era su única razón de ser, así que sin ella no quedaba layout. Venía del carrusel de workshop de
referencia, y es uno de esos casos en que el diseño trae un error: manda el manual. `[ly: rotulo]`
sigue aceptándose como alias de `texto` para que un bloque ya escrito no se quede sin pintar.

**Y el aire sobre el pie pasó de 24 px al margen de página (56).** Nada debe acercarse al pie más
de lo que se acerca al borde. Vive en `--foot-aire`.

### La papelería va en dos sitios, y eso es lo que da variedad

Las dos existen en los carruseles publicados:

| Colocación | Cómo | Quién la usa |
|---|---|---|
| **Al pie** | Imagotipo horizontal abajo a la izquierda, slug enfrente | Los dos de Miradas |
| **En cabecera** | Imagotipo girado arriba a la izquierda, slug o logo de cliente enfrente | Evento, workshop y Barcelona Design Week |

Se elige con `> marca: arriba` en la portada. No es un capricho de maquetación: es lo que
distingue una serie de otra de un vistazo en el feed, antes de leer nada.

**El texto y la marca ocupan extremos opuestos, siempre.** Con la papelería al pie el titular va
arriba; con la papelería en cabecera, abajo. Es lo que hace que las dos portadas se lean distintas
usando exactamente las mismas piezas, y es lo que hacen los diseños: los dos carruseles de Miradas
arrancan con el titular pegado al margen superior.

**El velo sigue al titular.** Cada velo lleva la banda fuerte donde cae el texto y una de apoyo en
el extremo contrario, donde va la papelería. Esa segunda banda no es opcional: el imagotipo y el
slug van en blanco, así que sobre una foto con una zona clara justo ahí desaparecen, y eso no se
descubre hasta que la pieza está publicada.

El imagotipo girado **mide lo mismo que el horizontal**, 318×41, porque es el mismo lockup rotado.
Medido al píxel en las dos portadas que lo usan: ocupa de (56,56) a (96,372).

**El imagotipo NO va en todas las tarjetas.** En los seis carruseles publicados aparece solo en la
portada; las interiores llevan únicamente el slug. Ponerlo en las nueve repetiría la firma nueve
veces y convertiría una marca en un sello de agua.

### El logo del cliente ocupa el hueco contrario

`> logo: ruta`, y se hereda a toda la pieza igual que el slug: una pieza hecha con alguien lo es de
principio a fin, y obligar a repetirlo tarjeta a tarjeta sería pedir que alguien se deje una.

- En la **portada** va arriba a la derecha, donde iría el slug.
- En las **interiores** va abajo a la izquierda, donde iría el imagotipo.

Así nunca compiten por el mismo sitio.

Va en **caja fija de 300×56 y contenido dentro**. Los logos ajenos vienen con proporciones
imprevisibles (el de la Barcelona Design Week lleva dos líneas y mide 250×55) y fijar solo el alto
dejaría uno apaisado invadiendo el slug.

### Se sube como en el Deck Maker, y no va a la galería

Botón **Logo de cliente** → selector de archivo → `uploadLogo(file, 'social')`, que lo deja en el
bucket de assets (`deck-assets`), igual que hace DeckMak_r con su propio prefijo. **No entra en el
banco de imágenes**: un logo de cliente no es una foto del universo visual y no tiene por qué
aparecer en la galería que usa todo el equipo.

### El color lo pone la tarjeta, no el archivo

Se pinta como **máscara CSS**, no como imagen: del archivo solo se usa su silueta y el color sale
de `--ink`, la tinta de la tarjeta. Warm Light sobre oscuro y sobre foto, Dark sobre claro. Un logo
que llegue en tres colores, en positivo o en negativo, sale siempre igual y siempre legible.

El Deck Maker resuelve lo mismo con `filter: brightness(0) invert(1)`, que lo deja en blanco puro.
Allí basta porque su logo de cliente solo aparece en la portada, que siempre es oscura. **Aquí
aparece también al pie de tarjetas claras**, donde el blanco desaparecería, y además el blanco puro
no es un token: el claro de marca es Warm Light.

Dos cosas verificadas antes de elegir esta vía: que **no es inyectar SVG** (el archivo se carga como
recurso de imagen desde CSS y solo se lee su canal alfa, así que no ejecuta nada, misma seguridad
que el `<img>` del deck) y que **la máscara sobrevive a la exportación a PNG**.

### El slug es texto libre

`/Miradas/`, `/Eventos/`, `/Knowledge/`, `/Summer Fest/`. Se declara con `> slug: /Miradas/` y la
primera tarjeta que lo declare lo fija para todas; cualquiera puede pisarlo con el suyo.

Una pieza sin slug no pinta ninguno: es una firma, y firmar por defecto con algo que nadie eligió
sería peor que no firmar.

---

## Fondos

Los cuatro neutros de marca más **Opal**, que es el único acento admitido como relleno de fondo.

Entra por dos motivos que se sostienen a la vez: lo usa un carrusel ya publicado, y el sistema
permite los acentos **como relleno** siempre que la tinta de encima dé contraste (Opal con texto
oscuro lo da; como color de letra no lo daría).

**Burdeos y Esmeralda no están.** Burdeos es el color de alerta de la interfaz y Esmeralda
identifica un servicio: pintar una tarjeta entera de ese color diría algo que el contenido casi
nunca quiere decir.

```
{warm-light}  {warm-dark}  {white}  {opal}  {dark}
```

### La cita

Las comillas **las pone el sistema**, no quien escribe: salen siempre las mismas y salen siempre
las angulares («»), que son las del castellano y las que aparecen en los carruseles publicados. Si
alguien las teclea igualmente, se le quitan antes para no doblarlas.

La firma va debajo, pequeña, y sale de `> autor: Nombre Apellido`. **Esa línea va escrita en el
bloque**, no oculta: se edita como cualquier otro texto. Mantiene el slug como cualquier otra
tarjeta, y admite fondo de color o foto.

Quién firma la cita, de lo más explícito a lo más implícito:

1. Un `> autor:` en esa tarjeta.
2. Una línea en MAYÚSCULAS en esa tarjeta.
3. **El autor de la pieza**, declarado en cualquier otra tarjeta (normalmente la de cierre).

Lo tercero es lo que evita repetirlo: un carrusel de Miradas lo firma alguien, y lo normal es que
la cita sea suya. Si se cita a otra persona, se escribe en la tarjeta y gana.

Por eso el compilador hace **dos pasadas**: el autor suele declararse en la tarjeta de cierre, que
es la última, así que no basta con llevar el dato hacia delante.

### Bajar la exposición de la foto

`> exposicion: 35`, de 0 a 100, o el deslizador del editor. 100 es la foto tal cual con el velo
normal del layout; por debajo se va oscureciendo para que el texto destaque.

**Solo baja, nunca sube.** El velo del layout es lo que garantiza que el texto se lea encima de
cualquier foto, así que poder subirlo por encima de ahí sería poder publicar una tarjeta
ilegible. Bajar no tiene ese riesgo: cuanto más oscuro, más se lee.

Se pinta como una capa aparte, encima del velo y no en su lugar. Así se suma a cualquiera de los
tres velos sin recalcular sus degradados, y la garantía de contraste del velo base queda intacta
pase lo que pase con este control.

### Aplicar el estilo Interactius a una foto

Botón **Estilo Interactius** en el panel de foto. Aplica la directiva de imagen de la marca con IA
y, al guardar, escribe la URL resultante en el markdown.

**La directiva NO se duplica aquí.** Vive en `lib/prompts.ts` (`getImagePrompt`), la aplica IMG_r
con Gemini desde hace semanas, su salida está congelada en `lib/__tests__/prompts.test.ts` y el
equipo y un cliente la usan a diario. Una segunda copia sería una norma de marca con dos versiones
destinadas a separarse. Este botón solo abre el modal que ya existe (`AiEditModal`) sin salir del
editor.

**El puente es la URL.** En el markdown una foto es una URL y «Editar con IA» necesita la fila del
banco, así que `GET /api/images` acepta ahora un filtro `url` de coincidencia exacta.

Dos consecuencias que conviene saber:

- **Solo funciona con fotos del banco.** Las de `/universo` son archivos estáticos del repositorio,
  no filas del banco: hay que subirlas desde la galería primero. El editor lo dice cuando pasa.
- **Gasta la cuota de IMG_r**, que son 25 ediciones por persona y mes. Es la misma bolsa, no una
  aparte.

### Cualquier tarjeta puede llevar foto de fondo

Una imagen en un layout que no la consume (titular, texto, lista, cita, rótulo, agenda) se entiende
como **foto de fondo** y sustituye al relleno plano. Es ortogonal al layout, igual que el color: el
componente no se entera.

Arrastra el tema a oscuro, y no es negociable: encima va tinta clara sobre el velo, y dejar que
alguien eligiera tinta oscura sería dejarle publicar una tarjeta ilegible.

**El velo es uniforme y vale 0,60.** Uniforme porque aquí el texto puede caer en cualquier parte de
la tarjeta, y un degradado protegería una zona dejando las otras al azar de la foto. Y 0,60 no es
un número a ojo: es el mínimo que garantiza **4,5:1** de contraste para `#F5F2ED` sobre el peor
fondo posible, una foto blanca (con 0,60 el blanco queda en 102 y da 5,14; con 0,55 se queda en
4,25 y no llega). Si aguanta contra una foto blanca, aguanta con cualquiera.

Es oscuro a propósito: una tarjeta de texto sobre foto usa la foto como **textura**, no como tema.
Para que la foto sea la protagonista está el layout `foto`.

Desde el editor hay **dos sitios**, y los dos hacen falta:

- La pestaña **Foto** bajo el editor, con *Añadir* / *Cambiar* / *Quitar*, el estilo con IA y la
  exposición. Actúa sobre la tarjeta seleccionada.
- Un rótulo al **pasar por encima** de la propia tarjeta.

La pestaña existe porque el rótulo por hover no se encontraba: quien edita mira a la columna
izquierda, que es donde están las demás acciones. Una función que no se ve es una función que no
existe.

**El primer clic sobre una tarjeta selecciona; el segundo actúa.** Si el clic sobre la foto abriera
la galería a la primera, una tarjeta con foto no se podría ni seleccionar para bajarle la
exposición: el modal saltaría siempre.

*Quitar* solo vale para la foto de fondo. En los layouts que la llevan por diseño (portada, foto,
cierre) el botón sale apagado y lo explica: una portada sin foto no es una portada.

---

## Cambiar la foto y el fondo sin escribir

Las dos cosas **editan el markdown**, no un estado aparte. El texto de la izquierda sigue siendo la
fuente de verdad y no puede desincronizarse de lo que se ve.

- **Clic sobre una foto** y se abre la galería de imágenes. Es la misma de DeckMak_r y FormMak_r
  (`components/deck/studio/ImageGallery`), o sea el banco que gestiona IMG_r. Al pasar por encima
  de una tarjeta con foto aparece un rótulo «Cambiar foto», porque el clic funciona pero nadie lo
  adivina.
- **La tarjeta de cierre tiene dos imágenes**, el fondo y el retrato, y cada una se cambia por su
  lado. El botón de retrato solo sale cuando ya hay foto de fondo: sin ella, cambiaría el fondo
  creyendo cambiar el retrato.
- **La paleta de fondos** está bajo la galería de layouts, con muestra y nombre de marca, para no
  tener que acordarse de si el beige se llama `warm-dark` o `arena`. La muestra lleva una «Aa»
  encima: un fondo no se elige en abstracto, se elige para que un texto se lea sobre él.
- En una tarjeta con foto a sangre **la paleta se apaga** y lo explica: ahí el fondo es la imagen.

Dos detalles de implementación que conviene no deshacer:

- `.box` lleva `pointer-events:none`. La caja de texto cubre el centro de la tarjeta, así que sin
  eso un clic en mitad de una portada caía sobre el texto y nunca sobre la foto. Dentro no hay nada
  interactivo y a la exportación le da igual.
- `setBlockBackground` escribe **siempre en la línea `[ly:]`** y de paso borra el sufijo `{…}` del
  titular si lo había. La línea `[ly:]` gana en el compilador: dejar la otra sería dejar una
  mentira en el texto.

---

## La exportación

**Se exporta desde el DOM, a propósito.** No se vuelve a dibujar la tarjeta en el servidor.

El motivo está en el `CLAUDE.md` del repo: la portada del deck ya tuvo que redibujarse a mano para
la imagen de previsualización, porque satori no sabe ejecutar nuestro React ni nuestro CSS. Eso
creó una **segunda fuente del diseño** que hay que mantener en paralelo y que deriva en cuanto
alguien toca una y no la otra. Repetir esa jugada con nueve layouts serían nueve derivas.

Exportando el nodo que ya está pintado, el PNG y la vista previa no pueden diferir: son el mismo
árbol.

- Librería: `html-to-image` (MIT, cero dependencias propias).
- El `.zip` lo hace `fflate`, que ya estaba en el proyecto. Va en zip y no en descargas sueltas
  porque los navegadores bloquean las descargas múltiples seguidas, y porque dentro van numeradas,
  que es lo que fija el orden al subirlas.
- Medido: entre 70 y 380 ms por imagen.

---

## La firma de la tarjeta de cierre

`> autor: Diana Yuste` y el retrato aparece solo. Ni subirlo, ni buscarlo, ni acordarse de cómo se
llama el archivo.

- **Tolerante al acento.** «Maria Najarro» y «María Najarro» son la misma persona. Nadie se queda
  sin foto por una tilde.
- **El nombre de pila basta si no se repite.** «Diana» funciona; «Elena» no, porque hay dos, y una
  foto equivocada es peor que ninguna foto.
- **Una segunda imagen en el bloque gana a la automática**, para firmar con alguien de fuera.
- **Quien no está en el equipo firma con el isotipo**, no con una inicial. Es lo que ya hace la web.
  Y el editor lo avisa, para que una errata no llegue a publicarse disfrazada de decisión.

### El equipo vive en otro repositorio

La fuente de verdad es `interactius-web`: `lib/data/team.ts` y
`public/identidad/fotos-team/team.md`. Aquí hacen falta las fotos porque el PNG se genera desde el
DOM y **una imagen de otro dominio contamina el lienzo**: la exportación se caería.

Copiar datos entre repositorios deriva, así que no es un copia y pega sino un script:

```
node scripts/sync-equipo.mjs
```

Copia las fotos y regenera `lib/social/equipo.ts`, que está marcado como generado. Cuando alguien
entre o salga del equipo, se vuelve a correr.

## Manda el manual, no el PNG

Los layouts salen de medir carruseles ya publicados, pero **esos diseños pueden traer errores**.
Instrucción de Martina del 12/11/2026: cuando un diseño y las guidelines no coinciden, **gana
`lib/tokens.ts`**. El PNG es evidencia sobre la estructura, no autoridad sobre los valores.

Ya ha pasado dos veces:

- Las tarjetas oscuras de Insights usan negro puro; la plantilla usa el token Dark.
- Los velos de foto usaban un negro inventado (`#0A0908`) que puse yo. Ahora usan `rgba(28,26,23)`,
  que es el Dark de marca y lo que ya hacía el deck.

Y eso tuvo consecuencia medible: el velo uniforme estaba en **0,60** calculado contra el negro
inventado. Con el oscuro de marca, que es más claro, el mismo alfa se quedaba en 4,06 de
contraste. **Subió a 0,64**, que es el mínimo que garantiza 4,5:1. Buen ejemplo de por qué el
color no se elige a ojo: cambiarlo movió la garantía sin que se notara en pantalla.

**Esto no depende de que nadie se acuerde.** `lib/__tests__/socialBrand.test.ts` lee `social.css`
y lo contrasta con `lib/tokens.ts`: todo color de la paleta, la serif solo en 300/400, la mono solo
en 400/500/600 y cero cursiva. Verificado que falla cuando se incumple, no solo que pasa cuando
todo está bien.

## La barra es la de la casa

La herramienta vive en `brand.interactius.com/workspace` junto al Deck Maker, el Form Maker y los
demás, y quien salta de una a otra tiene que reconocer dónde está sin pensarlo. Así que la barra
no es propia: es la misma anatomía que `DeckToolbar`, `FormToolbar` y `DsToolbar`.

**Imagotipo** (vuelve al workspace) · separador · **marca de la herramienta** · separador ·
**nombre de la pieza** · acciones · **menú de usuario**.

Los valores salen de ahí también: fondo Warm Light, filete Warm Dark, `padding: 10px 16px`. Antes
iba sobre blanco y con un «SOCIAL MAKER» escrito a mano en mayúsculas, que no era de la familia.

**Los botones son los de `components/deck/studio/ui.ts`, y hay que usar el correcto.** Las acciones
secundarias van con `toolbarBtn` (fondo blanco, filete Warm Dark), la principal con `btn` (relleno
oscuro) y los grupos de opción con `seg` / `segOn`. Estuvieron un tiempo con `btnGhost`, que lleva
filete OSCURO y fondo transparente: ese es el botón de los modales, no el de una barra, y cantaba
al lado del Deck Maker. Las pestañas de los paneles y las muestras de la paleta también parten de
ahí en vez de tener estilo propio.

El wordmark **SocialMak_r** se añade a `components/studio/Wordmark.tsx`, donde ya estaban los de
las otras cuatro herramientas. Ese componente ya contemplaba este caso: su comentario explica que
el `viewBox` se calcula en vez de fijarse precisamente porque «SocialMak_r» tiene 11 caracteres y
un ancho fijo lo recortaría por la derecha.

La página pasa a leer la sesión para que la barra lleve el menú de usuario, igual que las demás.
Eso la convierte en dinámica (`ƒ` en el build), que es lo que ya son `deckmak_r` y el resto.

## El vocabulario de la interfaz

**Slide**, no «tarjeta». **Imagen**, no «foto**». Decisión de Martina del 12/11/2026, y vale para
todos los rótulos: las pestañas son **Añadir slide**, **Modificar imagen** y **Cambiar fondo**.

El layout `foto` pasó a llamarse `imagen`, marcador incluido. `[ly: foto]` sigue aceptándose como
alias para que un bloque ya escrito no se quede sin pintar.

**Un botón apagado dice por qué.** El de *Quitar imagen* explica debajo si no hay slide elegida, si
la slide no tiene imagen de fondo, o si su layout la lleva por diseño. El motivo va en texto
visible y no en un `title`: un tooltip solo lo encuentra quien ya sospecha que hay algo que
encontrar.

## La columna de edición

Los tres paneles (**Añadir tarjeta**, **Foto**, **Fondo**) van en una fila de pestañas y
**cerrados de salida**. Antes iban apilados y abiertos: unos 300 px que le comían el sitio al
texto, que es donde de verdad se trabaja. Con la fila cerrada el editor pasa de ~510 a ~808 px de
alto en una pantalla de portátil.

Se abre una y se cierra la anterior, así que el alto del bloque está acotado pase lo que pase.
Cuál quedó abierta se recuerda en el navegador, como el zoom.

**Clicar una tarjeta lleva el cursor a su bloque** en el texto y lo acerca a la vista, igual que el
Deck Maker (`jumpToSource` en `DeckStudio`). Clicar una tarjeta es la forma natural de decir
«quiero editar esta», y sin eso hay que buscarla a mano en un texto de cien líneas.

## Los metadatos son una lista cerrada

`slug`, `autor`, `logo`, `marca`, `exposicion`, `posicion`, `cliente`. Y la lista tiene que estar
cerrada: antes se reconocía un metadato con el patrón «unas palabras, dos puntos, el resto», y eso
**se tragaba la prosa**. «El razonamiento largo: dónde se complica» desaparecía de la tarjeta sin
avisar, y los dos puntos son una construcción habitual en la voz de la casa.

Añadir una clave nueva es añadirla a `CLAVES_META` en `lib/social/compile.ts`.

## Cómo funciona pulsar Enter

**Un Enter es un salto de línea dentro del mismo texto. Una línea en blanco empieza otra cosa.**

Vale para titulares, párrafos, citas y elementos de lista. Un titular de tres líneas se escribe en
tres líneas y salen tres líneas.

Antes no era así: cada línea era un token propio, de modo que un titular partido en tres producía
un titular de una línea y dos párrafos sueltos que el layout no pintaba. **Los saltos
desaparecían.** La barra final (`\`) ya lo resolvía, pero nadie la adivina.

**El deck NO lo tiene**, y es deliberado. `parse()` recibe la opción `saltosBlandos` y solo la
activa el Social Maker. En las plantillas del deck hay 19 titulares pegados a su cuerpo sin línea
en blanco: con saltos blandos se tragarían el párrafo dentro del titular.

---

## Pendiente

- **Acento del icono.** `toolIconAccents` en `lib/tokens.ts` no declara ninguno para `socialmakr`,
  así que la tarjeta del dispatcher sale con su wordmark y sin icono. Añadir un color ahí es una
  decisión de marca: la toman Alberto o Carlos, no el código.
- **Galería de imágenes** para cambiar foto y fondo desde la interfaz, como en el Deck Maker.
- **Resincronizar el equipo** cuando cambie en la web. No hay forma automática de enterarse: los
  dos repositorios no se hablan.
- **Guardado y galería de piezas** en Supabase. El esquema se cambia por PR, nunca desde el panel
  (`README.md`).
