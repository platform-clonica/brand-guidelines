# Login con Google Workspace (@interactius.com) — Implementation Plan

> **Para quien lo ejecute:** plan tarea por tarea; los pasos usan `- [ ]` para ir marcando.
> Cada tarea termina en un commit propio. **El orden importa** — ver §*Orden y por qué importa*.
> **Rama:** `feat/login-google-workspace` · **Escrito:** 2026-08-17 · **Ejecutado:** 2026-08-18.

---

## Estado de ejecución · 2026-08-18

| Task | Estado |
|---|---|
| 0 · Versionar el plan | ✅ `1a932f5` |
| 1 · Panel Google Cloud + Supabase | ✅ manual. El Client Secret quedó vacío en el primer intento: el interruptor se veía activo y `/auth/v1/settings` decía `google: true`, pero `/auth/v1/authorize` devolvía **400 `missing OAuth secret`** |
| 2 · Hook de dominio | ✅ `5445947` · aplicada, registrada y probada: alta con `@gmail.com` → **403**, `auth.users` no sube |
| 3 · `lib/auth/team.ts` | ✅ `69b465f` · 5 tests |
| 4 · Callback de OAuth | ✅ `baf2650` |
| 5 · Botón de Google | ✅ `57c1048` · login real verificado |
| 6 · Dominio en el gate | ✅ `cdb9426` |
| 7 · Seam `created_by` | ✅ `3f29588` · 0 filas sin dueño; una pieza nueva lleva el uuid de Google |
| 8 · Retirar la contraseña | ✅ `fc2297a` · cero `signInWithPassword` en el repo |
| 9 · Documentación | ✅ `c530562` · doc nuevo, README, `.env.example`, urls, migraciones y auditoría |
| 10 · Cerrar la puerta vieja | ✅ `9a82229` desplegado. Provider `email` desactivado |
| — · Incidente y arreglo | ✅ `11ec7e3`. Al desactivar `email`, `disable_signup` quedó en `true` y **bloqueó las altas por Google**: dos personas fuera con un error genérico mientras quien ya tenía cuenta entraba. Reactivado. El callback ahora distingue el motivo y lo escribe en el log |

**Objetivo cumplido y verificado en producción:** `lucho.dominguez@interactius.com` se creó solo a
las 07:58:50 y entró 6 segundos después, sin que nadie tocara el panel.

**Verificado el 18/08:** el alta es automática (`carlos.ruiz@interactius.com` se creó sola con
provider `google`, sin tocar el panel). `type-check`, `lint` (0 errores), `test` (241/241) y `build`
en verde. Regresiones de superficies públicas comprobadas: visor **200**, `/timer` **200**,
`/api/brand.json` **200**, manual **200**; internas **401**; las cuatro redirecciones legacy, **308**.

> Un 500 del visor durante las pruebas resultó ser caché de `.next` corrompida por correr `build`
> con el `dev` levantado, no una regresión. Con `.next` limpio, **200**.

## Context

Hoy `/workspace` se abre con **email + contraseña de Supabase**, y en `auth.users` hay
**exactamente un usuario**: `info@interactius.com`, provider `email`, creado el 15/07/2026. Todo el
equipo comparte una credencial. No hay altas, ni bajas, ni rastro de quién hizo qué — y no puede
haberlo: ninguna tabla tiene columna de propietario.

Además `/auth/v1/settings` devuelve **`"disable_signup": false`** con el provider `email` activo. Es
el hallazgo **SEC-02** de `audit/INFORME.md`, abierto: cualquiera puede registrarse y el único
control de toda el área interna es `if (!user)`.

**Objetivo:** cada persona entra con **su** cuenta de Google de la empresa; el alta se resuelve sola
desde Google Admin; el login por contraseña desaparece.

### Verificado antes de planificar (medido, no de memoria)

