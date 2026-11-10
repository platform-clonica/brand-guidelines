import { EQUIPO, type Persona } from './equipo.ts';

/* De un nombre escrito a mano, el retrato y el cargo.
   ─────────────────────────────────────────────────────────────────────────
   Quien escribe la tarjeta de cierre pone `> autor: Diana Yuste` y la foto
   aparece sola. Ni subirla, ni buscarla, ni acordarse de cómo se llama el
   archivo.

   TOLERANTE AL ACENTO, A PROPÓSITO. «Maria Najarro» y «María Najarro» son
   la misma persona, y nadie debería quedarse sin foto por una tilde al
   teclear. Los nombres se comparan sin tildes y en minúsculas.

   OJO CON LA Ñ. El índice se normaliza al CONSTRUIRLO, no solo al
   consultarlo. Si las claves se guardaran tal cual y la consulta llegara
   normalizada, «Tomás Modroño» no encontraría nunca su entrada: la
   normalización le quita la ñ a la consulta y la clave la conserva. Es un
   fallo que ya se dio en el repo de la web; aquí no se repite. */

function normaliza(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const POR_NOMBRE = new Map(EQUIPO.map((p) => [normaliza(p.nombre), p]));

/* El nombre de pila basta si no se repite. «Diana» funciona; «Elena» no,
   porque hay dos, y entonces es mejor no adivinar: una foto equivocada es
   peor que ninguna foto. */
const POR_PILA = (() => {
  const cuenta = new Map<string, Persona[]>();
  for (const p of EQUIPO) {
    const pila = normaliza(p.nombre).split(' ')[0];
    cuenta.set(pila, [...(cuenta.get(pila) ?? []), p]);
  }
  return new Map([...cuenta].filter(([, v]) => v.length === 1).map(([k, v]) => [k, v[0]]));
})();

export type Autor = {
  /** El nombre tal como se escribió, siempre. */
  nombre: string;
  /** Solo si la persona está en el equipo. */
  rol?: string;
  /** El retrato, o el isotipo cuando quien firma no está en el registro. */
  foto: string;
  /** `false` cuando se ha caído al isotipo. */
  esRetrato: boolean;
};

/* Quien no está en el registro firma con el isotipo y no con una inicial.

   No es un apaño: es lo que ya hace la web desde noviembre de 2026, cuando
   se unificaron bajo «Interactius» las firmas de quienes ya no están. Una
   letra suelta no dice nada y se lee como un hueco por llenar; el isotipo
   dice lo que de verdad pasa, que la pieza la firma la casa. */
const ISOTIPO = '/logo/isotipo-positivo.svg';

export function resolverAutor(nombre: string): Autor {
  const clave = normaliza(nombre);
  const persona = POR_NOMBRE.get(clave) ?? (clave.includes(' ') ? undefined : POR_PILA.get(clave));
  if (persona) return { nombre, rol: persona.rol, foto: persona.foto, esRetrato: true };
  return { nombre, foto: ISOTIPO, esRetrato: false };
}

/** Los nombres completos, para que el editor pueda sugerirlos. */
export const NOMBRES_EQUIPO: readonly string[] = EQUIPO.map((p) => p.nombre);
