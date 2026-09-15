# DSMak_r — plan de implementación (fase 1)

> Plan de análisis de la fase 1 del prompt de [ds-mak-r.md](ds-mak-r.md).
>
> **Aprobado por Carlos el 2026-09-15**, con las propuestas de H1–H7 tal como están escritas: en H3,
> guardar los valores sorteados; en H7, concurrencia optimista con 409. En H6 queda pendiente de
> Alberto una sola cosa, la escala tipográfica de la plantilla. Mientras tanto, la plantilla usa la
> escala del motor.

**Objetivo:** llevar el prototipo de DS Maker al workspace como DSMak_r, con persistencia en
Supabase, el motor determinista portado a `lib/ds/` y la interfaz de cuatro pasos en castellano.

**Arquitectura:** el motor corre en el navegador y es una función pura
`brand + overrides → tokens`. El servidor solo persiste. La galería y el editor calcan el par de
FormMak_r. El autoguardado se extrae a un hook que pasan a usar las tres herramientas.

**Stack:** Next 15 (App Router), React 19, Zod 4, Supabase (Postgres + Storage), `node --test` con
`--experimental-strip-types`.

**Spec:** [docs/features/ds-mak-r.md](ds-mak-r.md) · prototipo en `prototipos/ds-maker/` (las
referencias `línea N` de este documento apuntan a `prototipo.app.js`).

## Restricciones globales

- Castellano en toda la interfaz, sin next-intl. Sin puntos suspensivos, tampoco en marcadores de
  posición ni en estados de carga (`Cargando` sin `…`).
- Chrome: IBM Plex Serif 300/400 y IBM Plex Mono 400/500/600, sin cursiva. La previsualización y el
  styleguide usan las fuentes y pesos del cliente y no siguen esta norma.
- Colores del chrome: `components/deck/studio/ui.ts` y `lib/tokens.ts`. Alerta = Burdeos `#99335F`.
- La validación nunca lanza: devuelve incidencias.
- `tokens` no se recalcula en silencio.
- `lib/ds/*` sin React y sin alias `@/`: imports relativos con extensión `.ts`, como `lib/forms/`,
  para que `node --test` los ejecute.
- Rutas de API con `requireUser()` + `supabaseAuthServer()`; errores de base de datos con `dbFail`.

---

## 0. Hallazgos que cambian la definición

La definición pide decir aquí lo que choca, con el dato en la mano, antes de escribir código. Son
diez. Los cuatro primeros afectan al modelo y hay que cerrarlos antes del bloque 1.

### H1 · El prototipo no tiene capa de `overrides` **[decide]**

**Dato.** En el prototipo el paso 2 edita `tokens` directamente: copia el objeto, lo modifica y lo
guarda entero (`Q0`, línea 4514: `d(JSON.parse(JSON.stringify(t)))` → `e(s)`). Y el botón
"Generar" del paso 1 vuelve a llamar a `L0(brand)` y **sobrescribe todos los tokens**, incluidas
las ediciones manuales y los bloqueos (`Pt`, línea 7082). La definición dice que mandan `brand` y
`overrides` y que `tokens` es derivado. Ese modelo no existe en el prototipo: hay que diseñarlo.

**Propuesta.** Composición pura y determinista:

```
tokens = applyOverrides(generateTokens(brand), overrides)
```

- Lo **estructural** vive en `brand`: familias de color (incluidas las que se añaden en el paso 2
  con "Añadir color", que el prototipo ya mete en `brand.colors` desde el paso 1, línea 3985),
  breakpoints y retícula.
- Lo **escalar** vive en `overrides`, como parche disperso: una muestra concreta, un tamaño de
  texto, un valor de espaciado, un radio o una sombra.
- Cambiar el color base de una familia en el paso 2 escribe en `brand.colors`, no en `overrides`.
- Si un override apunta a un token que ya no existe (se borró la familia, por ejemplo),
  `compileSystem` lo señala como incidencia y el override se ignora. No se borra solo.

Resultado: volver al paso 1 y cambiar la tipografía **no** pierde las muestras editadas a mano,
cosa que en el prototipo sí pasa.

### H2 · El bloqueo del prototipo no hace lo que dice la definición **[decide]**

**Dato.** La definición habla de "bloqueo por color y regeneración de la rampa alrededor de lo
bloqueado". En el prototipo el bloqueo es **por familia**, no por muestra (`locks[family]`, línea
4604). Además lo único que hace es ocultar el botón "Regenerate scale" (línea 4626). "Generar" lo
ignora.

**Propuesta.** Bloqueo por familia con efecto real: bloquear guarda la rampa actual en
`overrides.locks[family]`, y `applyOverrides` la aplica por encima de lo que genere el motor.
Cambiar el primario, la armonización o el alto contraste ya no toca una familia bloqueada.
Regenerar una rampa **alrededor** de una muestra fijada es un algoritmo nuevo, no un port. Lo dejo
en Pendiente salvo que se quiera en esta versión.

### H3 · "Regenerate scale" usa `Math.random` **[decide]**

**Dato.** Línea 4635: `chromaBoost: .9 + Math.random() * .35`, `hueShift: (Math.random() - .5) * 10`.
Rompe la invariante de la definición: los mismos parámetros dan los mismos tokens.

**Propuesta.** El botón sortea los dos números en la interfaz y los **guarda** en
`overrides.rampTweaks[family] = { chromaBoost, hueShift }`. El motor sigue siendo puro y la
variación se reproduce al reabrir. La alternativa es quitar el botón.

### H4 · Versión del motor distinta: qué hace el editor **[decide]**

**Dato.** Con la composición de H1 cualquier edición recalcula `tokens` con el motor actual. Si un
sistema se abre con un `engine_version` antiguo, tocar un solo control lo regeneraría entero:
justo el recálculo silencioso que la definición prohíbe.

**Propuesta.** Con versión distinta, el editor abre en **solo lectura**, con los `tokens` guardados
y un aviso con dos salidas: "Regenerar con el motor actual" (recalcula, muestra la diferencia de
tokens y desbloquea) o seguir en lectura. La entrega del paso 4 sigue disponible desde los tokens
guardados.

### H5 · El aviso de contraste no existe en el motor

