# Clock_r — plan de implementación (fase 1)

> Plan de análisis de la fase 1 del prompt de [clock-r.md](clock-r.md).
>
> **Aprobado por Carlos el 2026-09-17**, con las recomendaciones de H1, H2, H4 y H6 tal como están
> escritas: puerta única de escritura por función, RLS con políticas separadas, una sola
> implementación del hash en producción, y cadena por persona.
>
> Dos cosas **no** entran en esa aprobación y siguen abiertas: el **acento de icono**, que es de
> Alberto (bloque 7), y **aplicar la migración a producción**, que se pregunta aparte y a mano.

**Objetivo:** llevar el registro horario del equipo al workspace como Clock_r, con un libro de
asientos en Supabase que solo admite inserciones, hash encadenado calculado en servidor, y tres
pantallas en castellano.

**Arquitectura:** el asiento se escribe **únicamente** a través de una función de Postgres
`security definer` que bloquea la fila de la persona, lee el último hash y escribe el nuevo. El
navegador nunca inserta en la tabla ni calcula un hash. El estado de una jornada no se guarda: lo
calcula `compileDay(...)` desde los asientos, y nunca lanza.

**Stack:** Next 15 (App Router), React 19, Zod 4, Supabase (Postgres 17.6), `node --test` con
`--experimental-strip-types`. Sin modelo de IA, sin servicio externo, sin variable de entorno nueva.

**Spec:** [docs/features/clock-r.md](clock-r.md).

## Restricciones globales

- Castellano en toda la interfaz, sin next-intl. **Sin puntos suspensivos ni exclamaciones**,
  tampoco en marcadores de posición ni en mensajes de incidencia.
- Chrome: IBM Plex Serif 300/400 y IBM Plex Mono 400/500/600, sin cursiva. Colores de
  `components/deck/studio/ui.ts` y `lib/tokens.ts`. Alerta = Burdeos `#99335F`, por su `uiRole` ya
  declarado, y **reservado para lo crítico de verdad** (cadena rota, jornada días sin cerrar).
- `lib/clock/*` sin React y sin alias `@/`: imports relativos con extensión `.ts`, como `lib/ds/` y
  `lib/forms/`, para que `node --test` los ejecute.
- Rutas de API con `requireUser()` + `supabaseAuthServer()`; errores de base de datos con `dbFail`.
  **Ninguna ruta de esta herramienta usa la clave de servicio** — ver H2.
- Nada se reescribe en `clock_entries`. La compilación nunca lanza. Nunca se inventa una hora.
- Ni geolocalización, ni biometría, ni dato de dispositivo.

---

## 0. Hallazgos que cambian la definición

Comprobados contra el código y contra el proyecto remoto (`gcvzzpggpsnlwqnotfqv`) el 2026-09-17, no
de memoria. **H1 y H2 son agujeros en el modelo de integridad y hay que cerrarlos antes del bloque 1.**

### H1 · La política de INSERT de la definición deja forjar el hash **[decide]**

**Dato.** La definición propone (clock-r.md:241-243):

```sql
create policy "self writes" on public.clock_entries for insert with check (
  author_person_id in (select id from public.clock_people where user_id = auth.uid())
);
```

Con esa política, cualquier persona del equipo puede hacer un `insert` directo por PostgREST con la
clave publicable y **elegir a mano `hash`, `prev_hash`, `occurred_at` y `recorded_at`**. La función
de Postgres que encadena queda como una vía más, no como la única. La garantía de integridad se
sostiene entonces en que el cliente se porte bien, que es exactamente lo que no se puede asumir en
un registro que tiene que aguantar una inspección.

**Propuesta.** Nadie inserta directamente. La única puerta es la función:

- `revoke insert, update, delete on public.clock_entries from anon, authenticated;`
- **Ninguna** política de `insert`, `update` ni `delete`. Solo la de `select`.
- `grant execute on function public.clock_record(...) to authenticated;`

La función es `security definer`, así que escribe aunque no haya política: se ejecuta como su
propietario, que no pasa por RLS. Y deriva el autor de `auth.uid()`, no de lo que mande el cliente.
Resultado: el hash y las marcas de tiempo los pone el servidor siempre, sin excepción.

### H2 · La RLS de Clock_r rompe el patrón del repo, y debe romperlo **[decide]**

**Dato.** El repo usa una sola política por tabla: `for all to authenticated using (true) with check
(true)` (`20260915212500_create_design_systems.sql:52-53`, y las cuatro de
`20260817121000_tighten_rls.sql:27-29`). `for all` incluye `update` y `delete`.

Aplicar el patrón del repo a `clock_entries` concedería exactamente las dos operaciones que la
herramienta existe para impedir. CLAUDE.md pide señalar las incoherencias de "mismo rol, dos
valores distintos"; aquí el rol **no** es el mismo: las demás tablas guardan documentos editables y
esta guarda asientos. La desviación es deliberada y va escrita en la cabecera de la migración.

**Propuesta.** Políticas separadas y mínimas, más el `revoke` como red:

| Tabla | select | insert | update / delete |
|---|---|---|---|
| `clock_entries` | propia o admin | **ninguna** (solo la función) | **ninguna** |
| `clock_consents` | propia o admin | **ninguna** (solo la función) | **ninguna** |
| `clock_people` | autenticado | ninguna (alta por función) | solo admin |
| `clock_absences` | propia o admin | solo admin | solo admin |
| `clock_calendar_days` | autenticado | solo admin | solo admin |

El `revoke all ... from anon` va en las cinco, por el motivo ya escrito en el repo
(`create_design_systems.sql:14-17`): Supabase concede todo a `anon` en cada tabla nueva de `public`,
y el revoke es lo que salva la tabla si alguien desactiva la RLS un rato para depurar. En las dos
tablas de solo-inserción se revoca además a `authenticated`.

**Sobre la clave de servicio.** `service_role` se salta la RLS entera. Como aquí la RLS *es* la
garantía, ninguna ruta de Clock_r puede usarla. Hoy no hay riesgo estructural: la clave de servicio
no está ni en `.env.example` ni en el código — no existe en el repo. Queda escrito para que siga
siendo así.

### H3 · `clock_is_admin()` tal como está en la definición es incompleta

**Dato.** La definición la escribe sin `set search_path` (clock-r.md:226-232). **Las siete funciones
de `public` del proyecto lo llevan sin excepción** (comprobado en el remoto: `check_rate_limit`,
`deck_public`, `deck_public_signature`, `deck_sign_target`, `hook_restrict_signup_by_email_domain`,
`purge_rate_limits` con `search_path = public`, y `set_updated_at` con `search_path = ''`). Sin él,
una función `security definer` es el vector clásico de escalada por tabla suplantada.

