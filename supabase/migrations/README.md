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

`20260817121000_tighten_rls.sql` y `20260817122000_tighten_storage.sql` son **restrictivas** y
rompen el código que había antes. Se aplican **después** de que esté desplegado el commit que
migra los handlers a `supabaseAuthServer()` y el visor público a las RPC. Aplicarlas antes deja
`brand.interactius.com` sin galería, sin editor y sin visor hasta que el despliegue termine.
