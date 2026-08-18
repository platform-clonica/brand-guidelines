/* Rutas antiguas → nuevas, tras mover las herramientas internas bajo /workspace.

   Existe porque hay enlaces circulando: pestañas abiertas, marcadores, y los emails de
   recuperación de contraseña ya enviados, que apuntan a /deck/reset.

   Desde que el acceso es con Google no hay contraseña que recuperar, así que `forgot` y `reset`
   ya no existen como páginas. No se borran de este mapa: se redirigen al login. Un enlace viejo
   que lleva a la pantalla de acceso es mejor respuesta que un 404, y aquí entran las dos
   generaciones de la URL — la de /deck y la de /workspace.

   Lo que NO se redirige, y es lo importante de este fichero:
   - `/deck/{id}/view` — el visor público. Se manda a clientes, se firma desde ahí y hay enlaces
     ya enviados. Se queda donde está para siempre.
   - `/forms/f/{id}` — el formulario público, con respuestas ya recogidas.
   - `/forms/api/*` y `/api/*` — contratos de API, no páginas.

   Devuelve el pathname nuevo, o null si la ruta no se toca. */

const EXACT: Record<string, string> = {
  '/home': '/workspace',
  '/deck': '/workspace/deckmak_r',
  '/deck/login': '/workspace/login',
  '/deck/logout': '/workspace/logout',
  // Recuperar contraseña ya no existe: se entra con Google.
  '/deck/forgot': '/workspace/login',
  '/deck/reset': '/workspace/login',
  '/workspace/forgot': '/workspace/login',
  '/workspace/reset': '/workspace/login',
  '/forms/maker': '/workspace/formmak_r',
};

/* `/deck/{id}` es el editor y sí se mueve; `/deck/{id}/view` es el visor y no. */
const DECK_EDITOR = /^\/deck\/([^/]+)$/;
const FORM_EDITOR = /^\/forms\/maker\/(.+)$/;
const HOME_SUB = /^\/home\/(.*)$/;

export function legacyRedirect(pathname: string): string | null {
  const exact = EXACT[pathname];
  if (exact) return exact;

  const form = pathname.match(FORM_EDITOR);
  if (form) return `/workspace/formmak_r/${form[1]}`;

  const home = pathname.match(HOME_SUB);
  if (home) return `/workspace/${home[1]}`;

  const deck = pathname.match(DECK_EDITOR);
  if (deck) {
    // Las páginas de acceso ya están en EXACT; aquí solo puede quedar un id de presentación.
    return `/workspace/deckmak_r/${deck[1]}`;
  }

  return null;
}
