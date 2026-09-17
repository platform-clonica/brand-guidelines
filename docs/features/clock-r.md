# Clock_r — el registro horario del equipo

> Cada persona ficha su jornada desde el workspace y ve sus horas, sus pausas y su saldo. Personas
> ve el equipo entero, corrige incidencias y exporta el registro cuando se lo piden.
> Es la quinta herramienta del workspace, y la primera que no fabrica un documento: DeckMak_r vende
> el proyecto, FormMak_r lo investiga, ReWrit_r escribe, DSMak_r arranca la interfaz, y Clock_r
> registra el tiempo con el que se hacen las otras cuatro.

Estado: **definido** · pendiente de implementar.

## Contexto

El registro horario de Interactius se lleva hoy en **Zoho**, y cumple. Clock_r no cubre un
incumplimiento: sustituye una herramienta que funciona, por dos razones que conviene dejar escritas
porque son las que tendrán que seguir siendo ciertas dentro de un año.

La primera es de **fricción**: fichar en Zoho está lejos de donde el equipo trabaja cada día, y un
registro que cuesta abrir se llena de olvidos, que es justo lo que lo vuelve poco fiable. De ahí
sale la decisión de interfaz que más pesa de toda la v1 —la tarjeta activa en la home del
workspace— y de ahí sale también la decisión abierta sobre el móvil. La segunda es de
**coherencia**: todo lo interno vive en `brand.interactius.com/workspace` y el fichaje es la
excepción.

Hay una tercera razón que aparecerá cuando llegue, y que no justifica la v1 por sí sola: con las
horas en Supabase, la integración con una herramienta de gestión de proyectos deja de ser una
exportación y pasa a ser una consulta. Está en Pendiente, no en Alcance.

### Lo que esto significa asumir

Zoho no solo guarda fichajes: asume la responsabilidad de que el registro aguante una inspección.
Al traerlo dentro, esa responsabilidad pasa a ser nuestra —integridad de los asientos, cuatro años
de conservación, disponibilidad el día que los pidan. Es una decisión legítima y es de Carlos; el
documento la recoge para que nadie la descubra por sorpresa. Y es la razón de que las decisiones de
datos de este documento sean más estrictas que las del resto de herramientas del repo.

### Marco normativo

Consultado el 17 de septiembre de 2026, sobre fuentes secundarias —hay que contrastarlo con la
asesoría laboral antes de implementar, y desde luego antes de apagar Zoho.

- **Vigente:** la obligación de registro diario de jornada del RDL 8/2019 (art. 34.9 ET), con
  conservación de cuatro años y puesta a disposición de la persona trabajadora, su representación
  y la Inspección. Infracción grave.
- **Pendiente:** el Real Decreto de registro horario digital **no está publicado en el BOE**. El
  Consejo de Estado emitió un informe crítico el 23 de marzo de 2026 y el Ministerio lo está
  rehaciendo. [supuesto] Su borrador exige sellado temporal inmutable, trazabilidad de toda
  modificación (quién, cuándo, por qué), credenciales individuales, acceso remoto para la
  Inspección y conservación con garantías de integridad, y descarta el papel, la hoja de cálculo y
  la biometría de huella o facial.

Clock_r se diseña contra ese borrador aunque no esté aprobado, porque las garantías de integridad
son baratas de poner ahora y caras de añadir sobre un histórico ya escrito. El único requisito que
se aplaza a sabiendas es el acceso remoto de la Inspección — ver *Pendiente*.

## Alcance

**Sí:**

- Fichar entrada, salida, inicio y fin de pausa, con tantos tramos por día como haga falta.
- Modalidad por tramo: presencial o a distancia.
- Fichaje en un clic desde la tarjeta de Clock_r en la home del workspace, sin entrar en la
  herramienta.
- **Mi jornada**: el día en curso, la semana y el mes, con horas efectivas, pausas y saldo contra
  la jornada teórica. Exportación del registro propio.
- Corrección por la propia persona, con motivo obligatorio, sobre el libro de asientos: nada se
  reescribe, todo se anota.
- Jornada sin cerrar: queda abierta como incidencia, visible en Mi jornada y en el panel. Nunca se
  inventa una hora de salida.
- Exceso y defecto sobre la jornada teórica, derivados del calendario, sin intervención de nadie.
- **Calendario laboral**: jornada teórica por persona y día de la semana, festivos y jornada
  intensiva.
- Ausencias marcadas —vacaciones, festivo, ausencia justificada— sin flujo de solicitud ni
  aprobación. Sirven para que un día sin fichajes no sea una incidencia.
- **Panel de equipo** para administración: quién ha fichado hoy, incidencias abiertas, saldo por
  persona, y detalle individual con el historial completo de correcciones.
- Exportación del registro por persona y periodo, en CSV y PDF, con las correcciones incluidas.
- Aviso de protección de datos con aceptación registrada la primera vez.

**No:**

- **Geolocalización y biometría.** Ni huella, ni reconocimiento facial, ni coordenadas al fichar.
  Desproporcionado para una plantilla de este tamaño, foco seguro de conflicto con RGPD, y además
  el borrador del Real Decreto descarta la biometría como método ordinario.
