/* Campos espejo: los que la tabla `forms` copia del frontmatter para poder listar, ordenar y
   filtrar sin parsear cincuenta markdowns. El `md` manda siempre; esto se re-deriva en cada
   guardado y nunca se edita a mano. */

import type { FormDraft } from '@/lib/forms/schema';
import type { FormMirror } from '@/lib/forms/types';

export function mirrorFrom(def: FormDraft): FormMirror {
  return {
    public_id: def.id,
    title: def.title,
    client: def.client ?? null,
    status: def.status,
    slug: def.slug ?? null,
  };
}
