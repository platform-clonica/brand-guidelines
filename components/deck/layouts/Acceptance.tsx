import { Chrome } from '../Chrome';

/* Fixed brand page (ref p.43): budget approval / signature. */
export function Acceptance({ page }: { page: number }) {
  return (
    <div className="frame theme-light accept">
      <div className="whitehalf" />
      <Chrome page={page} />
      <div className="title">Aprobación del presupuesto</div>

      <div className="sign">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sig" src="/presentaciones/sign.png" alt="Firma" />
        <div className="who">
          CARLOS RUIZ RE{'\n'}co-CEO / Administrador{'\n'}Happy User Experiences S.L.{'\n'}B65914848{'\n'}Pau Claris 100, 2ª Planta 08009{'\n'}Barcelona
        </div>
      </div>

      <div className="lines" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <div className="note">La firma de esta página acuerda la aceptación total de la propuesta presentada en este documento.</div>
      <div className="cta">¡Una firma y empezamos!</div>
    </div>
  );
}