| Comprobación | Resultado |
|---|---|
| Providers OAuth activos | **ninguno** (`google: false`); solo `email: true` |
| `disable_signup` | **`false`** — registro abierto |
| Plan de la organización Supabase | **free** |
| SSO SAML (Google Workspace como IdP real) | Team/Enterprise → **descartado** |
| Google como social login OAuth | disponible en **free** |
| Hook `before-user-created` (filtro de dominio) | **Free y Pro**, como **función Postgres** (sin Edge Function) |
| Hook `custom-access-token` (roles en el JWT, para más adelante) | **Free y Pro** |
| Time-box / inactivity timeout de sesión | **Pro y superiores** → no disponible aquí |
| Cliente de navegador guarda la sesión en **cookies** (`createBrowserClient`) | sí → el PKCE se cierra en el servidor |
| Los 6 handlers de editor insertan con `supabaseAuthServer()` | sí → `auth.uid()` disponible en Postgres |

### El matiz que hay que asumir, no esquivar

"Gestionamos usuarios desde Google Admin" será cierto **para las altas**, no para las bajas:

- **Alta:** automática. La persona entra con Google y Supabase le crea el usuario. Cero pasos.
- **Baja: no es instantánea.** Supabase no revalida contra Google, y sus refresh tokens *no caducan
  por defecto*. Suspender a alguien en Google Admin **no le cierra la sesión** del workspace. El
  control que lo resolvería —time-box de sesiones— es de plan Pro.
- **Consecuencia operativa:** al dar de baja hay que **borrar o banear su fila en Supabase → Auth →
  Users**. Un paso manual, pero uno solo — y ya no hay que rotar una contraseña compartida.

### Decisiones tomadas (Carlos, 2026-08-17 / 18)

1. **Google como único método.** Se retira contraseña, `forgot` y `reset`.
2. **Tres capas de barrera de dominio:** consent screen *Internal* + hook Postgres + `isTeamEmail`.
3. **`info@interactius.com` se queda** de momento; no cuelga ningún dato de ella.
4. **Habrá permisos dentro del workspace** — los tres modelos a la vez: propiedad por pieza, acceso
   por herramienta y roles admin/editor/lector. **No se implementan aquí**, pero esta entrega deja
   el seam que los hace posibles (Task 7). Los roles vivirán en **una tabla de Supabase**, no en
   grupos de Google. Ver §*Permisos* al final.

**Test command:** `npm test` · `npm run type-check` · `npm run lint`
**Rama sugerida:** `feat/login-google-workspace`

---

## Orden y por qué importa

El orden no es cosmético: **si se retira la contraseña antes de que Google funcione, nadie entra.**
Tareas 1–7 son aditivas y reversibles; la 8 (retirar contraseña) y la 10 (desactivar el provider
`email` en el panel) son las únicas que queman la puerta anterior, y van al final.

---

### Task 0: Versionar el plan

**Files:** Create `docs/superpowers/plans/2026-08-18-login-google-workspace.md`

- [x] **Step 1:** Volcar este documento al fichero, siguiendo el formato de
  `docs/superpowers/plans/2026-06-12-presentaciones-deck-generator.md`.
- [x] **Step 2:** Commit

```bash
git checkout -b feat/login-google-workspace
git add docs/superpowers/plans/2026-08-18-login-google-workspace.md
git commit -m "docs(auth): plan de login con Google Workspace"
```

---

### Task 1: Panel — Google Cloud y Supabase (manual, no automatizable)

Bloquea la verificación de todo lo demás. Hacerlo lo primero de la mañana.

- [ ] **Step 1: Google Cloud Console**, en un proyecto **propiedad de la organización
      `interactius.com`** (si estuviera en una cuenta personal, la opción *Internal* no aparece):
  - *OAuth consent screen* → **Internal**. Esta es la barrera real: solo cuentas del Workspace
    pueden autorizar la app.
  - *Credentials → Create OAuth client ID → Web application*.
    - *Authorized JavaScript origins*: `https://brand.interactius.com`, `http://localhost:3000`
    - *Authorized redirect URIs*: `https://gcvzzpggpsnlwqnotfqv.supabase.co/auth/v1/callback`
  - Guardar **Client ID** y **Client Secret**.

- [ ] **Step 2: Supabase → Authentication → Providers → Google**: activar y pegar ID/Secret.
      **No tocar todavía el provider `email`** (es la única puerta que hay).

