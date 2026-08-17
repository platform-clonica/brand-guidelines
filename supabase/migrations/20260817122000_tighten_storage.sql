-- Cierra la escritura anónima sobre los dos buckets de Storage.
--
-- ⚠️ RESTRICTIVA. Aplicar después del despliegue, junto con 20260817121000.
--
-- Qué había. Seis políticas sobre `storage.objects` concedían INSERT, UPDATE y DELETE a `anon`,
-- acotadas únicamente por `bucket_id`. Ordenado por daño real:
--
--   1. UPDATE era lo peor. Un anónimo sobrescribe un objeto existente y **la URL pública no
--      cambia**: el cliente que reabre el enlace de su propuesta ve la imagen nueva. Son los logos
--      y las portadas de material ya enviado por correo.
--   2. INSERT sin `file_size_limit` ni `allowed_mime_types` es alojamiento arbitrario bajo el
--      dominio del proyecto, y coste de almacenamiento sin techo.
--   3. DELETE tenía una vía ya cerrada por el trigger `protect_objects_delete` que Supabase
--      instala de serie (aborta el borrado por PostgREST con 42501), pero seguía vigente por la
--      Storage API, que es justo la que fija la GUC que ese trigger comprueba.
--
-- No hace falta ninguna política de lectura para `anon`: los dos buckets son `public = true`, y
-- eso ya sirve cualquier objeto por URL sin autenticación. La subida la hace el navegador con la
-- sesión del equipo (`createBrowserClient` adjunta la cookie), así que cerrar `anon` no rompe el
-- flujo de `uploadLogo` ni el de `uploadImage`.

begin;

drop policy if exists deck_assets_insert_mvp on storage.objects;
drop policy if exists deck_assets_update_mvp on storage.objects;
drop policy if exists deck_assets_delete_mvp on storage.objects;
drop policy if exists deck_images_insert_mvp on storage.objects;
drop policy if exists deck_images_update_mvp on storage.objects;
drop policy if exists deck_images_delete_mvp on storage.objects;

create policy deck_assets_insert_team on storage.objects
  for insert to authenticated with check (bucket_id = 'deck-assets');
create policy deck_assets_update_team on storage.objects
  for update to authenticated using (bucket_id = 'deck-assets') with check (bucket_id = 'deck-assets');
create policy deck_assets_delete_team on storage.objects
  for delete to authenticated using (bucket_id = 'deck-assets');

create policy deck_images_insert_team on storage.objects
  for insert to authenticated with check (bucket_id = 'deck-images');
create policy deck_images_update_team on storage.objects
  for update to authenticated using (bucket_id = 'deck-images') with check (bucket_id = 'deck-images');
create policy deck_images_delete_team on storage.objects
  for delete to authenticated using (bucket_id = 'deck-images');

-- Límites que los buckets no tenían. 10 MB cubre de sobra una foto de portada ya optimizada
-- (`lib/deck/optimizeImage.ts` las reduce antes de subirlas) y un SVG de logotipo.
update storage.buckets
   set file_size_limit    = 10485760,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']
 where id in ('deck-assets', 'deck-images');

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────
-- Subir una imagen desde la galería del Deck Maker con sesión debe seguir funcionando.
-- Un PUT anónimo contra /storage/v1/object/deck-images/<ruta> debe devolver 403.
