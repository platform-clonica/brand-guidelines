import { WORDMARK_H } from '@/lib/social/typeScale';

/* La papelería de marca: imagotipo, logo de cliente y slug.
   ─────────────────────────────────────────────────────────────────────────
   Va en DOS sitios, y los dos existen en los carruseles publicados:

   · AL PIE, en horizontal. La usan los dos carruseles de Miradas.
   · EN CABECERA, con el imagotipo girado a la izquierda. La usan los de
     evento, workshop y Barcelona Design Week, que son mayoría.

   No es un capricho de maquetación: es lo que distingue una serie de otra
   de un vistazo en el feed, antes de leer nada.

   EL IMAGOTIPO NO VA EN TODAS LAS TARJETAS. En los seis carruseles
   publicados aparece solo en la portada; las interiores llevan el slug y,
   si la pieza es con alguien, su logo. Repetirlo nueve veces convertiría
   una marca en un sello de agua.

   EL LOGO DE CLIENTE OCUPA EL HUECO CONTRARIO. En la portada va arriba a la
   derecha, donde iría el slug; en las interiores va abajo a la izquierda,
   donde iría el imagotipo. Así nunca compiten por el mismo sitio. */

export type Mark = 'imagotipo' | 'logo' | 'ninguna';

type Props = {
  slug?: string;
  logo?: { src?: string; alt?: string };
  mark: Mark;
  /** Imagotipo en negativo: lo piden el tema oscuro y las tarjetas con foto. */
  negative?: boolean;
  onPhoto?: boolean;
};

function Logo({ logo }: { logo: { src?: string; alt?: string } }) {
  /* Caja fija y la imagen contenida dentro. Los logos ajenos vienen con
     proporciones imprevisibles —el de la Barcelona Design Week lleva dos
     líneas— y fijar solo el alto dejaría uno apaisado invadiendo el slug. */
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img className="mark cliente" src={logo.src} alt={logo.alt ?? ''} />;
}

export function Foot({ slug, logo, mark, negative, onPhoto }: Props) {
  const src = negative ? '/logo/interactius-negativo.svg' : '/logo/interactius-positivo.svg';
  return (
    <div className={`foot${onPhoto ? ' on-photo' : ''}`}>
      {mark === 'logo' && logo?.src ? (
        <Logo logo={logo} />
      ) : mark === 'imagotipo' ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="mark wordmark" src={src} alt="Interactius" style={{ height: WORDMARK_H }} />
      ) : (
        <span />
      )}
      {slug ? <span className="slug">{slug}</span> : <span />}
    </div>
  );
}

/* Cabecera de portada: imagotipo girado a la izquierda y, enfrente, el logo
   del cliente si lo hay o el slug si no.

   El imagotipo girado mide lo mismo que el horizontal —318×41— porque es el
   mismo lockup rotado. Medido al píxel en las portadas de evento y de
   workshop: ocupa de (56,56) a (96,372). */
export function Head({ slug, logo, negative }: Omit<Props, 'mark' | 'onPhoto'>) {
  const src = negative ? '/logo/interactius-negativo.svg' : '/logo/interactius-positivo.svg';
  return (
    <div className="head">
      <div className="vmark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Interactius" />
      </div>
      {logo?.src ? <Logo logo={logo} /> : slug ? <span className="slug">{slug}</span> : <span />}
    </div>
  );
}
