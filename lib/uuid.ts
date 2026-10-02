/* Un id de fila con forma de uuid. Antes vivía en lib/ds/server.ts; IMG_r habría sido la segunda
   copia. DSMak_r lo reexporta desde aquí. */
export const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
