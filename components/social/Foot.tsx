/* El pie de la tarjeta: una fila, idéntica en los nueve layouts.
   Izquierda la marca, derecha el slug.

   LA MARCA NO VA EN TODAS LAS TARJETAS, Y NO ES UN OLVIDO.
   En los seis carruseles que Interactius ya tiene publicados el imagotipo
   aparece SOLO en la portada; las tarjetas interiores llevan únicamente el
   slug. Ponerlo en las nueve repetiría la firma nueve veces y convertiría
   una marca en un sello de agua.

   La excepción es el logo co-marca: cuando una pieza se hace con alguien
   (una semana del diseño, un cliente), ese logo sí va en todas, porque lo
   que identifica no es quién publica sino en el marco de qué. Es lo que
   hace el carrusel de la Barcelona Design Week. */
export type Mark = 'imagotipo' | 'logo' | 'ninguna';

export function Foot({
  slug,
  logo,
  mark,
  negative,
  onPhoto,
}: {
  slug?: string;
  logo?: { src?: string; alt?: string };
  mark: Mark;
  /** Imagotipo en negativo: lo piden el tema oscuro y las tarjetas con foto. */
  negative?: boolean;
  onPhoto?: boolean;
}) {
  const src = negative ? '/logo/interactius-negativo.svg' : '/logo/interactius-positivo.svg';
  return (
    <div className={`foot${onPhoto ? ' on-photo' : ''}`}>
      {mark === 'logo' && logo?.src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="mark" src={logo.src} alt={logo.alt ?? ''} />
      ) : mark === 'imagotipo' ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="mark wordmark" src={src} alt="Interactius" />
      ) : (
        <span />
      )}
      {slug ? <span className="slug">{slug}</span> : <span />}
    </div>
  );
}
