/* 404 for the /forms segment (unknown id or draft form). Does not reveal whether a form exists.

   Noindex heredado de app/forms/layout.tsx: un `not-found.tsx` no puede exportar metadatos
   propios, y la cabecera del middleware ya no cubre `/forms/f/*` (ver el comentario de allí). */

import '@/components/forms/forms.css';

export default function FormNotFound() {
  return (
    <main className="ixf-notfound">
      <p className="ixf-notfound__code">404 · interactīus forms</p>
      <h1 className="ixf-notfound__title">Este formulario no está disponible.</h1>
      <p className="ixf-signature" style={{ color: 'rgba(245,242,237,0.72)' }}>
        Comprueba el enlace que te compartieron.
      </p>
    </main>
  );
}