- **Imputación de horas a proyecto o cliente.** Fase posterior. Mezclar un dato legal con uno de
  gestión hace que el registro dependa de que alguien recuerde un código de proyecto, y entonces el
  registro deja de ser fiable, que es lo único que no se puede permitir.
- **Gestión de vacaciones.** Ni solicitud, ni aprobación, ni bolsa de días. Se marca la ausencia y
  ya.
- **Nóminas y cualquier cálculo económico.**
- **Borrar.** No existe en esta herramienta, ni para una persona ni para administración.
- **Importar el histórico de Zoho.** Clock_r empieza de cero el día del despliegue. Meter datos sin
  cadena de integridad en un libro de asientos inmutable contamina justo lo que lo hace fiable.
- **Acceso de terceros al workspace.** Ni cuentas invitadas ni enlaces de consulta. Lo que sale,
  sale como archivo exportado por un administrador.
- **Escribir nada en `content/`.** El sistema de ficheros de producción es de solo lectura.

## Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Nombre y wordmark | `Clock_r`, `{ before: 'Clock', after: 'r' }` | La convención no es el `Mak`: es que `_r` elide la terminación *-er*. `DeckMak_r` es *DeckMaker* y `ReWrit_r` es *ReWriter*; `Clock_r` es *Clocker*. Se respeta, no se rompe |
| Ruta | `/workspace/clock_r`, `/workspace/clock_r/equipo`, `/workspace/clock_r/equipo/[personId]` | Tres pantallas con dueño distinto. No hay galería de documentos ni editor con split |
| Entrada en el catálogo | id `clockr`, label `Clockr`, descripción `Registro horario`, **quinta, detrás de `dsmakr` y delante de `socialmakr`** | Las tarjetas apagadas van al final: `socialmakr` tiene `href: null` |
| Acceso | Sesión de equipo `@interactius.com`, `X-Robots-Tag: noindex, nofollow` | Lo aplica `middleware.ts` a todo `/workspace/*` |
| Administración | Josep y Carlos, por columna `role` en `clock_people` | Dos administradores, sin dependencia de una sola persona |
| Fuente de verdad | `clock_entries`, libro de asientos que solo admite inserciones | Ver *Datos*. Es la ruptura central con el patrón del repo |
| Correcciones | Asiento nuevo que apunta al corregido, con motivo obligatorio | Trazabilidad de quién, cuándo y por qué, que es lo que pide el borrador |
| Integridad | Hash encadenado por persona, calculado en servidor | Una modificación por detrás rompe la cadena y se detecta |
| Conservación | Cuatro años. El asiento guarda copia del nombre y el correo | El registro sobrevive a la baja de la cuenta de Google |
| Alta | Automática con jornada por defecto al primer acceso | Cero fricción. Personas ajusta la jornada real desde el panel |
| Jornada sin cerrar | Incidencia, sin hora de salida | Un dato inventado dentro del registro oficial vale menos que un hueco declarado |
| Horas extra | Exceso derivado del calendario, sin clasificar manualmente | Ver *Pendiente*: es el hueco más probable si el Real Decreto sale como está |
| Idioma de la interfaz | Castellano, sin next-intl | El workspace es interno |
| Persistencia | Tablas `clock_people`, `clock_entries`, `clock_absences`, `clock_calendar_days`, `clock_consents` | Cinco tablas nuevas. No se toca ninguna existente |
| Modelo de IA | No usa | Un registro que puede pedir la Inspección no admite ni un dato inferido |
| Estilos | Inline, con `components/deck/studio/ui.ts` y `lib/tokens.ts` | Como el resto del studio |
| Color de alerta | Burdeos, por su `uiRole` ya declarado en `lib/tokens.ts` | No hay que declarar nada nuevo. Ver *Marca* |
| Arranque | Piloto con el equipo directivo antes de abrirlo a la plantilla | Los agujeros reales salen con gente que sabe reportarlos |

## Decisiones abiertas

