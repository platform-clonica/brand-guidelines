-- Clock_r: el registro horario del equipo. Ver docs/features/clock-r.md y docs/features/clock-r-plan.md.
--
-- ADITIVA. Crea cinco tablas y cinco funciones nuevas, y no toca ninguna existente (decks, forms,
-- responses, clients, images, signatures, rate_limits, design_systems) ni las políticas de Storage.
-- Se puede aplicar en cualquier momento.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- ESTA MIGRACIÓN ROMPE A PROPÓSITO EL PATRÓN DE RLS DEL REPO. Léelo antes de "corregirlo".
--
-- El resto de tablas usan una sola política `for all to authenticated using (true)`. `for all`
-- incluye `update` y `delete`, que son exactamente las dos operaciones que esta herramienta existe
-- para impedir: `clock_entries` es el registro horario legal de la empresa y tiene que aguantar una
-- inspección. Aquí no es la misma situación que en las demás tablas — allí se guardan documentos
-- editables, aquí asientos contables— así que la desviación no es una incoherencia: es la razón de
-- ser de la tabla. Ver el plan, H2.
--
-- De ahí las dos decisiones que sostienen todo lo demás:
--
--   1. NO HAY POLÍTICA de insert, update ni delete sobre `clock_entries`. Esa ausencia ES la
--      garantía: con RLS activa y sin política, la operación no afecta a ninguna fila.
--   2. NADIE INSERTA DIRECTAMENTE. La única puerta es `clock_record()`, que es `security definer`
--      y por eso escribe aunque no haya política. Si se dejara insertar por PostgREST, cualquiera
--      con sesión podría elegir a mano su `hash`, su `prev_hash` y su `occurred_at`, y la cadena
--      dejaría de probar nada (plan, H1). Por eso se revoca `insert` también a `authenticated`.
--
-- La clave de servicio se salta la RLS y con ella la única garantía de que nadie reescribe un
-- asiento: NINGUNA ruta de esta herramienta puede usarla. Hoy no existe en el repo, y así sigue.
-- ─────────────────────────────────────────────────────────────────────────────────────────────
--
-- `revoke all from anon` en las cinco, por el mismo motivo ya escrito en create_design_systems.sql:
-- Supabase concede por defecto todos los privilegios a `anon` en cada tabla nueva de `public`, y ese
-- revoke es lo que decide si la tabla queda abierta el día que alguien desactiva la RLS para depurar.
--
-- `created_by`: mismo patrón que 20260818100000_created_by_seam.sql. Rastro, no permiso.

begin;

-- ─────────────────────────────── 1 · Personas ───────────────────────────────

create table public.clock_people (
  id            uuid primary key default gen_random_uuid(),
  -- NUNCA `cascade`: borrar la cuenta de Google no puede llevarse el registro horario.
  user_id       uuid unique references auth.users(id) on delete set null,
  -- Copias estables. El registro sobrevive a la baja de la cuenta.
  email         text not null unique,
  display_name  text not null,
  role          text not null default 'member' check (role in ('member', 'admin')),
  status        text not null default 'active' check (status in ('active', 'inactive')),
  -- Array de tramos de jornada teórica, cada uno con `valid_from`, para que el saldo de un día
  -- pasado se calcule con la jornada vigente ESE día. Es la única fila de la herramienta que se
  -- reescribe: es configuración, no registro (plan, §1).
  schedules     jsonb not null default '[]',
  started_on    date,
  ended_on      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null default auth.uid()
);

create trigger clock_people_set_updated_at
  before update on public.clock_people
  for each row execute function public.set_updated_at();

-- ─────────────────────────────── 2 · El libro de asientos ───────────────────────────────

create table public.clock_entries (
  id               uuid primary key default gen_random_uuid(),
  -- Orden de escritura. Sirve para MOSTRAR, no como orden de la cadena: las identidades tienen
  -- huecos y pueden consumirse desordenadas bajo concurrencia. El orden de verdad es el encadenado.
  seq              bigint generated always as identity,
  person_id        uuid not null references public.clock_people(id),
  -- Copia en el momento del fichaje: el asiento no depende de que la persona siga existiendo.
  person_email     text not null,
  person_name      text not null,
  op               text not null default 'record' check (op in ('record', 'amend', 'annul')),
  corrects         uuid references public.clock_entries(id),
  reason           text,
  kind             text not null check (kind in ('in', 'out', 'break_start', 'break_end')),
  occurred_at      timestamptz not null,
  -- Cuándo se escribió. En un fichaje normal coincide con `occurred_at`; en una corrección, no.
  recorded_at      timestamptz not null default now(),
  work_date        date not null,
  mode             text not null check (mode in ('onsite', 'remote')),
  source           text not null check (source in ('home_card', 'app')),
  author_person_id uuid not null references public.clock_people(id),
  prev_hash        text,
  hash             text not null unique,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),

  -- Sin motivo no hay corrección, y la regla vive en la TABLA, no en un formulario: una pantalla
  -- se puede saltar, una restricción no.
  constraint clock_entries_correction_shape check (
    op = 'record'
    or (corrects is not null and reason is not null and length(btrim(reason)) > 0)
  )
);