- [ ] **Step 3: Supabase → Authentication → URL Configuration → Redirect URLs**, añadir:

```
https://brand.interactius.com/workspace/callback
https://brand.interactius.com/workspace/callback?**
http://localhost:3000/workspace/callback
http://localhost:3000/workspace/callback?**
```

  Las variantes con `?**` son por el `?next=` del `redirectTo`. **No borrar** `…/workspace/reset`
  ni `…/deck/reset` hasta que caduquen los emails de recuperación ya enviados.

- [ ] **Step 4: Verificar** que el provider está activo, sin tocar código:

```bash
curl -s -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  https://gcvzzpggpsnlwqnotfqv.supabase.co/auth/v1/settings | python3 -m json.tool
```

  Esperado: `"google": true`. (`"email": true` todavía — se cierra en la Task 10.)

---

### Task 2: Migración — el hook de dominio en Postgres

**Files:** Create `supabase/migrations/20260818090000_restrict_signup_domain.sql`

- [ ] **Step 1: Escribir la migración**, con cabecera comentada explicando el porqué, como hace
      `20260817121000_tighten_rls.sql`. Sin tabla de dominios: aquí sobra, es un dominio único.

```sql
-- Solo cuentas @interactius.com pueden crear usuario.
--
-- El registro estaba abierto (`disable_signup: false`, hallazgo SEC-02) y al activar Google eso
-- pasaría de "cualquiera con email" a "cualquiera con una cuenta de Google". Este hook corre ANTES
-- del insert en auth.users y rechaza lo que no sea del dominio.
--
-- Segunda de tres capas: la primera es el consent screen "Internal" de Google Cloud, la tercera es
-- isTeamEmail() en el middleware. Se pone aquí porque el panel lo puede cambiar cualquiera y esto
-- vive en el repo.
--
-- Registrar en Supabase → Authentication → Hooks → Before User Created → Postgres function.

create or replace function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  addr text := lower(event->'user'->>'email');
begin
  if addr like '%@interactius.com' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'message', 'Solo las cuentas de Interactius pueden acceder.',
    'http_code', 403));
end;
$$;

grant  execute on function public.hook_restrict_signup_by_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_by_email_domain(jsonb) from anon, authenticated, public;
```

  > El ejemplo de la documentación de Supabase usa `lower($1)` dentro de un `select` sobre una tabla
  > de dominios y confunde columna con parámetro. Esta versión evita ese lío.

- [ ] **Step 2: Aplicar** y **registrar el hook** en Supabase → Authentication → Hooks →
      *Before User Created* → Postgres function → `public.hook_restrict_signup_by_email_domain`.

- [ ] **Step 3: Verificar por SQL** el grant:

```sql
select p.proname,
       has_function_privilege('supabase_auth_admin', p.oid, 'execute') as auth_admin,
       has_function_privilege('anon', p.oid, 'execute')                as anon
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'hook_restrict_signup_by_email_domain';
```

  Esperado: `auth_admin = true`, `anon = false`.

- [ ] **Step 4: Probarlo con la puerta todavía abierta** — el provider `email` sigue activo, así
      que se puede comprobar el rechazo sin depender de Google:

```bash
curl -s -X POST -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"prueba@gmail.com","password":"unaContraseñaLarga123"}' \
  https://gcvzzpggpsnlwqnotfqv.supabase.co/auth/v1/signup
```

  Esperado: **403** con el mensaje del hook, y `select count(*) from auth.users` sigue en **1**.

- [ ] **Step 5: Commit** — `feat(auth): solo las cuentas @interactius.com pueden darse de alta`

---

### Task 3: `lib/auth/team.ts` — la regla de dominio, en un solo sitio

Mismo patrón que [lib/auth/safeNext.ts](lib/auth/safeNext.ts): regla explícita, comentada, con test
al lado. Es lo que impide que la comprobación derive a `email.includes('interactius')` en tres
sitios distintos.

