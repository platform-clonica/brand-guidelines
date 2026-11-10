# Social Maker

Editor de imágenes para redes. Markdown a la izquierda, tarjetas a la derecha, descarga en PNG.

- **Ruta:** `/workspace/socialmak_r` (detrás de login, como el resto del workspace).
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

| Lienzo | Base | Exportado (×2) | Ratio |
|---|---|---|---|
| Carrusel | 1080×1350 | 2160×2700 | 4:5 |
| Post horizontal | 1080×608 | 2160×1216 | 16:9 |

El ×2 no es arbitrario: el carrusel más reciente que Interactius ha publicado mide exactamente
2160×2700, así que es el tamaño al que ya se trabaja.

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
| `foto` | Foto a sangre con texto encima, arriba o abajo, o sin texto |
| `rotulo` | Cuerpo mono arriba, rótulo serif grande abajo |
| `agenda` | Filas de «qué \| cuándo» con filete |
| `cierre` | Llamada a leer, firma y retrato en la esquina |

El titular del cierre va al peldaño **`super` (192)** y no al `display` del resto: es el único
texto de la tarjeta, medido 182 en la pieza publicada, y 192 es el peldaño que la escala ya tiene
declarado para «una palabra o un titular muy corto». Es también el único titular **sin ligado de
viuda**: a ese tamaño, atar la última palabra corta a la anterior crea una tirada que no cabe en
la caja y deja una palabra suelta en la línea de antes, que es justo el defecto que la regla
quería evitar.

Las plantillas de arranque son cuatro: **Miradas** (papelería al pie), **evento** y **workshop**
(papelería en cabecera) y una en blanco.

### Cada plantilla trae su ritmo de fondos

En un feed, tres carruseles seguidos con los mismos layouts se leen como el mismo carrusel. La
variedad no hace falta buscarla en diseños nuevos (un layout que se usa una vez es un layout que
el siguiente usará mal) sino en el **orden de los fondos**, que no cuesta nada y cambia el
carácter de la pieza entera.

| Plantilla | Ritmo | Qué dice |
|---|---|---|
| Miradas | Oscuro · claros encadenados · un oscuro que corta · cierre | El claro domina y el oscuro puntúa: es una pieza para leer |
| Evento | Plano · foto · plano · foto | Lo que se cuenta pasó en un sitio, y el sitio se ve |
| Workshop | Bloques oscuros que enmarcan el dato claro | El oscuro domina y el claro es lo que hay que retener |

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

Desde el editor se pone con el botón **Logo de cliente**, que abre la galería y escribe el
metadato en el primer bloque.

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

Desde el editor: pasar por encima de la tarjeta y **Foto de fondo** / **Quitar foto**.

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
- Medido: entre 70 y 380 ms por imagen a 2160×2700.

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

## Trampa conocida al escribir

**Un párrafo tiene que ir en una sola línea.** El tokenizador convierte cada línea no vacía en su
propio párrafo, así que partir una frase con un salto de línea produce dos párrafos separados. Es
el mismo comportamiento que el deck.

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
