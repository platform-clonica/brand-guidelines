/* Clock_r — la forma de un asiento, declarada.

   Este fichero solo DECLARA. Quien valida sin lanzar es ./compile.ts, igual que en lib/ds
   (schema.ts declara, compile.ts repara). La separación importa: un esquema que lanza convierte una
   fila vieja o tocada a mano en una pantalla rota, y aquí lo que hay que poder hacer con una fila
   mala es verla y corregirla, no quedarse sin registro.

   Solo se declaran los campos que el cálculo mira. La fila de la base de datos trae además hash,
   prev_hash, person_email y el resto; Zod los deja pasar sin tocarlos porque el objeto no es
   estricto, y ninguno entra en el cálculo de horas. */

import { z } from 'zod';

export const ENTRY_KINDS = ['in', 'out', 'break_start', 'break_end'] as const;
export const ENTRY_OPS = ['record', 'amend', 'annul'] as const;

/* Una marca de tiempo que `Date` sepa leer, y ese es exactamente el listón que hace falta: lo que
   el cálculo va a hacer con este campo es `Date.parse`, así que lo que no se pueda parsear tiene
   que caerse AQUÍ y no convertirse en un NaN que viaja callado hasta el saldo del mes. */
const instant = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), 'No es una fecha y hora legible');

export const entryRowSchema = z.object({
  id: z.string(),
  seq: z.number(),
  op: z.enum(ENTRY_OPS),
  corrects: z.string().nullable().default(null),
  reason: z.string().nullable().default(null),
  kind: z.enum(ENTRY_KINDS),
  occurred_at: instant,
  /* Obligatorio, como en la tabla (`not null default now()`). Una fila sin él no es un caso a
     tolerar: es una fila malformada, y sin ella no se puede saber si una hora se fichó o se
     inventó después. */
  recorded_at: instant,
  work_date: z.string(),
});

export type EntryRow = z.infer<typeof entryRowSchema>;