**Files:** Create `lib/auth/team.ts` · Test `lib/auth/__tests__/team.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTeamEmail } from '../team.ts';

test('acepta el dominio del equipo, en cualquier caja', () => {
  assert.ok(isTeamEmail('alberto@interactius.com'));
  assert.ok(isTeamEmail('Alberto@Interactius.COM'));
  assert.ok(isTeamEmail('  carlos@interactius.com  '));
});

test('rechaza dominios que solo se le parecen', () => {
  assert.ok(!isTeamEmail('x@evil-interactius.com'));
  assert.ok(!isTeamEmail('x@interactius.com.evil.io'));
  assert.ok(!isTeamEmail('x@notinteractius.com'));
  assert.ok(!isTeamEmail('x@sub.interactius.com')); // decisión explícita: solo el dominio raíz
});

test('rechaza lo vacío y lo que no es un email', () => {
  for (const v of [null, undefined, '', 'interactius.com', 'a@b@interactius.com']) {
    assert.ok(!isTeamEmail(v as string | null | undefined));
  }
});
```

- [ ] **Step 2: Verificar que fallan** — `node --test --experimental-strip-types lib/auth/__tests__/team.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
export const TEAM_DOMAIN = 'interactius.com';

export function isTeamEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 && parts[1] === TEAM_DOMAIN;
}
```

- [ ] **Step 4: Verificar** — `npm test` en verde.
- [ ] **Step 5: Commit** — `feat(auth): isTeamEmail — el dominio del equipo, escrito una sola vez`

---

### Task 4: El callback de OAuth

Cierra el intercambio PKCE en el servidor. Va bajo `/workspace/callback` (grupo `(auth)`, que no
afecta a la URL) para no inventar un árbol nuevo.

**Files:** Create `app/workspace/(auth)/callback/route.ts` · Edit [middleware.ts](middleware.ts)

- [ ] **Step 1: Abrir la ruta en el middleware** — `isAuthPage` (línea 15) pasa a incluir
      `/workspace/callback`. Sin esto el middleware la manda al login antes de que pueda hacer nada.

- [ ] **Step 2: Escribir el Route Handler.** Puntos que no pueden fallar:
  - Usa `supabaseAuthServer()` de [lib/supabase/server.ts](lib/supabase/server.ts). Desde un Route
    Handler el `setAll` **sí** puede escribir cookies (el `try/catch` de la línea 45 es para Server
    Components), así que la sesión queda establecida aquí. **Comentarlo**, porque es justo lo
    contrario de lo que sugiere el comentario que hay ahora.
  - `exchangeCodeForSession(code)`; sin `code` o con error → `/workspace/login?error=oauth`.
  - Tras el intercambio, `getUser()` y **`isTeamEmail(user.email)`**; si falla → `auth.signOut()` y
    `/workspace/login?error=dominio`. (El hook ya lo impide en el alta; esto cubre a un usuario
    preexistente fuera de dominio.)
  - Éxito → `redirect(safeNext(url.searchParams.get('next')))`, reutilizando
    [lib/auth/safeNext.ts](lib/auth/safeNext.ts) **tal cual** — ya está probado contra open-redirect.
  - En producción hay balanceador (Netlify): reconstruir el origen con `x-forwarded-host` cuando
    exista, como indica la guía de Supabase para Next.js.

- [ ] **Step 3: Verificar** — `npm run type-check` y `npm run build` en verde.
- [ ] **Step 4: Commit** — `feat(auth): callback de OAuth para cerrar el flujo PKCE`

---

### Task 5: El botón de Google en el login

**Files:** Edit [components/deck/auth/LoginForm.tsx](components/deck/auth/LoginForm.tsx)

- [ ] **Step 1: Sustituir el formulario por el botón.** Se queda `'use client'` y pierde los
      `useState` de email/password.

