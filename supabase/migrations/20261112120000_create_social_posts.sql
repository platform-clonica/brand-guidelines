-- SocialMak_r: tabla `social_posts`. Ver docs/features/social-maker.md.
--
-- ADITIVA. Crea una tabla nueva y no toca ninguna existente (decks, forms, responses, clients,
-- images, design_systems, signatures, rate_limits) ni las políticas de Storage. Se puede aplicar
-- en cualquier momento, antes o después de desplegar el código.
--
-- QUÉ MANDA. `md` es la fuente de verdad y lo único que hay que guardar: las slides se compilan
-- desde ahí en cada render, igual que en el editor. No se guarda el resultado compilado porque
-- sería una segunda copia del diseño destinada a quedarse vieja en cuanto cambie un layout.
--
-- `canvas` se guarda aparte del markdown porque no vive en él: es cómo se mira la pieza, no qué
-- dice. `name` también, para poder listar sin abrir el texto.
--
-- `public_id` nace en la base de datos. Hoy no hay URL pública para una pieza social; existe para
-- no tener que migrar el día que la haya, y así un duplicado recibe uno nuevo sin que el código
-- tenga que acordarse. Mismo criterio que `design_systems`.
--
-- RLS con la forma del repo (20260817121000_tighten_rls.sql): una política para el equipo y
-- `revoke all from anon`. No hay superficie pública, así que anon no tiene nada que leer. El
-- revoke no es redundante: Supabase concede por defecto todos los privilegios a `anon` en cada
-- tabla nueva de `public`, y si alguien desactiva la RLS un momento para depurar, eso es lo que
-- decide si la tabla queda abierta.
--
-- `created_by`: mismo patrón que 20260818100000_created_by_seam.sql. Rastro, no permiso.

begin;

create table public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  public_id   text not null unique default ('soc_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  name        text not null,
  canvas      text not null default 'carrusel' check (canvas in ('carrusel', 'post')),
  md          text not null,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null default auth.uid()
);

create trigger social_posts_set_updated_at
  before update on public.social_posts
  for each row execute function public.set_updated_at();

-- La galería ordena por última edición; "lo mío" filtrará por created_by cuando exista.
create index social_posts_updated_at_idx on public.social_posts (updated_at desc);
create index social_posts_created_by_idx on public.social_posts (created_by);

alter table public.social_posts enable row level security;

create policy social_posts_team on public.social_posts
  for all to authenticated using (true) with check (true);

revoke all on public.social_posts from anon;

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────
-- Con la clave anónima y sin sesión: GET /rest/v1/social_posts?select=id → 401/permiso denegado.
