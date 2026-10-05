-- La purga de rate_limits deja de poder vaciar las cuotas mensuales y de estar abierta a cualquiera
-- (aprobado por Carlos el 3 de octubre de 2026; plan de IMG_r fase 2, § 3).
--
-- NO ES ADITIVA: cambia una función que ya existe. No borra datos y se deshace volviendo a la definición de
-- 20260817130000_rate_limits.sql y a sus grants.
--
-- Dos problemas de la versión anterior:
--   1. Borraba todo contador con más de un día. Las cuotas de «Editar con IA» son mensuales
--      (`imgr-edit:<user>:<AAAA-MM>`): una purga diaria convertía 25 al mes en 25 al día.
--   2. La podía ejecutar `anon`, o sea cualquiera con la clave pública que viaja en la web, sin sesión. Quien
--      quisiera saltarse los límites de /api/sign o de los formularios podía vaciarlos a voluntad.
-- Nadie la llama hoy (ni el código ni pg_cron), así que quitarle el permiso no rompe nada. Se lanza desde el
-- panel de Supabase o con la clave de servicio.

create or replace function public.purge_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits
   where (key not like 'imgr-edit:%' and window_start < now() - interval '1 day')
      -- Una cuota mensual solo se borra cuando su mes lleva dos meses cerrado: su ventana empieza dentro del
      -- mes, así que tres meses desde ella siempre caen después.
      or (key like 'imgr-edit:%' and window_start < now() - interval '93 days');
$$;

comment on function public.purge_rate_limits() is
  'Borra ventanas caducadas. Las cuotas mensuales (imgr-edit:) se guardan tres meses. Solo con la clave de servicio.';

revoke all on function public.purge_rate_limits() from public, anon, authenticated;
