# Acceso al workspace — cuenta de Google de Interactius

> Vigente desde 2026-08-18. Sustituye al login por email + contraseña descrito en
> [deck-login-acceso.md](deck-login-acceso.md), que queda como registro histórico.
> El mapa de URLs está en [urls-workspace.md](urls-workspace.md).

## Qué cambió y por qué

Hasta hoy `/workspace` se abría con **email + contraseña de Supabase**, y en `auth.users` había
**una sola cuenta**: `info@interactius.com`, creada a mano el 15/07/2026. Todo el equipo compartía
una credencial. Eso tenía tres consecuencias, y ninguna era buena:

- **No había altas ni bajas.** Entrar a alguien era darle la contraseña; sacarlo era cambiarla para
  todos.
- **No había rastro de quién hacía qué**, y no podía haberlo: ninguna tabla guardaba un autor.
- **El registro estaba abierto.** `/auth/v1/settings` devolvía `disable_signup: false` con el
  proveedor de email activo, y el único control de toda el área interna era `if (!user)`. Es el
  hallazgo **SEC-02** de [audit/INFORME.md](../../audit/INFORME.md).

Ahora cada persona entra con **su** cuenta de Google de la empresa, y el alta se resuelve sola.

## El modelo

```
Persona                Google                    Supabase                 App
   │                     │                          │                      │
   │ "Continuar          │                          │                      │
   │  con Google" ──────▶│ consent screen           │                      │
   │                     │ (Internal: solo el       │                      │
   │                     │  Workspace entra)        │                      │
   │                     │──── code ───────────────▶│                      │
   │                     │                          │ hook before-user-    │
   │                     │                          │ created: ¿dominio?   │
   │                     │                          │──── sesión ─────────▶│ /workspace/callback
   │                     │                          │                      │ isTeamEmail() + PKCE
   │◀────────────────────────────────────────────────────────────────────  │ → /workspace
```

### Tres capas para la misma regla, y ninguna sobra

| | Dónde | Qué impide | Quién la puede cambiar |
|---|---|---|---|
| 1ª | Consent screen **Internal** del cliente OAuth, en Google Cloud | Que una cuenta de fuera del Workspace llegue siquiera a autorizar la app | Un admin de Google |
| 2ª | Hook `before-user-created`, función Postgres | Que se cree un usuario cuyo email no sea `@interactius.com` | Un PR (vive en `supabase/migrations/`) |
| 3ª | `isTeamEmail()` en el gate | Que una cuenta ya existente fuera de dominio use la app | Un PR |

Las capas 1 y 2 miran el **alta**; la 3 mira **cada petición**. Por eso la tercera no es
redundante: cubre la cuenta que ya existía antes de poner las otras dos.

**El `hd` del login NO es una capa.** `signInWithOAuth` manda `queryParams: { hd: 'interactius.com' }`
y eso solo preselecciona la cuenta del dominio en el selector de Google. Se puede quitar editando la
URL. Está por comodidad, no por seguridad, y conviene no confundirlo.

## Archivos

**Nuevos**
- `lib/auth/team.ts` — `TEAM_DOMAIN` e `isTeamEmail()`, con su test. La regla, escrita una vez.
- `app/workspace/(auth)/callback/route.ts` — cierra el PKCE en el servidor y comprueba el dominio.
- `supabase/migrations/20260818090000_restrict_signup_domain.sql` — el hook.

**Modificados**
- `components/deck/auth/LoginForm.tsx` — un botón, sin campos.
- `middleware.ts` — `isAuthPage` = login + callback; el gate exige dominio, no solo sesión.
- `lib/supabase/server.ts` — `requireUser()` exige dominio; los nueve handlers que lo llaman lo
  heredan sin tocarlos.
- `lib/auth/legacyRoutes.ts` — `forgot` y `reset`, de ambas generaciones, van al login.

**Borrados** — `app/workspace/(auth)/{forgot,reset}/`, `ForgotForm.tsx`, `ResetForm.tsx`.

### Por qué el intercambio PKCE se hace en el servidor

