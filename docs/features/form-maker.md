# FormMaker — el editor de formularios

> Le da a los formularios el mismo ciclo de vida que ya tenían las presentaciones: crear, listar,
> buscar, editar en vivo, publicar, duplicar y borrar desde la app, sin tocar un fichero ni desplegar.

## Contexto

Antes de esto el repo tenía **dos mitades desiguales**:

- **DeckMaker** completo — galería en `/workspace/deckmak_r`, editor en `/workspace/deckmak_r/[id]`, tabla `decks`, autoguardado.
- **Interactius Forms** solo la mitad de lectura (ver
  [forms-persistencia-supabase.md](forms-persistencia-supabase.md)): un `.md` a mano en
  `content/forms/`, el esquema Zod, el renderer y la página pública. Crear un formulario significaba
  escribir un fichero, commitear y desplegar.

FormMaker **no es un producto nuevo al lado**: convierte en herramienta lo que era un formulario
concreto escrito a mano (el de Massimo Dutti). Su formato, su renderer y su tabla de respuestas se
quedan exactamente como estaban.

## Decisiones

### El lenguaje del markdown es el que ya existía

No se inventó ninguna sintaxis. FormMaker edita **el mismo formato** de `content/forms/*.md`:
frontmatter YAML (metadatos + `fields`) y cuerpo Markdown como intro, validado por el mismo
`frontmatterSchema` de [lib/forms/schema.ts](../../lib/forms/schema.ts).

Motivo: ese Zod es a la vez el validador del **autoring** y, derivado, el del **envío**. Un lenguaje
nuevo habría obligado a mantener dos gramáticas sincronizadas para el mismo contrato. Además,
`massimo-dutti.md` se pega en el editor y funciona sin migración.

### Un compilador nuevo, porque el parser no sirve en el navegador

[lib/forms/parse.ts](../../lib/forms/parse.ts) usa `node:crypto` y **lanza excepción** con
frontmatter inválido — correcto para el registry (un `.md` roto en disco debe fallar ruidosamente),
inaceptable en un editor donde el YAML está a medio escribir la mitad del tiempo.

[lib/forms/compile.ts](../../lib/forms/compile.ts) es el equivalente de `compileDeck`:

- `compileForm(raw)` → `{ ok, def, issues }`. **Nunca lanza.**
- Separa el frontmatter por líneas (no por regex: así el `---` de cierre tiene que ser una línea
  entera y no hay sorpresas con CRLF, BOM ni con un `---` dentro del cuerpo) y parsea con `js-yaml`.
- Reutiliza el **mismo** `frontmatterSchema.safeParse`.
- Devuelve issues con **línea aproximada**, para que el panel del editor lleve el cursor al sitio.
- Detecta lo que el esquema no puede expresar: `name` duplicado, `min >= max`, `min_select` mayor
  que el número de opciones, opciones con valor repetido.

`parse.ts` pasó a delegar en él y se quedó solo con el hash y el `throw`. Un test comprueba que
`parseForm` y `compileForm` devuelven **objetos idénticos** salvo `version`: es la garantía de que el
formato no se ha bifurcado.

`FormDefinition` se partió en dos: `FormDraft` (lo que hace falta para renderizar) y
`FormDefinition = FormDraft & { version }` (lo que produce el servidor). El navegador no calcula
hashes; la versión solo importa al enviar y al exportar.

### Modelo de datos: tabla `forms`, `responses` intacta

Migración `create_forms_table`. `responses` **no se tocó**: su `form_id` sigue guardando el id opaco
del frontmatter.

| Columna | Notas |
|---|---|
| `id` uuid PK | la URL del editor, estable pase lo que pase |
| `public_id` text unique | el `id` del frontmatter (`fk_xxx`) — lo que va en `/forms/f/[id]` |
| `title`, `client`, `status`, `slug` | **espejo** del frontmatter, re-derivado en cada guardado |
| `tags` text[] | mismo filtro por chips que la galería del deck |
| `md` text | la fuente de verdad |
| `created_at`, `updated_at` | trigger `set_updated_at`, el mismo que usa `decks` |