Le falta también el cierre de permisos que sí usa el repo (`rate_limits.sql:71-84`): `revoke all on
function ... from public;` y `grant execute ... to authenticated;`.

**Propuesta.** Las dos cosas, en las tres funciones nuevas. Nota que sí está bien en la definición y
conviene no "arreglar": que `clock_is_admin()` lea `clock_people` desde dentro de la política de
`clock_people` **no** provoca recursión, porque `security definer` se salta la RLS. Es el footgun
habitual de Supabase y aquí está esquivado por construcción.

### H4 · El hash en dos sitios: hay una forma mejor, y la propongo **[decide]**

La definición pide la misma función en TypeScript y en Postgres, con un test que pruebe que dan lo
mismo (clock-r.md:436). El prompt invita a decir si hay una forma mejor. La hay.

**Dato.** Ningún test del repo habla con Supabase: los 47 ficheros `*.test.ts` son puros, sin
`createClient`, sin mocks de red, y su único I/O es `readFileSync` de fixtures del propio repo. El
runner es `node --test` contra una lista explícita de carpetas (`package.json:11`). O sea que **un
test no puede, hoy, comparar la función de TypeScript con la de Postgres**. Escribir las dos y
"probar" solo la de TypeScript es precisamente la garantía decorativa que la definición quiere
evitar.

**Propuesta: una sola implementación en producción.**

- **Postgres calcula.** `clock_record()` escribe el hash. Nada más lo calcula.
- **Postgres verifica.** Una RPC `clock_verify_chain(p_person_id)` recorre los asientos de una
  persona en orden y devuelve el primer `seq` donde la cadena no cuadra, o `null`. La herramienta
  llama a esa RPC; **el navegador no rehace ningún hash**.
- **TypeScript no hashea en ninguna ruta de ejecución.** `lib/clock/hash.ts` existe solo como
  oráculo de test, y así se documenta en su cabecera.
- **La paridad se prueba con vectores dorados.** `lib/clock/__tests__/fixtures/hash-vectors.json`
  guarda pares (entrada canónica → hex esperado) generados **desde Postgres** por un script
  (`scripts/clock-hash-vectors.ts`, fuera del glob de tests). El test de node comprueba que la
  función de TypeScript reproduce los vectores. Regenerar los vectores es un paso manual anotado en
  la verificación.

Qué gana: en producción no hay dos implementaciones que puedan divergir, porque solo hay una. El
test sigue detectando que alguien cambie el algoritmo sin querer. Si Carlos prefiere la forma de la
definición (dos implementaciones vivas), se puede hacer, pero entonces el riesgo de deriva es real y
hay que aceptarlo por escrito.

### H5 · La carga útil del hash necesita ser inambigua, y el JSON no lo es

**Dato.** El orden de claves de `to_jsonb` en Postgres y el de un objeto de JavaScript no coinciden,
y el formato de un `timestamptz` depende del `TimeZone` de la sesión. Hashear JSON o texto
concatenado con un separador hace que dos asientos distintos puedan producir la misma carga: basta
un `reason` que contenga el separador.

**Propuesta.** Campos en orden fijo, cada uno **prefijado por su longitud en bytes UTF-8**, sin
separador que se pueda inyectar:

```
f(x) = octet_length(x) || ':' || x          -- Postgres
f(x) = Buffer.byteLength(x,'utf8') + ':' + x -- TypeScript
```

Orden: `prev_hash`, `person_id`, `person_email`, `person_name`, `op`, `corrects`, `reason`, `kind`,
`occurred_at`, `work_date`, `mode`, `source`, `author_person_id`. Los nulos entran como cadena
vacía. `occurred_at` se serializa como **microsegundos de época en entero**
(`(extract(epoch from x) * 1000000)::bigint`), que no depende de zona ni de formato. Luego
`encode(sha256(convert_to(payload, 'UTF8')), 'hex')`.

`sha256()` es **de núcleo desde Postgres 11** y el proyecto corre **17.6** (comprobado): la cadena
no depende de `pgcrypto`. Incluir el correo y el nombre copiados en la carga significa que tocar la
copia de identidad también rompe la cadena.

### H6 · Dos fichajes simultáneos: el bloqueo no basta por sí solo **[decide]**

El prompt pregunta cómo se garantiza que dos fichajes a la vez no rompen la cadena. Dos capas:

1. **Bloqueo de fila.** `select ... from clock_people where id = ... for update` al principio de la
   función, antes de leer el último asiento. Serializa por persona, y solo por persona: dos personas
   fichando a la vez no se estorban. Es la razón por la que la cadena es **por persona** y no global
   (decisión abierta de la definición, ver §9).
2. **Índice único de cadena**, que es la garantía estructural:

```sql
create unique index clock_entries_chain_idx
  on public.clock_entries (person_id, prev_hash) nulls not distinct;
```

Dos asientos no pueden apuntar al mismo antecesor. `nulls not distinct` (Postgres 15+, y hay 17)
extiende la protección al primer asiento de cada persona, que tiene `prev_hash` nulo. Si alguna vez
el bloqueo fallara, el segundo `insert` no corrompe la cadena: revienta con violación de unicidad y
el cliente reintenta.

`seq bigint generated always as identity` sirve para ordenar al mostrar, **no** como orden de la
cadena: las identidades tienen huecos y pueden consumirse desordenadas bajo concurrencia. El orden
de verdad lo da el encadenado.

### H7 · `work_date` lo tiene que derivar el servidor, y necesita zona horaria explícita

**Dato.** La definición llama a `work_date` "espejo, resuelve el cruce de medianoche"
(clock-r.md:177) pero no dice quién lo calcula. Si lo manda el cliente, se puede mentir, y es un
campo que decide a qué día se imputan las horas. Además, **el `TimeZone` por defecto de Postgres es
UTC** y este es el registro horario de una empresa española: en enero, un fichaje a las 00:30 hora
local cae en el día anterior si se calcula en UTC.

**Propuesta.** Lo deriva la función, con `Europe/Madrid` escrito explícitamente:

- `kind = 'in'` → `(p_occurred_at at time zone 'Europe/Madrid')::date`.
- Cualquier otro → el `work_date` del `in` abierto de esa persona. Si no hay ninguno abierto, la
  fecha local, y `compileDay` lo señalará como salida sin entrada.

La constante de zona vive en un solo sitio por lado (`lib/clock/calendar.ts` y la función), no
repetida por el código.

### H8 · El horario de verano no está en la definición y afecta al cálculo

España cambia la hora dos veces al año: hay un día de 23 horas y otro de 25. Con `timestamptz` la
resta de instantes da las horas **realmente trabajadas**, que es la respuesta correcta para el
registro; pero la jornada teórica de ese día sigue siendo la del calendario, así que el saldo de esos
dos días sale descuadrado en ±1 h y hay que decidir qué se muestra. Propuesta: no corregir nada
—las horas trabajadas son las que son— y que `compileDay` marque esos dos días con una nota
informativa, no con una incidencia. Test propio en `calendar.test.ts`.