```ts
await supabaseBrowser().auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/workspace/callback?next=${encodeURIComponent(safeNext(next))}`,
    queryParams: { hd: TEAM_DOMAIN, prompt: 'select_account' },
  },
});
```

  `hd` es **solo comodidad de UI** (preselecciona la cuenta del dominio); la barrera son el consent
  screen *Internal* y el hook. Dejarlo escrito en un comentario para que nadie lo confunda con
  seguridad.

- [ ] **Step 2: Estilos — sin CSS nuevo.** Reutilizar `s.submit` / `s.submitBusy` / `s.card` /
      `s.title` / `s.subtitle` de
      [components/deck/auth/authUi.ts](components/deck/auth/authUi.ts); el `?error=` se pinta con
      `s.errorBox`, que ya existe. **Nada de logo de Google a color**: rompe la paleta; texto
      "Continuar con Google" en el botón oscuro de marca. *(Si Alberto quiere el logotipo oficial
      por requisito de marca de Google, es decisión suya — avisar, no decidir.)*

- [ ] **Step 3: Quitar** el `<Link href="/workspace/forgot">` del pie (línea 58) y su `s.footer`.

- [ ] **Step 4: Verificar en local** — `npm run dev`, `/workspace/login`: el botón lleva al consent
      de Google y vuelve a `/workspace`.
      `select id, email, raw_app_meta_data->>'provider' from auth.users` muestra la cuenta nueva con
      provider `google`.

- [ ] **Step 5: Commit** — `feat(auth): entrar con la cuenta de Google de Interactius`

---

### Task 6: El dominio, también en el gate

Esto convierte SEC-02 de *"depende de que nadie reabra el registro en el panel"* en una regla escrita
en el repo.

**Files:** Edit [middleware.ts](middleware.ts) · [lib/supabase/server.ts](lib/supabase/server.ts)

- [ ] **Step 1: middleware** — el gate de `/workspace` (línea 39) y el de la API (línea 89) pasan de
      `if (!user)` a `if (!user || !isTeamEmail(user.email))`.
- [ ] **Step 2: server.ts** — `requireUser()` (línea 60) aplica el mismo `isTeamEmail`. Los ~9
      handlers que ya lo llaman heredan la comprobación **sin tocarlos** — ese es el punto.
- [ ] **Step 3: Verificar** — la sesión propia sigue entrando; `curl` sin cookie a `/api/decks`
      sigue devolviendo 401 JSON.
- [ ] **Step 4: Commit** — `feat(auth): el gate exige cuenta del dominio, no solo sesión`

---

### Task 7: El seam de identidad — `created_by`

**Por qué va aquí y no en una entrega futura.** Hoy hay **1 usuario y 12 propuestas**: rellenar la
columna es exacto, porque todo es de la misma cuenta. Dentro de tres meses habrá diez personas y
cien propuestas, y *quién creó qué* ya no se podrá reconstruir — ese dato no está en ningún sitio,
tampoco en el historial de git. **No activa ningún permiso ni cambia ningún comportamiento**: solo
deja de tirar el dato. Es el prerrequisito de los tres modelos de permisos de §*Permisos*.

**Files:** Create `supabase/migrations/20260818100000_created_by_seam.sql`

- [ ] **Step 1: La migración.** `default auth.uid()` funciona porque **los seis handlers de editor
      insertan con `supabaseAuthServer()`** (verificado: `app/api/{decks,clients,images,forms}/route.ts`),
      o sea con la sesión del usuario. **Cero cambios en el código de los handlers.**

```sql
-- Quién creó cada pieza. NO cambia ningún permiso: las políticas siguen siendo
-- `to authenticated using (true)`. Es solo el dato, que hoy se está tirando.
--
-- Se añade AHORA porque hoy hay 1 usuario y 12 propuestas: el backfill es exacto. Con diez
-- personas y cien propuestas sería adivinar.
--
-- `on delete set null`, NUNCA cascade: dar de baja a alguien no puede borrar las propuestas que
-- hizo. `default auth.uid()` lo rellena solo porque los handlers de editor insertan con la sesión
-- del usuario (supabaseAuthServer), no con la clave anon.

alter table public.decks   add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();
alter table public.clients add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();
alter table public.images  add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();
alter table public.forms   add column if not exists created_by uuid
  references auth.users(id) on delete set null default auth.uid();

