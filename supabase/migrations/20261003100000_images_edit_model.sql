-- IMG_r · fase 2: qué modelo hizo cada edición (añadido aprobado por Carlos el 3 de octubre de 2026; plan en
-- docs/features/img-r-fase-2-plan.md, § 1).
--
-- ADITIVA: una columna nula, sin valor por defecto. Guarda el id del modelo de lib/images/edit/models.ts
-- ('fast' = Nano Banana 2, 'pro' = Nano Banana Pro), no el nombre del modelo de Google, que puede cambiar.
-- Sin check: añadir un modelo no debe pedir otra migración.

alter table public.images add column edit_model text;

comment on column public.images.edit_model is
  'Modelo de la edición: id de lib/images/edit/models.ts (fast, pro). Null si no es una edición.';