### H9 · `CardActions` no aplica: no hay ninguna superficie donde ponerlo

**Dato.** La definición dice que `CardActions` "se usa sin la acción de borrar" (clock-r.md:362).
Abierto el fichero: `components/studio/CardActions.tsx:12-14` declara que el contenedor se
posiciona en absoluto sobre **la miniatura de una tarjeta de galería**, dentro de un envoltorio
`position: relative` que gobierna el hover. Clock_r no tiene galería, ni tarjetas, ni miniaturas.

**Propuesta.** Quitarlo de la lista de reutilización. No es que se use recortado: es que no hay
dónde. Lo corrige la fase 3 en la definición.

### H10 · La escala tipográfica y el wordmark: dos avisos de marca, ninguno nuevo

Abiertos `lib/tokens.ts` y `lib/typeScale.ts`, no citados de memoria:

- **`typeScale.ts` es la escala de la *web*:** siete peldaños `clamp()` que responden al viewport.
  El chrome del workspace ya no la usa — `components/deck/studio/ui.ts` pinta en píxeles fijos
  (10, 11, 13 px). Clock_r hereda ese chrome y añade tablas densas de datos, que es donde más
  tienta inventarse un peldaño intermedio. **Regla para esta herramienta: no se inventa ninguno.**
  Si una tabla no cabe con los tamaños de `ui.ts`, se trae a Alberto, no se añade un `12px` suelto.
- **`Wordmark` usa IBM Plex Mono 700** y `lib/tokens.ts` declara 400/500/600 para la tipografía de
  marca. Es una desviación **anterior**, ya documentada como pendiente de decisión en
  `workspace-dispatcher.md:210-212`. Clock_r la hereda y **no la reabre**; si se cierra, se cierra
  en `lib/tokens.ts` para las seis herramientas a la vez. Lo mismo con `colors.brick` (`#C24B36`),
  el acento del guión bajo, que sigue sin estar en `lib/tokens.ts`.

Lo que la definición dice de Burdeos **es correcto y está verificado**: `lib/tokens.ts:28` declara
el `uiRole` "Alerta y estados críticos en interfaz". No hay que declarar nada nuevo.

---

## 1. Modelo de datos

Migración `supabase/migrations/<ts>_create_clock.sql`, **aditiva**: crea cinco tablas nuevas y tres
funciones, y no toca ninguna tabla existente ni las políticas de Storage.

**No se toca:** `decks`, `forms`, `responses`, `clients`, `images`, `signatures`, `rate_limits`,
`design_systems`. Ni el bucket `deck-assets`.

Comprobado en el remoto el 2026-09-17: Postgres 17.6; `public.set_updated_at` **existe** (la migración
solo crea el *trigger*, nunca la función — la función viene de las ocho migraciones pre-repo,
`supabase/migrations/README.md:14-26`); no existe ninguna tabla ni función `clock_*`.

### `clock_people`

Como la definición (clock-r.md:143-153): `user_id` con **`on delete set null`**, nunca `cascade`;
`email` y `display_name` como copia estable; `role` (`member` | `admin`), `status`
(`active` | `inactive`), `schedules` jsonb, `started_on` / `ended_on`, marcas de tiempo con trigger
`clock_people_set_updated_at`, y `created_by uuid references auth.users(id) on delete set null
default auth.uid()`, que es el patrón de `created_by_seam.sql`: rastro, no permiso.

**Sobre `schedules` como array dentro de la fila: lo compro, con una salvedad.** Es configuración,
no registro; se lee entera en cada cálculo, así que una tabla aparte solo añadiría un join a algo
que siempre se quiere completo; y el `valid_from` hace que el saldo de un día pasado se calcule con
la jornada vigente **ese** día, que es lo que hay que conseguir. La salvedad es que, al ser la única
fila que se reescribe, **editar un tramo pasado cambia en silencio el saldo de meses ya cerrados**.
El saldo es derivado y no forma parte del registro legal —los asientos sí—, así que es asumible,
pero la interfaz de Personas debe empujar a **añadir un tramo nuevo** con su `valid_from` en vez de
editar el vigente, y el esquema Zod valida que los `valid_from` van en orden y sin solapes.

### `clock_entries` — el libro de asientos

Columnas como la definición (clock-r.md:165-182), más:

```sql
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint clock_entries_correction_shape check (
    op = 'record'
    or (corrects is not null and reason is not null and length(btrim(reason)) > 0)
  )
```

La restricción pone en la tabla lo que la definición pide "a nivel de tabla, no de formulario"
(clock-r.md:172-173): sin motivo no hay corrección, y no depende de que ninguna pantalla lo exija.
Más `hash text not null unique` y el índice de cadena de H6. Índices: `(person_id, work_date)` para
la semana y el mes, y `(work_date)` para el panel del día.

### `clock_absences`, `clock_calendar_days`, `clock_consents`

Como la definición. `clock_consents` es de solo inserción igual que `clock_entries`, con el mismo
tratamiento de `revoke` (H2). `clock_absences` y `clock_calendar_days` llevan trigger de
`updated_at` y escritura solo para administración.

### RLS y permisos

```sql
alter table public.clock_entries enable row level security;

create policy clock_entries_read on public.clock_entries for select to authenticated using (
  public.clock_is_admin()
  or person_id in (select id from public.clock_people where user_id = auth.uid())
);

-- NO hay policy de insert, update ni delete. Esa ausencia es la garantía (H1).
revoke all    on public.clock_entries from anon;
revoke insert, update, delete on public.clock_entries from authenticated;
```

Y el bloque final `-- ── Comprobación posterior ──` con las consultas que deben fallar, que es
convención del repo (`create_design_systems.sql:59-61`, `tighten_rls.sql:58-64`).

### Las tres funciones

Todas con `security definer`, `set search_path = public`, `comment on function` y el cierre de
permisos `revoke all from public` + `grant execute to authenticated`, siguiendo
`rate_limits.sql:35-84`.

| Función | Qué hace |
|---|---|
| `clock_is_admin()` | ¿la sesión es administradora? Lee `clock_people` por `auth.uid()` |
| `clock_record(...)` | **la única puerta de escritura**: valida, bloquea, deriva `work_date`, encadena e inserta |
| `clock_verify_chain(p_person_id)` | recorre los asientos y devuelve el primer `seq` roto, o `null` |

`clock_record` en orden: resuelve el autor desde `auth.uid()` (si no hay ficha activa, error);
comprueba que el autor es la propia persona **o** administración; `select ... for update` sobre la
fila de `clock_people`; lee el último asiento de esa persona; deriva `work_date` (H7); compone la
carga útil (H5); calcula el hash; inserta; devuelve la fila.

