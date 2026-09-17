-- Clock_r: la puerta para aceptar el aviso de protección de datos. Completa 20260917140000 y 150000.
--
-- ADITIVA. Crea una función y no toca ninguna tabla, política ni privilegio existente.
--
-- QUÉ FALTABA, Y POR QUÉ BLOQUEA. `clock_consents` es de solo inserción, igual que el libro de
-- asientos: una aceptación no se reescribe, y si cambia el texto informativo sube `policy_version`
-- y se vuelve a pedir. Para conseguirlo, 20260917150000 revocó `insert` a `authenticated`.
--
-- Pero a diferencia de `clock_people`, que tiene `clock_ensure_person()`, aquí no quedó ninguna
-- puerta: sin política de insert y sin privilegio, NADIE podía escribir un consentimiento. Y como
-- el aviso se acepta antes de poder fichar, eso dejaba bloqueado el primer acceso de cualquiera.
--
-- La solución es una función y no devolver el `insert`. Conceder `insert` directo permitiría
-- también escribir aceptaciones a nombre de otra persona, con la fecha que se quisiera — que es
-- exactamente el tipo de dato que un aviso de protección de datos existe para poder demostrar.
--
-- La persona sale de `auth.uid()`, nunca de lo que mande el cliente, y la fecha la pone `now()`.
-- Idempotente por versión: aceptar dos veces la misma no escribe dos asientos ni falla.

begin;

create or replace function public.clock_accept_policy(p_version text, p_hash text)
returns public.clock_consents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person public.clock_people;
  v_row    public.clock_consents;
begin
  if coalesce(btrim(p_version), '') = '' or coalesce(btrim(p_hash), '') = '' then
    raise exception 'Falta la versión o el sello del aviso' using errcode = '23514';
  end if;

  -- Crea la ficha si es el primer acceso: aceptar el aviso ES lo primero que se hace.
  v_person := public.clock_ensure_person();

  -- Ya aceptada esta versión: se devuelve la que hay. Volver a pulsar no escribe otra.
  select * into v_row
    from public.clock_consents
   where person_id = v_person.id and policy_version = p_version
   order by accepted_at desc
   limit 1;
  if found then
    return v_row;
  end if;

  insert into public.clock_consents (person_id, policy_version, policy_hash)
  values (v_person.id, btrim(p_version), btrim(p_hash))
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.clock_accept_policy(text, text) is
  'Registra la aceptación del aviso de protección de datos de la sesión actual. Idempotente por versión.';

revoke all on function public.clock_accept_policy(text, text) from public;
grant execute on function public.clock_accept_policy(text, text) to authenticated;

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────────────────────
-- Con sesión de equipo:
--   select * from public.clock_accept_policy('v1', 'sha256-de-prueba');   → devuelve la fila
--   select * from public.clock_accept_policy('v1', 'sha256-de-prueba');   → devuelve LA MISMA fila
--   select count(*) from public.clock_consents where policy_version = 'v1';  → 1, no 2
--
-- Y el privilegio directo sigue cerrado:
--   insert into public.clock_consents (person_id, policy_version, policy_hash) values (...);
--   → permission denied for table clock_consents