| Pregunta | Alternativas | Recomendación |
|---|---|---|
| El móvil | Diseñar Mi jornada para móvil desde el principio, o dejarlo responsive sin cuidarlo | **Diseñarlo para móvil.** El fichaje real ocurre al entrar y al salir por la puerta, muchas veces sin el portátil abierto, y en visitas a cliente. Si la razón de sustituir Zoho es la fricción de uso, aplazar el móvil reintroduce exactamente la fricción que se venía a quitar. El panel de equipo sí puede quedarse en escritorio |
| La edición en línea | Editar la hora sobre la semana, o modal con motivo | **En línea, con tres condiciones no negociables**: nada se escribe hasta confirmar el motivo, el valor anterior sigue visible junto al nuevo, y el control de edición no está activo por defecto —hay que entrar en modo corrección. Sin esas tres, la comodidad se paga en asientos tocados sin querer dentro de un registro legal |
| Suplente de administración | Dejarlo en dos personas, o prever un tercero | Dejarlo en dos y documentar cómo se añade uno. Con `role` en tabla es un `update`, no un despliegue |
| Cuándo se apaga Zoho | Al terminar el piloto, o tras un mes de solape | **Solape de un mes con todo el equipo dentro.** Zoho es hoy el registro que responde ante la Inspección; apagarlo antes de que Clock_r tenga un mes de datos limpios deja un hueco difícil de explicar |
| Formato de exportación | El nuestro, o el que espera la asesoría laboral | Preguntar a la asesoría antes de escribir el exportador. Es una conversación de diez minutos que ahorra reescribirlo |
| Alcance de la cadena de hash | Por persona, o global para toda la tabla | **Por persona.** La cadena global obliga a serializar cada inserción del equipo entero; la de persona solo bloquea la fila de quien ficha, y un fichaje concurrente de dos personas no se estorba |
| Ausencias por baja médica | Registrar el tipo, o solo la ausencia | **Solo la ausencia.** El motivo médico es dato de salud y no tiene por qué vivir en una herramienta que consulta administración a diario. Que conste el día no trabajado basta para el registro |
| Acento de icono | Compartir uno de los existentes, o pedir uno nuevo | Decisión de Alberto. `toolIconAccents` documenta que un acento **no** identifica una herramienta y que dos pueden compartirlo, como ya hacen ReWrit_r y DSMak_r con el cian |

## Datos

Cinco tablas nuevas, todas con prefijo `clock_`. Migración
`supabase/migrations/<YYYYMMDDHHMMSS>_create_clock.sql`, siguiendo el formato de las existentes.

**Qué no se toca:** `decks`, `forms`, `responses`, `clients`, `images`, `signatures`,
`rate_limits`, `design_systems`. Ni el bucket `deck-assets`.

### `clock_people`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | La URL del detalle de persona en el panel |
| `user_id` | uuid unique references `auth.users(id)` **on delete set null** | Nunca `cascade`: borrar la cuenta no puede llevarse el registro |
| `email` | text not null unique | Copia estable, sobrevive al borrado de la cuenta |
| `display_name` | text not null | |
| `role` | text not null default `'member'` | `member` o `admin` |
| `status` | text not null default `'active'` | `active` o `inactive`. No se borran filas |
| `schedules` | jsonb not null | Array de tramos de jornada teórica con `valid_from`. Ver abajo |
| `started_on` / `ended_on` | date | Alta y baja a efectos de registro |
| `created_at` / `updated_at` | timestamptz | Trigger `set_updated_at` |

`schedules` es un **array de tramos**, cada uno con `valid_from` y las horas teóricas por día de la
semana, más el periodo de jornada intensiva si aplica. Es la única fila de esta herramienta que sí
se reescribe: es configuración, no registro. El array evita una tabla de histórico y hace que el
saldo de un día pasado se calcule con la jornada que estaba vigente ese día, no con la actual.

### `clock_entries` — el libro de asientos

Solo admite inserciones. No hay `update` ni `delete` para nadie, y la RLS lo impone por ausencia de
política, no por convención.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `seq` | bigint generated always as identity | Orden de escritura, inmutable |
| `person_id` | uuid not null references `clock_people(id)` | |
| `person_email` / `person_name` | text not null | **Copia en el momento del fichaje.** El asiento no depende de que la persona siga existiendo |
| `op` | text not null default `'record'` | `record`, `amend` o `annul` |
| `corrects` | uuid references `clock_entries(id)` | Obligatorio si `op` no es `record` |
| `reason` | text | Obligatorio si `op` no es `record`. Restricción a nivel de tabla, no de formulario |
| `kind` | text not null | `in`, `out`, `break_start`, `break_end` |
| `occurred_at` | timestamptz not null | El momento fichado |
| `recorded_at` | timestamptz not null default `now()` | Cuándo se escribió. En un fichaje normal coincide; en una corrección, no |
| `work_date` | date not null | El día de jornada al que pertenece. Espejo, resuelve el cruce de medianoche |
| `mode` | text not null | `onsite` o `remote` |
| `source` | text not null | `home_card` o `app`. Diagnóstico de uso |
| `author_person_id` | uuid not null references `clock_people(id)` | Quién escribe el asiento. Normalmente la misma persona |
| `prev_hash` | text | Hash del asiento anterior **de esa persona** |
| `hash` | text not null | Sobre el contenido del asiento más `prev_hash` |

El hash se calcula **en servidor**, dentro de una función de Postgres que bloquea la fila de
`clock_people` correspondiente antes de leer el último asiento y escribir el nuevo. Nunca en el
navegador: un hash que calcula el cliente no prueba nada.

El estado de una jornada nunca se guarda: se **calcula** leyendo la serie de asientos de ese
`work_date`, aplicando las correcciones y descartando los anulados.

### `clock_absences`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `person_id` | uuid not null | |
| `from_date` / `to_date` | date not null | |
| `kind` | text not null | `vacaciones`, `ausencia_justificada`, `ausencia`. **Sin tipo médico** — ver decisiones abiertas |
| `note` | text | Libre y opcional |
| `created_by` | uuid not null | |
| `created_at` / `updated_at` | timestamptz | |

### `clock_calendar_days`