**Dos ids a propósito.** El uuid da una URL de editor estable; el `public_id` mantiene el `.md`
**autocontenido y portable** (se puede copiar de vuelta a `content/forms/` y funciona) y liga las
respuestas a un id que el autor ve y controla.

**El `md` manda.** Los campos espejo existen solo para listar y filtrar sin parsear cincuenta
markdowns. Si se desincronizan, gana el documento — el registry comprueba `status` sobre el `md`
compilado, no sobre la columna.

**RLS más estricta que la de `decks`**, aprovechando que se partía de cero:

```sql
create policy "anon reads published forms" on public.forms
  for select to anon using (status = 'published');
create policy "team manages forms" on public.forms
  for all to authenticated using (true) with check (true);
```

Los borradores no son legibles con la anon key **a nivel de dato**, no solo a nivel de app. Por eso
las rutas de `/api/forms` usan `supabaseAuthServer()` y no `supabaseServer()`.

### El registry es DB-first, con respaldo en fichero

`getForm` / `getPublishedForm` pasaron a ser `async`. Resuelven primero contra la tabla `forms` y,
si no encuentran el id, contra `content/forms/*.md`. Los formularios en fichero que ya están en
producción siguen sirviéndose sin tocarlos: **no hay migración forzosa**. Si un id existe en las dos
fuentes, gana la base de datos.

Es además la única opción viable: Netlify tiene el sistema de ficheros en solo lectura, así que un
maker que "escribiera `.md`" no puede existir.

Se conserva el **diseño líquido** de antes: un formulario que no compila se salta con un aviso en
consola y su URL da 404; nunca tumba la página ni a los demás.

### Ruta y acceso

`/workspace/formmak_r` y `/workspace/formmak_r/[id]`, con la **sesión de equipo del Deck Maker** — mismo login,
mismos usuarios, cero infraestructura nueva. En [middleware.ts](../../middleware.ts) es un hueco
dentro del bloque de `/forms` (que por defecto es público), siguiendo el patrón que ya existía para
`/forms/api/export`. `/api/forms` entró en `EDITOR_API`.

El guard anti-open-redirect del login se centralizó en
[lib/auth/safeNext.ts](../../lib/auth/safeNext.ts): antes vivía duplicado en `LoginForm` y en la
página de login como `raw.startsWith('/deck')`, que además dejaba pasar `/deckcualquiercosa`.

### El visor es interactivo, pero no envía

El preview monta los **componentes reales** (`HeroPanel` + `FormRenderer` + `forms.css`). Se escribe,
se marcan radios, se arrastra el ranking y se ve la validación real. `FormRenderer` recibió un único
prop opcional, `preview`: con él, el submit valida igual pero **corta antes del `fetch`** — no se
escribe nada en `responses`. La ruta pública no pasa el prop, así que su comportamiento es idéntico
al de antes.

**Trampa resuelta:** `FormRenderer` inicializa su estado con `useState(() => initialValues(def))`. Al
recompilar, el `def` cambia pero el estado persiste: los campos nuevos saldrían sin valor por defecto
y los borrados dejarían respuestas fantasma. El visor lleva una `key` con la **firma de forma** de los
campos (`[type, name, options]`), así que se remonta cuando cambia la estructura pero **no** al
retocar una etiqueta.

`forms.css` maqueta contra el viewport (`100vh`, media query a 1024px). Dentro del editor el
formulario vive en un panel, así que se añadió un escenario `.ixf-stage` que neutraliza esas dos
reglas, con `.ixf-stage--wide` para pintar a dos columnas cuando el panel mide ≥ 900 px. El ancho se
mide con `ResizeObserver` sobre el **panel**, porque una media query miraría el viewport.

## Arquitectura (archivos)