**Aplicación.** La migración se aplica **en producción, a mano y con tu confirmación**, desde el
fichero del repo: no hay entorno de pruebas, y el clasificador de permisos bloquea `apply_migration`
contra producción (es lo que ya pasó con DSMak_r, `ds-mak-r-plan.md:605`). Es aditiva.

## 2. Compilación

```ts
compileDay(entries, schedule, absences, holidays) → { ok, day, issues }
```

`lib/clock/compile.ts` recibe los asientos crudos de un `work_date` y devuelve la jornada resuelta
—tramos, pausas, horas efectivas, saldo— más las incidencias. Misma forma que `compileSystem` de
DSMak_r (`lib/ds/compile.ts:34-40`) y mismo tipo de incidencia que ya consume `IssuesPanel`
(`{ level, path, message }`), para poder reutilizar el panel tal cual.

**Cómo se garantiza que nunca lanza.** Tres reglas: la entrada es `unknown` y pasa por `safeParse`
campo a campo, reponiendo lo que falle; ninguna operación aritmética se hace sobre un valor no
validado; y **todo recorrido de correcciones está acotado** — ver el caso del ciclo, abajo, que es el
único que podría colgar en vez de lanzar, y colgarse es peor.

Las seis incidencias de la definición (clock-r.md:271-276), más las que he encontrado y no lista:

1. **Dos `in` seguidos sin `out`** — doble clic, o dos pestañas. Es el caso más probable en
   producción y no está en la lista.
2. **`break_start` sin `break_end`** al cerrar el día.
3. **Cadena de correcciones**: un `amend` de un `amend`. Hace falta una regla escrita —gana el más
   reciente no anulado— y un conjunto de visitados: **una corrección que se apunte a sí misma, o un
   ciclo, colgaría el bucle**. Acotado por construcción.
4. **`annul` sobre un asiento ya corregido**, y `amend` sobre uno ya anulado.
5. **Corrección que apunta a un asiento de otra persona**. La función lo rechaza al escribir, pero
   `compileDay` tiene que sobrevivir a encontrarlo.
6. **`occurred_at` en el futuro** respecto a `recorded_at`: desfase de reloj o corrección hacia
   delante.
7. **`work_date` que no cuadra** con la fecha derivada de `occurred_at`.
8. **Intervalo negativo**: un `out` anterior a su `in` después de aplicar correcciones.
9. **Pausa fuera de todo tramo de trabajo**, o pausas solapadas entre sí.
10. **Asientos duplicados exactos** (mismo tipo, mismo segundo).
11. **Ausencia que cubre solo parte del rango** del día.
12. **Persona sin tramo de `schedules` vigente** en esa fecha (alta posterior, o `valid_from` mal
    puesto): no hay jornada teórica contra la que calcular saldo.
13. **Día de cambio de hora** (H8): nota informativa, no incidencia.

La cadena rota no es un aviso más: es el único caso en el que la herramienta dice sin rodeos que el
registro de ese periodo ha dejado de ser fiable. Va en Burdeos; el resto de incidencias se
distinguen por jerarquía y posición, no por color.

## 3. El hash

Resuelto en H4 y H5. Resumen operativo:

- **Producción: una sola implementación**, la de Postgres.
- **Verificación: una RPC**, `clock_verify_chain`, no un recálculo en el navegador.
- **`lib/clock/hash.ts` es un oráculo de test**, no una ruta de ejecución, y su cabecera lo dice.
- **`hash-vectors.json`** se genera desde Postgres con `scripts/clock-hash-vectors.ts` y se commitea.
  `hash.test.ts` comprueba que TypeScript reproduce los vectores; si alguien cambia la función de
  Postgres sin regenerarlos, el paso manual de verificación lo caza.

## 4. Arquitectura de ficheros

```
NUEVO
  lib/clock/schema.ts                       Zod de asientos, jornada teórica, ausencias y calendario
  lib/clock/compile.ts                      compileDay(...) → { ok, day, issues }
  lib/clock/calendar.ts                     tramo vigente en una fecha, festivos, saldo, Europe/Madrid
  lib/clock/hash.ts                         oráculo de test del hash (NO se usa en producción, H4)
  lib/clock/export.ts                       CSV y PDF del registro por persona y periodo
  lib/clock/server.ts                       lo que deciden los handlers, puro y testeable en node
  lib/clock/api.ts                          cliente de /api/clock (calco de lib/ds/api.ts)
  lib/clock/types.ts                        tipos de fila; los jsonb como `unknown`
  lib/clock/__tests__/                      compile, hash, calendar, export, server + fixtures/
  scripts/clock-hash-vectors.ts             regenera los vectores desde Postgres (fuera del glob)
  app/api/clock/entries/route.ts            POST ficha (rpc clock_record), GET por persona y rango
  app/api/clock/people/route.ts             GET lista, PATCH jornada y rol (solo admin)
  app/api/clock/absences/route.ts           CRUD de ausencias (solo admin)
  app/api/clock/calendar/route.ts           festivos (solo admin)
  app/api/clock/export/route.ts             POST genera el registro de un periodo
  app/api/clock/consent/route.ts            POST registra la aceptación
  app/api/clock/verify/route.ts             GET cadena de una persona (rpc clock_verify_chain)
  app/workspace/clock_r/page.tsx            Mi jornada
  app/workspace/clock_r/equipo/page.tsx     panel
  app/workspace/clock_r/equipo/[personId]/page.tsx
  components/clock/                         botón de fichar, semana, mes, modo corrección,
                                            incidencias, calendario, aviso de protección de datos
  components/workspace/tileOverlays.tsx     registro de tarjetas con comportamiento (§6)
  lib/auth/role.ts                          isClockAdmin() sobre clock_people
  supabase/migrations/<ts>_create_clock.sql
  docs/features/clock-r-plan.md             este documento

MODIFICADO
  lib/workspace/catalog.ts                  entrada `clockr` + campo `overlay` en AppEntry (§6)
  lib/workspace/__tests__/catalog.test.ts   tres tests que enumeran ids y rutas
  lib/tokens.ts                             `toolIconAccents`: entrada `clockr` (decisión de Alberto)
  components/workspace/AppTile.tsx          hueco para el overlay declarado
  components/workspace/AppIcon.tsx          icono de `clockr`
  app/workspace/page.tsx                    lee el estado de fichaje y lo pasa a la tarjeta
  middleware.ts                             '/api/clock' en EDITOR_API
  package.json                              el glob de tests incluye lib/clock/__tests__
  docs/features/urls-workspace.md           las tres rutas nuevas
  docs/features/clock-r.md                  lo que cambien H1–H10 (en la fase 3)
```

`.env.example`: **ninguna variable nueva**. Confirmado: no hay modelo, ni clave, ni servicio externo.
`lib/auth/legacyRoutes.ts`: sin cambios, no se mueve nada que ya existiera.

