-- IMG_r · el banco de imágenes sobre la tabla `images` de siempre.
-- Definición: docs/features/img-r.md · plan: docs/superpowers/plans/2026-10-01-img-r-fase-1.md (§ 1).
--
-- COMPATIBLE con el código desplegado. La versión en producción del popup de imágenes inserta sin
-- `name` ni `tags`: por eso aquí `name` queda NULLABLE (relleno para todas las filas que hay) y `tags`
-- lleva default. El `not null` de `name` va en 20261001100100_images_name_not_null.sql, que se aplica
-- DESPUÉS de desplegar IMG_r. Aplicarlo antes dejaría la subida de DeckMak_r y FormMak_r respondiendo
-- 500 hasta el despliegue (plan, D1).
--
-- Qué NO toca: `decks`, `forms` y su `md`; ningún objeto de Storage (las imágenes antiguas siguen en
-- `images/<marca>-<nombre>`, porque su URL está dentro de decks publicados); el bucket `deck-assets`;
-- las políticas RLS y de Storage.

begin;

-- ── Funciones ───────────────────────────────────────────────────────────────

-- El nombre de una imagen subida antes de IMG_r: el `alt` (el popup guardaba ahí el nombre original del
-- fichero, sin extensión y sin sanear); si no hay, la ruta sin carpeta, sin marca de tiempo y sin
-- extensión. La misma regla que `legacyName()` en lib/images/naming.ts. La usan esta migración y la
-- del `not null`, para que la regla se escriba una sola vez.
create or replace function public.image_legacy_name(p_alt text, p_storage_path text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(p_alt, E' \t\r\n'), ''),
    nullif(regexp_replace(regexp_replace(regexp_replace(p_storage_path, '^.*/', ''), '^[0-9]+-', ''), '\.[^.]*$', ''), ''),
    p_storage_path
  )
$$;

-- El texto en el que se busca: nombre y etiquetas, en minúsculas y sin tildes. El mapa de tildes es
-- EXACTAMENTE el de FOLD_FROM / FOLD_TO en lib/images/filter.ts, que pliega la consulta: si los dos se
-- separan, lib/images/__tests__/filter.test.ts falla. `immutable` es una promesa nuestra (array_to_string
-- es `stable` en general, pero sobre text[] el resultado no depende de nada más que de la entrada), y
-- es lo que permite usarla en una columna generada.
create or replace function public.image_search_text(p_name text, p_tags text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(lower(coalesce(p_name, '') || ' ' || array_to_string(p_tags, ' ')), 'áàâäãåéèêëíìîïóòôöõúùûüñçý', 'aaaaaaeeeeiiiiooooouuuuncy')
$$;

-- LA definición de «en uso». Una fila por documento que lleva la URL de la versión ligera en su `md`.
-- La usan el listado (el recuento de cada tarjeta, en una sola llamada para la página entera),
-- GET /api/images/[id], /usage y el DELETE, que bloquea. `strpos` y no LIKE: una URL no tiene comodines
-- que escapar. El nombre del documento sigue la regla de app/api/images/[id]/usage antes de esto.
-- `security invoker`: corre con los permisos de quien llama, y la RLS de decks y forms aplica.
create or replace function public.image_uses(p_ids uuid[])
returns table (image_id uuid, kind text, doc_id uuid, doc_name text)
language sql
stable
security invoker
set search_path = ''
as $$
  select i.id, 'deck'::text, d.id, coalesce(nullif(d.commercial_id, ''), nullif(c.name, ''), 'Sin nombre')
    from public.images i
    join public.decks d on strpos(d.md, i.url) > 0
    left join public.clients c on c.id = d.client_id
   where i.id = any (p_ids)
  union all
  select i.id, 'form'::text, f.id, coalesce(nullif(f.title, ''), 'Sin título')
    from public.images i
    join public.forms f on strpos(f.md, i.url) > 0
   where i.id = any (p_ids)
$$;

-- Quién subió una imagen. `created_by` apunta a auth.users, que la sesión no lee por PostgREST; esto
-- devuelve el nombre de Google (o el correo, si no hay) de los ids que se le pasan, y nada más.
-- `security definer` para poder leer auth.users; solo la ejecuta `authenticated`, que es el equipo
-- (el registro está restringido al dominio, 20260818090000).
create or replace function public.team_member_names(p_ids uuid[])
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id,
         coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), nullif(btrim(u.raw_user_meta_data->>'name'), ''), u.email)
    from auth.users u
   where u.id = any (p_ids)
$$;

revoke execute on function public.image_legacy_name(text, text)  from public, anon;
revoke execute on function public.image_search_text(text, text[]) from public, anon;
revoke execute on function public.image_uses(uuid[])              from public, anon;
revoke execute on function public.team_member_names(uuid[])       from public, anon;
grant  execute on function public.image_legacy_name(text, text)  to authenticated;
grant  execute on function public.image_search_text(text, text[]) to authenticated;
grant  execute on function public.image_uses(uuid[])              to authenticated;
grant  execute on function public.team_member_names(uuid[])       to authenticated;

-- ── Columnas ────────────────────────────────────────────────────────────────

alter table public.images
  add column name                text,
  add column tags                text[] not null default '{}',
  add column original_path       text,
  add column original_bytes      bigint,
  add column original_width      int,
  add column original_height     int,
  add column thumb_path          text,
  add column parent_id           uuid references public.images (id) on delete set null,   -- fase 2
  add column prior_original_path text,                                                     -- fase 2
  add column updated_at          timestamptz not null default now();

-- Las que ya existen: nombre desde el fichero, sin etiquetas, sin original ni miniatura, y `updated_at`
-- igual a su `created_at` (no la fecha de esta migración). Va ANTES del trigger, que si no lo pisaría.
update public.images
   set name = public.image_legacy_name(alt, storage_path),
       updated_at = created_at
 where name is null;

alter table public.images
  add column search_text text generated always as (public.image_search_text(name, tags)) stored;

-- `edited` es de la fase 2; se declara ya para que la tabla no pida otra migración.
alter table public.images
  add constraint images_source_check check (source in ('upload', 'generated', 'edited'));

create index images_tags_gin_idx      on public.images using gin (tags);
create index images_created_at_id_idx on public.images (created_at desc, id desc);

-- Detecta el choque entre pestañas: PATCH /api/images/[id] solo escribe si `updated_at` sigue siendo
-- el que se leyó.
create trigger images_set_updated_at
  before update on public.images
  for each row execute function public.set_updated_at();

-- ── Bucket ──────────────────────────────────────────────────────────────────
-- Tenía 10 MB y cinco tipos (20260817122000_tighten_storage.sql). IMG_r guarda el original: 25 MB
-- (26 214 400 bytes, el MB de 1024 × 1024 con el que la interfaz formatea el peso) y solo JPEG, PNG y
-- WebP. Solo `deck-images`: `deck-assets` lleva logos SVG y no cambia.
update storage.buckets
   set file_size_limit    = 26214400,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'deck-images';

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────
--   select count(*) from images;                                         -- el mismo que antes
--   select count(*) from images where name is null or btrim(name) = '';  -- 0
--   select count(*) from images where updated_at <> created_at;          -- 0
--   select file_size_limit, allowed_mime_types from storage.buckets where id = 'deck-images';
--   select * from image_uses(array(select id from images));              -- los usos de hoy
