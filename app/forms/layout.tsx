/* Layout del segmento /forms. No pinta nada: existe para declarar el DEFECTO de indexación.

   Los formularios son enlaces privados de cliente y nacen `noindex, nofollow` (PRD §9, §10).
   Antes ese defecto lo imponía solo la cabecera `X-Robots-Tag` del middleware, que es ciega: en
   el borde no se sabe qué formulario se está pidiendo sin consultar la base de datos, así que
   tampoco se podía hacer una excepción con el formulario que sí quiere ser indexable.

   Poniéndolo aquí, el defecto cubre TODO el segmento —incluida la página 404, que no puede
   exportar metadatos propios— y la página del formulario lo pisa cuando su `indexable` lo pide.
   Next fusiona metadatos: lo que declara la página gana sobre lo que declara su layout. */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
