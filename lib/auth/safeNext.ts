/* Destinos a los que el login puede devolver al usuario tras autenticarse.

   Lista blanca explícita, por dos motivos: evitar un open-redirect, y evitar que la regla derive.
   Antes vivía duplicada en LoginForm y en la página de login como `raw.startsWith('/deck')`, lo
   que además dejaba pasar `/deckcualquiercosa`.

   Desde que todas las herramientas internas cuelgan de /workspace, la lista es una sola entrada.
   Lo público (/deck/[id]/view, /forms/f/[id]) queda fuera a propósito: nadie inicia sesión para
   acabar en una página que no la necesita. */

const ALLOWED = ['/workspace'];

export const DEFAULT_NEXT = '/workspace';

export function safeNext(raw: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (!raw || raw.startsWith('//')) return fallback;
  const ok = ALLOWED.some((p) => raw === p || raw.startsWith(`${p}/`) || raw.startsWith(`${p}?`));
  return ok ? raw : fallback;
}