-- Backfill: la única cuenta que ha existido.
update public.decks   set created_by = 'f303f577-6b42-443a-8bb6-8a35ab47d650' where created_by is null;
update public.clients set created_by = 'f303f577-6b42-443a-8bb6-8a35ab47d650' where created_by is null;
update public.images  set created_by = 'f303f577-6b42-443a-8bb6-8a35ab47d650' where created_by is null;
update public.forms   set created_by = 'f303f577-6b42-443a-8bb6-8a35ab47d650' where created_by is null;
```

  **Deliberadamente fuera:** `signatures` y `responses`. Quien firma o responde es un cliente sin
  cuenta; ahí el `created_by` no significaría nada.

- [ ] **Step 2: Verificar el backfill** — `select count(*) from public.decks where created_by is null`
      → **0**. Igual para las otras tres.

- [ ] **Step 3: Verificar que el default funciona de verdad** — desde el workspace ya autenticado
      con Google, crear una propuesta nueva y comprobar que su `created_by` es **el uuid de la
      cuenta de Google**, no el de `info@`. Es el paso que prueba que el seam sirve para algo; si el
      default sale `null`, algún handler está insertando con el cliente equivocado y hay que
      arreglarlo antes de seguir.

- [ ] **Step 4: Nada de tipos que regenerar** — el repo usa `Database = any` (hallazgo QA-04 de la
      auditoría), así que no hay tipos generados que actualizar.

- [ ] **Step 5: Commit** — `feat(datos): cada pieza registra quién la creó`

---

### Task 8: Retirar la contraseña

**Primero comprobar que la Task 5 funciona de verdad**, con dos cuentas distintas. A partir de aquí
no hay marcha atrás sin un `git revert`.

**Files:** Delete `app/workspace/(auth)/forgot/`, `app/workspace/(auth)/reset/`,
`components/deck/auth/ForgotForm.tsx`, `components/deck/auth/ResetForm.tsx` ·
Edit [middleware.ts](middleware.ts), [lib/auth/legacyRoutes.ts](lib/auth/legacyRoutes.ts),
[lib/auth/__tests__/legacyRoutes.test.ts](lib/auth/__tests__/legacyRoutes.test.ts),
[app/workspace/(auth)/layout.tsx](app/workspace/(auth)/layout.tsx)

- [ ] **Step 1: Actualizar el test de rutas legacy primero** (líneas 46 y 48): `/deck/forgot` y
      `/deck/reset` apuntan ahora a `/workspace/login`. **No tocar** el caso que blinda
      `/deck/[id]/view`. Correr el test y verlo fallar.
- [ ] **Step 2: `legacyRoutes.ts`** (líneas 18-19) → ambas a `/workspace/login`, y actualizar el
      comentario de cabecera, que hoy justifica el mapeo por los emails de recuperación enviados.
- [ ] **Step 3: Borrar** las cuatro rutas/componentes. `middleware.ts`: `isAuthPage` se queda en
      `/workspace/login` y `/workspace/callback`. `(auth)/layout.tsx`: ajustar el comentario de la
      línea 12 ("login / forgot / reset").
- [ ] **Step 4: Verificar** — `npm test`, `npm run type-check`, `npm run lint`, `npm run build`. Y un
      `grep -rn "forgot\|ResetForm\|resetPasswordForEmail" --include="*.ts*"` que no devuelva nada.
- [ ] **Step 5: Commit** — `refactor(auth): fuera el login por contraseña y su recuperación`

---

### Task 9: Documentación

No es opcional: media docena de ficheros describen hoy un flujo que dejará de existir.

- [ ] **Step 1: `.env.example`**, cabecera líneas 4-6 — dice *"Create users manually in Supabase →
      Auth → Users"* y cita `/deck/reset`. Reescribir con el flujo Google **y la nota de que la baja
      sigue siendo manual**.
- [ ] **Step 2:** [docs/features/deck-login-acceso.md](docs/features/deck-login-acceso.md) y
      [docs/features/presentaciones-login-acceso.md](docs/features/presentaciones-login-acceso.md) —
      el método de acceso cambia entero (líneas 24, 41, 59-60, 75-76, 83-85 del primero).
- [ ] **Step 3:** [docs/features/urls-workspace.md](docs/features/urls-workspace.md) — tabla de
      rutas (línea 14), mapa legacy (línea 51) y sección de Redirect URLs (líneas 58-71).
- [ ] **Step 4:** `README.md` (setup) y `audit/00-inventario.md` (línea 98).
- [ ] **Step 5:** `audit/INFORME.md` — **SEC-02 pasa a cerrado**, anotando qué lo cierra (provider
      `email` desactivado + hook + `isTeamEmail`) y **dejando escrito el riesgo residual: la baja de
      un usuario no es instantánea**. Ese párrafo es el entregable real de esta tarea.
      *De paso: la tabla §0 se escribió a las 13:22 del 17/08 y tres commits posteriores
      (`d8b7dee`, `78fe530`, `79219ca`) cerraron TRV-06, TRV-12, PERF-06 y TRV-11 sin actualizarla.*
- [ ] **Step 6:** `supabase/migrations/README.md` — añadir las **dos** migraciones nuevas.
- [ ] **Step 7: Documentar el seam** — una nota corta en
      `docs/features/deck-persistencia-supabase.md` diciendo que `created_by` existe, que **no
      filtra nada todavía**, y enlazando a §*Permisos* de este plan. Sin esto es exactamente lo que
      `CLAUDE.md` llama una norma de facto que nadie documentó.
- [ ] **Step 8: Commit** — `docs(auth): el acceso al workspace es con la cuenta de Google`

---

### Task 10: Cerrar la puerta vieja y desplegar

- [ ] **Step 1: Desplegar** la rama a producción (merge a `main` → Netlify).
- [ ] **Step 2: Verificar en `https://brand.interactius.com/workspace`** con una cuenta real antes
      de tocar nada más en el panel.
