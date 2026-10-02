-- IMG_r · el nombre pasa a ser obligatorio en la base de datos.
--
-- ⚠️ SE APLICA DESPUÉS DE DESPLEGAR IMG_r, no antes. La versión anterior del popup de imágenes inserta
-- sin `name`; con esto aplicado, cada subida desde DeckMak_r y FormMak_r respondería 500 hasta el
-- despliegue (plan docs/features/img-r-fase-1-plan.md, D1).
--
-- Repite el relleno de 20261001100000_images_bank.sql para las imágenes que el código anterior haya
-- subido entre las dos migraciones, con la misma función. Idempotente.

begin;

update public.images
   set name = public.image_legacy_name(alt, storage_path)
 where name is null or btrim(name) = '';

alter table public.images
  alter column name set not null,
  add constraint images_name_not_blank check (btrim(name) <> '');

commit;

-- ── Comprobación posterior ──────────────────────────────────────────────────
--   select count(*) from images;                                          -- el mismo que antes
--   select is_nullable from information_schema.columns
--    where table_schema = 'public' and table_name = 'images' and column_name = 'name';  -- NO