| Área | Archivo |
|---|---|
| Compilador tolerante (navegador) | [lib/forms/compile.ts](../../lib/forms/compile.ts) |
| Ediciones quirúrgicas del `md` | [lib/forms/edit.ts](../../lib/forms/edit.ts) |
| Plantilla + snippets de campo | [lib/forms/templates.ts](../../lib/forms/templates.ts) |
| Tipos de la tabla | [lib/forms/types.ts](../../lib/forms/types.ts) |
| Campos espejo | [lib/forms/mirror.ts](../../lib/forms/mirror.ts) |
| Cliente fetch de navegador | [lib/forms/api.ts](../../lib/forms/api.ts) |
| API REST | [app/api/forms/route.ts](../../app/api/forms/route.ts) · [app/api/forms/[id]/route.ts](../../app/api/forms/[id]/route.ts) |
| Dispatcher | [app/workspace/formmak_r/page.tsx](../../app/workspace/formmak_r/page.tsx) → [FormGallery](../../components/forms/maker/FormGallery.tsx) |
| Editor | [app/workspace/formmak_r/[id]/page.tsx](../../app/workspace/formmak_r/[id]/page.tsx) → [FormStudio](../../components/forms/maker/FormStudio.tsx) |
| Marca compartida | [components/studio/Wordmark.tsx](../../components/studio/Wordmark.tsx) |
| Input de etiquetas compartido | [components/studio/TagInput.tsx](../../components/studio/TagInput.tsx) |

### Qué se reutilizó en vez de duplicar

`lib/forms/schema.ts` entero, `FormRenderer`, `HeroPanel`, `Md`, `SuccessPanel`, `FieldControl`,
`forms.css`, `/forms/api/submit`, `/forms/api/export`, `lib/supabase/*`, y del estudio del deck:
`Modal`, `ConfirmModal` y los tokens de estilo de `studio/ui.ts`.

Dos piezas que estaban dentro del deck se **extrajeron a compartido** al necesitarlas los dos, para
no acabar con "mismo rol, dos valores":

- `Wordmark` — el logotipo DeckMakr/FormMakr. `DeckLogo.tsx` quedó como re-export para no tocar
  imports existentes.
- `TagInput` — chips + Enter/coma/Backspace + datalist. `DeckMetaModal` pasó a usarlo.

## Mecanismo del editor (calcado de DeckStudio)

- Dos átomos de estado: `md` (verdad) y `def` (compilado).
- Recompilado con **debounce de 250 ms**; si no compila, **se conserva el último `def` bueno** y los
  errores van al panel de issues, cada uno pulsable para saltar a su línea.
- `<textarea>` controlado en IBM Plex Mono, sin CodeMirror (el deck tampoco lo usa).
- **Autoguardado a 1400 ms** de inactividad, `savingRef` anti-solapamiento, `SaveState`, aviso
  `beforeunload` y `ConfirmModal` al navegar con cambios sucios.
- Split redimensionable, persistido en `localStorage['form.asideW']`.

**El `md` se guarda aunque no compile.** El autoguardado no puede negarse a persistir un documento a
medio escribir o se pierde el trabajo al recargar. Lo que no se refresca en ese caso son los campos
espejo: el listado conserva el último título bueno en vez de mostrar uno a medias.

## Diferencias deliberadas con la galería del deck

- **La búsqueda mira título y cliente.** La del deck solo mira `commercial_id` aunque tenga el nombre
  del cliente cargado; es una carencia conocida y no se copió.
- **La tarjeta no lleva miniatura de portada** — un formulario no tiene diapositiva 0. Usa la imagen
  `background` del frontmatter, con velo, y encima estado, título, cliente, nº de campos y nº de
  respuestas. El `md` se compila en la tarjeta para contar campos reales, no el espejo.
- **Hay estado vacío de verdad** ("aún no hay formularios"), que a la galería del deck le falta.
- **El editor está a la derecha y el visor a la izquierda**, al revés que DeckStudio. Petición
  expresa: el formulario público es hero-izquierda / campos-derecha y así se conserva la lectura.

## Ciclo de vida

| Acción | Dónde | Nota |
|---|---|---|
| Crear | galería | `FormMetaModal` → plantilla de `templates.ts` → `/workspace/formmak_r/[id]` |
| Duplicar | galería | `duplicateMd`: hereda todo menos `id` (nuevo), `slug` (fuera) y `status` (siempre borrador) |
| Borrar | galería | avisa del nº de respuestas; **las respuestas no se borran** |
| Publicar | editor | reescribe solo la línea `status:`, nunca reserializa el YAML |
| Ajustes | editor | clic en el título → `FormMetaModal`: título, cliente, acento, etiquetas, **URL, descripción, indexación y GEO** |
| Compartir | editor | copia la canónica: `/forms/f/{slug}` si hay alias, `/forms/f/{public_id}` si no |
| Exportar CSV | editor | enlaza a `/forms/api/export`, que existía y no tenía punto de entrada en la UI |

