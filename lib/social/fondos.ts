import type { Background } from './types.ts';

/* Los fondos que puede llevar una tarjeta, con nombre y muestra.
   ─────────────────────────────────────────────────────────────────────────
   Existe para que nadie tenga que acordarse de si el beige se llama
   `warm-dark` o `arena`. La interfaz pinta la muestra, enseña el nombre y
   escribe el modificador correcto en el markdown.

   El hex se repite aquí porque la interfaz necesita un color que pintar en
   un `<button>`, y los tokens del lienzo viven en CSS. Es la misma
   duplicación declarada que ya tiene el deck, y la cubre el mismo criterio:
   al tocar un color de marca, contrastar con `lib/tokens.ts`. */

export type FondoOpcion = {
  /** Lo que se escribe entre llaves en el markdown. */
  token: Background | 'dark';
  /** El nombre de marca, que es como lo llama todo el mundo. */
  nombre: string;
  hex: string;
  /** Color de la tinta encima, para que la muestra se lea como se verá. */
  tinta: string;
  nota?: string;
};

export const FONDOS: readonly FondoOpcion[] = [
  { token: 'warm-light', nombre: 'Warm Light', hex: '#F5F2ED', tinta: '#1C1A17' },
  { token: 'warm-dark', nombre: 'Warm Dark', hex: '#E0DAD2', tinta: '#1C1A17' },
  { token: 'white', nombre: 'Blanco', hex: '#FFFFFF', tinta: '#1C1A17' },
  {
    token: 'opal',
    nombre: 'Opal',
    hex: '#B0B5B0',
    tinta: '#1C1A17',
    nota: 'El único acento que vale como fondo, y siempre con tinta oscura.',
  },
  { token: 'dark', nombre: 'Oscuro', hex: '#1C1A17', tinta: '#F5F2ED' },
];

export const fondoPorToken = (t?: string): FondoOpcion | undefined =>
  FONDOS.find((f) => f.token === t);