Festivos y días no laborables comunes. `date`, `name`, `scope` (`nacional`, `cataluña`,
`barcelona`), `year`. Se cargan a mano una vez al año desde el panel.

### `clock_consents`

`person_id`, `policy_version` text, `accepted_at` timestamptz, `policy_hash` text. Append-only
también: una aceptación no se reescribe, y si cambia el texto informativo sube `policy_version` y se
vuelve a pedir.

### RLS

```sql
alter table public.clock_people        enable row level security;
alter table public.clock_entries       enable row level security;
alter table public.clock_absences      enable row level security;
alter table public.clock_calendar_days enable row level security;
alter table public.clock_consents      enable row level security;

-- Ninguna policy para anon en ninguna tabla. A propósito: no hay superficie pública.

-- Helper: ¿la sesión actual es administradora?
create or replace function public.clock_is_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.clock_people p
    where p.user_id = auth.uid() and p.role = 'admin' and p.status = 'active'
  );
$$;

-- Cada persona ve lo suyo; administración ve todo.
create policy "self or admin reads" on public.clock_entries for select using (
  clock_is_admin()
  or person_id in (select id from public.clock_people where user_id = auth.uid())
);

-- Solo se escribe sobre uno mismo.
create policy "self writes" on public.clock_entries for insert with check (
  author_person_id in (select id from public.clock_people where user_id = auth.uid())
);

-- NO hay policy de update ni de delete sobre clock_entries. Esa ausencia es la garantía.
```

Las rutas usan `supabaseAuthServer()`, **nunca** `supabaseServer()`: sin política para `anon`, la
clave pública no lee ni una fila. Y ninguna ruta de esta herramienta puede usar la clave de
servicio, que se salta la RLS y con ella la única garantía de que nadie reescribe un asiento.

## Formato del documento

No aplica: no hay markdown, como en DSMak_r y por una razón distinta. Allí no había autor de texto;
aquí lo que hay son hechos con hora, y un `md` intermedio sería una superficie editable dentro de
algo que precisamente no debe poder editarse.

Lo que sí se conserva del patrón del repo es la propiedad que lo hace útil: **la compilación nunca
lanza**.

```
compileDay(entries, schedule, absences, holidays) → { ok, day, issues }
```

`lib/clock/compile.ts` recibe los asientos crudos de un `work_date` y devuelve la jornada resuelta
—tramos, pausas, horas efectivas, saldo— más una lista de incidencias con el asiento que las
provoca. Nunca revienta: una serie incoherente produce incidencias, no una excepción.

Qué detecta que los tipos no pueden expresar:

- Jornada abierta: un `in` sin su `out`.
- Salida sin entrada, o pausa que empieza fuera de un tramo de trabajo.
- Tramos solapados tras aplicar correcciones.
- Corrección que apunta a un asiento ya anulado.
- Día con fichajes dentro de una ausencia declarada.
- Cadena de hash rota: `prev_hash` que no cuadra con el asiento anterior.

Esa última incidencia no se muestra como un aviso más. Es el único caso en el que la herramienta
tiene que decir, sin rodeos, que el registro de ese periodo ha dejado de ser fiable.

## Interfaz

- **Mi jornada** `/workspace/clock_r` — el botón de fichar arriba, grande, con el estado actual y
  el tiempo acumulado hoy. Debajo, la semana con sus tramos y el saldo; y el mes plegado. Modo
  corrección explícito, que activa la edición en línea de las horas y exige motivo antes de
  escribir, mostrando el valor anterior junto al nuevo. Botón de exportar el registro propio.
- **Equipo** `/workspace/clock_r/equipo` — solo administración. Quién ha fichado hoy y quién no,
  incidencias abiertas ordenadas por antigüedad, saldo por persona, y las acciones de calendario:
  jornada de cada uno, ausencias, festivos del año.
- **Detalle de persona** `/workspace/clock_r/equipo/[personId]` — el historial completo de alguien,
  con todos los asientos y sus correcciones a la vista, y la exportación por periodo. Es la
  pantalla que se abre el día de una revisión.
- **Tarjeta activa en la home** — la tarjeta de Clock_r en `/workspace` muestra el estado y ficha
  con un clic. **Rompe el patrón del catálogo**, donde una entrada de `APPS` solo declara `href`:
  obliga a que la home deje de ser puramente declarativa y a que el dispatcher acepte una tarjeta
  con comportamiento. Es deliberado y es la funcionalidad de la que depende que el registro sea
  real.
- **Superficie pública**: no hay. Ninguna URL de esta herramienta sale de `/workspace`.
- **Aviso de protección de datos**: al primer acceso, antes de poder fichar. Finalidad, qué se
  guarda, cuánto tiempo, quién lo ve y cómo ejercer derechos. Se registra la aceptación. **El texto
  lo redacta quien lleve lo legal, no la herramienta ni quien la implemente.**

Diferencias deliberadas con el resto de herramientas:

