import type { SlideKind } from './types.ts';

/* Fuente única de los layouts disponibles. De aquí salen:
   - el mapa marcador → kind del compilador
   - la galería de layouts del editor
   - la documentación
   Añade un layout aquí y aparece en todas partes.

   Los nueve salen de lo que los seis carruseles publicados repiten de
   verdad. No hay ninguno inventado «por si acaso»: un layout que nadie usa
   es una papeleta para que alguien lo use mal. */

export type LayoutCatalogEntry = {
  marker: string;
  kind: SlideKind;
  nombre: string;
  slots: string;
  skeleton: string;
};

/* Imagen de relleno de los esqueletos: un archivo de marca real, para que
   un bloque pegado se vea en lugar de dar 404. Se cambia desde la galería. */
const IMG = '![Imagen del universo visual](/universo/universo-01.jpg)';

const SKELETONS: Record<string, string> = {
  /* `> marca: arriba` pone la papelería en cabecera, con el imagotipo
     girado. Va comentado en el esqueleto porque las dos colocaciones son
     legítimas y la de Miradas es la que más se usa; quitarle el comentario
     es un gesto, acordarse de que existe no lo es. */
  portada: `# Titular de la portada

## Una línea que explica de qué va el carrusel

> slug: /Miradas/

${IMG}`,

  titular: `# La frase que quieres que se lleven`,

  texto: `## Titular de la tarjeta

Primer párrafo del cuerpo. Aquí va lo que se lee seguido.

Segundo párrafo, si hace falta.`,

  lista: `## Título de la lista

- **Lo primero.** La explicación que lo acompaña.
- **Lo segundo.** La explicación que lo acompaña.
- **Lo tercero.** La explicación que lo acompaña.`,

  /* Las comillas no van en el esqueleto: las pone el sistema, siempre
     angulares. El autor va como metadato y no como antetítulo en
     mayúsculas, que es lo que se quiere debajo de una cita: un nombre,
     no una etiqueta. */
  cita: `> La frase citada, tal cual se dijo.

> autor: Nombre Apellido`,

  foto: `${IMG}

# Texto que va encima de la foto`,

  rotulo: `Cuerpo de texto que ocupa la parte de arriba de la tarjeta y
explica el contexto de lo que se muestra.

## Rótulo`,

  agenda: `## Programa

- Apertura | 09:00
- Primera sesión | 09:30
- Pausa | 11:00
- Cierre | 15:00`,

  /* Sin retrato: en este repo no hay fotos de equipo, y un esqueleto que
     apunta a un archivo inexistente enseña un icono roto la primera vez que
     alguien lo usa. El retrato es la SEGUNDA imagen del bloque y se añade
     desde la galería. */
  cierre: `# Artículo completo en nuestro blog.

> autor: Nombre Apellido

${IMG}`,
};

export const LAYOUTS: readonly LayoutCatalogEntry[] = [
  {
    marker: 'portada',
    kind: 'portada',
    nombre: 'Portada',
    slots:
      'Foto a sangre · titular serif abajo · subtítulo mono · papelería al pie, o en cabecera ' +
      'con «> marca: arriba»',
    skeleton: SKELETONS.portada,
  },
  {
    marker: 'titular',
    kind: 'titular',
    nombre: 'Titular',
    slots: 'Un titular serif grande y nada más',
    skeleton: SKELETONS.titular,
  },
  {
    marker: 'texto',
    kind: 'texto',
    nombre: 'Texto',
    slots: 'Titular serif opcional · cuerpo en mono · antetítulo opcional',
    skeleton: SKELETONS.texto,
  },
  {
    marker: 'lista',
    kind: 'lista',
    nombre: 'Lista numerada',
    slots: 'Titular · entradilla opcional · elementos numerados con filete',
    skeleton: SKELETONS.lista,
  },
  {
    marker: 'cita',
    kind: 'cita',
    nombre: 'Cita',
    slots:
      'Cita entre comillas en serif · firma pequeña debajo · fondo de color o foto. ' +
      'Es el layout pensado para el post horizontal.',
    skeleton: SKELETONS.cita,
  },
  {
    marker: 'foto',
    kind: 'foto',
    nombre: 'Foto',
    slots: 'Foto a sangre · texto serif encima, arriba o abajo, o sin texto',
    skeleton: SKELETONS.foto,
  },
  {
    marker: 'rotulo',
    kind: 'rotulo',
    nombre: 'Rótulo',
    slots: 'Cuerpo mono arriba · rótulo serif grande abajo',
    skeleton: SKELETONS.rotulo,
  },
  {
    marker: 'agenda',
    kind: 'agenda',
    nombre: 'Agenda',
    slots: 'Título · filas de «qué | cuándo» con filete',
    skeleton: SKELETONS.agenda,
  },
  {
    marker: 'cierre',
    kind: 'cierre',
    nombre: 'Cierre',
    slots: 'Llamada a leer · firma · retrato en la esquina · foto de fondo',
    skeleton: SKELETONS.cierre,
  },
];

export const LAYOUT_MAP: Record<string, SlideKind> = Object.fromEntries(
  LAYOUTS.map((l) => [l.marker, l.kind]),
);

/* Alias que se aceptan al escribir, para que nadie se pelee con el nombre.
   No los emitas: los canónicos son los `marker` de arriba. */
export const LAYOUT_ALIASES: Record<string, string> = {
  cover: 'portada',
  statement: 'titular',
  frase: 'titular',
  text: 'texto',
  cuerpo: 'texto',
  list: 'lista',
  bullets: 'lista',
  quote: 'cita',
  photo: 'foto',
  imagen: 'foto',
  label: 'rotulo',
  programa: 'agenda',
  closing: 'cierre',
  final: 'cierre',
};