## 5. Reutilización

**Tal cual:** `components/studio/Wordmark`, `UserMenu`, `LogoutButton`, `BrandMark`, `IssuesPanel`;
los estilos de `components/deck/studio/ui.ts` (`btn`, `btnGhost`, `toolbarBtn`, `overlay`, `card`,
`cardTitle`, `label`, `input`, `field`, `seg`/`segOn`); `Modal` y `ConfirmModal`;
`lib/supabase/server.ts` con `supabaseAuthServer`, `requireUser` y `dbFail`; `lib/auth/team.ts`; el
trigger `set_updated_at`.

`IssuesPanel` encaja sin tocarlo: su prop `locate` devuelve la etiqueta a la que salta cada
incidencia —FormMak_r devuelve una línea (`L12`), DSMak_r un paso (`P1`), Clock_r devuelve el día
(`14/09`)—. Es exactamente para lo que se generalizó.

**Cabecera:** las galerías usan `LogoutButton`; `UserMenu` con foto solo está en el dispatcher.
Clock_r sigue a las galerías, como decidió DSMak_r (`ds-mak-r-plan.md:438-440`).

**No entran, y por qué:**

- `lib/hooks/useAutosave.ts` — **no aplica y no debe aplicarse.** No hay borrador que salvar: hay
  asientos que se escriben una vez. Si alguien lo conecta por parecido, ha entendido mal la
  herramienta.
- `GalleryFilters` y `TagInput` — no hay galería ni etiquetas.
- `CardActions` — **tampoco**, y aquí la definición se equivoca: ver H9.

**A extraer a compartido:** el rol de administración. `lib/auth/team.ts` solo distingue una cuenta
del equipo de una que no lo es; Clock_r necesita un segundo nivel. Sale a `lib/auth/role.ts`, que lee
`clock_people.role`. **[supuesto]** Si el rol acaba siendo transversal al workspace, la tabla de
roles debería salir de `clock_people` a una tabla de equipo; hoy no hay materia para decidirlo, así
que vive donde se usa. La semilla ya estaba puesta: `created_by_seam.sql:27-29` anota los tres
modelos de permisos previstos y aún no implementados.

## 6. La tarjeta activa en la home

**El problema.** `app/workspace/page.tsx` pinta `AppTile` por cada entrada de `APPS`, y `AppTile` es
un server component sin JavaScript. Fichar desde ahí exige un componente de cliente. Y hay una
restricción que el prompt no menciona: **`lib/workspace/catalog.ts` es una tabla de datos pura que
importan los tests**, y el repo ya decidió una vez que el JSX no entra ahí — por eso los iconos viven
en un mapa por `id` dentro de `AppIcon.tsx` y no como campo del catálogo (`AppIcon.tsx:3-5`).

**Propuesta: repetir exactamente ese patrón, que resuelve las dos cosas que pide el prompt.**

1. `AppEntry` gana un campo **de datos**, no JSX: `overlay?: 'clock'`. Se declara en el tipo, el test
   del catálogo puede afirmarlo, y `catalog.ts` sigue sin importar React.
2. `components/workspace/tileOverlays.tsx` mapea esa clave a un componente de cliente, igual que
   `ICONS` mapea `id` a un SVG. `AppTile` renderiza `{OVERLAYS[app.overlay]}` si lo hay.
3. El dispatcher no gana ningún `if (app.id === 'clockr')`.

**Lo que implica para `app/workspace/page.tsx`:** la home ya renderiza por petición (lee la sesión
para la foto), así que no se pierde nada estático. Sí añade **una consulta a la base de datos en la
home para todo el mundo**: el estado de fichaje del día. Se lee en el server component y se pasa como
prop inicial al componente de cliente, para que la tarjeta no parpadee. Es el coste real de la
decisión y conviene decirlo: la home deja de ser gratis. A cambio, es la funcionalidad de la que
depende que el registro sea real.

Una consecuencia menor: `AppTile` deshabilitada se renderiza como `<div aria-disabled>` y la activa
como `<a>`; la tarjeta de Clock_r necesita un `<button>` **dentro** del `<a>`, que es HTML inválido.
Se resuelve como ya se resolvió en las galerías con `CardActions` (`CardActions.tsx:12-14`): el
botón no se anida, se superpone en un envoltorio `position: relative`.

## 7. Middleware, catálogo y URLs

- **`middleware.ts:12`** — añadir `'/api/clock'` a `EDITOR_API`. Confirmado que cubre las subrutas:
  `isEditorApi` hace `p === base || p.startsWith(base + '/')` (`middleware.ts:13`), así que
  `/api/clock/entries` entra. Las páginas ya están cubiertas por la rama `/workspace/*`, que además
  pone el `X-Robots-Tag`.
- **`lib/workspace/catalog.ts`** — entrada `clockr`: `label: 'Clockr'`, `group: 'tools'`,
  `href: '/workspace/clock_r'`, `description: 'Registro horario'`,
  `wordmark: { before: 'Clock', after: 'r' }`, `overlay: 'clock'`. **Entre `dsmakr` y `socialmakr`**:
  `socialmakr` está apagada (`href: null`) y las apagadas van al final.
- **`catalog.test.ts`** — hay que tocar tres tests a mano, y es a propósito: el `deepEqual` del orden
  de `tools` (L70-78), el mapa de rutas reales (L80-88) y, si se añade `overlay`, una invariante
  nueva. **Verificado que la entrada propuesta pasa el test de coherencia ruta↔wordmark** (L90-96):
  `Clock` + `_` + `r` en minúsculas es `clock_r`, que es el slug de `/workspace/clock_r`.
- **`toolIconAccents` en `lib/tokens.ts`** — no hay entrada para `clockr`. El propio fichero declara
  que un acento **no** identifica una herramienta y que dos pueden compartirlo (ReWrit_r y DSMak_r
  comparten el cian), y que su alcance es `AppIcon.tsx` y nada más. **Propongo, no elijo:** o
  compartir uno existente, o uno nuevo. Decisión de Alberto.
- **`docs/features/urls-workspace.md`** — tres filas en la tabla del workspace. Nada en la tabla
  pública: ninguna URL de esta herramienta sale de `/workspace`.
- **`.env.example`** — confirmado: ninguna variable nueva.

## 8. Plan de tests

Al glob de `package.json:11` se añade `lib/clock/__tests__/*.test.ts`. **Es una lista explícita de
carpetas, no un glob recursivo**: sin esa línea, los tests nuevos no se ejecutan nunca.