-- LA GARANTÍA ESTRUCTURAL DE LA CADENA. Dos asientos de una misma persona no pueden apuntar al
-- mismo antecesor. `nulls not distinct` (Postgres 15+) extiende la protección al primer asiento,
-- cuyo `prev_hash` es nulo. Si alguna vez fallara el bloqueo de fila de `clock_record`, el segundo
-- insert no corrompe nada: revienta por unicidad y el cliente reintenta (plan, H6).
create unique index clock_entries_chain_idx
  on public.clock_entries (person_id, prev_hash) nulls not distinct;

create index clock_entries_person_day_idx on public.clock_entries (person_id, work_date);
create index clock_entries_day_idx        on public.clock_entries (work_date);
create index clock_entries_corrects_idx   on public.clock_entries (corrects);

-- ─────────────────────────────── 3 · Ausencias, calendario y consentimientos ───────────────────

create table public.clock_absences (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.clock_people(id),
  from_date  date not null,
  to_date    date not null,
  -- SIN tipo médico, a propósito: el motivo de una baja es dato de salud y no tiene por qué vivir
  -- en una herramienta que administración consulta a diario. Que conste el día no trabajado basta.
  kind       text not null check (kind in ('vacaciones', 'ausencia_justificada', 'ausencia')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint clock_absences_range check (to_date >= from_date)
);

create trigger clock_absences_set_updated_at
  before update on public.clock_absences
  for each row execute function public.set_updated_at();

create index clock_absences_person_idx on public.clock_absences (person_id, from_date);

create table public.clock_calendar_days (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  name       text not null,
  scope      text not null check (scope in ('nacional', 'cataluna', 'barcelona')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  unique (day, scope)
);

create trigger clock_calendar_days_set_updated_at
  before update on public.clock_calendar_days
  for each row execute function public.set_updated_at();

-- Append-only igual que el libro: una aceptación no se reescribe. Si cambia el texto informativo,
-- sube `policy_version` y se vuelve a pedir.
create table public.clock_consents (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.clock_people(id),
  policy_version text not null,
  policy_hash    text not null,
  accepted_at    timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null default auth.uid()
);

create index clock_consents_person_idx on public.clock_consents (person_id, accepted_at desc);

-- ─────────────────────────────── 4 · Funciones ───────────────────────────────
--
-- Las cinco llevan `set search_path`, como las siete que ya hay en `public`: sin él, una función
-- `security definer` es el vector clásico de escalada por tabla suplantada.

-- ¿La sesión actual es administradora? Que lea `clock_people` desde dentro de la política de
-- `clock_people` NO provoca recursión: `security definer` se salta la RLS.
create or replace function public.clock_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clock_people p
    where p.user_id = auth.uid() and p.role = 'admin' and p.status = 'active'
  );
$$;

comment on function public.clock_is_admin() is
  'true si la sesión pertenece a una persona activa con rol admin.';

-- El hash de un asiento. Está aparte de clock_record() a propósito: así el script que regenera los
-- vectores dorados llama EXACTAMENTE a la misma función que escribe en producción.
--
-- Cada campo va precedido de su longitud EN BYTES, en orden fijo y sin separador que se pueda
-- inyectar. Hashear JSON no serviría (el orden de claves de to_jsonb y el de JavaScript no
-- coinciden) y concatenar con un separador tampoco: un motivo que lo contuviera permitiría que dos
-- asientos distintos dieran la misma carga. Ver el plan, H5, y lib/clock/hash.ts.
--
-- Dos detalles que parecen cosméticos y no lo son:
--   · `occurred_at` se serializa como MICROSEGUNDOS DE ÉPOCA, que no dependen de zona ni de formato.
--   · `work_date` pasa por to_char con formato explícito: `date::text` obedece a DateStyle, y un
--     servidor con otro DateStyle produciría otra carga para el mismo asiento.
create or replace function public.clock_entry_hash(
  p_prev_hash        text,
  p_person_id        uuid,
  p_person_email     text,
  p_person_name      text,
  p_op               text,
  p_corrects         uuid,
  p_reason           text,
  p_kind             text,
  p_occurred_at      timestamptz,
  p_work_date        date,
  p_mode             text,
  p_source           text,
  p_author_person_id uuid
)
returns text
language sql
stable
set search_path = public
as $$
  select encode(
    sha256(convert_to(
      (
        select string_agg(octet_length(v) || ':' || v, '' order by ord)
        from unnest(array[
          coalesce(p_prev_hash, ''),
          coalesce(p_person_id::text, ''),
          coalesce(p_person_email, ''),
          coalesce(p_person_name, ''),
          coalesce(p_op, ''),
          coalesce(p_corrects::text, ''),
          coalesce(p_reason, ''),
          coalesce(p_kind, ''),
          coalesce(((extract(epoch from p_occurred_at) * 1000000)::bigint)::text, ''),
          coalesce(to_char(p_work_date, 'YYYY-MM-DD'), ''),
          coalesce(p_mode, ''),
          coalesce(p_source, ''),
          coalesce(p_author_person_id::text, '')
        ]) with ordinality as t(v, ord)
      ),
      'UTF8'
    )),
    'hex'
  );
$$;

comment on function public.clock_entry_hash(text, uuid, text, text, text, uuid, text, text, timestamptz, date, text, text, uuid) is
  'Hash de un asiento: sha256 de los campos con prefijo de longitud en bytes. Espejo de lib/clock/hash.ts.';

-- Alta automática al primer acceso. Cero fricción: Personas ajusta después la jornada real.
create or replace function public.clock_ensure_person()
returns public.clock_people
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := lower(auth.jwt() ->> 'email');
  v_name   text := coalesce(
                     auth.jwt() -> 'user_metadata' ->> 'full_name',
                     auth.jwt() -> 'user_metadata' ->> 'name',
                     split_part(lower(auth.jwt() ->> 'email'), '@', 1)
                   );
  v_person public.clock_people;
begin
  if auth.uid() is null then
    raise exception 'Hace falta una sesión' using errcode = '42501';
  end if;
  -- Cuarta capa del mismo cinturón que describe lib/auth/team.ts. Dominio exacto, no sufijo.
  if v_email is null or split_part(v_email, '@', 2) <> 'interactius.com' then
    raise exception 'Solo las cuentas de Interactius tienen registro horario' using errcode = '42501';
  end if;

  select * into v_person from public.clock_people where user_id = auth.uid();
  if found then
    return v_person;
  end if;

  -- Una persona que ya existía por correo (dada de alta por administración antes de su primer
  -- acceso, o que cambió de cuenta) recupera SU ficha en vez de estrenar otra: si naciera una
  -- segunda, su registro quedaría partido en dos cadenas.
  update public.clock_people
     set user_id = auth.uid(), display_name = coalesce(nullif(display_name, ''), v_name)
   where email = v_email and user_id is null
  returning * into v_person;
  if found then
    return v_person;
  end if;

  insert into public.clock_people (user_id, email, display_name, started_on)
  values (auth.uid(), v_email, v_name, (now() at time zone 'Europe/Madrid')::date)
  returning * into v_person;

  return v_person;
end;
$$;

comment on function public.clock_ensure_person() is
  'Devuelve la ficha de la sesión, creándola al primer acceso. Idempotente.';

-- LA ÚNICA PUERTA DE ESCRITURA del libro de asientos.
--
-- Concurrencia: bloquea la fila de `clock_people` ANTES de leer el último asiento, así que dos
-- fichajes simultáneos de la misma persona se serializan; dos personas distintas no se estorban,
-- que es por lo que la cadena es por persona y no global. El índice único de cadena es la segunda
-- capa por si esta fallara (plan, H6).
create or replace function public.clock_record(
  p_kind        text,
  p_occurred_at timestamptz default now(),
  p_mode        text default 'onsite',
  p_source      text default 'app',
  p_op          text default 'record',
  p_corrects    uuid default null,
  p_reason      text default null,
  p_person_id   uuid default null
)
returns public.clock_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author    public.clock_people;
  v_person    public.clock_people;
  v_corrected public.clock_entries;
  v_last      public.clock_entries;
  v_work      date;
  v_hash      text;
  v_row       public.clock_entries;
begin
  -- 1 · Quién escribe. Se deriva de la sesión, NUNCA de lo que mande el cliente.
  select * into v_author from public.clock_people
   where user_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'No hay ninguna ficha de persona activa para esta sesión' using errcode = '42501';
  end if;

  -- 2 · Sobre quién se escribe, con la fila bloqueada hasta el commit.
  select * into v_person from public.clock_people
   where id = coalesce(p_person_id, v_author.id)
   for update;
  if not found then
    raise exception 'Esa persona no existe' using errcode = '23503';
  end if;
  if v_person.id <> v_author.id and not public.clock_is_admin() then
    raise exception 'Solo administración puede escribir sobre otra persona' using errcode = '42501';
  end if;
  if v_person.status <> 'active' then
    raise exception 'Esa persona está dada de baja' using errcode = '42501';
  end if;

  -- 3 · Forma de la corrección. La restricción de tabla ya lo exige; aquí el mensaje es legible.
  if p_op <> 'record' then
    if p_corrects is null or btrim(coalesce(p_reason, '')) = '' then
      raise exception 'Una corrección necesita el asiento que corrige y un motivo' using errcode = '23514';
    end if;
    select * into v_corrected from public.clock_entries where id = p_corrects;
    if not found then
      raise exception 'El asiento que se corrige no existe' using errcode = '23503';
    end if;
    if v_corrected.person_id <> v_person.id then
      raise exception 'Ese asiento es de otra persona' using errcode = '42501';
    end if;
  elsif p_corrects is not null or p_reason is not null then
    raise exception 'Un fichaje normal no corrige nada ni lleva motivo' using errcode = '23514';
  end if;

  -- 4 · A qué día de jornada pertenece. Lo deriva el servidor: si lo mandara el cliente, se podría
  --     mentir sobre el día al que se imputan las horas. Zona horaria explícita — el TimeZone por
  --     defecto de Postgres es UTC, y esto es el registro horario de una empresa española, así que
  --     en enero un fichaje a las 00:30 locales caería en el día anterior (plan, H7).
  if v_corrected.id is not null then
    v_work := v_corrected.work_date;                      -- una corrección vive en el día que corrige
  elsif p_kind = 'in' then
    v_work := (p_occurred_at at time zone 'Europe/Madrid')::date;
  else
    select * into v_last from public.clock_entries
     where person_id = v_person.id and op = 'record'
     order by seq desc limit 1;
    if found and v_last.kind in ('in', 'break_start', 'break_end') then
      v_work := v_last.work_date;                         -- la jornada sigue abierta: mismo día
    else
      v_work := (p_occurred_at at time zone 'Europe/Madrid')::date;
    end if;
  end if;

  -- 5 · El eslabón anterior de ESTA persona.
  select * into v_last from public.clock_entries
   where person_id = v_person.id
   order by seq desc limit 1;

  v_hash := public.clock_entry_hash(
    v_last.hash, v_person.id, v_person.email, v_person.display_name,
    p_op, p_corrects, p_reason, p_kind,
    p_occurred_at, v_work, p_mode, p_source, v_author.id
  );

  insert into public.clock_entries (
    person_id, person_email, person_name, op, corrects, reason, kind,
    occurred_at, work_date, mode, source, author_person_id, prev_hash, hash
  ) values (
    v_person.id, v_person.email, v_person.display_name, p_op, p_corrects, p_reason, p_kind,
    p_occurred_at, v_work, p_mode, p_source, v_author.id, v_last.hash, v_hash
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.clock_record(text, timestamptz, text, text, text, uuid, text, uuid) is
  'Única puerta de escritura de clock_entries: bloquea, encadena e inserta. El hash lo pone el servidor.';

-- Verifica la cadena de una persona. Devuelve CERO FILAS si está intacta; si no, el primer asiento
-- donde deja de cuadrar. Esto es lo que consulta la aplicación: el navegador no rehace hashes.
create or replace function public.clock_verify_chain(p_person_id uuid)
returns table (broken_seq bigint, broken_id uuid, expected_hash text, found_hash text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r      public.clock_entries;
  v_prev text := null;
  v_hash text;
begin
  if not (
    public.clock_is_admin()
    or exists (select 1 from public.clock_people p where p.id = p_person_id and p.user_id = auth.uid())
  ) then
    raise exception 'Sin permiso para verificar esta cadena' using errcode = '42501';
  end if;

  for r in select * from public.clock_entries where person_id = p_person_id order by seq loop
    v_hash := public.clock_entry_hash(
      v_prev, r.person_id, r.person_email, r.person_name,
      r.op, r.corrects, r.reason, r.kind,
      r.occurred_at, r.work_date, r.mode, r.source, r.author_person_id
    );
    if r.prev_hash is distinct from v_prev or r.hash <> v_hash then
      broken_seq := r.seq; broken_id := r.id; expected_hash := v_hash; found_hash := r.hash;
      return next;
      return;                       -- a partir del primer eslabón roto, lo de después no dice nada
    end if;
    v_prev := r.hash;
  end loop;
  return;
end;
$$;

comment on function public.clock_verify_chain(uuid) is
  'Cero filas = cadena intacta. Si devuelve una, ese es el primer asiento que no cuadra.';

-- ─────────────────────────────── 5 · RLS y permisos ───────────────────────────────

alter table public.clock_people        enable row level security;
alter table public.clock_entries       enable row level security;
alter table public.clock_absences      enable row level security;
alter table public.clock_calendar_days enable row level security;
alter table public.clock_consents      enable row level security;

-- Personas: cada cual ve su ficha; administración las ve y las edita todas. El alta la hace
-- clock_ensure_person(), así que tampoco hay política de insert aquí.
create policy clock_people_read on public.clock_people
  for select to authenticated
  using (public.clock_is_admin() or user_id = auth.uid());

create policy clock_people_admin_write on public.clock_people
  for update to authenticated
  using (public.clock_is_admin()) with check (public.clock_is_admin());

-- El libro: solo lectura, y solo de lo propio salvo administración.
create policy clock_entries_read on public.clock_entries
  for select to authenticated
  using (
    public.clock_is_admin()
    or person_id in (select id from public.clock_people where user_id = auth.uid())
  );

-- NO hay policy de insert, update ni delete sobre clock_entries. Esa ausencia es la garantía.

create policy clock_absences_read on public.clock_absences
  for select to authenticated
  using (
    public.clock_is_admin()
    or person_id in (select id from public.clock_people where user_id = auth.uid())
  );

create policy clock_absences_admin_write on public.clock_absences
  for all to authenticated
  using (public.clock_is_admin()) with check (public.clock_is_admin());

-- El calendario laboral lo ve todo el equipo; lo escribe administración.
create policy clock_calendar_days_read on public.clock_calendar_days
  for select to authenticated using (true);

create policy clock_calendar_days_admin_write on public.clock_calendar_days
  for all to authenticated
  using (public.clock_is_admin()) with check (public.clock_is_admin());

create policy clock_consents_read on public.clock_consents
  for select to authenticated
  using (
    public.clock_is_admin()
    or person_id in (select id from public.clock_people where user_id = auth.uid())
  );

-- No hay superficie pública en toda la herramienta: anon no tiene nada que hacer aquí.
revoke all on public.clock_people        from anon;
revoke all on public.clock_entries       from anon;
revoke all on public.clock_absences      from anon;
revoke all on public.clock_calendar_days from anon;
revoke all on public.clock_consents      from anon;

-- Las dos tablas de solo-inserción: ni siquiera el equipo escribe contra ellas directamente.
revoke insert, update, delete on public.clock_entries  from authenticated;
revoke insert, update, delete on public.clock_consents from authenticated;
-- Y el alta de personas pasa por clock_ensure_person(), no por un insert suelto.
revoke insert, delete on public.clock_people from authenticated;

revoke all on function public.clock_is_admin()      from public;
revoke all on function public.clock_ensure_person() from public;
revoke all on function public.clock_verify_chain(uuid) from public;
revoke all on function public.clock_record(text, timestamptz, text, text, text, uuid, text, uuid) from public;
revoke all on function public.clock_entry_hash(text, uuid, text, text, text, uuid, text, text, timestamptz, date, text, text, uuid) from public;

grant execute on function public.clock_is_admin()      to authenticated;
grant execute on function public.clock_ensure_person() to authenticated;
grant execute on function public.clock_verify_chain(uuid) to authenticated;
grant execute on function public.clock_record(text, timestamptz, text, text, text, uuid, text, uuid) to authenticated;
grant execute on function public.clock_entry_hash(text, uuid, text, text, text, uuid, text, text, timestamptz, date, text, text, uuid) to authenticated;

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────────────────────
-- Con la clave anónima, las cinco tienen que responder 401 `permission denied`:
--   GET {url}/rest/v1/clock_entries?select=id     → 401
--   GET {url}/rest/v1/clock_people?select=id      → 401
--
-- Con sesión de equipo:
--   · select sobre clock_entries devuelve SOLO los asientos propios (o todos, si es admin);
--   · update sobre clock_entries afecta a 0 filas y además no tiene privilegio;
--   · insert directo sobre clock_entries → `permission denied for table clock_entries`;
--   · rpc clock_record(p_kind => 'in') inserta y devuelve la fila con su hash;
--   · rpc clock_verify_chain(<id>) devuelve cero filas;
--   · tras un `update` a mano desde el panel de Supabase, clock_verify_chain devuelve ese asiento.
