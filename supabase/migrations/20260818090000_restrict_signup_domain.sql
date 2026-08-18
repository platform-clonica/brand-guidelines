-- Solo las cuentas @interactius.com pueden crear usuario.
--
-- ADITIVA. Solo crea una función; no cambia ninguna política ni rompe nada. Se puede aplicar en
-- cualquier momento. No hace nada hasta que se registra en el panel (ver "Registro" abajo).
--
-- Qué había. `/auth/v1/settings` devolvía `disable_signup: false` con el proveedor de email
-- activo, y el único control de autorización de toda el área interna era `if (!user)`: ni dominio,
-- ni rol, ni lista blanca. Es el hallazgo SEC-02 de audit/INFORME.md, que quedó abierto porque
-- "requiere el panel de Supabase". Al activar Google como proveedor, ese registro abierto pasa de
-- "cualquiera con un email" a "cualquiera con una cuenta de Google", así que deja de ser una
-- deuda tolerable.
--
-- Esta es la SEGUNDA de tres capas, y la única que vive en el repositorio:
--   1ª  El consent screen "Internal" del cliente OAuth en Google Cloud — solo cuentas del
--       Workspace pueden autorizar la aplicación. Es la barrera más fuerte y está en Google.
--   2ª  Este hook. Corre ANTES del insert en auth.users y rechaza lo que no sea del dominio.
--   3ª  isTeamEmail() en middleware.ts y en requireUser() — defensa en profundidad en la app.
--
-- Se pone aquí, y no solo en el panel, por lo que dice CLAUDE.md: una norma de facto que nadie
-- documentó es una norma que el siguiente se saltará sin querer. El interruptor "Allow new users
-- to sign up" lo puede volver a encender cualquiera, un martes, para una prueba, y nada avisaría.
-- Un fichero en esta carpeta sí deja diff, autor y revisor.
--
-- Nota sobre el `hd` de Google. El login manda `queryParams: { hd: 'interactius.com' }`, pero eso
-- es SOLO comodidad de interfaz: preselecciona la cuenta del dominio en el selector. No es una
-- barrera de seguridad y no debe contarse como una de las tres capas.
--
-- ⚠️ ESTE HOOK EXIGE QUE EL REGISTRO SIGA ABIERTO. `disable_signup` debe quedarse en `false`.
-- Ese interruptor es global, no por proveedor: cerrarlo no bloquea "las altas por email" —el
-- proveedor de email ya está desactivado— sino TODAS, Google incluido, y entonces nadie nuevo
-- puede entrar. Quien ya tiene cuenta sigue entrando, así que el fallo pasa desapercibido hasta
-- que lo prueba alguien nuevo. Pasó el 18/08, el día del despliegue.
--
-- Registro (manual, una vez):
--   Supabase → Authentication → Hooks → Before User Created → Postgres function
--   → public.hook_restrict_signup_by_email_domain

begin;

create or replace function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- El payload del hook trae el usuario que está a punto de insertarse; todavía no existe en
  -- Postgres, así que el email hay que leerlo de aquí y no de auth.users.
  addr text := lower(event->'user'->>'email');
begin
  if addr like '%@interactius.com' then
    return '{}'::jsonb;
  end if;

  -- Devolver un objeto `error` deniega el alta y el usuario no se crea.
  return jsonb_build_object('error', jsonb_build_object(
    'message', 'Solo las cuentas de Interactius pueden acceder.',
    'http_code', 403));
end;
$$;

-- El único que debe poder invocarla es el servicio de Auth. Que `anon` pudiera ejecutarla no sería
-- grave (no escribe nada), pero tampoco tiene ningún motivo para poder.
grant  execute on function public.hook_restrict_signup_by_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_email_domain(jsonb) from anon, authenticated, public;

commit;
