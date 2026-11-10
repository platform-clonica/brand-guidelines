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

**La regla, en una frase: la serif se queda en la escala tal cual; la mono corre a ×2.**

- El **serif** solo aparece en titulares, y el peldaño `display` de `lib/typeScale.ts` (96 px) es
  exactamente el tamaño al que están puestos los titulares de los carruseles publicados. Medido
  sobre los PNG. No hace falta tocar nada.
- El **mono** aparece en cuerpo de texto, y ahí la escala web se queda corta: 18 px sobre un
  lienzo de 1080 se ven a 6,6 px cuando la tarjeta se muestra a 400 px de ancho en un móvil. A ×2
  (36 px) se ven a 13,3 px, que es la densidad normal de una tarjeta de feed.

Un multiplicador único y explicado es preferible a tres números sueltos: si cambia la escala,
estos peldaños se recalculan solos.

**Única excepción serif:** `title-sm` va a 40 y no a 32, porque a 32 quedaría por debajo del
cuerpo mono (36) e invertiría la jerarquía. Es el intermedio propio del lienzo, equivalente al
`--title-section` del deck.

> **Pendiente de Alberto.** Esto *extiende* la norma, no la contradice: familias, pesos y la
> prohibición de la cursiva se respetan enteras. Pero un multiplicador de lienzo es una decisión
> de sistema y le toca a él confirmarla o cambiarla.

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
| `cita` | Cita serif centrada en la tarjeta |
| `foto` | Foto a sangre con texto encima, arriba o abajo, o sin texto |
| `rotulo` | Cuerpo mono arriba, rótulo serif grande abajo |
| `agenda` | Filas de «qué \| cuándo» con filete |
| `cierre` | Llamada a leer, firma y retrato en la esquina |

Añadir uno es una entrada en `lib/social/catalog.ts` más su componente y su regla CSS.

### El pie es una fila, siempre la misma

Izquierda la marca, derecha el slug.

**El imagotipo NO va en todas las tarjetas.** En los seis carruseles publicados aparece solo en la
portada; las interiores llevan únicamente el slug. Ponerlo en las nueve repetiría la firma nueve
veces y convertiría una marca en un sello de agua.

La excepción es el **logo co-marca** (`> logo: ruta`): cuando una pieza se hace con alguien, ese
logo sí va en todas, porque lo que identifica no es quién publica sino en el marco de qué.

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
- **Guardado y galería de piezas** en Supabase. El esquema se cambia por PR, nunca desde el panel
  (`README.md`).
