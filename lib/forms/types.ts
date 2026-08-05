/* FormMaker — tipos de la tabla `forms`. Espejo de la migración `create_forms_table`.
   Equivalente de lib/decks/types.ts para el otro lado de la casa. */

/* Campos derivados del frontmatter en cada guardado. El `md` manda: estos existen para poder
   listar, ordenar y filtrar sin parsear cincuenta markdowns. */
export type FormMirror = {
  public_id: string;   // el `id` del frontmatter — lo que va en /forms/f/[id]
  title: string;
  client: string | null;
  status: 'draft' | 'published';
  slug: string | null;
};

export type FormRecord = FormMirror & {
  id: string;          // uuid — la URL del editor, estable aunque cambie el public_id
  tags: string[];
  md: string;
  created_at: string;
  updated_at: string;
};

/* Lo que devuelve el listado. Incluye `md` porque la tarjeta compila el formulario en el navegador
   para sacar la imagen de fondo y contar campos, igual que la galería del deck compila la portada. */
export type FormListItem = FormRecord & {
  responses: number;   // cuántas respuestas tiene, por public_id
};

export type FormCreateInput = {
  md: string;
  tags?: string[];
};

export type FormUpdateInput = {
  md?: string;
  tags?: string[];
};
