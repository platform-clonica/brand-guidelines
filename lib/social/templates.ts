/* Plantillas de arranque.
   ─────────────────────────────────────────────────────────────────────────
   No son ejemplos decorativos: reproducen la estructura de los carruseles
   que Interactius ya publica, para que quien empiece uno nuevo parta de una
   secuencia que funciona en lugar de una página en blanco.

   El texto es instructivo a propósito («Titular de la portada»), nunca
   copia plausible: tiene que ser evidente que hay que sustituirlo y no
   puede colarse en una publicación real si alguien se lo deja. */

export type TemplateId = 'miradas' | 'evento' | 'vacio';

export type SocialTemplate = {
  id: TemplateId;
  nombre: string;
  descripcion: string;
  md: string;
};

const MIRADAS = `[ly: portada] {dark}

# Titular del artículo, tal como se publica

## Una línea que explique de qué va

> slug: /Miradas/

![Imagen del universo visual](/universo/universo-01.jpg)

---

[ly: titular] {warm-light}

# La idea central, en una frase que se sostenga sola.

---

[ly: texto] {warm-light}

## El titular de esta tarjeta

Primer párrafo del cuerpo. Aquí va lo que se lee seguido, en mono.

Segundo párrafo, si el argumento lo pide.

---

[ly: lista] {warm-dark}

## Lo que cambia, en tres puntos

- **Lo primero.** La explicación que lo acompaña.
- **Lo segundo.** La explicación que lo acompaña.
- **Lo tercero.** La explicación que lo acompaña.

---

[ly: titular] {dark}

# El giro del argumento, en negativo para que corte.

---

[ly: texto] {warm-light}

Un bloque de cuerpo sin titular, para rematar el razonamiento.

La última frase es la que se lleva quien lo lea.

---

[ly: cierre]

# Artículo completo en nuestro blog.

> autor: Nombre Apellido

![Imagen del universo visual](/universo/universo-01.jpg)
`;

const EVENTO = `[ly: portada] {dark}

# Nombre del evento

## Qué se hizo y para quién, en una línea

> slug: /Eventos/

![Imagen del universo visual](/universo/universo-02.jpg)

---

[ly: foto]

![Foto del evento](/universo/universo-03.jpg)

# La frase que resume lo que se vio allí

---

[ly: agenda] {warm-light}

## Programa

- Apertura | 09:00
- Primera sesión | 09:30
- Pausa | 11:00
- Cierre | 15:00

---

[ly: rotulo] {dark}

Cuerpo de texto que da el contexto de lo que se muestra debajo y prepara al lector para el rótulo.

## Insights

---

[ly: cita] {opal}

> La frase citada, tal cual se dijo.

NOMBRE DE QUIEN LO DIJO

---

[ly: titular] {dark}

# La pregunta con la que quieres que se queden.
`;

export const TEMPLATES: readonly SocialTemplate[] = [
  {
    id: 'miradas',
    nombre: 'Carrusel de Miradas',
    descripcion: 'Portada, desarrollo del argumento y cierre con firma. El de los artículos.',
    md: MIRADAS,
  },
  {
    id: 'evento',
    nombre: 'Carrusel de evento',
    descripcion: 'Portada, fotos, programa, rótulos y cita. El de lo que se hace en directo.',
    md: EVENTO,
  },
  {
    id: 'vacio',
    nombre: 'En blanco',
    descripcion: 'Una sola tarjeta para empezar de cero.',
    md: `[ly: titular] {warm-light}

# Escribe aquí tu primer titular.
`,
  },
];

export const templateById = (id: TemplateId): SocialTemplate =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
