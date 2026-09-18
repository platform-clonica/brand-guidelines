/* Clock_r — el aviso de protección de datos.

   ⚠ EL TEXTO DE AQUÍ ABAJO ES UN MARCADOR, NO UN AVISO LEGAL. Está escrito para que sea IMPOSIBLE
   confundirlo con el definitivo: si pareciera prosa jurídica verosímil, alguien podría publicarlo
   creyendo que está terminado, y un aviso de privacidad inventado es peor que no tener ninguno.

   Lo redacta quien lleve lo legal —no la herramienta, y no quien la implementa— porque tiene que
   decir cosas que solo esa persona puede afirmar: la base jurídica del tratamiento, el plazo real
   de conservación, quién accede y cómo se ejercen los derechos.

   QUÉ SÍ FUNCIONA YA: el circuito entero. Se pide al primer acceso, se registra la aceptación con
   `clock_accept_policy`, y es idempotente por versión. El día que llegue el texto bueno se
   sustituye, se sube `POLICY_VERSION`, y la herramienta vuelve a pedir la aceptación a todo el
   mundo sin tocar una línea de código. */

/* Subir esto REPREGUNTA a todo el equipo. Es el mecanismo por el que un cambio de texto no pasa
   desapercibido: una aceptación vieja no vale para una versión nueva. */
export const POLICY_VERSION = 'v0-marcador';

/* Sello del texto. Con el aviso definitivo será el hash real del contenido, para que una edición
   silenciosa se pueda detectar comparando. Mientras el texto sea un marcador, el sello lo dice
   también: no se finge una garantía que no existe. */
export const POLICY_HASH = 'sin-sello-el-texto-es-un-marcador';

export const POLICY_TITULO = 'Aviso de protección de datos — PENDIENTE DE REDACCIÓN';

/* Cada línea es un párrafo. Dice qué tiene que decir el texto definitivo, no lo dice por él. */
export const POLICY_TEXTO: readonly string[] = [
  'ESTE TEXTO ES UN MARCADOR. No es el aviso definitivo y no tiene validez legal.',
  'El aviso real lo redacta quien lleve lo legal en Interactius, y tiene que decir al menos: con qué finalidad se registra la jornada, cuál es la base jurídica, qué datos concretos se guardan, cuánto tiempo se conservan, quién puede consultarlos y cómo se ejercen los derechos de acceso, rectificación, supresión y oposición.',
  'Lo que la herramienta hace hoy, y que el texto definitivo tendrá que reflejar: guarda la hora de cada fichaje, si fue presencial o a distancia, y las correcciones con su motivo y su autor. No guarda ubicación ni ningún dato biométrico. Administración ve el registro de todo el equipo.',
  'Al aceptar queda constancia de la versión aceptada y del momento. Si el texto cambia, se vuelve a pedir.',
];
