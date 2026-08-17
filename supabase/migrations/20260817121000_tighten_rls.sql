-- Cierra las políticas MVP que dejaban `decks`, `clients`, `images` y `signatures` abiertas a la
-- clave anónima, que viaja en el bundle del cliente por diseño.
--
-- ⚠️ RESTRICTIVA. Aplicar SOLO después de desplegar el commit que migra los handlers de editor a
-- `supabaseAuthServer()` y el visor público a las RPC de 20260817120000. Aplicarla antes deja
-- brand.interactius.com sin galería, sin editor y sin visor.
--
-- Qué había. `decks_open_mvp`, `clients_open_mvp` e `images_open_mvp` eran
-- `FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`, y `signatures` tenía SELECT e
-- INSERT `TO public` con `USING (true)`. Verificado el 2026-08-17 desde una máquina cualquiera,
-- sin sesión de equipo: 12 propuestas completas (columna `md`, 90.198 caracteres), 14 clientes con
-- sus correos, 44 imágenes y la firma de aceptación con su IP. Y con permiso de escritura.
--
-- El modelo nuevo es el que `responses` y `forms` ya usaban bien: `anon` solo donde un anónimo
-- legítimo tiene que actuar (firmar una propuesta que ha recibido), el equipo para todo lo demás.

begin;

-- ── decks · clients · images ────────────────────────────────────────────────
-- Solo el equipo. La lectura pública del visor va por `public.deck_public(uuid)`, que es
-- SECURITY DEFINER y devuelve un subconjunto acotado a partir de un id que hay que conocer.

drop policy if exists decks_open_mvp   on public.decks;
drop policy if exists clients_open_mvp on public.clients;
drop policy if exists images_open_mvp  on public.images;

create policy decks_team   on public.decks   for all to authenticated using (true) with check (true);
create policy clients_team on public.clients for all to authenticated using (true) with check (true);
create policy images_team  on public.images  for all to authenticated using (true) with check (true);

-- La RLS es lo único que se interponía, porque los GRANT de tabla a `anon` eran totales. Con la
-- política cerrada ya no bastaría con ellos, pero un GRANT que nadie necesita es superficie que
-- sobra: si mañana alguien desactiva RLS un momento para depurar, esto es lo que decide si el
-- agujero dura ese momento o no.
revoke all on public.decks   from anon;
revoke all on public.clients from anon;
revoke all on public.images  from anon;

-- ── signatures ──────────────────────────────────────────────────────────────
-- El INSERT anónimo se queda: quien firma es un cliente, no tiene cuenta y no debe tenerla.
-- Lo que se cierra es la LECTURA pública, que exponía correo, IP y user-agent de los firmantes.
-- El visor lee por `public.deck_public_signature(uuid)`, sin ip ni user_agent.

drop policy if exists "MVP open read signatures" on public.signatures;

create policy signatures_team_read on public.signatures
  for select to authenticated using (true);

-- La política de INSERT existente ("MVP open insert signatures", TO public) se mantiene tal cual:
-- es correcta para su caso de uso. Se acota su abuso con rate limiting en la aplicación, no aquí.

-- `anon` necesita exactamente un permiso sobre esta tabla: insertar.
revoke all    on public.signatures from anon;
grant  insert on public.signatures to   anon;

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────
-- Con la clave anónima y sin sesión, estas cuatro deben devolver 0 filas:
--   GET /rest/v1/decks?select=id
--   GET /rest/v1/clients?select=id
--   GET /rest/v1/images?select=id
--   GET /rest/v1/signatures?select=id
-- Y el visor público de una propuesta existente debe seguir cargando.
