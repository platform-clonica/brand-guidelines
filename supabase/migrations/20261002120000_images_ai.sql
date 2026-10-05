-- IMG_r · fase 2: el análisis de estilo, la edición con IA y su cuota (docs/features/img-r.md, «Fase 2 — IA»;
-- plan en docs/features/img-r-fase-2-plan.md).
--
-- ADITIVA. Seis columnas nulas y sin valor por defecto, y dos funciones nuevas. No toca ninguna fila
-- existente (quedan «sin analizar»), ninguna columna ni ninguna función que ya exista. El código de la fase
-- 1 sigue funcionando con ella aplicada, así que se puede aplicar antes de desplegar.
--
-- `parent_id`, `prior_original_path` y `source = 'edited'` ya los creó 20261001100000_images_bank.sql.

-- ── Columnas ────────────────────────────────────────────────────────────────

alter table public.images
  add column style_verdict     text constraint images_style_verdict_check check (style_verdict in ('si', 'parcial', 'no')),
  add column style_checks      jsonb,
  add column style_reason      text,
  add column style_analyzed_at timestamptz,
  add column people_present    boolean,
  add column prompt_variant    text constraint images_prompt_variant_check check (prompt_variant in ('standard', 'people'));

comment on column public.images.style_verdict is
  'Veredicto de estilo Interactius: si / parcial / no. Null = sin analizar. Lo calcula el código (lib/images/analyze/verdict.ts) desde style_checks.';
comment on column public.images.style_checks is
  '{ film, dof, light, motion, not_stock, subject }: true / false / null (no aplica). Criterios en lib/prompts.ts.';
comment on column public.images.style_reason is
  'Una o dos frases que explican el veredicto. Null si no pasó evalText().';
comment on column public.images.people_present is
  'Si el análisis vio personas. Preselecciona el prompt de edición y decide el sexto criterio.';
comment on column public.images.prompt_variant is
  'El prompt de la guía (getImagePrompt) con el que se hizo la edición: standard o people.';

-- ── Cuota de «Editar con IA» ────────────────────────────────────────────────
--
-- La cuota usa check_rate_limit (20260817130000_rate_limits.sql) con la clave
-- `imgr-edit:<user_id>:<AAAA-MM>`. check_rate_limit SUMA al leer, así que hacen falta dos funciones más:
-- una que lea sin sumar (el contador del modal) y otra que devuelva un intento cuando el proveedor falla.
--
-- Las dos solo aceptan la clave de QUIEN LLAMA. Son security definer —rate_limits no tiene políticas y nadie
-- la lee directamente—, y sin esta guarda cualquiera con sesión podría leer o devolver intentos ajenos, o
-- tocar los contadores de /api/sign y de los formularios. Lo que queda abierto es que alguien se devuelva
-- intentos a sí mismo llamando a la función desde la consola: es un tope de coste de una herramienta
-- interna, y se acepta.

create or replace function public.peek_rate_limit(p_key text, p_window_seconds integer)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or p_key not like 'imgr-edit:' || auth.uid()::text || ':%' then
    raise exception 'peek_rate_limit: solo la cuota propia' using errcode = '42501';
  end if;

  select case when r.window_start < now() - make_interval(secs => p_window_seconds) then 0 else r.count end
    into v_count
    from public.rate_limits r
   where r.key = p_key;

  return coalesce(v_count, 0);
end;
$$;

comment on function public.peek_rate_limit(text, integer) is
  'Lee el contador de una cuota sin sumar. Solo la cuota imgr-edit de quien llama.';

create or replace function public.refund_rate_limit(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_key not like 'imgr-edit:' || auth.uid()::text || ':%' then
    raise exception 'refund_rate_limit: solo la cuota propia' using errcode = '42501';
  end if;

  update public.rate_limits
     set count = count - 1
   where key = p_key
     and count > 0;
end;
$$;

comment on function public.refund_rate_limit(text) is
  'Devuelve un intento de la cuota (resta uno si el contador es mayor que cero). Solo la cuota imgr-edit de quien llama.';

-- Sin sesión no hay cuota: fuera `anon` (y `public`, del que Supabase hereda el permiso por defecto).
revoke all on function public.peek_rate_limit(text, integer) from public, anon;
revoke all on function public.refund_rate_limit(text) from public, anon;
grant execute on function public.peek_rate_limit(text, integer) to authenticated;
grant execute on function public.refund_rate_limit(text) to authenticated;

-- ── Comprobación posterior ──────────────────────────────────────────────────
--   select count(*) from images;                                   -- el mismo que antes
--   select count(*) from images where style_verdict is not null;   -- 0
--   select has_function_privilege('anon', 'public.refund_rate_limit(text)', 'execute');  -- false