El flujo de recuperación anterior lo hacía en el navegador, y por eso necesitaba un estado de
"comprobando" y un rebote. Aquí no hace falta: el cliente de navegador es `createBrowserClient` de
`@supabase/ssr`, que guarda la sesión —y el verificador PKCE— en **cookies** y no en localStorage,
así que el Route Handler puede leerlas. La sesión queda escrita antes del primer render y el
middleware la ve al primer intento.

Cuidado con el `try/catch` de `lib/supabase/server.ts:45`: está ahí porque desde un **Server
Component** las cookies son de solo lectura. En un **Route Handler** sí se pueden escribir, y es lo
único que hace que el callback sirva de algo.

## Configuración manual (Supabase y Google Cloud)

Nada de esto está en el repo; si se pierde, el acceso deja de funcionar.

**Google Cloud** — proyecto propiedad de la organización `interactius.com`:
- *OAuth consent screen* → **Internal**. Si el proyecto estuviera en una cuenta personal, esta
  opción no aparece y se pierde la primera capa.
- *Credentials → OAuth client ID → Web application*
  - Origins: `https://brand.interactius.com`, `http://localhost:3000`
  - Redirect URI: `https://gcvzzpggpsnlwqnotfqv.supabase.co/auth/v1/callback`

**Supabase → Authentication:**
- *Providers → Google*: activo, con Client ID **y Client Secret**. Con el secreto vacío el
  interruptor se ve encendido y `/auth/v1/settings` dice `google: true`, pero `/auth/v1/authorize`
  responde **400 `missing OAuth secret`**. Pasó al configurarlo.
- *Providers → Email*: **desactivado**.
- *Hooks → Before User Created → Postgres function* → `public.hook_restrict_signup_by_email_domain`.
- *URL Configuration → Redirect URLs*:
  ```
  https://brand.interactius.com/workspace/callback
  https://brand.interactius.com/workspace/callback?**
  http://localhost:3000/workspace/callback
  http://localhost:3000/workspace/callback?**
  ```
  Las variantes con `?**` son por el `?next=` que lleva el `redirectTo`.

## Altas y bajas — la parte que no es automática

**Alta: automática.** La persona entra con Google y Supabase le crea el usuario. Nadie toca ningún
panel. Verificado el 18/08: `carlos.ruiz@interactius.com` apareció solo, con provider `google`.

**Baja: NO es automática, y conviene saberlo.** Supabase no revalida contra Google en cada
refresco, y sus refresh tokens **no caducan por defecto**. Suspender a alguien en Google Admin
**no le cierra la sesión** del workspace. El control que lo resolvería —*time-box user sessions* /
*inactivity timeout*— es de plan **Pro**, y la organización está en **free**.

> **Al dar de baja a alguien hay que borrar o banear su fila en Supabase → Auth → Users.**
> Es el único paso manual que queda, y sin él la persona conserva el acceso indefinidamente.

## Permisos

**No hay.** Todas las políticas RLS son `for all to authenticated using (true)`: dentro del
workspace se ve todo. La tabla `created_by`
(`supabase/migrations/20260818100000_created_by_seam.sql`) guarda quién creó cada pieza pero **no
filtra nada** — es el prerrequisito de los tres modelos decididos el 18/08 (propiedad por pieza,
acceso por herramienta, roles admin/editor/lector), documentados en
[el plan](../superpowers/plans/2026-08-18-login-google-workspace.md) §Permisos.

## Verificación (hecha, 2026-08-18)

- Hook: alta con un `@gmail.com` → **403** con el mensaje del hook; `auth.users` no sube.
- `/auth/v1/authorize` → **302** a `accounts.google.com` con nuestro `client_id` y `hd`.
- `/workspace` sin sesión → **307** a `/workspace/login?next=%2Fworkspace`.
- `/workspace/callback` sin `code` → **307** a `/workspace/login?error=oauth`.
- `/api/decks` sin sesión → **401**.
- `/workspace/{forgot,reset}` y `/deck/{forgot,reset}` → **308** al login.
- Login real con Google → sesión y aterrizaje en `/workspace`; el usuario se crea solo.
- Una propuesta creada después lleva `created_by` = el uuid de la cuenta de Google.