- [ ] **Step 3: Supabase → Authentication → Providers → Email: desactivar.** Solo ahora.
- [ ] **Step 4: Verificar el cierre**

```bash
curl -s -H "apikey: $KEY" https://gcvzzpggpsnlwqnotfqv.supabase.co/auth/v1/settings | python3 -m json.tool
```

  Esperado: `"google": true`, `"email": false`.

- [ ] **Step 5: Alta real de un tercero** — que otra persona de `@interactius.com` entre por primera
      vez sin que nadie toque el panel. Es la prueba de que el objetivo se ha cumplido. Comprobar de
      paso que lo que cree lleva **su** `created_by`.

---

## Verificación end-to-end (al terminar)

1. `npm run type-check && npm run lint && npm test && npm run build`.
2. **Flujo feliz:** sin sesión, `/workspace` → `/workspace/login?next=/workspace` → botón → consent
   → `/workspace/callback` → aterriza en `/workspace`.
3. **`next` respetado y saneado:** `?next=/workspace/deckmak_r` aterriza ahí;
   `?next=https://evil.com` aterriza en `/workspace` (lo garantiza `safeNext`).
4. **Rechazo de dominio:** entrar con una cuenta Google fuera del dominio → error visible, y
   `select count(*) from auth.users` no sube.
5. **El seam:** cero `created_by is null` en las cuatro tablas, y una pieza nueva lleva el uuid de
   quien la creó.
6. **Regresiones obligatorias** — el middleware es compartido y esta rama lo toca en tres puntos:
   - `/deck/{id}/view` sigue abierto sin sesión, y su firma (`POST /api/sign`) también.
   - `/forms/f/{id}` y `POST /forms/api/submit` siguen públicos; `/forms/api/export` sigue pidiendo
     sesión de equipo.
   - `/timer` sigue funcionando **sin credenciales de Supabase** (no pasa por `updateSession`).
   - `/deck/login`, `/deck/forgot` y `/deck/reset` siguen redirigiendo (ahora al login).
   - `POST /workspace/logout` sigue devolviendo al login.

---

## Permisos dentro del workspace — el camino, no la obra

**Decidido (18/08): habrá permisos, con los tres modelos, y los roles vivirán en una tabla de
Supabase.** No se implementan en esta entrega. Esto documenta el camino para que nadie lo
reinvente, y para que se vea qué de lo de mañana es prerrequisito de qué.

