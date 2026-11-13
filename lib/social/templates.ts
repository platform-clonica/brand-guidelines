/* Plantillas de arranque.
   ─────────────────────────────────────────────────────────────────────────
   No son ejemplos decorativos: reproducen la estructura de los carruseles
   que Interactius ya publica, para que quien empiece uno nuevo parta de una
   secuencia que funciona en lugar de una página en blanco.

   El texto es instructivo a propósito («Titular de la portada»), nunca
   copia plausible: tiene que ser evidente que hay que sustituirlo y no
   puede colarse en una publicación real si alguien se lo deja.

   CADA PLANTILLA TRAE SU RITMO DE FONDOS, Y ES LA PARTE QUE MÁS SE NOTA

   En un feed, tres carruseles seguidos con los mismos layouts se leen como
   el mismo carrusel. La variedad no hace falta buscarla en diseños nuevos
   —un layout que se usa una vez es un layout que el siguiente usará mal—
   sino en el orden de los fondos, que no cuesta nada y cambia el carácter
   de la pieza entera.

   Los tres ritmos son deliberadamente distintos:

     Miradas    respiración larga. Oscuro, luego claros encadenados, y un
                oscuro que corta antes del cierre. El claro domina y el
                oscuro puntúa: es una pieza para leer.
     Insights   alterna razonamiento y dato. Oscuro cuando piensa en voz
                alta, claro cuando asienta algo concreto.
     Evento     la imagen marca el compás. Plano, imagen, plano, imagen. Lo que
                se cuenta pasó en un sitio, y el sitio se ve.

   El ritmo vive en el markdown de la plantilla, no en código: quien parte
   de ella lo hereda y puede romperlo a mano en cualquier tarjeta. Un ritmo
   que no se pudiera romper sería una cárcel, no un punto de partida. */

export type TemplateId = 'miradas' | 'insights' | 'evento' | 'libre';

export type SocialTemplate = {
  id: TemplateId;
  nombre: string;
  descripcion: string;
  md: string;
};

const MIRADAS = `[ly: portada] {dark}

# Titular del artículo, tal como se publica

> slug: /Miradas/

![Imagen del universo visual](/universo/universo-01.jpg)

---

[ly: titular] {warm-light}

# La idea central, en una frase que se sostenga sola.

---

[ly: texto] {dark}

## El titular de esta slide

Primer párrafo del cuerpo. Aquí va lo que se lee seguido, en mono, y **lo que de verdad importa va en negrita**.

Segundo párrafo, si el argumento lo pide.

---

[ly: lista] {warm-light}

## Lo que cambia, en tres puntos

- **Lo primero.** La explicación que lo acompaña.
- **Lo segundo.** La explicación que lo acompaña.
- **Lo tercero.** La explicación que lo acompaña.

---

[ly: titular] {dark}

# El giro del argumento, en negativo para que corte.

---

[ly: texto] {warm-dark}

Un bloque de cuerpo sin titular, para rematar el razonamiento.

**La última frase es la que se lleva quien lo lea.**

---

[ly: cierre]

# Artículo completo en nuestro blog.

> autor: Yolanda Delgado

![Imagen del universo visual](/universo/universo-01.jpg)
`;

const EVENTO = `[ly: portada] {dark}

# Nombre del evento

## Qué se hizo y para quién, en una línea

> marca: arriba

> slug: /Eventos/

![Imagen del universo visual](/universo/universo-02.jpg)

---

[ly: texto] {warm-light}

## Qué se planteó

El contexto en una o dos frases, para **quien llega sin saber de qué va**.

---

[ly: imagen]

![Imagen del evento](/universo/universo-03.jpg)

# La frase que resume lo que se vio allí

---

[ly: texto] {dark}

Cuerpo de texto que recoge **lo que salió de la sesión**, en el tono con el que se contaría a alguien que no estuvo.

---

[ly: imagen]

![Otra imagen del evento](/universo/universo-04.jpg)

---

[ly: cita] {opal}

> La frase citada, tal cual se dijo.

> autor: Yolanda Delgado

---

[ly: titular] {dark}

# La pregunta con la que quieres que se queden.
`;

/* Insights: un concepto que merece contarse, SIN artículo detrás.

   Es lo que lo separa de Miradas, y no es un matiz de tono: un carrusel de
   Miradas presenta un artículo del blog y termina mandando a leerlo. Un
   Insight no tiene adónde mandar, así que NO LLEVA TARJETA DE CIERRE.
   Cierra con la pregunta que deja abierta, que es su forma de rematar.

   El ritmo alterna razonamiento y dato: párrafo serif sobre oscuro para
   pensar en voz alta, titular más cuerpo mono sobre claro para asentar lo
   concreto. Sale de las seis tarjetas del carrusel de pagos agénticos. */
const INSIGHTS = `[ly: portada] {dark}

# El titular del concepto, tal como lo contarías en voz alta.

> slug: /Insights/

![Imagen del universo visual](/universo/universo-02.jpg)

---

[ly: parrafo] {warm-light}

El planteamiento, en serif: qué está pasando y por qué merece mirarse.

Y el giro que lo hace interesante, en un segundo párrafo.

---

[ly: texto] {dark}

## El concepto, nombrado

El dato concreto que lo sostiene, en mono. Aquí va **lo que se puede comprobar**.

---

[ly: texto] {warm-dark}

## ¿La pregunta que abre el asunto?

El matiz que la pregunta deja ver, con **el detalle que haga falta**.

---

[ly: parrafo] {dark}

El razonamiento largo: dónde se complica, qué se fragmenta, quién acaba asumiéndolo.

---

[ly: titular] {warm-light}

# ¿La pregunta con la que quieres que se queden?
`;

export const TEMPLATES: readonly SocialTemplate[] = [
  {
    id: 'miradas',
    nombre: 'Miradas',
    descripcion: 'Portada, desarrollo del argumento y cierre con firma. El de los artículos.',
    md: MIRADAS,
  },
  {
    id: 'insights',
    nombre: 'Insights',
    descripcion: 'Un concepto que merece contarse, sin artículo detrás. Cierra con la pregunta, no con un enlace.',
    md: INSIGHTS,
  },
  {
    id: 'evento',
    nombre: 'Evento',
    descripcion: 'Portada, imágenes, lo que salió y una cita. El de lo que se hace en directo.',
    md: EVENTO,
  },
  {
    id: 'libre',
    nombre: 'Libre',
    descripcion: 'Una sola tarjeta para empezar de cero.',
    md: `[ly: titular] {warm-light}

# Escribe aquí tu primer titular.
`,
  },
];

export const templateById = (id: TemplateId): SocialTemplate =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
