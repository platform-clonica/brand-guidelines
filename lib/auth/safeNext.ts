/* Destinos a los que el login puede devolver al usuario tras autenticarse.

   Lista blanca explícita, por dos motivos: evitar un open-redirect, y evitar que la regla derive.
   Antes vivía duplicada en LoginForm y en la página de login como `raw.startsWith('/deck')`, lo
   que además dejaba pasar `/deckcualquiercosa`. Al añadir FormMaker hacían falta dos superficies,
   así que la regla pasa a estar escrita una sola vez. */

const ALLOWED = ['/home', '/deck', '/forms/maker'];

/* El dispatcher, no la galería de presentaciones: dejó de ser cierto que el DeckMaker fuera la
   única herramienta en cuanto llegó FormMaker. */
export const DEFAULT_NEXT = '/home';

export function safeNext(raw: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (!raw || raw.startsWith('//')) return fallback;
  const ok = ALLOWED.some((p) => raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`));
  return ok ? raw : fallback;
}