**Punto de partida honesto:** hoy no hay nada. Ninguna tabla tenía columna de propietario y **todas
las políticas RLS son `for all to authenticated using (true)`** — dentro se ve todo. La Task 7
añade lo único que faltaba para poder filtrar por algo.

### Las tres capas, de más barata a más cara

**1 · Acceso por herramienta — la más barata, y no toca la base de datos.**
Quién entra a DeckMak_r, FormMak_r o ReWrit_r se resuelve por ruta, en el mismo sitio donde mañana
queda `isTeamEmail`: el gate de [middleware.ts](middleware.ts) más el dispatcher de
`app/workspace/page.tsx`, que ya pinta las cuatro herramientas y solo tendría que pintar las
permitidas. Ni RLS, ni columnas, ni migraciones. Si hay que enseñar algo pronto, empezar por aquí.

**2 · Propiedad por pieza — habilitada por la Task 7.**
Con `created_by` poblándose solo, las políticas pasan de `using (true)` a algo como
`using (created_by = auth.uid() or <es admin>)`. Toca las tres políticas de
`20260817121000_tighten_rls.sql` y **obliga a reprobar el visor público entero**, porque lee por RPC
`SECURITY DEFINER` — esas funciones se saltan la RLS por diseño y hay que revisar una a una que
sigan devolviendo lo que deben. Es la capa con más riesgo de regresión.

**3 · Roles admin / editor / lector — el patrón estándar de Supabase, y gratis.**
Tabla `user_roles(user_id, role)` + **hook `custom-access-token`** (verificado: disponible en plan
**Free**) que mete el rol como claim en el JWT. A partir de ahí el rol se lee en dos sitios sin
consultar la base de datos: en las políticas RLS (`auth.jwt() -> 'app_metadata' ->> 'role'`) y en el
servidor junto a `isTeamEmail`. Encaja con lo de mañana sin rehacer nada: `lib/auth/team.ts` gana un
`hasRole()` al lado de `isTeamEmail()`.

### El panel de admin: cuándo, y por qué no ahora

Para menos de diez personas, dar y quitar un rol es una fila en Supabase → Table Editor, o una línea
de SQL. Un panel propio se justifica cuando **lo tenga que hacer alguien que no toca SQL**, o cuando
haya suficientes combinaciones de rol × herramienta como para que recordarlas sea un problema.
Construirlo antes es mantener interfaz para un caso de uso que todavía no existe. Cuando toque, es
una herramienta más del dispatcher (`/workspace/admin`), con el mismo patrón que las otras cuatro.

### Lo que hay que traerle a Alberto antes de implementar nada de esto

- **"Cada uno ve lo suyo" choca con cómo trabaja una agencia pequeña**, donde hoy todo el mundo toca
  todas las propuestas. Si se activa la propiedad, ¿las 12 propuestas existentes pasan a ser de
  `info@`, o visibles para todos? Es una decisión de operativa, no técnica.
- **Qué es exactamente "lector"**: ¿ve la propuesta y no la edita, o tampoco ve presupuesto ni
  emails de cliente? La segunda lectura no es un rol, es filtrado por columna, y se resuelve con
  RPC acotadas — el patrón que ya usa `deck_public()`.
- **Rastro de cambios.** `created_by` dice quién creó, no quién cambió. Si hace falta lo segundo,
  eso es otra tabla y otra conversación.

---

## Fuera de alcance — decidir después, no en esta rama

- **RLS por propietario o por rol.** Ver §*Permisos*. La Task 7 deja el dato; nadie lo filtra aún.
- **`/api/translate`, `/api/rewrite` y `/api/eval` no llaman a `requireUser()`** — dependen solo del
  middleware, y son justo los que gastan cuota de Anthropic. Con identidades reales, además, ya se
  podría limitar por `user.id` y no solo por IP.
- **`info@interactius.com`.** Se queda; decidir si se borra cuando todo el equipo tenga su cuenta.
  Ojo: es la dueña de las 12 propuestas tras el backfill, así que borrarla las dejaría con
  `created_by = null` (no las borra — el `on delete set null` está puesto justo para eso).
