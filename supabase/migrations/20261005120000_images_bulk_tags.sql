-- IMG_r · entrega 3: «Añadir etiquetas» en bloque (docs/features/img-r.md, G10; plan en
-- docs/features/img-r-entrega-3-plan.md, § 5).
--
-- ADITIVA. Una función nueva. No toca ninguna fila, columna ni función existente: el código de las fases 1 y 2
-- sigue funcionando con ella aplicada, así que se puede aplicar antes de desplegar.
--
-- La unión se hace en SQL, fila a fila, con las etiquetas que la fila tiene EN ESE MOMENTO: si otra pestaña
-- guardó entre medias, no se pisa su cambio, y no hace falta control de versión. `SET` y `WHERE` leen `i.tags`,
-- así que si una fila cambia mientras se espera su bloqueo, Postgres vuelve a evaluar los dos con la versión
-- nueva.
--
-- - Añade las que la fila no tiene, en el orden en que llegan, hasta `p_max` etiquetas por imagen. El tope vive
--   en la app (TAGS_MAX, lib/images/naming.ts), como en la subida y en el PATCH de una imagen.
-- - Solo actualiza las filas que reciben alguna etiqueta: una que ya las tenía todas, o que está llena, no
--   mueve su `updated_at` ni provoca un choque en otra pestaña.
-- - `search_text` es una columna generada de nombre y etiquetas: se mantiene sola.
-- - `security invoker`: vale la RLS de `images` (política images_team), igual que en el PATCH de una imagen.

create or replace function public.add_image_tags(p_ids uuid[], p_tags text[], p_max integer)
returns setof public.images
language sql
security invoker
set search_path = public
as $$
  update public.images i
     set tags = i.tags || array(
           select u.t
             from unnest(p_tags) with ordinality as u(t, n)
            where not (u.t = any(i.tags))
            order by u.n
            limit greatest(p_max - cardinality(i.tags), 0))
   where i.id = any(p_ids)
     and cardinality(i.tags) < p_max
     and exists (select 1 from unnest(p_tags) as x(t) where not (x.t = any(i.tags)))
  returning i.*;
$$;

comment on function public.add_image_tags(uuid[], text[], integer) is
  'Añade etiquetas a varias imágenes sin pisar las que ya tienen, hasta p_max por imagen. Devuelve las filas que cambian.';

revoke all on function public.add_image_tags(uuid[], text[], integer) from public, anon;
grant execute on function public.add_image_tags(uuid[], text[], integer) to authenticated;

-- ── Comprobación posterior ──────────────────────────────────────────────────
--   select count(*) from images;                                                         -- el mismo que antes
--   select has_function_privilege('anon', 'public.add_image_tags(uuid[], text[], integer)', 'execute');  -- false