| Test | Invariante |
|---|---|
| `compile.test.ts` · jornada normal | dos pausas dan las horas efectivas correctas |
| `compile.test.ts` · abierta | un `in` sin `out` produce incidencia y **no lanza** |
| `compile.test.ts` · corrección | sustituye al original en el cálculo, y el original sigue visible |
| `compile.test.ts` · anulado | desaparece del cálculo |
| `compile.test.ts` · solape | tramos solapados tras corregir producen incidencia |
| `compile.test.ts` · caos | una serie deliberadamente incoherente devuelve incidencias, nunca una excepción |
| `compile.test.ts` · ciclo | una corrección que se apunta a sí misma termina y da incidencia (H-3 del §2) |
| `compile.test.ts` · los 13 casos | un test por cada caso límite del §2 |
| `hash.test.ts` · vectores | la función de TypeScript reproduce `hash-vectors.json`, generado en Postgres |
| `hash.test.ts` · sensibilidad | cambiar un byte de cualquier campo cambia el hash |
| `hash.test.ts` · ambigüedad | un `reason` con separadores o unicode no colisiona con otro asiento (H5) |
| `calendar.test.ts` · vigencia | el saldo usa el tramo de `schedules` vigente esa fecha, no el actual |
| `calendar.test.ts` · ausencias | festivo y ausencia no generan incidencia por falta de fichaje |
| `calendar.test.ts` · intensiva | aplica solo dentro de su periodo |
| `calendar.test.ts` · medianoche | el cruce asigna el tramo al `work_date` correcto (H7) |
| `calendar.test.ts` · cambio de hora | los días de 23 y 25 horas dan las horas reales (H8) |
| `export.test.ts` | el CSV incluye las correcciones con motivo y autor; el PDF lleva periodo, persona y fecha; los textos libres se escapan |
| `server.test.ts` | la validación de las rutas rechaza lo que debe, sin HTTP (patrón de `lib/ds/server.ts`) |
| `catalog.test.ts` | la entrada `clockr`, su posición delante de `socialmakr` y la coherencia ruta↔wordmark |

Más `npm run test`, `npm run type-check`, `npm run lint` y `npm run build` limpios al cerrar cada
bloque. **No hay tests de handler HTTP en el repo y aquí tampoco los habrá**: la lógica sale a
`lib/clock/server.ts` y el handler queda como cableado, que es la decisión ya tomada y escrita en
`app/api/design-systems/route.ts:6`.

## 9. Riesgos y decisiones abiertas

### Las ocho de la definición, con recomendación

| Pregunta | Recomendación |
|---|---|
| **El móvil** | **Diseñar Mi jornada para móvil desde el principio.** Coincido con la definición y añado el dato que lo cierra: la razón de sustituir Zoho es la fricción, y el fichaje ocurre al cruzar la puerta, muchas veces sin portátil. Aplazarlo reintroduce el problema que se venía a quitar. El panel de equipo sí se queda en escritorio |
| **Edición en línea** | **En línea, con las tres condiciones no negociables** de la definición: nada se escribe hasta confirmar el motivo, el valor anterior sigue visible, y el modo corrección no está activo por defecto. Añado una cuarta: el control de edición no aparece sobre asientos ya anulados |
| **Suplente de administración** | **Dos personas, y documentar cómo se añade un tercero.** Con `role` en tabla es un `update`, no un despliegue |
| **Apagado de Zoho** | **Solape de un mes con todo el equipo dentro.** Zoho es hoy el registro que responde ante la Inspección |
| **Formato de exportación** | **Preguntar a la asesoría antes de escribir el exportador.** Diez minutos que ahorran reescribirlo. Es además el momento de contrastar todo el marco normativo del §"Contexto", que está sobre fuentes secundarias |
| **Alcance de la cadena** | **Por persona.** La global obliga a serializar cada inserción del equipo entero; la de persona solo bloquea una fila (H6) |
| **Baja médica** | **Solo la ausencia.** El motivo médico es dato de salud y no tiene por qué vivir en una herramienta que administración consulta a diario |
| **Acento de icono** | **Cerrada por Carlos el 2026-09-17**, que delegó la elección al no estar Alberto: **ámbar `#F59E0B`**, declarado en `toolIconAccents`. Queda anotado como decisión suya, no del sistema, para que Alberto pueda revocarla. El porqué, en `lib/tokens.ts` |

### Las nuevas

Las de H1, H2, H4 y H6, arriba. La que más pesa es **H4**: si se prefiere la forma de la definición
—dos implementaciones del hash vivas— hay que aceptar por escrito el riesgo de deriva.

### Riesgos

- **R1 · La migración se aplica en producción sin entorno de pruebas.** Es aditiva y no toca nada
  existente; aun así, se aplica con tu confirmación, y las consultas de comprobación posterior van en
  el propio fichero.
- **R2 · El PDF.** `puppeteer-core` está como **devDependency** (`package.json:45`), así que no se
  puede dar por hecho que haya generación de PDF en el servidor de producción. **No he verificado
  cómo se genera hoy el PDF de DeckMak_r**; lo miro con `docs/features/deck-export-visor.md` delante
  al empezar el bloque 6, antes de comprometer el formato. El CSV no tiene este problema.
- **R3 · El texto legal del aviso de protección de datos.** Lo aporta Carlos. El componente se deja
  listo y el texto como marcador evidente, **nunca inventado**: un aviso de privacidad redactado por
  la herramienta es peor que no tenerlo.
- **R4 · La home deja de ser gratis** (§6): una consulta más por visita para todo el equipo.
- **R5 · El piloto.** Los agujeros de un registro horario salen con gente usándolo a diario. El
  arranque con el equipo directivo antes de abrirlo a la plantilla no es una formalidad.

## Fase 2 · bloques

Los siete del prompt, con una salvedad: el bloque 1 es el que sostiene todo lo demás y conviene
cerrarlo con la migración **ya aplicada** y la cadena verificada a mano contra el remoto.

1. **Datos e integridad** — migración, cinco tablas, RLS, triggers, las tres funciones, y
   `lib/clock/hash.ts` con sus vectores. Sin interfaz. Al cerrar: insertar asientos desde un test,
   verificar la cadena, y comprobar que un `update` falla.
2. **Compilación y calendario** — `schema.ts`, `compile.ts`, `calendar.ts` con sus tests.
3. **API** — rutas `/api/clock/*`, `lib/clock/server.ts`, `lib/auth/role.ts`, `EDITOR_API`. Las de
   administración comprueban el rol **en servidor**.
4. **Mi jornada** — botón de fichar, día, semana, mes, modo corrección, incidencias. Móvil incluido.
5. **Equipo y detalle de persona** — las dos pantallas de administración, calendario, ausencias.
6. **Exportación** — CSV y PDF con las correcciones.
7. **Cierre técnico** — catálogo y su test, `toolIconAccents`, la tarjeta activa, `urls-workspace.md`
   y el aviso de protección de datos.

