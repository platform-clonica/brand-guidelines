/* Rutas antiguas → nuevas, tras mover las herramientas internas bajo /workspace.

   Existe porque hay enlaces circulando: pestañas abiertas, marcadores, y sobre todo los emails
   de recuperación de contraseña ya enviados, que apuntan a /deck/reset.

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
  '/deck/forgot': '/workspace/forgot',
  '/deck/reset': '/workspace/reset',
  '/deck/logout': '/workspace/logout',
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
