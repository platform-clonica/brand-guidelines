import { Chrome } from '../Chrome';

/* Fixed brand page (ref p.41): client logo wall. The image already includes the
   category labels, so it is placed contained within the margins (not full-bleed). */
export function Clients({ page }: { page: number }) {
  return (
    <div className="frame theme-light clients">
      <Chrome page={page} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logos" src="/presentaciones/clients.png" alt="Clientes de Interactius" />
    </div>
  );
}
