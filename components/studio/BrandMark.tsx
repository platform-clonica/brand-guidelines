import { colors } from '@/components/deck/studio/ui';

/* Marca de Interactius para las cabeceras de las herramientas internas.

   Usa el ISOTIPO (la marca cuadrada), no el logotipo horizontal: en una barra de 20px de alto,
   el lockup completo mide ~155px de ancho y compite con el wordmark de la herramienta que va
   justo al lado. El isotipo ocupa un cuadrado y deja que la identidad de la herramienta mande.
   El logotipo completo se sigue usando en el login, donde hay sitio y es la portada.

   <img> plano sobre un SVG estático de public, como en el resto del repo (Sidebar, MobileHeader,
   TimerClient). No es next/image a propósito: no hay nada que optimizar.

   `href` lo convierte en enlace: a /home desde las landings de cada herramienta, y a la landing
   de la propia herramienta desde dentro de su editor. */
export function BrandMark({
  height = 20,
  href,
  label = 'Interactius',
  variant = 'mark',
}: {
  height?: number;
  href?: string;
  label?: string;
  /* `mark` = isotipo cuadrado, para las barras de las páginas internas.
     `lockup` = logotipo completo, para el login: ahí hay sitio y es la portada de la marca. */
  variant?: 'mark' | 'lockup';
}) {
  const isMark = variant === 'mark';

  /* eslint-disable-next-line @next/next/no-img-element */
  const img = (
    <img
      src={isMark ? '/logo/isotipo-positivo.svg' : '/logo/interactius-positivo.svg'}
      alt="interactīus"
      style={{ display: 'block', height, width: isMark ? height : 'auto' }}
    />
  );

  if (!href) return img;

  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
    >
      {img}
    </a>
  );
}

/* Separador entre el imagotipo y la marca de la herramienta, para que se lean como dos cosas
   distintas y no como un solo lockup. */
export function MarkDivider() {
  return (
    <span
      aria-hidden
      style={{ width: 1, height: 18, background: colors.warmDark, flexShrink: 0, margin: '0 4px' }}
    />
  );
}
