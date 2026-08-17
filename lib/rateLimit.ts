import { supabaseServer } from './supabase/server';

/* Limitación de tasa por IP para los endpoints públicos de escritura.

   El contador vive en Postgres (`public.check_rate_limit`, migración 20260817130000): hace falta
   que sea atómico y compartido entre invocaciones de una función serverless, y el proyecto ya
   tiene una base de datos. Ver la cabecera de la migración para por qué no es Redis.

   Presupuestos por superficie, no uno global: firmar una propuesta y responder un formulario son
   acciones de frecuencia muy distinta, y un límite único o ahoga la legítima o no frena la otra. */

export type RateLimitRule = {
  /** Etiqueta del endpoint. Entra en la clave, así que dos rutas no comparten cupo. */
  scope: string;
  /** Peticiones permitidas por ventana y por IP. */
  limit: number;
  /** Longitud de la ventana, en segundos. */
  windowSeconds: number;
};

/* Una propuesta se firma una vez. Cinco por hora deja margen de sobra para un cliente que se
   equivoca, recarga o firma desde otro dispositivo, y corta cualquier bucle. */
export const SIGN_LIMIT: RateLimitRule = { scope: 'sign', limit: 5, windowSeconds: 3600 };

/* Un formulario se rellena una vez, pero una misma oficina puede salir por una sola IP: por eso
   diez y no cinco. */
export const FORM_SUBMIT_LIMIT: RateLimitRule = { scope: 'form-submit', limit: 10, windowSeconds: 3600 };

/* La IP del cliente detrás del proxy de Netlify. `x-forwarded-for` es una lista y el primer valor
   es el cliente original; los siguientes son los proxies. Si no viene ninguna —imposible en
   Netlify, posible en local— se agrupa todo bajo una clave común, que es el lado conservador:
   limita de más, nunca de menos. */
function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  const first = xff?.split(',')[0]?.trim();
  return first || req.headers.get('x-nf-client-connection-ip') || 'sin-ip';
}

/**
 * `true` si la petición cabe en el presupuesto. `false` si hay que responder 429.
 *
 * Ante un fallo del contador se permite la petición. Es deliberado: la alternativa es que una
 * incidencia de la base de datos impida a un cliente firmar su propuesta, y eso es peor que dejar
 * pasar tráfico durante ese rato. Queda registrado para que no sea invisible.
 */
export async function allowRequest(req: Request, rule: RateLimitRule): Promise<boolean> {
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.rpc('check_rate_limit', {
      p_key: `${rule.scope}:${clientIp(req)}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error('[rate-limit] contador no disponible, se deja pasar', rule.scope, error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error('[rate-limit] excepción, se deja pasar', rule.scope, e);
    return true;
  }
}

/** Respuesta estándar de rechazo. `Retry-After` en segundos, como manda la especificación. */
export function tooManyRequests(rule: RateLimitRule) {
  return Response.json(
    { error: 'Demasiadas peticiones. Inténtalo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(rule.windowSeconds) } },
  );
}