| Diferencia | Motivo |
|---|---|
| Sin galería de documentos | No hay documentos. Hay una persona y sus días |
| Sin autoguardado | Nada se guarda solo: un asiento se escribe cuando alguien pulsa, y no se reescribe nunca |
| Sin `beforeunload` ni `ConfirmModal` al salir | No hay estado sucio que perder. Consecuencia directa de lo anterior |
| Sin borrar | Un registro legal no se borra. `CardActions` se usa sin esa acción |
| Tarjeta con comportamiento en la home | La fricción de fichar es la razón de existir de la herramienta |
| Permisos por rol | Primera herramienta del workspace donde no todo el equipo lo ve todo |

## Ficheros

```
NUEVO
  lib/clock/schema.ts                       Zod de asientos, jornada teórica y ausencias
  lib/clock/compile.ts                      compileDay(...) → { ok, day, issues }
  lib/clock/hash.ts                         construcción del hash de asiento (misma función que la
                                            de Postgres, para poder verificar la cadena en test)
  lib/clock/calendar.ts                     jornada teórica vigente en una fecha, festivos, saldo
  lib/clock/export.ts                       CSV y PDF del registro por persona y periodo
  lib/clock/api.ts                          cliente de /api/clock
  lib/clock/types.ts
  lib/clock/__tests__/                      compile, hash, calendar, export
  app/api/clock/entries/route.ts            POST ficha, GET lista por persona y rango
  app/api/clock/people/route.ts             GET lista, PATCH jornada y rol (solo admin)
  app/api/clock/absences/route.ts           CRUD de ausencias (solo admin)
  app/api/clock/calendar/route.ts           festivos (solo admin)
  app/api/clock/export/route.ts             POST genera el registro de un periodo
  app/api/clock/consent/route.ts            POST registra la aceptación
  app/workspace/clock_r/page.tsx            Mi jornada
  app/workspace/clock_r/equipo/page.tsx     panel
  app/workspace/clock_r/equipo/[personId]/page.tsx
  components/clock/                         botón de fichar, semana, modo corrección, panel de
                                            incidencias, calendario
  lib/auth/role.ts                          isClockAdmin(user) sobre clock_people
  supabase/migrations/<ts>_create_clock.sql
  docs/features/clock-r.md                  este documento

MODIFICADO
  lib/workspace/catalog.ts                  entrada `clockr`, entre `dsmakr` y `socialmakr`
  lib/workspace/__tests__/catalog.test.ts   la entrada nueva y el orden
  lib/tokens.ts                             `toolIconAccents`: entrada `clockr` (decisión de Alberto)
  app/workspace/page.tsx                    la tarjeta de Clock_r ficha, no solo navega
  middleware.ts                             '/api/clock' en EDITOR_API
  package.json                              el glob de tests incluye lib/clock/__tests__
  docs/features/urls-workspace.md           las tres rutas nuevas
```

`.env.example`: ninguna variable nueva. No hay modelo, no hay clave, no hay servicio externo.

`lib/auth/legacyRoutes.ts`: sin cambios. No se mueve nada que ya existiera.

## Qué se reutiliza en vez de duplicar

Tal cual: `components/studio/Wordmark`, `UserMenu`, `LogoutButton`, `BrandMark`; `Modal` y
`ConfirmModal`; los estilos de `components/deck/studio/ui.ts`; `lib/supabase/server.ts` con
`supabaseAuthServer`, `requireUser` y `dbFail`; `lib/auth/team.ts`; el trigger `set_updated_at`.

`CardActions` se usa sin la acción de borrar. `GalleryFilters` y `TagInput` **no** se usan: aquí no
hay etiquetas ni galería.

`lib/hooks/useAutosave.ts` —ya extraído del editor de decks y formularios— **no aplica aquí y no
debe aplicarse**. Si alguien lo conecta por parecido, ha entendido mal la herramienta: no hay
borrador que salvar, hay asientos que se escriben una vez.

A extraer a compartido:

- **El rol de administración.** `lib/auth/team.ts` hoy solo sabe distinguir una cuenta del equipo de
  una que no lo es. Clock_r necesita un segundo nivel. Sale a `lib/auth/role.ts`, que lee
  `clock_people.role`, y queda disponible para la siguiente herramienta que lo necesite —que la
  habrá. **[supuesto]** Si el rol acaba siendo transversal al workspace y no propio de Clock_r, la
  tabla de roles debería salir de `clock_people` a una tabla de equipo. Hoy no hay materia para
  decidirlo, así que vive donde se usa.
- **La tarjeta de catálogo con acción.** Si la home acepta una tarjeta con comportamiento, conviene
  que `AppEntry` lo declare como un campo más y no que el dispatcher haga un `if` sobre `clockr`.

## IA

No aplica, y no por ahorro: por diseño. Un registro que puede acabar delante de un inspector no
admite ni un dato generado ni una hora estimada por un modelo. Tampoco hay resumen automático de
incidencias en la v1 —un resumen que se equivoque en un panel de cumplimiento vale menos que nada.

## Marca — avisos

Los cuatro primeros se comprobaron abriendo `lib/tokens.ts` y `lib/workspace/catalog.ts`, no de
memoria. Dos de ellos corrigen supuestos que traía la definición antes de mirar el código.

