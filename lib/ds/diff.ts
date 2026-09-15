/* DSMak_r — qué valores cambian entre dos juegos de tokens.

   Lo usa el aviso de motor antiguo (plan, H4): antes de regenerar, el diseñador ve cuántos valores
   y cuáles se van a mover. Las listas de tokens (tipografía, espaciado, sombras, breakpoints) se
   comparan por su `key` o `name`, no por posición: la ruta sale legible (`typography.h1.size`) y
   un rol añadido en medio no marca como cambiados todos los de detrás. */

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function byName(list: unknown[]): Obj {
  return Object.fromEntries(
    list.map((item, i) => {
      const id = isObject(item) ? (item.key ?? item.name) : undefined;
      return [typeof id === 'string' ? id : String(i), item];
    }),
  );
}

const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

export function tokenDiff(a: unknown, b: unknown, path = ''): string[] {
  if (Array.isArray(a) && Array.isArray(b)) return tokenDiff(byName(a), byName(b), path);
  if (isObject(a) && isObject(b)) {
    const keys = [...Object.keys(a), ...Object.keys(b).filter((k) => !Object.hasOwn(a, k))];
    return keys.flatMap((k) => tokenDiff(a[k], b[k], join(path, k)));
  }
  return Object.is(a, b) ? [] : [path];
}
