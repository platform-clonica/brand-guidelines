/* Versión del motor. Se guarda en `design_systems.engine_version` junto a los tokens.

   SÚBELA cuando cambie la salida de `composeTokens` para unos mismos parámetros: un coeficiente, un
   redondeo, un preset. Un sistema entregado a un cliente no puede cambiar solo porque se afine el
   algoritmo; con la versión, el editor lo detecta y ofrece regenerar (plan, H4).

   No hace falta acordarse: lib/ds/__tests__/golden.test.ts compara la salida con un fixture y falla
   si cambia. Al subir la versión, se regenera el fixture en el mismo commit. */
export const ENGINE_VERSION = '1';