**Dato.** `Ka` (línea 853) mide cada muestra contra el mejor de dos colores de texto, `#FFFFFF` o
`#111111`. No mide nada "sobre el fondo". La verificación manual 9 de la definición ("un primario
que no llegue a AA sobre el fondo claro") no la puede cumplir el motor tal como está. Además `Ka`
etiqueta el rango 3–4,5 como `"AA+"`. En WCAG ese rango es **AA para texto grande**, y
"AA+" sugiere lo contrario.

**Propuesta.** Una función nueva, `contrastWarnings(tokens, mode)`, con dos comprobaciones:
(a) el texto recomendado sobre `primary` 500/600/700 por debajo de 4,5:1, y (b) `primary.500`
sobre `canvas` por debajo de 4,5:1 (uso como color de enlace o texto). La etiqueta pasa a
`AA grande`. El resultado alimenta el aviso Burdeos de la muestra y el del styleguide.

### H6 · La plantilla Interactius choca con dos reglas duras **[decide · Alberto]**

**Dato 1, pesos.** El motor fija los pesos por rol: display y H1–H2 a 700, H3–H6 a 600 (`DC`,
línea 1150). Con la plantilla de marca saldría IBM Plex Serif a 700 y 600, cuando `lib/tokens.ts`
declara Serif `[300, 400]`. Es el único sitio de la herramienta donde la norma sí aplica al
resultado, así que ahí no se puede dejar pasar.

**Dato 2, colores.** El motor necesita un primario y un secundario. `lib/tokens.ts` no tiene esos
roles, y los tres acentos identifican servicios: poner Burdeos o Esmeralda de secundario sería
usarlos como decoración.

**Dato 3, escala.** La escala del motor es modular (base × ratio). `lib/typeScale.ts` son siete
peldaños `clamp()` con uso declarado. La plantilla no reproduciría la escala canónica.

**Propuesta.**
- Añadir a `brand` los pesos por rol, `weights: { display, heading, body }`, con 700/600/400 por
  defecto (lo que hace hoy el prototipo). La plantilla los lee de `lib/tokens.ts`: Serif 300/400,
  Mono 400.
- Plantilla: primario `Dark #1C1A17`, secundario `Ash Dark #46433F`, neutros en gris cálido, radio
  `Sharp`, y `error` sustituido por Burdeos mediante override, que es su rol de interfaz declarado.
  Sin Opal ni Esmeralda.
- Escala: la del motor, documentada como desviación, igual que ya se documentó la del deck. O bien
  tamaños fijados por override a los máximos de `typeScale.ts`. Esto lo tiene que decidir Alberto.

### H7 · La comprobación 5 exige algo que no existe en ninguna herramienta **[decide]**

**Dato.** "Cambiar un color con el editor abierto en otra pestaña y comprobar que el autoguardado
no pisa lo que la otra escribió sin avisar". Hoy DeckStudio y FormStudio hacen `update … eq('id')`:
la última escritura gana, sin aviso. No hay nada que reutilizar.

**Propuesta.** Concurrencia optimista, que es barata. El PATCH envía `expectedUpdatedAt`, el
handler actualiza con `.eq('id', id).eq('updated_at', expected)` y, si no toca ninguna fila y la
fila existe, devuelve **409**. El hook de autoguardado añade el estado `conflict`, que no
reintenta, y el editor muestra un `ConfirmModal`: "Otra pestaña guardó cambios. Recargar / Guardar
encima". Solo DSMak_r lo activa en esta versión; decks y forms quedan como están. La alternativa es
quitar la comprobación 5.

### H8 · La comprobación de retícula no tiene objeto

**Dato.** La definición pide detectar "una retícula con menos columnas que las que usa un
componente configurado". Ninguno de los 17 componentes (`Tn`, líneas 2860–3300) usa columnas de
retícula. La comprobación sería código muerto.

**Propuesta.** Quitarla. En su lugar, algo que sí pasa en el prototipo: el styleguide cruza
breakpoints y retícula **por nombre** (línea 6408), así que renombrar uno sin el otro deja la tabla
con guiones. Eso sí es incidencia.

### H9 · Nombres de familia que acaban en CSS

**Dato.** Las familias de color son claves libres (`custom3`, línea 4675) que el exportador mete
tal cual en `--ds-${family}-${step}` (línea 1489). Un nombre con espacios o signos rompe la hoja,
y `neutral`, `success`, `warning`, `error` e `info` los pisa el motor (línea 1317).

**Propuesta.** El esquema exige `^[a-z][a-z0-9-]*$` y reserva esos cinco nombres. Colisión = error
de `compileSystem`.

### H10 · Google Fonts: un nombre mal escrito tumba las dos tipografías

**Dato, medido hoy.** `css2` devuelve 200 aunque se pidan pesos que la familia no tiene: sirve los
que hay (Space Mono con `400;500;600;700` → 200, dos `@font-face`). Pero un nombre de familia que no
existe devuelve **400**, y el prototipo pide titular y cuerpo en la **misma** URL (`$u`, línea
1479). Con el campo libre de tipografía, una errata deja sin fuentes la previsualización y el
styleguide enteros.

**Propuesta.** Un `<link>` por familia, en el editor y en el styleguide exportado. La lista curada
no necesita guardar los pesos disponibles.

---

## 1. Modelo de datos

Comprobado en el proyecto `brand-guidelines` (`gcvzzpggpsnlwqnotfqv`) el 2026-09-15: la función
`public.set_updated_at` existe y la usan `decks_set_updated_at` y `forms_set_updated_at`; la tabla
`design_systems` no existe; el bucket `deck-assets` es público, con límite de 10 MB y MIME
`jpeg/png/webp/avif/svg+xml`.

Migración `supabase/migrations/<ts>_create_design_systems.sql`, **aditiva**:

```sql
begin;

create table public.design_systems (
  id             uuid primary key default gen_random_uuid(),
  public_id      text not null unique,
  name           text not null,
  client         text,
  status         text not null default 'draft' check (status in ('draft', 'published')),
  tags           text[] not null default '{}',
  brand          jsonb not null,
  overrides      jsonb not null default '{}',
  tokens         jsonb not null,
  configs        jsonb not null default '{}',
  engine_version text not null,
  logo_path      text,
  logo_dark_path text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null default auth.uid()
);

create trigger design_systems_set_updated_at
  before update on public.design_systems
  for each row execute function public.set_updated_at();

create index design_systems_updated_at_idx on public.design_systems (updated_at desc);
create index design_systems_created_by_idx on public.design_systems (created_by);

alter table public.design_systems enable row level security;

create policy design_systems_team on public.design_systems
  for all to authenticated using (true) with check (true);

revoke all on public.design_systems from anon;

commit;
```

**Cambio respecto a la definición: la RLS.** La definición propone cuatro políticas con
`auth.role() = 'authenticated'`. El repo usa otra forma, en `tighten_rls.sql` y en `forms`: una
política `for all to authenticated`, más `revoke all from anon` para que desactivar la RLS un
momento no abra la tabla. Adopto la del repo. El efecto es el mismo, pero dos formas para el mismo
rol es la incoherencia que CLAUDE.md pide evitar. `created_by` sigue exactamente el patrón de
`created_by_seam.sql`.

**No se toca:** `decks`, `forms`, `responses`, `clients`, `images`, `signatures`, `rate_limits`, ni
las políticas de Storage.

**Storage.** Bucket `deck-assets`, prefijo `ds/<id>/`, ficheros `logo.<ext>` y `logo-dark.<ext>`.
- La subida la hace el navegador con la sesión, igual que `uploadLogo`. `accept` se limita a los MIME
  que admite el bucket; el prototipo acepta `image/*` (línea 3880) y un GIF fallaría en el servidor.
- El logo se pinta siempre como `<img>` y nunca como SVG inline, por la regla de XSS que ya existe.
- **Borrar** el sistema borra antes el prefijo en el servidor (`storage.list` + `remove`), con el
  patrón de `app/api/images/[id]/route.ts`. Si falla el borrado del fichero, se registra y la fila
  se borra igual.
- **Duplicar** copia los ficheros al prefijo nuevo (`storage.copy`) y guarda las rutas nuevas.
  Cubre la comprobación 10.

**Aplicación.** Aplicar la migración escribe en la base de datos de producción: no hay entorno de
pruebas. Se aplica en el bloque 2 **con tu confirmación explícita**, desde el fichero del repo.

## 2. Esquema y validación

### Por qué no hay markdown (comprobación de que lo entiendo)

En DeckMak_r y FormMak_r el `md` es el texto del autor. Se guarda aunque no compile porque es
trabajo de una persona a medio escribir, y el compilador tolera ese estado intermedio. En DSMak_r
nadie escribe texto: todo entra por controles con valores acotados. Un `.md` sería una gramática
inventada que nadie teclea. Lo que se conserva del patrón es la propiedad importante: **abrir una
fila vieja o dañada nunca revienta el editor**. Y aquí se puede ir más lejos que en forms, porque
un control nunca produce un estado a medio escribir: lo inválido solo llega desde filas antiguas o
editadas a mano.

### Tipos (en `lib/ds/schema.ts`, inferidos de Zod)

```ts
Brand = {
  name: string; client: string | null;
  mode: 'light' | 'dark' | 'both'; highContrast: boolean;
  colors: Record<FamilyKey, Hex>;            // incluye primary y secondary, obligatorios
  neutralPreset: 'pure' | 'warm' | 'cool' | 'primary-tint';
  harmonize: boolean;
  fonts: { heading: string; body: string };
  weights: { display: number; heading: number; body: number };   // H6
  baseSize: number; ratio: number;
  shadow: 'none' | 'subtle' | 'medium' | 'pronounced';
  radiusStyle: 'sharp' | 'subtle' | 'playful' | 'round' | 'full';
  spacingUnit: number; density: 'compact' | 'regular' | 'relaxed';
  breakpoints: { name: string; min: number; max: number | null }[];
  grid: { name: string; columns: number; margin: number; gutter: number }[];
}

Overrides = {
  swatches?:   Record<`${FamilyKey}.${Step}`, Hex>;
  locks?:      Record<FamilyKey, Ramp>;                            // H2
  rampTweaks?: Record<FamilyKey, { chromaBoost: number; hueShift: number }>;  // H3
  semantic?:   Record<`${SemanticKey}.${50|100|200}`, Hex>;
  typography?: Record<TypeKey, Partial<{ size: number; weight: number; lineHeight: number; letterSpacing: number }>>;
  spacing?:    Record<SpaceName, number>;
  radius?:     Record<RadiusName, number>;
  radiusMap?:  Record<string, RadiusName>;
  shadows?:    Record<ShadowName, Partial<Shadow>>;
}

ComponentConfig = {
  variant: string | null; intention: string | null; size: string | null; state: string | null;
  anatomy: Record<string, string | boolean>;
  props: Record<string, number | string>;   // SOLO lo que el usuario ha cambiado (disperso)
  note: string;
}
Configs = Record<ComponentKey, ComponentConfig>
```

Los identificadores de enumeración van en inglés y en minúscula, y la interfaz los muestra en
castellano. El prototipo guardaba las etiquetas visibles como valor ("Gris frío", "Subtle").

**Cambio en `configs.props`.** El prototipo guarda las props **calculadas** (`to`, línea 3303) y
por eso se quedan viejas cuando cambian los tokens: tiene un botón "regenerar componente" para
arreglarlo (línea 5870). Guardando solo las props que el usuario cambió, los valores por defecto se
calculan siempre desde los tokens y la talla actuales, y el botón deja de hacer falta.

### `compileSystem`

```ts
type DsIssue = { level: 'error' | 'warning'; path: string; message: string };

compileSystem(row: unknown): {
  ok: boolean;
  system: { brand: Brand; overrides: Overrides; configs: Configs; tokens: Tokens } | null;
  issues: DsIssue[];
  engineMismatch: boolean;
}
```

1. `safeParse` de cada columna por separado. Lo que falle se rellena campo a campo con
   `defaultBrand()` y queda anotado con su ruta (`brand.fonts.heading`).
2. `ok: false` solo cuando no hay forma de reconstruir un `brand` usable (sin `primary` válido). En
   ese caso el editor muestra los `tokens` guardados en lectura, más las incidencias.
3. Comprobaciones que el tipo no puede expresar:
   - un bloqueo o override sobre una familia o token que no existe (aviso, se ignora);
   - un breakpoint cuyo `min` no supera el `max` del anterior (error);
   - una retícula sin breakpoint del mismo nombre, o al revés (aviso, H8);
   - un nombre de familia reservado o que no sirve para CSS (error, H9);
   - `engine_version` distinto de `ENGINE_VERSION` (aviso, más `engineMismatch: true`, H4).

`IssuesPanel` hoy salta a una **línea** del md. Aquí no hay líneas: el panel se generaliza
(tipo `{ level, path, message, line? }` y `onJump` opcional) y en DSMak_r pulsar una incidencia
lleva al paso donde está el campo.

## 3. El motor

| Qué | Prototipo | Destino | Tratamiento |
|---|---|---|---|
| sRGB ↔ OKLab ↔ OKLCH, clamp, hex | `tn`, `Cf`, `zC`, `Pu`, `B0`, `MC`, `wC`, `Ml` (741–806) | `engine/color.ts` | Se porta tal cual, con tipos |
| Mapeo a gama por bisección de croma (24 iteraciones) | `S2`, `sa` (807–835) | `engine/color.ts` | Tal cual. Conserva L y h y recorta C |
| Luminancia y ratio WCAG, texto recomendado | `T2`, `H0`, `wl`, `Ka` (837–862) | `engine/contrast.ts` | Se porta. `AA+` pasa a `AA grande` y se añade `contrastWarnings` (H5) |
| Rampa 50→900 | `Pa` + tablas `fa`/`Tf`/`C2` (863–884) | `engine/ramp.ts` | Tal cual. **Ojo:** el color de entrada se incrusta exacto en el escalón de L más cercana (línea 883). No es un bug, es lo que garantiza que el hex del cliente aparece en su rampa, y lo cubre un test |
| Neutros por preset | `Ef`, `ec` (885–912) | `engine/ramp.ts` | Tal cual, con ids en inglés |
| Semánticos | `AC`, `zf`, `nc`, `qu` (913–961) | `engine/semantic.ts` | Tal cual. "Armonizar" no desplaza el tono: **sube el croma** hacia el del primario (`u.C*.6 + max(C,.06)*.7`). Lo anoto porque el nombre engaña |
| Derivar secundario y acento | `U0` (963–973) | `engine/derive.ts` | Tal cual (+152° y −42°) |
| Presets: ratios, tamaños, radios, sombras, densidad, espaciado, roles de texto, breakpoints, retícula | 983–1276 | `engine/presets.ts` | Datos, con ids en inglés y etiquetas aparte |
| Parámetros por defecto | `wf` (1277) | `engine/presets.ts` → `defaultBrand()` | Se porta con `weights` añadido (H6) |
| Brand → tokens | `L0` (1309) | `engine/generate.ts` → `generateTokens(brand)` | Se porta **sin** `locks` (van a overrides) y leyendo `brand.weights` en vez de pesos fijos. La compresión de los pasos altos (`m>3 → 3+(m-3)*.72`) y el tracking negativo desde 24 px, tal cual |
| Overrides | no existe | `engine/overrides.ts` → `applyOverrides(tokens, overrides)` | **Nuevo** (H1, H2, H3) |
| Superficies claro/oscuro | `Rl` (1385) | `engine/surfaces.ts` | Tal cual |
| Tokens → JSON | `A2` (1406) | `export/json.ts` | Se porta con `generatedAt` **inyectado** como parámetro, para que la salida sea determinista y testeable |
| Tokens → CSS | `F0`, `Af`, `qa` (1482–1527) | `export/css.ts` | Se porta. `@import` de fuentes una por familia (H10) |
| URL de fuentes | `$u` (1479) | `fonts.ts` | Reescrito: un enlace por familia |
| Tokens para previsualizar | `ja` (1536) | `engine/resolve.ts` | Tal cual |
| Catálogo de 17 componentes | `Tn`, `to`, `eo`, `N2` (1530, 2860–3328) | `components.ts` | Solo **datos**: ejes, anatomía y `props(tokens, scale)`. Los `render` (JSX, ~1300 líneas entre 1560 y 2860) van a `components/ds/previews/`, no a `lib/` |
| Styleguide HTML | `x3`, `L6`, `Gt` (6238–6450) | `export/styleguide.ts` | Se porta. `Gt` ya escapa `&<>"` y se aplica a nombre, notas y ejes; se añade `'` y un test. El HTML de cada componente **entra como parámetro** (ver riesgo R3) |
| Descarga y portapapeles | 404–416 | `components/ds/` | Se reescribe mínimo |
| Hoja de estilos `x2`, semilla `X6`/`G6`, progreso falso `Pt`, enlace `blob:` | 425, 6963, 7078, 6517 | — | **Se tira** |

`ENGINE_VERSION = '1'` vive en `lib/ds/engine/version.ts`. Un test *golden* compara
`generateTokens(defaultBrand())` con un fixture JSON versionado: si el algoritmo cambia sin subir
la versión, el test falla. Así la invariante de H4 no depende de acordarse.

**Lo que no entiendo del todo y no porto a ciegas:**
- Los coeficientes de `Tf` (luminosidad por escalón) y `C2` (reparto de croma) no tienen origen
  declarado. Se portan como constantes con nombre y un comentario que lo dice: no hay criterio para
  cambiarlos.
- El desplazamiento `aaa` (+0,018 en claros, −0,022 en oscuros) no garantiza AAA; solo empuja en esa
  dirección. En la interfaz se llamará "alto contraste", no "AAA", salvo que el test demuestre lo
  contrario.

## 4. Arquitectura de ficheros

```
NUEVO
  lib/ds/engine/color.ts, contrast.ts, ramp.ts, semantic.ts, derive.ts, presets.ts,
               generate.ts, overrides.ts, surfaces.ts, resolve.ts, version.ts
  lib/ds/engine/index.ts        composeTokens(brand, overrides) — único punto de entrada del motor
  lib/ds/schema.ts              Zod de brand, overrides, tokens y configs + tipos inferidos
  lib/ds/compile.ts             compileSystem
  lib/ds/components.ts          catálogo de datos de los 17 componentes
  lib/ds/export/json.ts, css.ts, styleguide.ts
  lib/ds/fonts.ts               lista curada (27 familias del prototipo, línea 3738) y URLs
  lib/ds/template.ts            plantilla Interactius, leída de ../tokens.ts (H6)
  lib/ds/api.ts                 cliente fetch de /api/design-systems (calco de lib/forms/api.ts)
  lib/ds/types.ts               tipos de fila y de listado
  lib/ds/__tests__/engine.test.ts, engine.golden.test.ts, overrides.test.ts, compile.test.ts,
                  export.test.ts, template.test.ts, fixtures/default-tokens.json
  lib/hooks/useAutosave.ts      hook compartido
  lib/hooks/autosaveCore.ts     lógica pura del hook (backoff, cuándo programar), testeable en node
  lib/hooks/__tests__/autosaveCore.test.ts
  lib/storage/logos.ts          subida de logo con prefijo (extraída de lib/decks/api.ts)
  app/api/design-systems/route.ts          GET lista (con tira de color calculada), POST crea o duplica
  app/api/design-systems/[id]/route.ts     GET, PATCH (con 409), DELETE (con limpieza de Storage)
  app/workspace/dsmak_r/page.tsx
  app/workspace/dsmak_r/[id]/page.tsx
  components/ds/DsGallery.tsx, DsCard.tsx, DsMetaModal.tsx
  components/ds/DsStudio.tsx               estado, autoguardado, paso activo
  components/ds/DsToolbar.tsx              wordmark, paso, guardado, sello
  components/ds/steps/BrandStep.tsx, FoundationsStep.tsx, ComponentsStep.tsx, DeliveryStep.tsx
  components/ds/preview/Preview.tsx        contenedor con variables --ds-*
  components/ds/previews/*.tsx             los 17 renders
  components/ds/Swatch.tsx, RampRow.tsx, ContrastBadge.tsx, EngineMismatchBanner.tsx
  supabase/migrations/<ts>_create_design_systems.sql
  docs/features/ds-mak-r-plan.md           este documento

MODIFICADO
  lib/decks/api.ts                         uploadLogo reexporta desde lib/storage/logos.ts
  components/deck/DeckStudio.tsx           pasa a useAutosave
  components/forms/maker/FormStudio.tsx    pasa a useAutosave
  components/forms/maker/IssuesPanel.tsx   tipo genérico y onJump opcional
  components/studio/Wordmark.tsx           + DsLogo (3 líneas, como DeckLogo y FormLogo)
  lib/workspace/catalog.ts                 dsmakr: href y descripción
  lib/workspace/__tests__/catalog.test.ts  href de dsmakr y el comentario de "deshabilitadas"
  middleware.ts                            '/api/design-systems' en EDITOR_API
  package.json                             glob de tests: lib/ds/__tests__ y lib/hooks/__tests__
  docs/features/urls-workspace.md          las dos rutas
  docs/features/ds-mak-r.md                decisiones movidas por H1–H10 (en la fase 3)
```

La definición decía que `Wordmark` e `IssuesPanel` se usan "tal cual, sin tocar". Los dos necesitan
un cambio pequeño, y por eso están en MODIFICADO.

## 5. Reutilización y las dos extracciones

**Tal cual:** `BrandMark`, `MarkDivider`, `SearchField`, `FilterBar`, `TagInput`, `CardActions`,
`LogoutButton`, `Modal`, `ConfirmModal`, los estilos de `ui.ts`, y `requireUser`,
`supabaseAuthServer`, `dbFail` y `supabaseBrowser`.

**Cabecera.** Las galerías de deck y forms usan `LogoutButton`; `UserMenu`, con la foto, solo está
en el dispatcher desde `0dab54a`. DSMak_r sigue a las galerías. Si la foto va a llegar a todas, es
un cambio aparte para las tres a la vez.

### Extracción 1 · `useAutosave`

Las dos copias hacen lo mismo con diferencias pequeñas: Deck desactiva el guardado sin
`currentDeckId` y lleva un `eslint-disable`; Form acepta valores explícitos en `saveNow(md, tags)`.

```ts
useAutosave<T>(opts: {
  enabled: boolean;                        // Deck: !!currentDeckId · Form: !!record
  value: T;                                // Deck: { md, meta } · Form: { md, tags }
  save: (value: T) => Promise<void>;       // lanza ConflictError → estado 'conflict', sin reintentos
  delay?: number;                          // 1400
  maxRetries?: number;                     // 3
}): {
  saveState: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  dirty: boolean;
  saveNow: (override?: T) => Promise<void>;
  retry: () => void;                       // pone reintentos a 0 y guarda
  markSaved: (value: T) => void;           // tras la carga inicial
}
```

El `beforeunload` va dentro del hook. `withGuard` y su `ConfirmModal` se quedan en cada componente,
que ya tiene `dirty`. El "Guardar como" de Deck sin id sigue siendo del componente.

**Migración sin romper nada.** Primero el hook con sus tests de `autosaveCore`. Luego FormStudio,
en un commit propio, porque es la copia más limpia. Luego DeckStudio, en otro commit. Tras cada uno
se verifica a mano en `npm run dev`: escribir y ver "Guardado", cortar la red y ver tres reintentos
y el botón, recargar con cambios pendientes y ver el aviso, publicar o cambiar metadatos y ver el
guardado inmediato. **Recomiendo que sea un bloque aparte (5a), antes del editor de DSMak_r**: toca
dos herramientas en producción, y así, si algo se rompe, se revierte sin arrastrar lo demás.

### Extracción 2 · subida de logo

`lib/storage/logos.ts` exporta `uploadLogo(file, prefix = 'logos')`. `lib/decks/api.ts` lo reexporta
y DeckMak_r no cambia ni una línea de llamada. DSMak_r lo llama con `ds/${id}` y un nombre fijo.

## 6. Middleware, catálogo y URLs

- `middleware.ts:12` añade `'/api/design-systems'` a `EDITOR_API`. Las páginas ya están cubiertas
  por el bloque `/workspace/*`.
- `lib/workspace/catalog.ts`, entrada `dsmakr`: `href: '/workspace/dsmak_r'` y
  `description: 'Design systems'`. La posición no cambia.
- `catalog.test.ts:84`: `assert.equal(byId.get('dsmakr')?.href, '/workspace/dsmak_r')`. El test del
  orden sigue igual; su comentario ("las deshabilitadas van las últimas") deja de ser cierto con
  `dsmakr` encendida delante de `socialmakr`, y se reescribe.
- `docs/features/urls-workspace.md`: dos filas, `/workspace/dsmak_r` (galería de design systems) y
  `/workspace/dsmak_r/[id]` (editor). Nada en la tabla pública.
- `.env.example`: **ninguna variable nueva**. Confirmado: no hay modelo ni clave, y Storage usa el
  cliente con la sesión que ya existe.
- `lib/auth/legacyRoutes.ts`: sin cambios.

## 7. Plan de tests

Glob de `package.json`: se añaden `lib/ds/__tests__/*.test.ts lib/hooks/__tests__/*.test.ts`.

| Test | Invariante |
|---|---|
| `engine.test.ts` · determinismo | `composeTokens(b, o)` dos veces da `deepEqual`, en varios brands |
| `engine.test.ts` · rampa | L de OKLCH decrece estrictamente de 50 a 900, con y sin alto contraste |
| `engine.test.ts` · entrada | el hex de entrada aparece exacto en su rampa |
| `engine.test.ts` · gama | todo hex generado es `#RRGGBB` válido (el recorte funciona) |
| `engine.test.ts` · contraste | `contrast('#FFFFFF','#000000') = 21`, `('#777777','#FFFFFF') ≈ 4,48` → no llega a AA; niveles en 3 / 4,5 / 7 |
| `engine.test.ts` · espaciado | todos los valores son pares y ≥ 2; la densidad los escala |
| `engine.golden.test.ts` | `generateTokens(defaultBrand())` coincide con el fixture; si falla, se sube `ENGINE_VERSION` |
| `overrides.test.ts` | un override de muestra gana; una familia bloqueada no cambia al cambiar el primario; `rampTweaks` reproduce la misma rampa; un override huérfano se ignora sin lanzar |
| `compile.test.ts` | una fila válida no da incidencias; `brand` corrupto → incidencias con ruta y **no lanza** (incluye `null`, strings y arrays donde van objetos); versión antigua → `engineMismatch`; breakpoint solapado → error; familia `error` o `Mi Color` → error |
| `export.test.ts` | CSS: una variable `--ds-` por token y ninguna repetida; JSON: forma estable con `generatedAt` inyectado; styleguide: `<script>alert(1)</script>` en nombre y nota sale escapado; un `<link>` de fuentes por familia |
| `template.test.ts` | la plantilla Interactius usa solo pesos de `typography.*.weights` de `lib/tokens.ts` y ningún hex de `colorsAccent` salvo Burdeos en `error` |
| `autosaveCore.test.ts` | backoff 1400 / 2800 / 5600 y parada al tercer fallo; `conflict` no reintenta |
| `catalog.test.ts` | ruta de `dsmakr` y orden de las tarjetas |

Más `npm run type-check`, `npm run lint` y `npm run build` limpios al cerrar cada bloque.

## 8. Riesgos y decisiones abiertas

### Las cuatro de la definición · **decididas** (Carlos, 2026-09-15: según la recomendación)

| Pregunta | Decisión |
|---|---|
| Cliente, ¿texto o relación? | **Texto**, como en `forms`. De acuerdo con la definición: `clients` está pensada para decks (logo, correos) |
| Etiquetas | **Desde el primer día**, con `TagInput` y `FilterBar`. De acuerdo |
| Pasos o split | **Pasos**. Con persistencia, un sistema nace ya generado al crearlo, así que los cuatro pasos están disponibles desde el principio. El prototipo bloqueaba del 2 al 4 hasta pulsar "Generar" (línea 7025); ese botón desaparece porque el cálculo es en vivo |
| Aviso de motor antiguo | **En el editor**, en solo lectura hasta regenerar (H4) |

### Las nuevas

Las decisiones de H1, H2, H3, H4, H6 y H7, arriba.

### Riesgos

- **R1 · Tamaño del bloque de editor.** Solo los renders de los 17 componentes son unas 1300 líneas
  del prototipo, más el paso 3 (~470) y el paso 4 (~500). Por eso el bloque 5 de la definición se
  parte en cuatro (abajo).
- **R2 · El refactor del autoguardado** toca DeckStudio y FormStudio, que están en producción.
  Mitigación: bloque 5a aislado y verificación manual de las dos herramientas.
- **R3 · Styleguide y `react-dom/server`.** El prototipo genera el HTML de los componentes con
  `renderToStaticMarkup` en el navegador. Importar `react-dom/server` desde un componente cliente en
  el App Router no está probado en este repo. Mitigación: `export/styleguide.ts` recibe el HTML ya
  hecho (así el test en node no necesita React), y el paso 4 lo obtiene con `renderToStaticMarkup` o,
  si Next lo rechaza, pintando en un contenedor oculto y leyendo `innerHTML`. Se prueba al empezar el
  bloque 5d.
- **R4 · Migración en producción** sin entorno de pruebas. Es aditiva y no toca nada existente; aun
  así, se aplica con tu confirmación.
- **R5 · Tamaño de las filas.** `tokens` completo más `configs` rondará 30–60 KB por fila. El GET de
  la lista **no** lo devuelve: calcula la tira de color en el servidor y selecciona solo lo necesario.

## Fase 2 · bloques, con el ajuste propuesto

1. **Motor y esquema.** `lib/ds/engine/*`, `schema.ts`, `compile.ts`, `components.ts`, `export/*`,
   `fonts.ts`, `template.ts` y sus tests. Sin interfaz ni base de datos. Al cerrar: `composeTokens`
   se puede llamar desde un test.
2. **Datos.** Migración, aplicada con confirmación, y tipos de fila.
3. **API.** Rutas con 409, limpieza y copia de Storage, `lib/storage/logos.ts`, entrada en
   `EDITOR_API`.
4. **Galería.** Buscador, filtros, tarjeta con la tira de color, estado vacío, crear, renombrar,
   duplicar, exportar y borrar.
5. **Editor**, partido en cuatro:
   - **5a.** `useAutosave` y migración de FormStudio y DeckStudio. Sin cambios visibles.
   - **5b.** `DsStudio`, barra, pasos 1 y 2, previsualización, panel de incidencias, conflicto 409,
     aviso de motor.
   - **5c.** Paso 3: los 17 renders, ejes, anatomía y props dispersas.
   - **5d.** Paso 4: JSON, CSS, styleguide, copiar y descargar.
6. **Cierre técnico.** Catálogo, su test y `urls-workspace.md`.

Parada para revisión entre bloques, con `test`, `type-check`, `lint` y `build` limpios en cada uno.
Cada bloque se desglosa en tareas TDD (test que falla → implementación → test que pasa → commit)
al empezarlo, no aquí: el desglose depende de lo que se decida en H1–H7.

## Bloque 1 · qué cambió respecto al plan al implementarlo

- **Fidelidad del port.** Un test diferencial fuera del repo (el motor del prototipo extraído y
  ejecutado como oráculo) comparó 500 marcas aleatorias token a token: 0 diferencias. Los literales
  de `ramp.test.ts` y `generate.test.ts` salen de ese oráculo.
- **Overrides de semánticos.** El campo `semantic` del §2 pasa a ser `semanticBase` (color base que
  rehace la rampa y su escala suave). Los retoques de muestra van todos por `swatches`, con ruta
  `palette.*`, `semantic.*` o `semanticScale.*`.
- **Avisos de contraste (H5).** `color-on-canvas` mide el primario **tal como lo introduce el
  cliente**, no el escalón 500. El 500 de cualquier rampa cae en L≈0,63 y sobre un fondo casi blanco
  no llega nunca a 4,5, así que avisaría siempre y no diría nada. Por eso `contrastWarnings` recibe
  la marca además de los tokens.
- **Ratio truncado.** El prototipo mostraba `#E5117F` como "4.5:1 AA+" con un ratio real de 4,45.
  Ahora se trunca a un decimal y el nivel se llama `AA grande`.
- **Inyección en el styleguide.** El prototipo escapaba el HTML pero metía la familia tipográfica
  tal cual dentro de `<style>`. Una familia con `</style><script>` salía del bloque. Todo el texto
  libre pasa ahora por `lib/ds/escape.ts`, y hay tests para familia, nombre, notas, breakpoints y
  retícula.
- **Pesos de fuente pedidos a Google.** Salen de los tokens, overrides incluidos, no de una lista
  fija: la plantilla Interactius necesita Serif a 300 y el prototipo pedía siempre 400–700.
- **Styleguide.** Los titulares usan los pesos del sistema en vez de un 600 fijo, que con la
  plantilla ponía IBM Plex Serif fuera de norma. Los avisos se marcan con el color de error **del
  propio sistema**: el documento es del cliente.
- **JSON.** `radiusMap` sale de `radius` al primer nivel, y se añade `meta.engineVersion`.
- **Componentes.** Los valores de los ejes (Primary, Hover, Solid) se conservan en inglés, como
  vocabulario técnico. Se revisa al hacer el paso 3 (5c).
- **Plantilla.** `harmonize: false`: con un primario casi negro, armonizar apaga los semánticos. La
  escala tipográfica sigue pendiente de Alberto.
- **Ficheros de test.** Uno por módulo (`color`, `contrast`, `ramp`, `semantic`, `generate`,
  `overrides`, `warnings`, `compile`, `template`, `fonts`, `components`, `export`, `golden`) en vez
  de los tres de la tabla del §7. El glob de `lib/hooks/__tests__` se añade en el bloque 5a, cuando
  exista.

## Bloque 2 · datos

- Migración `20260915212500_create_design_systems.sql` aplicada a mano por Carlos en el SQL Editor
  el 2026-09-15: el clasificador de permisos de Claude Code bloquea `apply_migration` contra
  producción. Verificado después con consultas de solo lectura:
  - columnas, check de estado, FK a `auth.users` con `on delete set null`, trigger e índices;
  - RLS activa, con una única política `design_systems_team` para `authenticated`;
  - `anon` sin ningún privilegio: la petición REST con la clave anónima devuelve 401,
    `permission denied for table design_systems`;
  - el asesor de seguridad no lista la tabla.
- `public_id` lo genera la base de datos (`ds_` + 16 hex), así que un duplicado recibe uno nuevo sin
  código.
- Las columnas JSONB se tipan como `unknown` en `lib/ds/types.ts`: se abren con `compileSystem`.

## Bloque 3 · API

- **Los tokens nunca vienen del cliente.** El servidor los calcula con su motor a partir de `brand` y
  `overrides`, que se guardan siempre juntos y con `engineVersion`. Si el editor corre otro motor
  (una pestaña abierta durante un despliegue), el PATCH responde 409 en vez de guardar tokens de
  otra versión. Cambia el tipo `DesignSystemUpdateInput` respecto al bloque 2: sale `tokens`, entra
  `engineVersion`.
- **Crear valida como el editor.** Los errores de `compileSystem` (familia reservada, breakpoints
  solapados) son motivo de 400.
- **Concurrencia (H7).** El PATCH actualiza con `.eq('updated_at', expectedUpdatedAt)`. Si no toca
  ninguna fila y la fila existe, responde 409 con el `updated_at` actual. `lib/ds/api.ts` lo lanza
  como `ConflictError`.
- **Rutas de logo.** Solo se aceptan bajo `ds/<id>/`. Borrar un sistema borra sus logos, así que
  aceptar una ruta ajena permitiría borrar el logo de una propuesta.
- **Duplicar** copia la fila tal cual, incluidos tokens y versión del motor (duplicar no es
  regenerar). Nace borrador y copia los logos al prefijo nuevo.
- **Ids.** Un id mal formado responde 404 antes de llegar a PostgREST, que respondería 500.
- **Buckets.** Los nombres de bucket pasan a `lib/storage/paths.ts`, sin `'use client'`: una constante
  importada de un módulo cliente no llega como valor a un Route Handler. `publicApi.ts` los
  reexporta. La subida de logos pasa a `lib/storage/logos.ts` y `lib/decks/api.ts` la reexporta.
- **Sin tests de handler.** La lógica está en `lib/ds/server.ts` y se testea en node; los handlers solo
  hacen de fontanería. Del middleware se comprobó a mano que `/api/design-systems` responde 401 sin
  sesión.

## Bloque 4 · galería

Tres decisiones de Carlos del 2026-09-15, tomadas al empezar el bloque:

- **Renombrar no pasa por la marca.** Con la API del bloque 3, cambiar el nombre obligaba a mandar
  `brand` y `overrides`, y eso recalculaba los tokens: un sistema con otro `engine_version` se habría
  regenerado entero sin avisar solo por renombrarlo, que es justo lo que H4 prohíbe. El PATCH acepta
  ahora `name` y `client` sueltos. El handler lee la marca guardada y reescribe `brand.name` y
  `brand.client` junto a los espejos (`renamePatch`), sin tocar `tokens` ni `engine_version`. El nombre
  no entra en los tokens, así que no hay nada que recalcular. No se pueden mandar junto a `brand`. La
  escritura sigue condicionada a `updated_at`: leer antes la marca no abre ninguna carrera.
- **Exportar desde la galería descarga `tokens.json` y `tokens.css`**, generados desde los tokens
  **guardados** (`lib/ds/gallery.ts`, `exportFile`). Solo se exige que los tokens estén sanos; la marca
  puede no compilar. El styleguide necesita pintar los componentes y se añade al mismo modal en 5d.
- **Filtro por estado en `FilterBar`**, con una prop opcional (`statuses`, `status`, `onStatus`) y el
  traje de las píldoras. DeckMak_r y FormMak_r no la pasan y no cambian.

Además:

- **`CardActions`** gana dos iconos, `edit` (renombrar) y `download` (exportar), con el mismo trazo.
  El orden en la tarjeta es renombrar, exportar, duplicar y eliminar.
- **Tarjeta.** La miniatura es la tira de color del servidor, con el nombre debajo y no encima: sobre
  un color de cliente arbitrario no se garantiza que se lea. Sin tira, "Tokens dañados" en Burdeos,
  como "No compila" en FormMak_r. El logo no se pinta.
- **Crear** pide nombre, cliente, etiquetas y punto de partida: valores por defecto del motor o
  plantilla Interactius (`lib/ds/template.ts`).
- **Conflicto al renombrar.** Si otra pestaña guardó entre medias, la galería se recarga y lo dice.
- **Norma.** El "+" de crear va en Mono 400, no en 300 como en FormGallery, y los estados de carga no
  llevan puntos suspensivos.
- **Qué falta para usarla.** La tarjeta abre `/workspace/dsmak_r/[id]`, que no existe hasta 5b y hoy
  da 404. La galería tampoco está enlazada desde `/workspace` hasta el bloque 6.

## Bloque 5a · `useAutosave`

Tres commits, como pedía el §5: el hook con sus tests, FormStudio y DeckStudio.

- **Reparto.** Las decisiones (cuándo programar, backoff, qué es trabajo pendiente) viven en
  `lib/hooks/autosaveCore.ts`, sin React y con tests. `lib/hooks/useAutosave.ts` solo las cablea. Las
  constantes y el comentario de los ~2.500 PATCH por hora, que estaban copiados en los dos editores,
  quedan en un único sitio.
- **Firma.** La del §5, con dos ajustes. `retry` devuelve la promesa, porque DeckMak_r la espera
  antes de abrir la pestaña del PDF. `isConflict` es el predicado que convierte un error en
  `conflict`, así el hook no importa `lib/ds/api.ts`.
- **`SaveState`** incluye `conflict` y sale del hook. `FormToolbar` y `DeckStudio` lo reexportan.
  Sus indicadores no pintan `conflict` porque nunca les llega: no pasan `isConflict`.
- **`markSaved` solo marca la versión guardada.** No limpia un `error` ni reinicia intentos, igual
  que hacían las copias al cargar o al editar metadatos. DSMak_r decidirá en 5b qué hace "Recargar"
  tras un conflicto.
- **Dos diferencias invisibles.**
  - FormStudio parte de la instantánea del estado vacío, no de `''`. Antes de cargar el editor no se
    pinta, así que nadie ve ese `dirty`.
  - `saveNow` comprueba `enabled`. FormStudio no lo comprobaba, pero solo se llamaba con el
    formulario ya cargado.
- **Build aislado.** Se construye en un worktree temporal para no pisar el `.next` de un `next dev` en
  marcha (ver bloque 4).
- **Verificación manual pendiente, en las dos herramientas.** Comprobar cada una de estas cosas:
  - escribir y ver "Guardado ✓";
  - cortar la red y ver tres reintentos y "Error · reintentar";
  - reintentar con la red de vuelta;
  - recargar con cambios pendientes y ver el aviso del navegador;
  - volver a la galería con cambios y ver el `ConfirmModal`;
  - en FormMak_r, publicar y editar metadatos, y ver el guardado inmediato;
  - en DeckMak_r, Compartir URL y Descargar PDF con cambios sin guardar.

## Bloque 5b · editor, pasos 1 y 2

### Base del editor

Lógica pura, con tests:

| Fichero | Qué hace |
|---|---|
| `lib/ds/edit.ts` | Ediciones sobre `overrides` y familias. Una sección vacía desaparece; renombrar o quitar una familia se lleva sus ajustes |
| `lib/ds/live.ts` | El sistema mientras se edita: incidencias, avisos de contraste y `blocking` |
| `lib/ds/steps.ts` | A qué paso lleva cada incidencia |
| `lib/ds/diff.ts` | Qué valores cambian al regenerar |
| `lib/ds/preview.ts` | Variables de la previsualización |

### Decisiones al implementarlo

- **El paso 2 no tiene "Guardar cambios" por sección.** El prototipo editaba cada sección en un
  borrador que se tiraba sin avisar al abrir otra. Aquí cada retoque es un override y lo recoge el
  autoguardado. "Restablecer" y "Volver al del motor" quitan el override. Una marca (●) señala lo
  retocado a mano.
- **Lo estructural solo se edita en el paso 1** (H1): fuentes, unidad, densidad, estilo de radio,
  breakpoints y retícula. El prototipo también los tocaba en el paso 2, sobre los tokens. La excepción
  es el color base de cada familia, que el plan permite cambiar también en el paso 2.
- **La previsualización es nueva.** El prototipo no tenía ninguna en los pasos 1 y 2. Va al lado del
  paso 2, en un contenedor con las variables `--ds-*`, y enseña titulares, texto, botones, un campo,
  una tarjeta y avisos. Usa los mismos nombres de variable que `tokens.css`, porque `css.ts` y
  `preview.ts` comparten `tokenVariables()`, y un test lo comprueba.
- **Validación en vivo y autoguardado en pausa.**
  - `useAutosave` gana `paused`: no guarda, pero lo pendiente cuenta para el aviso al cerrar.
  - Con errores de validación (breakpoints solapados, un nombre vacío) el servidor respondería 400,
    así que el editor no guarda.
  - La barra dice "Sin guardar · corrige los errores" y la previsualización se queda en la última
    versión válida.
  - Los campos de número y de color solo confirman valores válidos, así que al estado no llega nunca
    un NaN ni un hex a medias.
- **Contraste (H5).** Los avisos salen en tres sitios, en Burdeos: el panel de incidencias, la muestra
  afectada y, en el caso del primario sobre el fondo, un texto bajo el campo del paso 1.
- **Conflicto (H7).**
  - El 409 abre un modal con "Recargar" y "Guardar encima".
  - Guardar encima reintenta con el `updated_at` que devolvió el servidor.
  - Recargar aplica la fila y `markSaved` da el conflicto por resuelto.
  - Si el 409 es por versión del motor, el modal solo ofrece recargar la página.
- **Motor antiguo (H4).**
  - El editor abre en solo lectura con los tokens guardados: un `fieldset` desactiva todos los
    controles.
  - "Regenerar" enseña antes cuántos valores cambian y cuáles.
  - La versión del motor viaja en el valor del autoguardado, así que regenerar deja el documento
    `dirty` y se guarda por la vía normal.
- **`IssuesPanel`** pasa a `components/studio/`. Cada editor dice adónde lleva cada incidencia con
  `locate`: FormMak_r, a una línea (`L12`); DSMak_r, a un paso (`P1`).
- **Familias.**
  - Se renombran en el paso 1, con validación (formato CSS, reservadas, repetidas).
  - Quitar una familia se lleva sus ajustes.
  - "Derivar secundario y acento del primario" sustituye el secundario y crea o sustituye `accent`,
    igual que el prototipo.
- **Fallos del prototipo que no se portan:**
  - la colisión de nombres al añadir colores tras borrar uno;
  - la densidad que se multiplica en cada clic;
  - el bloqueo que solo escondía un botón;
  - el logo oscuro que se subía y no se usaba.
- **Pasos 3 y 4.** Se ven apagados en la barra hasta 5c y 5d. El paso activo vive en el estado, no
  en la URL.
- **Norma.** Chrome en IBM Plex Mono 400/500/600 y sin puntos suspensivos ("Guardando", "Subiendo",
  "Cargando"). La previsualización y la columna de muestra de tipografía usan las fuentes y pesos del
  cliente.

### Pendiente

- **Logos huérfanos al sustituir.** Cambiar o quitar un logo deja el fichero anterior en
  `deck-assets/ds/<id>/`. Borrar el sistema sí limpia la ruta vigente. Para no dejar huérfanos
  habría que borrar el anterior después de un guardado confirmado.
- **`tokens.css` no entrega las rampas completas de los semánticos**, solo sus fondos suaves
  (50/100/200). Es así desde el bloque 1 y ya lo hacía el prototipo (`F0`). La previsualización sí
  necesita los escalones fuertes y los declara aparte. Se decide en 5d, con la entrega.

### Verificación manual

1. Abrir un sistema desde la galería: se ve el paso 1 con sus valores, y "Guardado ✓" tras el primer
   cambio.
2. Cambiar el primario y ver el paso 2 y la previsualización actualizados.
3. Retocar una muestra (●), bloquear la familia, cambiar el primario en el paso 1 y comprobar que la
   familia bloqueada no se mueve (comprobación 6).
4. Solapar dos breakpoints: sale el error en el panel, la barra dice "Sin guardar · corrige los
   errores" y pulsar la incidencia lleva al paso 1.
5. Poner un primario muy claro, como `#DDDDDD`: sale el aviso de contraste en el paso 1, en el panel y
   en las muestras (comprobación 9, parte del editor).
6. Abrir el mismo sistema en dos pestañas, cambiar algo en las dos y comprobar el modal de conflicto
   con sus dos salidas (comprobación 5).
7. Subir un logo claro y otro oscuro y verlos en la previsualización en los dos modos.
8. Renombrar una familia añadida con un nombre inválido (`Mi Color`, `error`) y con uno válido.
9. Sistema de motor antiguo: `update design_systems set engine_version = '0' where id = …` en uno de
   prueba. Se abre en solo lectura, "Regenerar" enseña los cambios, y al confirmar se guarda y vuelve
   a `engine_version = '1'`.

## Hallazgos fuera del alcance (para que consten, no se tocan aquí)

- **Storage sin política de lectura para el equipo.** `storage.objects` tiene políticas de insert,
  update y delete para `authenticated` en los dos buckets, pero ninguna de select. Según la
  documentación de Supabase, `remove()` y `copy()` necesitan select. Sin ella, `remove()` no da error
  pero no borra nada. Dato de producción del 2026-09-15: 13 de las 69 imágenes de `deck-images` no
  tienen fila en `images`, y la más reciente es del 2026-09-02, posterior a `tighten_storage`.
  **Confirmado el mismo día con una prueba controlada.** Desde la galería de DeckMak_r se subió y se
  borró `images/1789503530988-BLANC_MAD_02-215.jpg`. En los logs, la fila de `images` se borra
  (`204`) y Storage responde `DELETE … 200`, pero el objeto sigue en `storage.objects`: los
  huérfanos pasaron de 13 a 14. Arreglo preparado en
  `supabase/migrations/20260915224000_storage_select_team.sql`, pendiente de ejecutar a mano. Los
  huérfanos que ya existen no se limpian con la migración: borrar ficheros va aparte y con
  confirmación. DSMak_r comprueba igualmente lo que Storage confirma haber borrado o copiado y lo
  deja en el log si no cuadra.

- **`colors.brick: '#C24B36'`** en `components/deck/studio/ui.ts:16`. No está en `lib/tokens.ts` y
  es el acento del cursor de los wordmarks de las herramientas (`Wordmark.tsx:34`) y de los enlaces
  de `authUi.ts`. Es una norma de facto sin documentar: o se declara en `lib/tokens.ts`, como se hizo
  con `toolIconAccents`, o se retira.
- **Mono a 300** en `FormGallery.tsx:169` (el "+" de crear). IBM Plex Mono admite 400/500/600.
- **Puntos suspensivos** en el chrome: "Cargando…" en `FormGallery.tsx:176` y `FormStudio.tsx`, y
  "Guardando…" en los indicadores de `FormToolbar.tsx` y `DeckToolbar.tsx`. El 5a no los toca porque
  era un cambio sin efectos visibles. DSMak_r no los copia.
- **Logos huérfanos en decks.** `DELETE /api/decks/[id]` borra la fila y deja el logo en el bucket.
  DSMak_r sí limpia (comprobación 7); decks sigue igual.
- **Remotos.** En esta máquina solo existe `origin` → `platform-clonica/brand-guidelines`, que es el
  repo del equipo. CLAUDE.md lo llama `produccion` y describe un `origin` personal que aquí no
  existe. `feat/dsmakr` todavía no está subida.
