# Mapa de URLs — el workspace y lo público

> Documento vivo. Si añades una herramienta interna o una superficie pública, actualiza esta tabla.

Las herramientas internas cuelgan todas de `/workspace`. Lo que ve un cliente **no** está ahí y no
se mueve nunca: sus enlaces ya están enviados.

## El workspace (requiere sesión de equipo)

| URL | Qué es |
|---|---|
| `/workspace` | Dispatcher: el lanzador de aplicaciones |
| `/workspace/login` | Acceso — botón de Google, sin campos |
| `/workspace/callback` | Retorno de Google: cierra el PKCE y deja la sesión puesta |
| `/workspace/logout` | `POST` → cierra sesión |
| `/workspace/deckmak_r` | Galería de presentaciones |
| `/workspace/deckmak_r/[id]` | Editor de una presentación |
| `/workspace/formmak_r` | Galería de formularios |
| `/workspace/formmak_r/[id]` | Editor de un formulario |
| `/workspace/rewrit_r` | Reescritura de correos y textos con la voz de marca |

Todo `/workspace/*` lo protege [middleware.ts](../../middleware.ts): **sin sesión de equipo**
—sesión Y cuenta `@interactius.com`, ver [workspace-login-google.md](workspace-login-google.md)—
redirige a `/workspace/login?next=…`. Las dos páginas de acceso son la excepción: el login, y el
callback, que por fuerza llega sin sesión porque la está creando. Todo lleva
`X-Robots-Tag: noindex, nofollow`.

## Lo público (NO se mueve)

| URL | Qué es | Por qué no se toca |
|---|---|---|
| `/deck/[id]/view` | Visor de una presentación | Se manda a clientes, es el PDF y es donde **firman**. Hay enlaces circulando. |
| `/deck/[id]/view/opengraph-image` | Preview social del visor | Cacheado por WhatsApp, Slack y demás |
| `/forms/f/[id]` | Formulario público | Recoge respuestas reales; el id vive además en `responses.form_id` |
| `/forms/api/submit` | Envío de respuestas | Contrato del formulario público |
| `/timer` | Herramienta pública | — |
| `/`, `/es`, `/en`, `/ca` | Web de marca | — |

`/forms/api/export` (CSV) es público en ruta pero exige sesión dentro del handler
(`requireUser`), igual que antes.

## Redirecciones desde las rutas antiguas

En [lib/auth/legacyRoutes.ts](../../lib/auth/legacyRoutes.ts), aplicadas por el middleware con
**308** (conserva el método, así que el `POST` de cerrar sesión sigue funcionando desde una
pestaña vieja).

| Antigua | Nueva |
|---|---|
| `/home` | `/workspace` |
| `/deck` | `/workspace/deckmak_r` |
| `/deck/[id]` | `/workspace/deckmak_r/[id]` |
| `/deck/login` · `/deck/logout` | `/workspace/…` |
| `/deck/forgot` · `/deck/reset` · `/workspace/forgot` · `/workspace/reset` | `/workspace/login` |
| `/forms/maker` · `/forms/maker/[id]` | `/workspace/formmak_r/…` |

**`/deck/[id]/view` no está en esa tabla, y es lo importante del fichero.** Hay un test que lo
exige explícitamente ([legacyRoutes.test.ts](../../lib/auth/__tests__/legacyRoutes.test.ts)):
si alguien añade una regla que se coma el visor, el test falla.

## Configurado a mano en Supabase

Nada de esto vive en el repo. Está detallado en
[workspace-login-google.md](workspace-login-google.md); el resumen:

**Authentication → URL Configuration → Redirect URLs.** El login manda a
`{origin}/workspace/callback?next=…` y Supabase solo redirige a URLs de su lista blanca:

```
https://brand.interactius.com/workspace/callback
https://brand.interactius.com/workspace/callback?**
http://localhost:3000/workspace/callback
http://localhost:3000/workspace/callback?**
```

Las entradas antiguas de `/workspace/reset` y `/deck/reset` ya no hacen falta: esas rutas no
existen y sus enlaces se redirigen al login con un 308.

**Authentication → Providers:** Google activo (con Client ID **y** Secret), Email desactivado.
**Authentication → Hooks:** *Before User Created* → `public.hook_restrict_signup_by_email_domain`.

## Decisiones

- **`/workspace` en vez de la raíz.** La raíz es la web de marca pública; el workspace es interno.
- **`deckmak_r` / `formmak_r`** replican el guiño del wordmark. `formmak_r` va sin la ese: la
  herramienta es FormMak_r.
- **Lo público se quedó fuera de `/workspace`.** Se valoró mover el visor con una redirección
  permanente, pero "workspace" es un nombre interno y no tiene por qué aparecer en la URL que abre
  un cliente. La frontera es semántica, no solo técnica.