Publicar y duplicar usan `setFrontmatterValue`, que opera **sobre líneas**. Reserializar el
frontmatter con js-yaml reordenaría claves, se comería comentarios y reformatearía cadenas escritas a
mano: el `md` es del autor y solo se toca la línea que toca. Hay un test de ida y vuelta que exige
que publicar y despublicar el formulario real devuelva un texto **byte a byte idéntico** al original.

## La `slug` es la URL pública (septiembre de 2026)

Hasta aquí `slug` era **decorativa**: solo daba nombre al CSV exportado y se estampaba en cada
respuesta (`responses.form_slug`). La URL era siempre el `public_id` opaco. Y sin embargo
[lib/forms/translate.ts](../../lib/forms/translate.ts) ya decía *"`id` y `slug` son la URL
pública"* y rechazaba una traducción que la cambiara: una **norma de facto sin respaldo en el
código**, exactamente del tipo que el siguiente se salta sin querer.

Se ha resuelto **a favor de la norma escrita**: la slug pasa a ser un **alias** de la URL.

- `/forms/f/{slug}` y `/forms/f/{public_id}` resuelven al mismo formulario. El id opaco **no
  desaparece nunca** — los enlaces ya repartidos siguen vivos, y un formulario sin slug conserva
  su URL no enumerable de siempre.
- **La no-enumerabilidad del PRD §10 sigue siendo el defecto.** Un formulario nace sin alias.
  Ponerle uno es una decisión del autor, y el modal se lo dice con esas palabras: *déjalo vacío si
  el formulario es confidencial*.
- El id gana sobre la slug al resolver. No puede haber empate —la gramática de la slug prohíbe
  `_` y los ids nacen como `fk_…`— pero el orden queda escrito por si algún día se afloja.
- **Gramática** ([lib/forms/slug.ts](../../lib/forms/slug.ts)): minúsculas, dígitos y guiones
  simples, 80 caracteres, sin segmentos reservados. El modal **normaliza al teclear**, así que
  nadie tiene que adivinarla. La valida además `frontmatterSchema`, para que una slug imposible no
  llegue a publicarse.
- **Unicidad en tres capas**: el modal pregunta a `/api/forms/slug-check` mientras se escribe,
  `/api/forms[/:id]` devuelve 409 con mensaje entendible, y el índice único
  `forms_slug_key` lo garantiza de verdad
  ([migración](../../supabase/migrations/20260928100000_forms_slug_unique.sql)).
- **Duplicar ya no hereda la slug.** Heredarla habría hecho que la copia no se pudiera guardar, o
  peor, que dos formularios se disputaran la misma URL.
- El segmento de la URL se concatena dentro de un filtro `.or()` de PostgREST, así que pasa por
  `isRouteKey` antes de tocar la base de datos: todo lo que no sea `[A-Za-z0-9_-]` es un 404.

## Compartir, indexar y GEO

Tres decisiones distintas, y conviene no mezclarlas. Viven en
[lib/forms/seo.ts](../../lib/forms/seo.ts) y se editan en el mismo modal de ajustes.

| Decisión | Clave | Defecto | Qué hace |
|---|---|---|---|
| Compartir | `description` | — | Título, descripción e imagen para el unfurl de WhatsApp, Slack o LinkedIn |
| Indexar | `indexable` | `false` | Levanta el `noindex` de **ese** formulario |
| GEO | `ai_crawlers` | `block` | Directivas por agente para GPTBot, ClaudeBot, PerplexityBot, Google-Extended… |

**Compartir no es indexar.** Un enlace privado también se pega en un chat, y ahí el unfurl es lo
único que se ve. Es el criterio que ya seguía el visor de presentaciones
([app/deck/[id]/view/page.tsx](../../app/deck/[id]/view/page.tsx)): `noindex` y aun así OG
completo. Sin descripción propia se compone `Formulario para {cliente}`, la misma frase que el
deck; sin cliente no hay descripción, que es mejor que rellenarla.