Parada para revisión entre bloques, con `test`, `type-check`, `lint` y `build` limpios en cada uno.
El desglose en tareas TDD de cada bloque se hace **al empezarlo**, no aquí: depende de lo que se
decida en H1–H10.

## Bloque 1 · qué cambió al implementarlo

Migración `20260917140000_create_clock.sql`, aplicada a mano por Carlos en el SQL Editor el
2026-09-17, por el mismo motivo que en DSMak_r: el clasificador de permisos bloquea
`apply_migration` contra producción.

- **Cinco funciones, no tres.** El plan preveía `clock_is_admin`, `clock_record` y
  `clock_verify_chain`. Al escribirlo salieron dos más, y las dos por un motivo:
  - `clock_entry_hash(...)` se separa de `clock_record` para que **el script que regenera los
    vectores dorados llame exactamente a la función que escribe en producción**. Si el hash viviera
    dentro de `clock_record`, los vectores se generarían con una copia de la expresión, y una copia
    es justo lo que H4 quería evitar.
  - `clock_ensure_person()` no estaba y hacía falta: sin política de `insert` sobre `clock_people`,
    el alta automática del primer acceso no tenía por dónde ocurrir. Recupera por correo la ficha de
    quien ya existiera sin `user_id`, para que un cambio de cuenta no parta su registro en dos
    cadenas.
- **`work_date` de una corrección lo hereda del asiento que corrige**, que es más preciso que
  derivarlo de su propia hora: una corrección escrita hoy sobre el martes pertenece al martes.
- **El agujero del `TRUNCATE`** (corregido en `20260917150000_clock_revoke_truncate.sql`). La
  migración revocaba `insert, update, delete` sobre las tablas de solo-inserción y daba la escritura
  por cerrada. No lo estaba: Supabase concede **todos** los privilegios a `authenticated`, y
  `TRUNCATE` **no pasa por la RLS** — vacía la tabla entera sin tocar filas una a una, así que
  ninguna política lo detiene. La frase que sostiene toda la herramienta —"no hay política de update
  ni de delete, y esa ausencia es la garantía"— era falsa mientras ese privilegio estuviera puesto.
  No era explotable por PostgREST, que no expone truncate, pero **la garantía no puede depender de
  qué expone hoy la capa de encima**. Se revoca en las cinco tablas, junto con `TRIGGER` y
  `REFERENCES`, que tampoco pintan nada sobre un libro de asientos.
  Lo encontró la verificación posterior a aplicar, no la revisión del fichero: es el argumento de
  que el bloque de "Comprobación posterior" de cada migración se ejecute y no solo se escriba.
  **Aplicada y verificada el 2026-09-17**: a `authenticated` le quedan `select` en `clock_entries` y
  `clock_consents`, `select` y `update` en `clock_people`, y las cuatro en `clock_absences` y
  `clock_calendar_days` filtradas por la política de admin. `anon` no aparece en ninguna de las cinco.
- **La jornada por defecto** (`20260917151000_clock_default_schedule.sql`). La migración inicial
  dejaba `schedules` en `[]`, así que quien entrara por primera vez nacía sin jornada teórica y
  todos sus días habrían salido como incidencia hasta que Personas le pusiera el horario a mano —
  justo la fricción que la herramienta viene a quitar. El tramo por defecto son 40 h de lunes a
  viernes en minutos, con `validFrom` en 2000-01-01 para que cubra cualquier fecha. Es **el
  supuesto** (jornada ordinaria máxima del Estatuto), no una norma comprobada con la asesoría.
  **Aplicada y verificada el 2026-09-17**: el valor por defecto está puesto y no queda ninguna
  persona sin jornada.
- **La paridad del hash está probada de verdad.** `clock_entry_hash` ya desplegada reproduce los
  cuatro vectores del fixture. Ya no es "la misma expresión escrita dos veces": es la función de
  producción devolviendo los valores que espera el test de node.
- **Lo que el bloque 1 NO deja probado.** Fichar, que un `update` falle y que la cadena se verifique
  necesitan `auth.uid()`, y las consultas de administración corren sin sesión. Esas tres
  comprobaciones se hacen desde la aplicación, con una sesión real, en el bloque 3. Hasta entonces
  no están verificadas y no se dan por buenas.

## El primer administrador · un hueco de arranque

**Guardé la salida y dejé abierta la entrada.** `buildRolePatch` y `buildStatusPatch` impiden quitar
el último administrador —sin ninguno, nadie puede nombrar a otro, porque escribir en `clock_people`
exige serlo— pero **nunca hubo un primero**: el alta automática crea a todo el mundo como `member`,
y no existe ninguna vía en la aplicación para promocionar al primero. Solo se podía a mano.

Se vio al mirar los datos después de la primera prueba real, no leyendo el código.

**Decisión de Carlos, 2026-09-17: un `update` suelto.** Aplicado ese día sobre
`carlos.ruiz@interactius.com`, que pasa a `admin`. Funciona **precisamente porque la conexión de
administración se salta la RLS**, que es la puerta que todo el diseño prohíbe a las rutas de la
aplicación: aquí es el uso legítimo de esa puerta, arrancar el sistema, y es la razón de que no
pueda existir en ningún handler.

**Pendiente, y no puede depender de que alguien se acuerde:** Josep todavía no tiene ficha, porque
no ha entrado nunca. Hay que repetir el `update` **después de su primer acceso**. Mientras solo haya
un administrador, la aplicación le impedirá degradarse o darse de baja a sí mismo —responderá 409—,
que es la guarda funcionando, no un fallo.

Las otras dos opciones que se descartaron, por si vuelve a hacer falta: una lista de correos dentro
de `clock_ensure_person` (se cura sola, pero cambiar la lista pide migración) y «el primero que entra
es admin si no hay ninguno» (sin correos en el código, pero es una regla débil para decidir quién
manda en el registro horario).

## La verificación de extremo a extremo · 2026-09-17

Lo que los bloques 1, 2 y 3 dejaron aplazado porque exigía `auth.uid()`, hecho con la pantalla ya
en marcha y **comprobado sobre los datos, no de palabra**:

- La ficha se crea sola al cargar la página, con su tramo de jornada por defecto.
- Fichar entrada y salida escribe dos asientos, con la hora puesta por `now()` en el servidor. Esto
  confirma el fallo que se cazó en la frontera entre la función pura y la llamada real: omitir
  `p_occurred_at` en vez de mandarlo nulo era lo correcto, y mandarlo nulo habría reventado el primer
  fichaje.
- **La cadena verifica.** Recalculada desde fuera con `clock_entry_hash` en una consulta aparte, no
  llamando a `clock_verify_chain` —que habría estado de acuerdo consigo misma—: `prev_hash` y `hash`
  cuadran en los dos asientos.
- Que un `update` directo sobre `clock_entries` no es posible ya estaba probado antes por otra vía:
  a `authenticated` solo le queda `select`, así que se deniega por privilegio antes de llegar a la
  RLS.