1. **El wordmark no rompe la convención.** La constante no es el `Mak`: es que el sufijo `_r` elide
   la terminación *-er*. `DeckMak_r` es *DeckMaker*, `FormMak_r` es *FormMaker*, `ReWrit_r` es
   *ReWriter*, y `Clock_r` es *Clocker*. `ReWrit_r` ya demostró que `Mak` no era parte de la regla.
   No hay excepción que documentar.
2. **El rol de color de estado ya existe; no hay que declarar nada.** `lib/tokens.ts` declara
   `uiRole` sobre Burdeos —«Alerta y estados críticos en interfaz»— decidido en julio de 2026 al
   integrar `/timer`, recogiendo lo que `components/forms/forms.css` ya hacía. Durante la entrevista
   se acordó declarar un rol nuevo; **al abrir el archivo resulta innecesario**. Clock_r usa el que
   hay.
   Queda la observación que motivó aquella decisión, y que sí es de uso y no de token: a volumen
   diario, el burdeos deja de leerse como alerta. La regla para esta herramienta es que **burdeos se
   reserva para lo crítico de verdad** —la cadena de hash rota, la jornada que lleva días sin
   cerrar— y las incidencias corrientes se distinguen por jerarquía y posición, no por color.
3. **Acento de icono.** `toolIconAccents` no tiene entrada para `clockr`. El propio archivo declara
   que un acento **no** identifica una herramienta y que dos pueden compartirlo —ReWrit_r y DSMak_r
   comparten el cian—, y que su alcance es `components/workspace/AppIcon.tsx` y nada más: no entran
   en la interfaz de la herramienta. Decisión de Alberto.
4. **Posición en el catálogo.** `APPS` termina hoy con `socialmakr`, apagada (`href: null`). Clock_r
   entra delante: las apagadas van al final, y el test del catálogo cubre esa invariante.
5. **Botón con relleno.** La norma pide el CTA como enlace subrayado y el chrome del workspace ya no
   la cumple: `components/deck/studio/ui.ts` define `btn` con fondo. Clock_r hereda el precedente y
   no lo reabre —y el botón de fichar es, de todos, el que más pide ser un botón de verdad. Si
   alguien quiere cerrar el asunto, se cierra en `lib/tokens.ts` para las cinco herramientas a la
   vez, no aquí.
6. **Puntuación.** Sin puntos suspensivos ni exclamaciones, tampoco en los marcadores de posición ni
   en los mensajes de incidencia. Un registro horario tiene tentación de escribir «Te falta fichar
   la salida!» y no.
7. **Vocabulario.** El texto de la herramienta habla de jornada, tramo, pausa, incidencia y
   corrección. No de «solución», ni de fichaje «inteligente». Las normas de voz de `lib/tokens.ts`
   mandan aquí como en el resto del chrome.
8. **Tono.** Esta herramienta vigila horarios, y eso la hace incómoda por defecto. La interfaz se
   escribe desde el punto de vista de quien ficha —sus horas, su saldo, su registro— y no desde el
   de quien controla. Es una decisión de marca tanto como de producto.

## Verificación

**Automática** — `lib/clock/__tests__/`, añadido al glob de `package.json`:

- `compile.test.ts` — una jornada normal con dos pausas da las horas efectivas correctas. Un `in`
  sin `out` produce incidencia de jornada abierta y **no lanza**. Una corrección sustituye al
  asiento original en el cálculo y el original sigue siendo visible. Un asiento anulado desaparece
  del cálculo. Tramos solapados tras corregir producen incidencia. Una serie deliberadamente
  incoherente devuelve incidencias y nunca una excepción.
- `hash.test.ts` — la cadena verifica de principio a fin. Alterar el contenido de un asiento
  intermedio rompe la verificación en ese punto exacto. La función de TypeScript y la de Postgres
  producen el mismo hash para la misma entrada — este test es el que evita que la garantía sea
  decorativa.
- `calendar.test.ts` — el saldo usa el tramo de `schedules` vigente en la fecha, no el actual. Un
  festivo y una ausencia no generan incidencia por falta de fichaje. La jornada intensiva aplica
  solo dentro de su periodo. El cruce de medianoche asigna el tramo al `work_date` correcto.
- `export.test.ts` — el CSV incluye los asientos de corrección con su motivo y su autor, no solo el
  resultado. El PDF lleva periodo, persona y fecha de generación. Los textos libres se escapan
  antes de inyectarse.
- `lib/workspace/__tests__/catalog.test.ts` — la entrada `clockr`, su posición delante de
  `socialmakr`, y las invariantes que ya cubre el archivo: ids únicos y tarjeta apagada sin `href`.
- `npm run type-check` y `npm run build` limpios.

**Manual**

1. Sin sesión, `/workspace/clock_r` redirige a `/workspace/login?next=/workspace/clock_r`.
2. Con una cuenta que no sea `@interactius.com`, lo mismo.
3. Con una cuenta sin rol de administración, `/workspace/clock_r/equipo` no se abre —y comprobar que
   la API tampoco responde si se la llama a mano, no solo que la pantalla no se pinte.
