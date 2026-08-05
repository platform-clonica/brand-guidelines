# Acceso con login (email + contraseña) al Deck Maker

> ⚠ **Las rutas de este documento son las originales y ya no existen.** El login pasó a
> `/workspace/login` y las herramientas a `/workspace/*` — el mapa vigente está en
> [urls-workspace.md](urls-workspace.md). El mecanismo (sesión de Supabase, middleware,
> `requireUser`) sigue siendo el que se describe aquí.

> Implementado. Login de **equipo** que protege las herramientas internas.
> Los usuarios se crean a mano en Supabase (sin panel de admin, sin registro público).

## Contexto

El **Deck Maker** (`/deck` — editor + galería, `noindex`) era una herramienta interna **sin
control de acceso**: cualquiera con la URL entraba, y sus APIs (`/api/decks`, `/api/clients`,
`/api/images`, `/api/translate`) eran abiertas. Supabase JS estaba instalado pero **sin auth**
(anon key, sin sesión, RLS permisiva — ver comentario histórico en `lib/supabase/server.ts`).

Objetivo: que **solo el equipo** pueda usar la herramienta, con **email + contraseña** y
**recuperación de contraseña por email**.

### Decisiones
- **Alcance:** se protege **solo `/deck`** (editor + galería) y las **APIs de editor**. El
  **visor de clientes** `/deck/[id]/view` y la **web pública** `/[locale]` siguen **abiertos**.
- **Recovery:** flujo completo por email (forgot → email → nueva contraseña).
- **Registro:** solo manual en Supabase (Auth → Users). Sin signup, sin panel de admin.
- **Sin** `SUPABASE_SERVICE_ROLE_KEY`: no hace falta para este MVP.
- **Futuro (no incluido):** login *por presentación* para clientes (el visor), descrito en
  [presentaciones-login-acceso.md](presentaciones-login-acceso.md). Esta implementación deja
  lista la base reutilizable (`@supabase/ssr`, sesión en cookies, `LoginForm`, guards) sin
  solaparse: aquí el visor sigue público.

## Arquitectura

Gate a nivel de **middleware** usando **`@supabase/ssr`** (sesión en cookies válida en
middleware, Server Components y Route Handlers). El middleware rutea **por pathname** para no
mezclar next-intl con la auth:

- `/api/*`: si es una API de editor (`/api/decks|clients|images|translate|eval`) exige sesión
  (401 si no hay); el resto (`/api/sign`, `/api/brand.json`) pasa directo.
- `/deck/*`: exige sesión y redirige a `/deck/login?next=…`, **excepto** las páginas de auth
  (`/deck/login|forgot|reset`) y el visor público (`/deck/<id>/view`).
- Resto (`/[locale]`): next-intl como antes.

> El gate del middleware es la protección única de las APIs (cubre también llamadas directas);
> no se duplica un `getUser()` por handler para no añadir una segunda llamada de red de auth por
> request. El helper `requireUser()` queda disponible en `lib/supabase/server.ts` por si se
> necesita en el futuro.

> **RLS/datos:** este MVP protege a nivel de app, no de datos (la anon key sigue leyendo con RLS
> permisiva). Endurecer con `auth.uid()` + cliente autenticado es el paso siguiente y encaja con
> el futuro login por presentación.

## Archivos

**Nuevos**
- `lib/supabase/middleware.ts` — `updateSession(req)`: refresca token y espeja cookies.
- `app/deck/(auth)/layout.tsx` — chrome centrado de las pantallas de auth (wordmark + card).
- `app/deck/(auth)/login/page.tsx` + `components/deck/auth/LoginForm.tsx` — `signInWithPassword`.
- `app/deck/(auth)/forgot/page.tsx` + `components/deck/auth/ForgotForm.tsx` — `resetPasswordForEmail`.
- `app/deck/(auth)/reset/page.tsx` + `components/deck/auth/ResetForm.tsx` — `updateUser({ password })`.
- `app/deck/logout/route.ts` — `POST` → `signOut()` → redirect a `/deck/login`.
- `components/deck/auth/authUi.ts` — estilos de las pantallas (compuestos del kit `studio/ui.ts`).

**Modificados**
- `middleware.ts` — ruteo por pathname + gate de auth (antes solo next-intl).
- `lib/supabase/client.ts` — `createBrowserClient` (sesión en cookies); misma firma `supabaseBrowser()`.
- `lib/supabase/server.ts` — añade `supabaseAuthServer()`, `getUser()`, `requireUser()`; mantiene
  `supabaseServer()` (anon, sin sesión) para los datos del visor y las APIs.
- `components/deck/gallery/DeckGallery.tsx` — botón "Cerrar sesión" en la cabecera.
- `.env.example` — documenta el login y el redirect de recovery.
- `package.json` — nueva dependencia `@supabase/ssr`.

## Configuración en Supabase (manual)
- **Auth → Users:** crear los usuarios del equipo.
- **Auth → URL Configuration → Redirect URLs:** añadir `<dominio>/deck/reset` y
  `http://localhost:3000/deck/reset` (para que el enlace de recovery funcione).
- **Email:** basta el SMTP por defecto de Supabase (rate-limited) para el MVP.

## Verificación (hecha, `npm run dev`)
- `/deck` sin sesión → **307** a `/deck/login?next=%2Fdeck`.
- `/api/decks` sin sesión → **401**; `/api/sign` sigue accesible (405 a GET, no gateada).
- `/deck/<id>/view` (visor) → **no** redirige a login; `/[locale]` y `/` públicos (200).
- `/deck/login|forgot|reset` → **200**.
- Con credenciales válidas: login → `/deck`; logout → vuelve a `/deck/login`.
- Recovery: `/deck/forgot` → email → `/deck/reset` → nueva contraseña → `/deck`.
- `npm run type-check` y `npm run build` sin errores.

## Ampliaciones futuras
- Endurecer RLS con `auth.uid()` y cliente de datos autenticado.
- RLS de Storage a `authenticated` para las subidas de logos/imágenes.
- Login *por presentación* para clientes (ver `presentaciones-login-acceso.md`).
