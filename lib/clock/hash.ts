/* Clock_r — el hash de un asiento del libro.

   ⚠ ESTE FICHERO NO SE USA EN PRODUCCIÓN, Y NO DEBE USARSE. El hash lo calcula SOLO Postgres,
   dentro de `clock_record()`, que es la única puerta de escritura de `clock_entries`
   (docs/features/clock-r-plan.md, H1 y H4). Un hash calculado en el navegador no prueba nada:
   quien lo calcula es quien lo puede falsificar.

   Entonces, ¿para qué existe? Para poder comprobar SIN base de datos que el algoritmo de Postgres
   es el que creemos y que nadie lo cambia sin darse cuenta. Ningún test de este repo habla con
   Supabase, así que la comprobación va contra vectores generados en Postgres
   (__tests__/fixtures/hash-vectors.json, regenerables con scripts/clock-hash-vectors.ts).
   Verificar una cadena en la aplicación se hace llamando a la RPC `clock_verify_chain`, no aquí.

   POR QUÉ LA CARGA ÚTIL SE COMPONE ASÍ (plan, H5). Hashear JSON no sirve: el orden de claves de
   `to_jsonb` y el de un objeto de JavaScript no coinciden. Concatenar con un separador tampoco:
   un motivo que contuviera el separador permitiría que dos asientos distintos produjeran la misma
   carga, y sustituir uno por otro sin romper la cadena. Así que cada campo va precedido de su
   longitud EN BYTES UTF-8, en un orden fijo, sin separador que se pueda inyectar. Los nulos entran
   como cadena vacía y las fechas ya llegan serializadas: `occurred_at` como microsegundos de época
   en entero, que no depende de zona horaria ni de formato — y que además esquiva que Date, en
   JavaScript, solo tenga precisión de milisegundos. */

import { createHash } from 'node:crypto';

/* El orden ES el contrato con la función de Postgres. Se declara una vez, aquí, y de aquí lo lee
   también el script que regenera los vectores: dos listas en dos ficheros acabarían divergiendo. */
export const HASH_FIELD_ORDER = [
  'prevHash',
  'personId',
  'personEmail',
  'personName',
  'op',
  'corrects',
  'reason',
  'kind',
  'occurredAtMicros',
  'workDate',
  'mode',
  'source',
  'authorPersonId',
] as const;

export type ClockHashField = (typeof HASH_FIELD_ORDER)[number];

/** Los trece campos que entran en el hash, ya serializados como texto. */
export type ClockHashFields = Record<ClockHashField, string>;

const bytes = (value: string): number => new TextEncoder().encode(value).length;

/** La carga útil exacta que hashea Postgres: `<bytes>:<valor>` por campo, en orden, sin separador. */
export function clockEntryPayload(fields: ClockHashFields): string {
  let payload = '';
  for (const field of HASH_FIELD_ORDER) {
    const value = fields[field] ?? '';
    payload += `${bytes(value)}:${value}`;
  }
  return payload;
}

/** sha256 de la carga útil, en hexadecimal minúsculo. Mismo resultado que `encode(sha256(…), 'hex')`. */
export function clockEntryHash(fields: ClockHashFields): string {
  return createHash('sha256').update(clockEntryPayload(fields), 'utf8').digest('hex');
}