4. La tarjeta aparece en `/workspace`, entre DSMak_r y SocialMak_r, y ficha desde ahí sin navegar.
5. Fichar entrada, pausa, vuelta y salida, y comprobar que la semana cuadra.
6. Intentar un `update` sobre `clock_entries` desde el cliente de Supabase con una sesión normal:
   tiene que fallar por RLS.
7. Corregir una hora: el asiento original sigue visible, el nuevo lleva motivo y autor, y sin motivo
   no deja guardar.
8. Dejar una jornada abierta pasada la medianoche y comprobar que aparece como incidencia, sin hora
   de salida inventada.
9. Modificar a mano una fila de `clock_entries` desde el panel de Supabase y comprobar que la
   herramienta detecta la cadena rota y lo dice.
10. Marcar una ausencia y comprobar que ese día deja de contar como incidencia y no resta saldo.
11. Dar de baja a una persona, desactivar su cuenta en Supabase Auth, y comprobar que su registro
    sigue completo y exportable con su nombre y correo.
12. Exportar un mes en CSV y en PDF y comprobar que las correcciones aparecen con su motivo.
13. Entrar por primera vez con una cuenta nueva: sale el aviso de protección de datos antes de poder
    fichar, y la aceptación queda registrada.

## Pendiente

- **El móvil.** La señal ya está: es la primera decisión abierta y la que más afecta a que el
  registro sea real. Si el piloto del directivo muestra olvidos concentrados en entradas y salidas,
  ya no es una decisión abierta sino un fallo.
- **Acceso remoto de la Inspección.** Se aplaza a propósito: el Real Decreto no está publicado y no
  se sabe qué forma tendrá exactamente. La señal es su publicación en el BOE. Mientras tanto, la
  exportación cubre la obligación vigente. El diseño de datos ya es compatible con lo que se espera.
- **Clasificación de horas extraordinarias y complementarias.** Hoy se deriva un exceso; no se
  clasifica. Es el hueco más probable frente al borrador. La señal, la misma: el BOE.
- **Imputación a proyecto y cliente.** La integración futura. Con `clock_entries` en Supabase es
  añadir una dimensión a un dato que ya está, no rehacer la herramienta. Antes conviene decidir si
  la imputación se hace sobre el mismo asiento —y entonces deja de ser inmutable— o en una tabla
  aparte que referencia tramos. **Recomendación anticipada: tabla aparte.** El registro legal no se
  toca.
- **Notificaciones.** Recordatorio de jornada abierta por correo o Slack. Hoy el aviso solo vive en
  la home. La señal: incidencias que se acumulan más de una semana sin que nadie las corrija.
- **Límite de escritura.** `lib/rateLimit.ts` ya existe y hoy no se aplica a esta herramienta. La
  señal: fichajes duplicados por doble clic o por una pestaña repetida.
- **Apagado de Zoho.** No es una tarea de código, pero es la que cierra el proyecto. Ver decisiones
  abiertas.

---

## Prompt para Claude Code

