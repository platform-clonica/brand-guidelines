-- Quién creó cada pieza.
--
-- ADITIVA y sin efecto sobre los permisos. Las políticas siguen siendo exactamente las mismas
-- (`for all to authenticated using (true)`): dentro del workspace se sigue viendo todo. Esto NO
-- filtra nada. Solo deja de tirar un dato que hasta ahora no se guardaba en ninguna parte.
--
-- Por qué AHORA y no cuando haga falta. Hoy hay 1 usuario y 12 propuestas, 14 clientes, 44
-- imágenes y 1 formulario: el backfill es exacto, porque todo lo creó la misma cuenta compartida
-- (info@interactius.com, f303f577-6b42-443a-8bb6-8a35ab47d650, la única que ha existido). Con diez
-- personas y cien propuestas ya no se podría reconstruir: quién creó qué no está en la base de
-- datos, ni en el historial de git, ni en ningún log. Es un dato que solo se puede empezar a
-- guardar, nunca recuperar.
--
-- Cómo se rellena. `default auth.uid()`, sin tocar una línea de los handlers. Funciona porque los
-- seis handlers de editor (app/api/{decks,clients,images,forms}/route.ts y sus [id]) insertan con
-- `supabaseAuthServer()` — la sesión del usuario — y no con la clave anónima. Esa regla está
-- escrita en lib/supabase/server.ts:16-27 desde que se endureció la RLS.
--
-- `on delete set null`, NUNCA cascade. Dar de baja a alguien no puede borrar las propuestas que
-- hizo. Y es un caso real y cercano: el plan contempla eliminar info@interactius.com cuando todo
-- el equipo tenga su cuenta, y esa cuenta es la dueña de las 12 propuestas tras este backfill.
--
-- Fuera a propósito: `signatures` y `responses`. Quien firma una propuesta o responde un
-- formulario es un cliente sin cuenta; ahí un created_by no significaría nada. Y `rate_limits`,
-- que no tiene dueño ni lo quiere.
--
-- Para qué sirve: es el prerrequisito de los tres modelos de permisos que se decidieron el
-- 2026-08-18 (propiedad por pieza, acceso por herramienta, roles admin/editor/lector). Ver
-- docs/superpowers/plans/2026-08-18-login-google-workspace.md §Permisos. Ninguno se implementa aquí.

begin;

alter table public.decks   add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();
alter table public.clients add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();
alter table public.images  add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();
alter table public.forms   add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();

-- Backfill. Por email y no por uuid literal: si la cuenta no existiera, esto no asigna nada a
-- nadie en vez de dejar una referencia rota.
update public.decks   set created_by = (select id from auth.users where email = 'info@interactius.com')
  where created_by is null;
update public.clients set created_by = (select id from auth.users where email = 'info@interactius.com')
  where created_by is null;
update public.images  set created_by = (select id from auth.users where email = 'info@interactius.com')
  where created_by is null;
update public.forms   set created_by = (select id from auth.users where email = 'info@interactius.com')
  where created_by is null;

-- Índices: las consultas por propietario todavía no existen, pero cuando lleguen serán "lo mío"
-- en la galería, que es el listado más caliente del editor.
create index if not exists decks_created_by_idx   on public.decks   (created_by);
create index if not exists clients_created_by_idx on public.clients (created_by);
create index if not exists images_created_by_idx  on public.images  (created_by);
create index if not exists forms_created_by_idx   on public.forms   (created_by);

commit;
