/* Un límite de trabajos a la vez, en orden de llegada. Lo usa la subida para pedir las propuestas: tres a la
   vez como máximo (docs/features/img-r.md, F21), para que un lote de veinte no lance veinte llamadas de golpe. */
export function createLimiter(max: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    if (running >= max) return;
    const start = queue.shift();
    if (start) start();
  };
  return function limit<T>(job: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        running++;
        job()
          .then(resolve, reject)
          .finally(() => {
            running--;
            next();
          });
      });
      next();
    });
  };
}
