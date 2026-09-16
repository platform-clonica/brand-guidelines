-- Storage: el equipo puede LEER los objetos de sus dos buckets. Sin esto, borrar no borra.
--
-- ADITIVA. Añade dos políticas SELECT para `authenticated`. No toca ni quita ninguna existente.
--
-- El problema. 20260817122000_tighten_storage.sql dejó INSERT, UPDATE y DELETE para el equipo, pero
-- ninguna política SELECT sobre storage.objects. La Storage API resuelve `remove()` y `copy()` con
-- una consulta que necesita leer la fila del objeto: sin SELECT, la RLS la filtra, la API responde
-- 200 y no borra ni copia nada. Nadie se entera.
--
-- Comprobado el 2026-09-15 con una prueba controlada desde la galería de DeckMak_r: subida de
-- `images/1789503530988-BLANC_MAD_02-215.jpg` y borrado desde la interfaz. En los logs, la fila de
-- `images` se borra (`DELETE /rest/v1/images … 204`) y Storage responde `DELETE /object/deck-images
-- 200`, pero el objeto sigue en storage.objects. Los ficheros sin fila en `images` pasaron de 13 a 14.
--
-- Lo que abre, y a quién. Los dos buckets ya son públicos por URL (`public = true`): cualquiera con la
-- ruta descarga el fichero. Esto solo añade que el EQUIPO pueda listar los objetos y leer sus
-- metadatos. `anon` sigue sin ninguna política. `authenticated` es solo el equipo: el registro está
-- restringido al dominio (20260818090000_restrict_signup_domain.sql).
--
-- A quién arregla. A la galería de imágenes de DeckMak_r y FormMak_r, que hoy deja un huérfano en cada
-- borrado, y a DSMak_r, que borra y copia logos de `deck-assets`.
--
-- Los huérfanos que ya existen NO se limpian aquí: borrar ficheros es irreversible y va aparte.

begin;

create policy deck_assets_select_team on storage.objects
  for select to authenticated using (bucket_id = 'deck-assets');

create policy deck_images_select_team on storage.objects
  for select to authenticated using (bucket_id = 'deck-images');

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────
-- Subir una imagen en la galería de DeckMak_r, borrarla, y comprobar que el objeto ya no está en
-- storage.objects. Un GET anónimo de /storage/v1/object/list/deck-images debe seguir sin listar nada.
