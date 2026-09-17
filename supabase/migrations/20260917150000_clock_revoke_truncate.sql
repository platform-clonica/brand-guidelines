-- Clock_r: cerrar TRUNCATE sobre el libro de asientos. Corrige 20260917140000_create_clock.sql.
--
-- RESTRICTIVA, pero no rompe nada: quita privilegios que ninguna parte del código usa. Se puede
-- aplicar en cualquier momento, y cuanto antes mejor.
--
-- QUÉ SE ESCAPÓ Y POR QUÉ IMPORTA. La migración anterior revocaba `insert, update, delete` sobre
-- `clock_entries` y `clock_consents`, y daba por cerrada la escritura. No lo estaba: Supabase
-- concede por defecto TODOS los privilegios a `authenticated` en cada tabla nueva de `public`, y
-- entre ellos va `TRUNCATE`.
--
-- `TRUNCATE` NO PASA POR LA ROW LEVEL SECURITY. La RLS filtra filas; truncate no toca filas una a
-- una, vacía la tabla entera, así que no hay política que lo pare — ni la que hay, ni una que se
-- añadiera. Toda la garantía de esta herramienta está escrita como "no hay política de update ni
-- de delete, y esa ausencia es la garantía", y con el privilegio de truncate puesto esa frase era
-- falsa: una sesión de equipo podía vaciar el registro horario legal de la empresa de una vez.
--
-- Hoy no era explotable por la vía normal —PostgREST no expone truncate— pero la garantía no puede
-- depender de qué expone hoy la capa de encima. Se cierra en la base de datos, que es donde vive.
--
-- De paso se quitan dos privilegios que tampoco pinta nada tener aquí:
--   · TRIGGER: permitiría colgar un disparador de una tabla que solo admite inserciones.
--   · REFERENCES: permitiría apuntar claves ajenas al libro desde fuera.
-- Los triggers que ya existen (set_updated_at) los creó el propietario de la migración, no
-- `authenticated`, así que revocarlo no los afecta.
--
-- Se revoca el truncate de las CINCO tablas, no solo de las dos de solo-inserción: vaciar
-- `clock_people` o `clock_calendar_days` deja el registro igual de inservible aunque los asientos
-- sigan ahí.

begin;

revoke truncate, trigger, references on public.clock_entries       from authenticated;
revoke truncate, trigger, references on public.clock_consents      from authenticated;
revoke truncate, trigger, references on public.clock_people        from authenticated;
revoke truncate, trigger, references on public.clock_absences      from authenticated;
revoke truncate, trigger, references on public.clock_calendar_days from authenticated;

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────────────────────
-- Los privilegios de `authenticated` tienen que quedar así, y nada más:
--   clock_entries       → SELECT
--   clock_consents      → SELECT
--   clock_people        → SELECT, UPDATE        (el update lo filtra la política de admin)
--   clock_absences      → SELECT, INSERT, UPDATE, DELETE   (todos filtrados por la de admin)
--   clock_calendar_days → SELECT, INSERT, UPDATE, DELETE   (idem)
-- Y `anon`, sin una sola fila en la consulta:
--
--   select table_name, grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public' and table_name like 'clock%'
--      and grantee in ('anon', 'authenticated')
--    order by 1, 2, 3;
