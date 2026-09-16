-- DSMak_r: tabla `design_systems`. Ver docs/features/ds-mak-r.md y docs/features/ds-mak-r-plan.md §1.
--
-- ADITIVA. Crea una tabla nueva y no toca ninguna existente (decks, forms, responses, clients,
-- images, signatures, rate_limits) ni las políticas de Storage. Se puede aplicar en cualquier momento.
--
-- Qué manda. `brand` y `overrides` son la fuente de verdad; `tokens` es la salida del motor, guardada
-- para que un sistema entregado no cambie solo cuando se afine el algoritmo (`engine_version`).
-- `name` y `client` son espejo de `brand` para listar y buscar sin abrir el JSONB.
--
-- `public_id` nace en la base de datos. Hoy no hay URL pública; existe para no tener que migrar el
-- día que la haya, y así un duplicado recibe uno nuevo sin que el código tenga que acordarse.
--
-- RLS con la forma del repo (20260817121000_tighten_rls.sql): una política para el equipo y
-- `revoke all from anon`. No hay superficie pública, así que anon no tiene nada que leer. El revoke
-- no es redundante: Supabase concede por defecto todos los privilegios a `anon` en cada tabla nueva
-- de `public` (comprobado en `forms` el 2026-09-15), y si alguien desactiva la RLS un momento para
-- depurar, eso es lo que decide si la tabla queda abierta.
--
-- `created_by`: mismo patrón que 20260818100000_created_by_seam.sql. Rastro, no permiso.

begin;

create table public.design_systems (
  id             uuid primary key default gen_random_uuid(),
  public_id      text not null unique default ('ds_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
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

-- La galería ordena por última edición; "lo mío" filtrará por created_by cuando exista.
create index design_systems_updated_at_idx on public.design_systems (updated_at desc);
create index design_systems_created_by_idx on public.design_systems (created_by);

alter table public.design_systems enable row level security;

create policy design_systems_team on public.design_systems
  for all to authenticated using (true) with check (true);

revoke all on public.design_systems from anon;

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────
-- Con la clave anónima y sin sesión: GET /rest/v1/design_systems?select=id → 401/permiso denegado.
-- get_advisors (security) no debe listar design_systems.
