-- Lectura pública acotada del visor de propuestas, para poder cerrar la RLS de `decks`.
--
-- Contexto. `/deck/[id]/view` es público a propósito: su URL se manda a clientes y se firma desde
-- ahí. Hasta ahora funcionaba porque la política `decks_open_mvp` daba a `anon` ALL sobre la tabla
-- entera, lo que también permitía listar las 12 propuestas completas y modificarlas. Al cerrar esa
-- política (ver 20260817121000_tighten_rls.sql) el visor se queda sin lectura.
--
-- Estas dos funciones le devuelven exactamente lo que pinta y nada más, a partir de un id que hay
-- que conocer. SECURITY DEFINER porque tienen que ver por encima de la RLS; `search_path` fijado
-- para que no se pueda secuestrar la resolución de nombres; STABLE porque solo leen.
--
-- Lo que deliberadamente NO devuelven: `contact_emails` y `budget_url` de la propuesta, y la `ip`
-- y el `user_agent` del firmante. Ninguno de los cuatro se pinta en ninguna parte, y los dos
-- últimos viajaban hasta el HTML servido a cualquiera con el enlace.

-- Todo lo que el visor, el `generateMetadata` y la imagen de previsualización necesitan de un deck.
create or replace function public.deck_public(p_id uuid)
returns table (
  md            text,
  type          text,
  logo_path     text,
  commercial_id text,
  client_name   text
)
language sql
security definer
set search_path = public
stable
as $$
  select d.md, d.type, d.logo_path, d.commercial_id, c.name
  from public.decks d
  left join public.clients c on c.id = d.client_id
  where d.id = p_id;
$$;

comment on function public.deck_public(uuid) is
  'Lectura pública del visor de propuestas. Devuelve solo lo que se pinta; nunca contact_emails ni budget_url.';

-- La firma, para el estado inmutable de la página de aceptación.
-- signer_name y signer_email SÍ: los pinta components/deck/SignatureCapture.tsx:30-31 y son la
-- constancia de quién aceptó. ip y user_agent NO: no los pinta nadie.
create or replace function public.deck_public_signature(p_id uuid)
returns table (
  id             uuid,
  deck_id        uuid,
  signer_name    text,
  signer_email   text,
  signature_png  text,
  signed_at      timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.deck_id, s.signer_name, s.signer_email, s.signature_png, s.signed_at
  from public.signatures s
  where s.deck_id = p_id
  order by s.signed_at desc
  limit 1;
$$;

comment on function public.deck_public_signature(uuid) is
  'Firma de un deck para el visor público. Sin ip ni user_agent: no se pintan y son datos personales.';

-- Comprobación de existencia para POST /api/sign, que es público y necesita validar el deck antes
-- de insertar. Devuelve solo el identificador comercial, que es el nombre del PDF y ya lo tiene
-- quien posee la URL. Antes el handler hacía `select id, commercial_id, contact_emails` y los
-- correos de contacto no los usaba para nada.
create or replace function public.deck_sign_target(p_id uuid)
returns table (commercial_id text)
language sql
security definer
set search_path = public
stable
as $$
  select d.commercial_id from public.decks d where d.id = p_id;
$$;

comment on function public.deck_sign_target(uuid) is
  'Valida que existe el deck que se va a firmar. Sin contact_emails: el handler no los usaba.';

-- Permisos explícitos: revocar el EXECUTE que Postgres concede a PUBLIC por defecto y darlo solo
-- a los dos roles que lo necesitan.
revoke all on function public.deck_public(uuid)           from public;
revoke all on function public.deck_public_signature(uuid) from public;
revoke all on function public.deck_sign_target(uuid)      from public;

grant execute on function public.deck_public(uuid)           to anon, authenticated;
grant execute on function public.deck_public_signature(uuid) to anon, authenticated;
grant execute on function public.deck_sign_target(uuid)      to anon, authenticated;
