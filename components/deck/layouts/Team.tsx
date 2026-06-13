import { Chrome } from '../Chrome';

/* Fixed brand page (ref p.11): the tribe — voice copy left, portrait grid right. */
export function Team({ page }: { page: number }) {
  return (
    <div className="frame theme-light team">
      <Chrome page={page} />
      <div className="txt">
        <p>En el centro no pasa nada nuevo. Es previsible, cómodo y hoy, la forma más rápida de volverse irrelevante.</p>
        <p>Por eso decidimos operar en los márgenes, lo ambiguo, lo incierto. Ahí están las verdades humanas. Y ahí decidimos quedarnos.</p>
        <p>Trabajamos desde ese espacio liminal, entre lo que es y lo que está por venir. Lo hacemos cuestionando lo evidente y desplazando el foco, con criterio y perspectiva humana.</p>
        <p className="bold">No encajamos en etiquetas ni vestimos de ellas.</p>
        <p>Somos un compañero: cercano, implicado y enfocado en lo que realmente importa. Trabajamos con rigor, naturalidad y criterio.</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="grid" src="/presentaciones/team.png" alt="Equipo Interactius" />
    </div>
  );
}
