# supabase/migrations

Esta carpeta no existía. El esquema se gestionaba "por-docs": el DDL vivía en prosa dentro de
`docs/features/*.md` y se aplicaba a mano desde el dashboard o por MCP. Está declarado así en
`docs/features/forms-persistencia-supabase.md`, o sea que era una decisión, no un descuido.

El problema de esa decisión no es que el esquema estuviera indocumentado — lo estaba, y bien. Es
que **nada lo verificaba ni lo aplicaba**: los bloques SQL de los docs no se ejecutan, no llevan
orden, no llevan checksum, y nada obliga a que coincidan con el proyecto remoto. La deriva ya se
había producido: el doc de `responses` presume "sin PII innecesaria; sin IP" mientras `signatures`
almacenaba IP y user-agent sin política de retención, y cuatro tablas seguían con políticas MVP
abiertas que ningún PR había visto nunca.

## Estado de partida (8 migraciones ya aplicadas en remoto, no reproducidas aquí)

```
20260615201852 deck_persistence_schema      20260617095051 create_signatures_table
20260615201932 deck_assets_storage          20260715090823 add_tags_to_decks
20260615202104 harden_function_and_storage  20260724080732 forms_responses
20260617080106 image_gallery                20260805073529 create_forms_table
```

**No las he reconstruido.** Reescribir a mano ocho migraciones ya aplicadas invita a que el fichero
y la realidad discrepen, que es justo el problema que esta carpeta viene a resolver. La forma
correcta de traerlas es `supabase link` + `supabase db pull`, que las genera desde el estado real
del remoto. Queda pendiente y anotado.

Las migraciones de aquí en adelante sí nacen en el repo y se aplican desde él.

## Regla

Un cambio de esquema o de política **entra por un fichero de esta carpeta y por un PR**. El panel
de Supabase se usa para mirar, no para escribir. Una política RLS es código con impacto de
seguridad: si se cambia sin diff, sin autor y sin revisor, nadie puede saber después quién relajó
qué ni cuándo.

## Orden de aplicación de las migraciones nuevas

`20260817120000_public_deck_rpcs.sql` es **aditiva** y se puede aplicar en cualquier momento: solo
crea funciones.

`20260818090000_restrict_signup_domain.sql` (hook de dominio del login con Google) y
`20260818100000_created_by_seam.sql` (columna `created_by`) también son **aditivas**. La primera no
hace nada hasta registrarla en Authentication → Hooks; la segunda añade columnas con `default
auth.uid()` y no cambia ninguna política — nadie filtra por ese dato todavía.

`20260915212500_create_design_systems.sql` (DSMak_r) es **aditiva**: crea `design_systems` con su
RLS y no toca ninguna tabla existente.

`20260928100000_forms_slug_unique.sql` (la slug de FormMak_r pasa a ser URL pública) es **aditiva**
y se puede aplicar en caliente: añade un índice único parcial sobre `forms.slug` y un trigger. La
app ya comprueba la unicidad antes de escribir, así que el índice es la garantía dura, no la
primera línea de defensa — el código funciona igual antes y después de aplicarla. **Si hubiera
slugs duplicadas en la tabla, el índice fallará al crearse**: resolverlas primero.

`20261001100000_images_bank.sql` (IMG_r) es **aditiva** y ya está aplicada: el 1 de octubre de 2026,
registrada en remoto como `20261001131350 images_bank`. Añade columnas a `images` con `name` todavía
nullable, las funciones `image_uses` y `team_member_names`, y los límites del bucket `deck-images`
(25 MB; JPEG, PNG y WebP). El código anterior sigue funcionando con ella.

`20261001100100_images_name_not_null.sql` (IMG_r) es **restrictiva**: vuelve a rellenar `name` y lo
pone `not null`. El popup de imágenes del código anterior inserta sin `name`, así que se aplica
**después** de que esté desplegado IMG_r. Aplicarla antes rompe la subida desde DeckMak_r y
FormMak_r; una vez aplicada, ya no se puede volver al código anterior.

`20261002120000_images_ai.sql` (IMG_r, fase 2) es **aditiva** y se puede aplicar en cualquier momento:
seis columnas nulas en `images` (estilo y prompt de la edición) y dos funciones nuevas para la cuota de
«Editar con IA», `peek_rate_limit` y `refund_rate_limit`, que solo aceptan la cuota de quien llama. No toca
filas, columnas ni funciones existentes.

`20261003100000_images_edit_model.sql` (IMG_r, fase 2) es **aditiva**: una columna nula en `images` con el
modelo que hizo cada edición.

`20261003100100_purge_keeps_monthly.sql` **no es aditiva**: cambia `purge_rate_limits()`, que dejaba vaciar
la cuota mensual de «Editar con IA» y la podía ejecutar `anon`. Ahora guarda tres meses las claves
`imgr-edit:` y solo la ejecuta la clave de servicio. No borra datos y nadie la llamaba; se deshace con la
definición y los permisos de `20260817130000_rate_limits.sql`.

`20260817121000_tighten_rls.sql` y `20260817122000_tighten_storage.sql` son **restrictivas** y
rompen el código que había antes. Se aplican **después** de que esté desplegado el commit que
migra los handlers a `supabaseAuthServer()` y el visor público a las RPC. Aplicarlas antes deja
`brand.interactius.com` sin galería, sin editor y sin visor hasta que el despliegue termine.
