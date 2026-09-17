/* Traducción de los errores de las funciones de Postgres de Clock_r a respuestas HTTP.

   No es un route: en el App Router solo son rutas los ficheros con nombre reservado (`route.ts`),
   así que esto puede vivir aquí al lado de quienes lo usan.

   POR QUÉ NO BASTA CON `dbFail`. La regla del repo es no reenviar nunca el texto de Postgres, y es
   buena: ahí se cuelan nombres de columna, de restricción y de tipo. Pero un 500 genérico tampoco
   sirve aquí, porque «esta cuenta no puede hacer eso» y «se te ha adelantado otra pestaña» son
   cosas que quien ficha tiene que poder leer y resolver. De ahí un mensaje fijo NUESTRO por clase
   de error, y `dbFail` para todo lo demás. */

import { NextResponse } from 'next/server';
import { dbFail } from '@/lib/supabase/server';

const BY_CODE: Record<string, { status: number; message: string }> = {
  /* `raise ... using errcode = '42501'`: sin ficha activa, o escribiendo sobre otra persona sin ser
     administración. */
  '42501': { status: 403, message: 'Esta cuenta no puede hacer esa operación sobre el registro.' },
  /* Una corrección sin motivo o sin asiento al que apuntar. */
  '23514': { status: 400, message: 'El fichaje no tiene la forma que exige el registro.' },
  /* Apunta a una persona o a un asiento que no existe. */
  '23503': { status: 400, message: 'El fichaje apunta a algo que no existe.' },
  /* El índice único de cadena: dos escrituras compitieron por el mismo eslabón. No es un fallo del
     usuario y se resuelve reintentando, así que se dice así. */
  '23505': { status: 409, message: 'Se ha escrito otro fichaje a la vez. Vuelve a intentarlo.' },
};

export function rpcFail(scope: string, error: { code?: string; message: string }): NextResponse {
  const known = error.code ? BY_CODE[error.code] : undefined;
  if (!known) return dbFail(scope, error);

  console.error(`[clock:${scope}]`, error.code, error.message);
  return NextResponse.json({ error: known.message }, { status: known.status });
}
