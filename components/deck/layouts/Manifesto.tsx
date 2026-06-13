import { Chrome } from '../Chrome';

/* Fixed brand page (ref p.10): centred serif manifesto on a warm-greige ground. */
export function Manifesto({ page }: { page: number }) {
  return (
    <div className="frame theme-light manifesto">
      <Chrome page={page} />
      <div className="wrap">
        <h2>
          Ayudamos a las organizaciones en momentos de <span className="emph">/ transformación /</span> a decidir con criterio.
        </h2>
        <p className="sub">Convertimos la estrategia en soluciones que perduran.</p>
      </div>
    </div>
  );
}