**El `noindex` sigue siendo el defecto, y eso no cambia** (PRD §9, §10). Lo que cambia es **dónde**
se declara. Antes lo imponía la cabecera `X-Robots-Tag` del middleware, que es **ciega**: en el
borde no se sabe qué formulario se está pidiendo sin consultar la base de datos en cada petición, y
una cabecera fija le gana siempre a los metadatos de la página — el interruptor no habría tenido
efecto. Ahora el defecto lo declara [app/forms/layout.tsx](../../app/forms/layout.tsx), que cubre
el segmento entero (**la 404 incluida**, que no puede exportar metadatos propios) y que la página
pisa solo cuando el formulario pide ser indexable. El middleware conserva la cabecera para el
resto de `/forms`.

**La canónica importa justo ahora**, porque la slug crea un segundo camino a la misma página:
`alternates.canonical` apunta al alias si lo hay y al id si no.

**GEO** se emite como **metaetiquetas por agente** (`<meta name="GPTBot" content="noindex,
nofollow, noarchive">`), que es la convención documentada para robots meta. Límite honesto, escrito
también en el código: una metaetiqueta la lee quien decide leerla. El control duro de un rastreador
es `robots.txt` o una regla en el borde, y ninguno de los dos puede depender del formulario
concreto. Es una declaración de intenciones legible por máquina, no un cortafuegos.

Los **datos estructurados** (JSON-LD `WebPage`) se emiten **solo si el formulario es indexable**: en
una página `noindex` no los lee nadie y lo único que harían es publicar el nombre del cliente en el
HTML de un enlace privado.

Traducir un formulario **no puede** cambiar `slug`, `indexable` ni `ai_crawlers`: el verificador de
`translate.ts` los trata como identificadores y ajustes, no como contenido. Una traducción que
decidiera por el autor si su formulario sale en Google se rechaza entera.

## Pendiente / avisos

- **El acento vs. `lib/tokens.ts`.** Los tres acentos **identifican un servicio** (Opal =
  pensamiento estratégico, Burdeos = diseño de experiencias + rol de alerta, Esmeralda =
  transformación cultural). El MVP de forms permite elegir acento libremente por formulario, que es
  usarlos como decoración, y FormMaker hace esa elección más visible y más frecuente. El selector
  etiqueta cada acento con su servicio para que la elección sea consciente, pero **la norma sigue sin
  cubrir este caso**. Decisión de Alberto: o se declara un `uiRole` para los acentos en forms, o el
  selector debería atarse al servicio del proyecto.
- **`Wordmark` usa IBM Plex Mono 700**, y `tokens.ts` declara 400/500/600 para la tipografía de
  marca. Viene del `DeckLogo` original; al extraer el componente compartido se conservó el valor tal
  cual para no cambiar el diseño del deck por la puerta de atrás, pero ahora está en un solo sitio.
- **`colors.brick` (`#C24B36`)** en `studio/ui.ts` es el acento del cursor de los logotipos y **no
  está en `lib/tokens.ts`**. Norma de facto sin documentar.
- `massimo-dutti.md` sigue en fichero. El respaldo lo hace innecesario; migrar cuando haya confianza.
- `forms-persistencia-supabase.md` cita `content/forms/prework-taller-acme.md` como ejemplo de
  referencia, y ese fichero ya no existe (se borró en un commit posterior).
- **No hay `lang` en el frontmatter.** El JSON-LD declara `inLanguage: 'es'` porque es lo que dice
  `app/layout.tsx` para todo `/forms`, pero `translate.ts` ya produce formularios en catalán e
  inglés y nada lo registra. Un formulario traducido e indexable declararía un idioma falso. Si la
  indexación se usa de verdad, esto necesita una clave.
- **La comprobación de slug tiene una ventana de carrera** de unos segundos entre
  `/api/forms/slug-check` y el guardado. La pierde quien guarde segundo, con el 409 y su mensaje;
  la garantía dura es el índice único.
