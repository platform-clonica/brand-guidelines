# Guía del `.md` — Generador de presentaciones

Reglas completas para escribir el contenido de un deck en el editor de
`brand.interactius.com/presentaciones`. El generador es **determinista**: no
hay IA en runtime, todo sale de estas reglas. Pulsa **Generar** para recompilar.

---

## 1. Estructura general

- **Separar diapositivas**: una línea con `---` (tres guiones o más) sola, con
  una línea en blanco antes y después.
- Cada bloque entre separadores se convierte en **una** diapositiva.
- **Declara el layout** con un marcador `[ly: nombre]` en la primera línea del bloque
  (ver §1.1). Si no pones marcador, el tipo se **deduce** del contenido (§4), como antes.

```markdown
[ly: portada]
# Primera diapositiva

---

[ly: lista]
## Segunda diapositiva
- Punto uno
- Punto dos
```

### 1.1 Marcadores de layout (`[ly: …]`)

El marcador **elige el diseño** con independencia de los copies. El contenido del bloque
solo rellena los huecos de ese layout.

| Marcador | Diseño | Rellena con |
|---|---|---|
| `[ly: portada]` | Portada | título (`#`), subtítulo, `> cliente:`, imagen de fondo |
| `[ly: cierre]` | Cierre | título, url |
| `[ly: enunciado]` | Antetítulo + título grande | `MAYÚSCULAS` + `#` |
| `[ly: texto]` | Párrafo | antetítulo + párrafo |
| `[ly: lista]` | Lista de viñetas | título + `- ítems` |
| `[ly: columnas]` | Columnas numeradas | título + varios `###` (subtítulo + cuerpo) |
| `[ly: split-der]` | Texto + imagen a la **derecha** (default) | antetítulo, título, párrafo, imagen |
| `[ly: split-izq]` | Texto + imagen a la **izquierda** | igual que split-der, espejado |
| `[ly: contexto]` | Contexto | un párrafo |
| `[ly: reto]` | El reto (imagen + título) | título + imagen |
| `[ly: objetivos]` | Objetivos (lista numerada + imagen) | título + `- ítems` + imagen |
| `[ly: roadmap]` | Roadmap por fases | título + varios `###` (fase + cuerpo + `- tareas`) |
| `[ly: gantt]` | Diagrama de Gantt | líneas `clave: valor` (o bloque ```` ```gantt ````) — §5 |
| `[ly: presupuesto]` | Presupuesto | `- Partida: importe` + `### Condiciones` |
| `[ly: manifiesto]` | Manifiesto de marca | título + subtítulo (*opcional*; default de marca) |
| `[ly: equipo]` | Equipo | párrafos + imagen (*opcional*; default de marca) |
| `[ly: clientes]` | Muro de clientes | imagen (*opcional*; default de marca) |
| `[ly: aceptacion]` | Aprobación / firma | título + `nombre:`/`cargo:`/`empresa:`/`nif:`/`direccion:`/`aviso:`/`cta:` + imagen firma (*todo opcional*; default de marca) |

Las páginas de marca (`manifiesto`, `equipo`, `clientes`, `aceptacion`) **ya no se insertan
solas**: se declaran como cualquier otra y la plantilla Comercial las trae con su contenido
escrito en el `.md` (editable y traducible). Si borras ese contenido, vuelve el texto/imagen
por defecto de la marca (ver §8).

---

## 2. Elementos de línea (sintaxis markdown reconocida)

| Escribes | Se interpreta como |
|---|---|
| `[ly: nombre]` | Marcador de layout (§1.1); en la primera línea del bloque |
| `# … ######` | Encabezado (el número de `#` marca el nivel) |
| `TEXTO EN MAYÚSCULAS` | Antetítulo (*eyebrow*) — máx. 48 car., sin `.` `;` `:` |
| `- texto` o `* texto` | Ítem de lista |
| `> texto` | Cita |
| `> cliente: Nombre` | Asigna el cliente (sale en la portada) |
| `![alt](/ruta.jpg)` | Imagen (en su propia línea; ruta desde `/public`) |
| Bloque cercado ```` ```gantt ```` … ```` ``` ```` | Datos del diagrama de Gantt |
| Cualquier otra línea | Párrafo |

**Negrita**: envuelve el texto en `**dobles asteriscos**`. Funciona en **todos** los slots de
texto: títulos, subtítulos, antetítulos, párrafos, viñetas, objetivos, columnas, fases del
roadmap y condiciones del presupuesto (el formato significa lo mismo en todas partes).

**Énfasis del manifiesto**: en el título de `[ly: manifiesto]`, envuelve una palabra entre
barras con espacios — `/ palabra /` — para el realce de marca (p. ej. `/ transformación /`).
Se conservan las barras y, al traducir, solo cambia la palabra de dentro.

**Salto de línea en un titular**: termina la línea con una **barra invertida** `\` y sigue
escribiendo debajo. Vale en cualquier titular, de cualquier layout.

```
## Convertimos la estrategia \
en decisiones con criterio
```

⚠️ **Pulsar Enter a secas no parte el titular**, y es a propósito: en las plantillas un titular va
pegado a su párrafo sin línea en blanco, así que un salto normal tiene que seguir significando
«aquí acaba el titular y empieza el cuerpo». La barra lo hace explícito.

El salto es solo visual: en el título del PDF y en la vista previa al compartir el enlace, las
líneas se vuelven a unir con un espacio.

---

## 3. Fondo de la diapositiva

Por defecto: **oscuro** en portada, *statement* y cierre; **claro** (crema) en el resto.

Hay **cuatro fondos**, con el nombre del token de marca correspondiente:

| Escribes | Fondo | Tinta |
|---|---|---|
| _(nada)_ o `{warm-light}` | Crema `#F5F2ED` (por defecto) | Oscura |
| `{white}` | Blanco puro `#FFFFFF` | Oscura |
| `{warm-dark}` | Arena `#E0DAD2` | Oscura |
| `{dark}` | Oscuro `#1C1A17` | **Clara** (se invierte sola) |

> Se siguen aceptando los alias en castellano —`crema`, `blanco`, `arena`, `oscuro`— para no romper
> los decks ya escritos, pero **usa los cuatro de arriba**: son los nombres de los tokens de marca y
> van todos en la misma familia.

El fondo **oscuro** se reserva para las pantallas canónicas (portada, statement, cierre), pero se
puede forzar en cualquier otra con `{dark}`. Al hacerlo **el texto se invierte solo**:
títulos, cuerpo, listas, números, filetes y cabeceras de tabla pasan a claro. Las tarjetas blancas
(columnas, fases del roadmap) y la media página blanca de presupuesto y aceptación siguen siendo
blancas, así que su texto sigue siendo oscuro — es correcto, van sobre blanco.

> Hasta el 31/07/2026 esto **no** funcionaba: con `{dark}` el fondo se oscurecía pero buena parte
> del texto seguía en tinta oscura y desaparecía. El selector de fondo se había añadido pensando
> solo en los tres tonos claros.

**Ya viene puesto.** Cuando copias un layout de la galería, el bloque llega con su fondo actual ya
escrito (`{warm-light}`, o `{dark}` en portada/statement/cierre). No cambia nada por sí solo: está
ahí para que veas el mando y lo sustituyas por `{white}` o `{warm-dark}` sin volver a esta guía.

**Dónde ponerlo** — dos sitios, el que te venga:
- Junto al marcador de layout (funciona también en las páginas de solo-marcador como manifiesto):
  ```markdown
  [ly: manifiesto] {blanco}
  ```
- Al final de un **encabezado**:
  ```markdown
  ## Nuestra mirada {arena}
  ```

**Dos excepciones, a propósito:** `[ly: presupuesto]` y `[ly: aceptacion]` van **siempre en claro**.
Son las dos páginas contractuales del deck y su legibilidad no se negocia, así que `{dark}` no
tiene efecto en ellas. El **fondo** sí se les puede cambiar (`{white}`, `{warm-dark}`); lo que no
se puede es volverlas oscuras. No es un fallo: está fijado en el código (`lib/deck/classify.ts`).

---

## 4. Tipos de diapositiva (orden de prioridad)

El generador prueba estas reglas **en orden** y se queda con la primera que encaja:

1. **Gantt** — un bloque cercado de tipo `gantt` (ver §5). Gana aunque el título sea «Roadmap».
2. **Secciones por palabra clave**:
   - Antetítulo `CONTEXTO` → bloque de texto serif (versión larga si ≥150 car.).
   - Antetítulo `EL RETO` → imagen + título serif.
   - Encabezado `Objetivos` → lista numerada + imagen.
   - Encabezado `Roadmap` → columnas de fases (cada `###` es una fase, ver §6).
   - Encabezado `Presupuesto` → tabla de presupuesto (ver §7).
3. **Portada** — primera diapositiva con `#` (H1) y subtítulo, cliente o imagen.
4. **Cierre** — última diapositiva titulada «Gracias» o con una línea de URL.
5. **Statement** — antetítulo en mayúsculas + encabezado, sin nada más.
6. **Columnas** — encabezado + 2 o más subencabezados `###`.
7. **Viñetas** — encabezado + lista.
8. **Split** — encabezado + imagen + párrafo.
9. **Párrafo** — cualquier otra cosa (caso por defecto).

> Las palabras clave (`CONTEXTO`, `EL RETO`, `Objetivos`, `Roadmap`,
> `Presupuesto`) son sensibles al texto pero **no** a mayúsculas/minúsculas.
> `CONTEXTO` y `EL RETO` van como antetítulo (línea en mayúsculas);
> `Objetivos`, `Roadmap` y `Presupuesto` van como encabezado (`##`).

---

## 5. Diagrama de Gantt

Con el marcador `[ly: gantt]`, escribe la spec como **líneas sueltas** `clave: valor`
(forma recomendada). También sigue valiendo dentro de un bloque ```` ```gantt ```` (compatibilidad).

````markdown
[ly: gantt]
## Roadmap
semanas: 8
Diagnóstico: 1
Discovery: 2-3
Volumetría: 4-8
hitos cliente: 1, 3, 5, 8
````

- `semanas: N` → nº de columnas (por defecto 8). La **palabra** que uses es la
  etiqueta del eje: `meses: 6` muestra «Meses», `días: 30` muestra «Días».
- `Etiqueta: N` → barra de una semana en la semana N. `Etiqueta: inicio-fin` → barra de rango.
- **Tramos sueltos**: separa por comas para que una fase **no** tenga que ser continua.
  Cada trozo dibuja su propia barra, todas del mismo color (es una fase, no varias).
  - `Descubrimiento: 4, 6, 9` → tres barras sueltas, saltándose 5, 7 y 8.
  - `Acompañamiento: 1-3, 6, 9-10.5` → se pueden mezclar rangos, sueltos y medias.
- **Medias semanas**: usa `.5` en cualquier extremo del rango; la barra dibuja
  media celda.
  - `Discovery: 2-3.5` → semanas 2 y 3 + la primera mitad de la 4.
  - `Cierre: 4-4.5` → solo la primera mitad de la semana 4.
  - `Kick Off: 0.5` → media semana al inicio (un valor suelto con decimal).
- `hitos …: a, b, c` → semanas con hito. La **palabra** tras `hitos` es la etiqueta de la fila
  de hitos: `hitos cliente: 1, 3` muestra «Cliente» (por defecto «Cliente» si la omites).
- Los colores de las barras rotan automáticamente (opal · burdeos · esmeralda).

---

## 6. Roadmap por fases

```markdown
## Roadmap
Estimamos que la duración del proyecto será de 6 semanas.
### Diagnóstico
Texto introductorio de la fase.
- Tarea 1
- Tarea 2
### Discovery
...
```

- El primer párrafo tras `## Roadmap` es el subtítulo.
- Cada `###` abre una fase: su texto = primer párrafo; sus viñetas = «¿Qué hacemos?».
- Las fases se numeran solas (Fase 01, Fase 02…).

---

## 7. Presupuesto

```markdown
## Presupuesto
- Análisis Heurístico: 3.315 €
- Benchmark Android/Mobile: 3.770 €
- Inmersión + gestión: 3.991 €
### Condiciones
- Pago a 30 días.
- IVA aparte.
```

- Cada viñeta es `Partida: importe`. Separadores válidos: `:` `—` `–` `|`.
- **Total**: se **suma solo** a partir de las partidas. Para fijarlo a mano,
  añade `- Total: 12.000 €` y ese valor manda.
- **Sin total**: añade `- nototal` (o `sin total`) y la fila del total desaparece.
  Para presupuestos que no suman a nada — un fijo más un mantenimiento mensual,
  por ejemplo — donde un total sería un número que la propuesta no dice.
- **El importe admite texto libre**: negativo (`-259 €`), con unidad (`500 €/mes`),
  con una segunda cifra o con **negrita** para destacar la que importa:
  `- Descuento cliente recurrente 5%: -259 € **4.915 €**`.
  La negrita es `**doble asterisco**` — uno solo es cursiva en Markdown y la cursiva
  está prohibida en la marca, así que `*así*` sale con los asteriscos a la vista.
- Los importes en negrita compiten con la fila Total, que ya va en peso 600.
  Combínalos sabiendo que la jerarquía se aplana; con `nototal` no hay choque.
- Formato es-ES: miles con `.`, decimales con `,` (`1.200,50 €`).
- El auto-suma lee **la primera cifra** de cada importe (y resta las negativas). Si un
  importe lleva dos cifras o una unidad (`/mes`), el total deja de significar algo: usa `nototal`.
- **Condiciones**: opcionales bajo `### Condiciones`. Si no las pones, salen las
  condiciones de pago estándar de Interactius.
- Si dejas `## Presupuesto` vacío, se muestra el ejemplo de referencia (p.42).

---

## 8. Páginas de marca (manifiesto · equipo · clientes · aceptación)

**Ya no se insertan solas.** Son diapositivas como cualquier otra: se declaran con su marcador
(`[ly: manifiesto]`, `[ly: equipo]`, `[ly: clientes]`, `[ly: aceptacion]`) y la plantilla
**Comercial** las trae con su contenido de marca **escrito en el `.md`**, de modo que es
editable en el editor y **se traduce** con el resto del deck.

- Si borras el contenido de un bloque de marca, vuelve a salir el texto/imagen por defecto.
- Aceptación: el firmante usa líneas `clave: valor` (`nombre:`, `cargo:`, `empresa:`, `nif:`,
  `direccion:`, `aviso:`, `cta:`) + `![Firma](…)`. Las **claves** se mantienen tal cual al
  traducir; se traducen los valores de `cargo`/`aviso`/`cta` (los nombres propios no).

---

## 9. Atajos del editor

- **Generar** — recompila el deck con el `.md` actual.
- **Descargar PDF** — imprime/guarda el deck (print-CSS).
- **Copiar URL** — copia un enlace con el deck embebido (vista cliente, sin chrome interno).