Queda anotado para el piloto: **no hay ningún festivo cargado**, así que hasta que se metan, un día
festivo cuenta como laborable en el saldo.

## Bloque 2 · qué cambió al implementarlo

- **H8 se retira: el canal informativo que proponía no hace falta, y la premisa era falsa.** El plan
  decía que los días de 23 y 25 horas descuadran el saldo y que había que marcarlos con una nota
  aparte. Al mirar el calendario —en vez de razonar sobre él— resulta que en España **el cambio de
  hora cae siempre en domingo** (comprobado: 2026-03-29 pasa de +01:00 a +02:00 y 2026-10-25 de
  +02:00 a +01:00), y con una jornada de lunes a viernes el domingo debe 0 minutos por los dos
  lados. Lo que sí importaba —un turno que **cruza** el cambio— ya funcionaba: el cálculo se hace
  sobre instantes, así que de 22:00 a 06:00 cuenta 540 minutos aunque el reloj marque 480. Queda un
  test que lo fija. Inventar una estructura para un caso que no existe habría sido peor que no
  haberlo pensado.
- **La firma de `compileDay` pasa a un objeto de opciones** en vez de los cuatro parámetros
  posicionales del plan: cinco cosas en fila se equivocan de orden solas.
- **`schema.ts` declara y `compile.ts` repara**, el mismo reparto que `lib/ds`. Antes de eso
  `compileDay` hacía un cast y confiaba: una fila `null` lo tumbaba con un `TypeError`, o sea que la
  invariante titular del módulo —que no lanza nunca— era **falsa**, y lo fue hasta que un test lo
  demostró.
- **Dos huecos que se tragaban datos en silencio**, los dos en código que ya estaba en verde: una
  salida sin entrada la descartaba el emparejador sin decir nada, y sin tramo de jornada vigente los
  teóricos se ponían a 0, o sea un saldo calculado contra una jornada que nadie decidió. Un hueco en
  código verde es peor que un caso sin cubrir: nada avisa de que está ahí.
- **El `NaN` que no era.** Predije que una fila sin hora propagaría un `NaN` hasta el saldo. No lo
  hacía, pero por accidente: la guarda `minutes > 0`, escrita para los intervalos negativos, también
  se lo tragaba porque toda comparación con `NaN` es falsa. Funcionaba sin que nadie lo hubiera
  decidido. Ahora la hora ilegible se rechaza en el esquema, que es donde se ve.
- **Criterio de nivel.** `error` cuando el número de horas del día deja de ser fiable —serie
  ambigua, asiento de otro día, hora futura, corrección circular—; `warning` cuando falta algo pero
  el total no miente: jornada abierta, o fichajes en un día declarado como ausencia. `ok` significa
  «no hay errores», no «no hay incidencias», como en `compileSystem`.
- **La semana y el mes** los resuelve `compileRange`, y la decisión que lo define es que **el rango
  se enumera por fechas y no por los asientos que hay**. Un día laborable sin fichajes aparece igual
  y cuenta como defecto; si solo se recorrieran los días con datos, un mes con una semana sin fichar
  saldría con saldo cero en vez de con cuarenta horas de menos, y el error caería a favor de quien
  no fichó y en contra de la fiabilidad del registro. La aritmética de días va en UTC: sumar 24
  horas en hora local se tuerce los dos días del año en que existe el cambio de hora.
- **`lib/clock/types.ts` se aplaza al bloque 3, a propósito.** Son tipos de fila sin comportamiento:
  no hay test que escribir antes, y nadie los consume hasta que existan las rutas de API. Escribirlos
  ahora sería adivinar la forma que necesitará su consumidor.
- **Estado al cerrar el bloque 2:** 484 tests en verde, `type-check`, `lint` y `build` limpios. Los
  13 casos límite del §2 están cubiertos salvo los que resultaron no existir (ver H8).
- **Lo que el bloque 2 NO deja probado.** Todo esto son funciones puras probadas contra datos
  escritos a mano. Que los asientos REALES de Postgres tengan la forma que `schema.ts` declara no lo
  demuestra ningún test de aquí, y no se sabrá hasta que el bloque 3 lea filas de verdad.

## Bloque 4 · qué cambió al implementarlo

- **«Mi jornada» va con hoja de estilos propia, no con los estilos en línea del resto del chrome**, y
  el motivo no es de gusto: la pantalla se diseña para móvil desde el principio —primera decisión
  abierta de la definición— y **un estilo en línea no puede expresar una media query**. Iba a escribir
  una maqueta móvil en un sitio donde el concepto no existe. El repo ya tenía la respuesta: lo que
  necesita puntos de ruptura vive en su `.css` (`timer.css`, `workspace.css`, `forms.css`) y lo que se
  adapta solo va en línea con `flex-wrap` y `minmax`. `clock.css` sigue ese patrón, con los colores
  desde los `--c-*` y **sin un solo peldaño fuera de escala**: la tentación era inventarse un
  intermedio para las tablas de horas, y eso se habla con Alberto.
- **Quién soy llega como prop desde un server component.** El cliente no puede saberlo:
  `/api/clock/people` devuelve una ficha a un miembro y todas a administración, así que de esa lista
  no se deduce cuál soy. La página lo resuelve con `currentPerson`, igual que `app/workspace/page.tsx`
  con la sesión. Se evitó inventar un `/api/clock/me`, y de paso el alta automática ocurre al cargar.
- **`instantAt`: de hora de reloj a instante.** Lo necesita el modo corrección, y la vía obvia está
  mal —`new Date('2026-07-10T17:00')` se interpreta en el huso del navegador—. Se resuelve sondeando
  el desfase real de la zona. **Los tests se ejecutan con `TZ` forzado a Madrid, Nueva York y Tokio**,
  porque esta máquina está en Madrid y una implementación ingenua habría pasado aquí. No cubre
  desfases de media hora.
- **El campo de modalidad entra en `entryRowSchema` como OPCIONAL.** En la tabla es `not null`, pero
  el esquema es una PROYECCIÓN —solo lo que se mira— y el cálculo de horas no usa la modalidad;
  la interfaz sí. Exigirla habría roto `compileDay`, que acepta filas sin ella.
- **El defecto de horas no va en Burdeos.** Deber horas a media mañana es lo más corriente del
  mundo, y pintarlo de rojo a diario convierte el color de alerta en decoración — que es lo que hace
  que el día que salga algo crítico nadie lo mire.
- **Lo que el bloque 4 NO deja resuelto.** El panel de incidencias solo muestra las de HOY, porque
  `compileRange` aplana las del mes sin decir de qué día es cada una; y sus filas no son pulsables
  porque no hay adónde saltar. Las dos cosas están escritas en el código, no disimuladas.
