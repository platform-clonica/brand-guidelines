-- FormMaker · la `slug` pasa a ser URL pública, así que pasa a ser única.
--
-- Hasta ahora `forms.slug` era decorativa: daba nombre al CSV exportado y se estampaba en cada
-- respuesta (`responses.form_slug`). La URL era siempre el `public_id` opaco. Desde el commit que
-- introduce lib/forms/slug.ts, `/forms/f/{slug}` resuelve al mismo formulario que
-- `/forms/f/{public_id}` — y dos filas con la misma slug harían esa URL ambigua.
--
-- Aditiva y segura de aplicar en caliente: solo añade un índice. La app ya comprueba la unicidad
-- antes de escribir (lib/forms/registry.ts → slugTaken, y /api/forms/slug-check), así que esto es
-- la garantía dura, no la primera línea de defensa.

-- Índice PARCIAL: `slug` es nullable y la inmensa mayoría de los formularios no tiene alias.
-- En Postgres los NULL nunca colisionan en un índice único, pero declararlo parcial lo deja
-- explícito y mantiene el índice pequeño.
create unique index if not exists forms_slug_key
  on public.forms (slug)
  where slug is not null;

-- Red de seguridad para el otro lado de la ambigüedad: una slug que coincida con el `public_id`
-- de OTRO formulario. La gramática de la slug ya lo impide (no admite `_`, y los ids nacen como
-- `fk_…`), pero si alguien afloja esa gramática, el registry resuelve por id primero y la slug
-- quedaría muerta en silencio. Esto lo convierte en un error de escritura, que es ruidoso.
create or replace function public.forms_slug_not_a_public_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is not null and exists (
    select 1 from public.forms f where f.public_id = new.slug and f.id <> new.id
  ) then
    raise exception 'slug "%" choca con el public_id de otro formulario', new.slug
      using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists forms_slug_not_a_public_id on public.forms;
create trigger forms_slug_not_a_public_id
  before insert or update of slug on public.forms
  for each row execute function public.forms_slug_not_a_public_id();
