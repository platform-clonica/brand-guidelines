/* Quién es "del equipo".

   Hasta hoy, "autenticado" y "del equipo" eran sinónimos por convención: solo existía una cuenta,
   creada a mano. El middleware preguntaba `if (!user)` y con eso bastaba. La auditoría (SEC-02)
   señaló el problema de fondo: esa equivalencia no está escrita en ninguna parte, así que el día
   que alguien reabra el registro en el panel deja de ser cierta sin que nada avise.

   Con el login de Google la equivalencia se sostiene en tres capas, y esta es la tercera:
     1ª  Consent screen "Internal" en Google Cloud — solo cuentas del Workspace autorizan la app.
     2ª  Hook `before-user-created` en Postgres — rechaza el alta fuera del dominio.
         (supabase/migrations/20260818090000_restrict_signup_domain.sql)
     3ª  Esto, en el gate de la aplicación.

   Ninguna de las tres sobra: la 1ª y la 2ª viven en paneles que alguien puede cambiar, y la 3ª
   viaja con el código y se revisa en el PR.

   Mismo patrón que safeNext.ts: la regla se escribe UNA vez, aquí, con su test al lado. Lo que
   esto evita es que la comprobación acabe copiada como `email.includes('interactius')` en tres
   sitios, que es como se cuela un `x@evil-interactius.com`. */

export const TEAM_DOMAIN = 'interactius.com';

export function isTeamEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split('@');
  // Exactamente una arroba, con algo delante, y el dominio EXACTO — no un sufijo.
  // Los subdominios quedan fuera a propósito: si un día hace falta uno, se añade con su test.
  return parts.length === 2 && parts[0].length > 0 && parts[1] === TEAM_DOMAIN;
}
