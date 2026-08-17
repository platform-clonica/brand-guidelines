-- Limitación de tasa para los dos endpoints públicos de escritura.
--
-- No había ninguna en todo el proyecto: el único 429 del repo era el reenvío del RateLimitError de
-- Anthropic, que es su límite hacia nosotros y no el nuestro hacia el cliente. Verificado en la
-- auditoría: 60 POST seguidos a /api/sign y a /forms/api/submit sin un solo 429 ni ralentización.
--
-- Por qué en Postgres y no con Redis. Hace falta un contador ATÓMICO compartido entre todas las
-- invocaciones de una función serverless, y este proyecto ya tiene exactamente eso a mano. Meter
-- Upstash sería una dependencia, una credencial más y un servicio más que puede caerse, para un
-- volumen que hoy son decenas de escrituras al mes.
--
-- La ventana es deslizante por reinicio: cuando la ventana caduca, el contador vuelve a 1 en vez
-- de decaer gradualmente. Es menos preciso que un algoritmo de cubo y es suficiente aquí — el
-- objetivo es cortar un bucle automatizado, no repartir cuota con exactitud.

create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer     not null default 0
);

comment on table public.rate_limits is
  'Contadores de limitación de tasa por clave (endpoint + IP). Solo se escribe vía check_rate_limit().';

-- Para poder purgar ventanas viejas sin recorrer la tabla entera.
create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

-- RLS activa y SIN políticas: nadie llega a esta tabla directamente, ni con la clave anónima ni
-- con sesión de equipo. El único camino es la función de abajo, que es SECURITY DEFINER.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Devuelve true si la petición cabe dentro del presupuesto, false si hay que rechazarla.
-- Un solo INSERT ... ON CONFLICT: atómico, sin condición de carrera entre invocaciones paralelas.
create or replace function public.check_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                  else r.count + 1
                end,
        window_start = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                  else r.window_start
                end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

comment on function public.check_rate_limit(text, integer, integer) is
  'Contador atómico por ventana. true = la petición cabe; false = rechazar con 429.';

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;

-- Purga de ventanas caducadas. Sin esto la tabla crece con cada IP distinta que haya escrito
-- alguna vez. Se puede enganchar a pg_cron; mientras tanto, la llama el propio handler de vez en
-- cuando (ver lib/rateLimit.ts), que a este volumen basta.
create or replace function public.purge_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

revoke all on function public.purge_rate_limits() from public;
grant execute on function public.purge_rate_limits() to anon, authenticated;