```markdown
Trabajas en `interactius-brandguidelines` (repo `platform-clonica/brand-guidelines`). Vamos a
construir Clock_r, la quinta herramienta del workspace: el registro horario del equipo. La
definición completa está en `docs/features/clock-r.md`: léela primero, es el contrato.

Antes de nada, una advertencia que condiciona todo lo demás. Clock_r **no sigue el patrón de las
otras cuatro herramientas**. No hay markdown, no hay documento, no hay autoguardado y no hay
borrado. Lo que hay es un libro de asientos que solo admite inserciones, con hash encadenado,
porque este es el registro horario legal de la empresa y tiene que aguantar una inspección. Si en
algún momento te descubres reutilizando `lib/hooks/useAutosave.ts`, reescribiendo una fila de
`clock_entries` o añadiendo un `delete`, párate: has entendido mal la herramienta.

## Fase 1 — análisis y plan. NO escribas código todavía.

Estudia como referencia FormMak_r —para el par de pantallas, la persistencia y el estilo de las
rutas de API— y `lib/supabase/server.ts`, `lib/auth/team.ts` y `middleware.ts`. Devuelve un plan que
cubra:

1. **Modelo de datos** — las cinco tablas `clock_*` con sus columnas, la migración, y qué tablas
   existentes NO se tocan. Dentro de esto, con detalle:
   - La **RLS**, que aquí es la garantía principal: por qué la ausencia de política de `update` y
     `delete` sobre `clock_entries` basta, qué pasa con la clave de servicio, y por qué ninguna ruta
     de esta herramienta puede usarla.
   - La **función de Postgres** que inserta un asiento: bloqueo de la fila de persona, lectura del
     último hash, cálculo del nuevo, inserción. Dime cómo garantizas que dos fichajes simultáneos de
     la misma persona no rompen la cadena.
   - La **jornada teórica con histórico**: `schedules` como array de tramos con `valid_from` dentro
     de `clock_people`, en vez de una tabla aparte. Dime si lo compras y por qué.
2. **Compilación** — `compileDay(...) → { ok, day, issues }`, qué incidencias detecta, y cómo
   garantizas que nunca lanza. Enumera los casos límite que has encontrado tú y que la definición no
   lista.
3. **El hash en dos sitios** — la misma función en TypeScript y en Postgres. Cómo aseguras que
   producen el mismo resultado y cómo lo prueba el test. Si crees que hay una forma mejor de
   conseguir la garantía, dilo ahora.
4. **Arquitectura de ficheros** — la lista de archivos nuevos y modificados, con su rol.
5. **Reutilización** — qué se usa tal cual de `components/studio/*`, `components/deck/studio/ui.ts`
   y `lib/supabase/*`; la extracción del rol de administración a `lib/auth/role.ts`; y por qué
   `useAutosave`, `GalleryFilters` y `TagInput` no entran aquí.
6. **La tarjeta activa en la home** — hoy `AppEntry` solo declara `href` y la tarjeta navega. Propón
   cómo la de Clock_r ficha desde `/workspace` declarándolo en el tipo, sin convertir el dispatcher
   en un caso especial, y qué implica para `app/workspace/page.tsx`.
7. **Middleware, catálogo y URLs** — los cambios exactos en `middleware.ts` (`'/api/clock'` en
   `EDITOR_API`, que cubre las subrutas con el `startsWith` que ya hay), `lib/workspace/catalog.ts`
   —la entrada va entre `dsmakr` y `socialmakr`—, su test, `toolIconAccents` en `lib/tokens.ts` y
   `docs/features/urls-workspace.md`. Confirma que no hace falta ninguna variable nueva en
   `.env.example`.
8. **Plan de tests** — qué invariante cubre cada test y el cambio en el glob de `package.json`.
9. **Riesgos y decisiones abiertas** — las ocho que la definición deja abiertas, con tu
   recomendación para cada una. En particular la del móvil y la de la edición en línea, que cambian
   la interfaz.

Si algo de la definición choca con `lib/tokens.ts`, `lib/typeScale.ts` o `CLAUDE.md`, dilo en esta
fase con la norma en la mano y sin citarla de memoria: abre el archivo. No lo resuelvas por tu
cuenta. El acento de icono de `clockr` es decisión de Alberto: propón, no elijas.

**Gate: no escribas ni una línea de código hasta que apruebe el plan.**

## Fase 2 — implementación

Por bloques, en este orden, parando a que revise entre bloques:

1. **Datos e integridad** — migración, las cinco tablas, RLS, trigger, la función de inserción con
   hash, y `lib/clock/hash.ts` con su test de cadena. Sin interfaz. Al cerrar este bloque quiero
   poder insertar asientos desde un test, verificar la cadena, y comprobar que un `update` falla.
2. **Compilación y calendario** — `schema.ts`, `compile.ts`, `calendar.ts`, con sus tests. Sin
   interfaz todavía.
3. **API** — las rutas `/api/clock/*` con `supabaseAuthServer()` y `requireUser()`, el rol en
   `lib/auth/role.ts`, y la entrada en `EDITOR_API`. Las rutas de administración comprueban el rol
   en servidor, no confían en que la pantalla no se pinte.
4. **Mi jornada** — `/workspace/clock_r`: botón de fichar, día, semana, mes, modo corrección con
   motivo obligatorio, panel de incidencias.
5. **Equipo y detalle de persona** — las dos pantallas de administración, el calendario, las
   ausencias.
6. **Exportación** — CSV y PDF con las correcciones incluidas.
7. **Cierre técnico** — catálogo, su test, `toolIconAccents`, la tarjeta activa en la home,
   `urls-workspace.md`, y el aviso de protección de datos con su registro de aceptación. El texto
   legal lo aporta Carlos: deja el componente listo y el texto como marcador evidente, nunca
   inventado.

Reglas mientras implementas:
- Castellano en toda la interfaz del workspace, sin next-intl. Sin puntos suspensivos ni
  exclamaciones, tampoco en marcadores de posición ni en mensajes de incidencia.
- Nada de valores de marca a mano: salen de `lib/tokens.ts`. Burdeos es el color de alerta por su
  `uiRole` ya declarado, y se reserva para lo crítico de verdad.
- **Nada se reescribe en `clock_entries`.** Una corrección es un asiento nuevo. Si en algún punto te
  hace falta un `update` sobre esa tabla, el diseño está mal y hay que parar a hablarlo.
- El hash se calcula en servidor. Nunca en el navegador.
- La compilación nunca lanza: devuelve incidencias.
- Nunca se inventa una hora. Una jornada sin cerrar es un hueco declarado, no un dato estimado.
- Ni geolocalización, ni biometría, ni ningún dato del dispositivo más allá de lo que hace falta
  para escribir el asiento.
- La interfaz se escribe desde el punto de vista de quien ficha, no de quien controla.
- `npm run test`, `npm run type-check` y `npm run build` limpios al cerrar cada bloque.

## Fase 3 — cierre

Actualiza `docs/features/clock-r.md` con lo que cambió respecto a la definición: estado a
**implementado**, decisiones que se movieron y por qué, pendientes reales. Lista después los pasos
de verificación manual que me tocan a mí, incluidos los trece de la definición, y señala cuáles hay
que repetir con la asesoría laboral delante antes de apagar Zoho.
```
