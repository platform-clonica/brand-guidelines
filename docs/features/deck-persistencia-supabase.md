# Persistencia de presentaciones (Deck Maker) — plan de implementación

> Convertir el generador de presentaciones de una herramienta sin estado a una app con
> **persistencia en Supabase y CRUD completo** (crear, histórico, abrir, duplicar, eliminar),
> **sacándola fuera** del chrome de la Brand Guide a su propia pestaña.

## Contexto

Hoy el Deck Maker ([DeckStudio.tsx](../../components/deck/DeckStudio.tsx)) vive dentro de `/[locale]/presentaciones`, **embebido en el layout de la guía de marca** (Sidebar + MobileHeader + MenuOverlay, ver [layout.tsx](../../app/[locale]/layout.tsx)) y **no persiste nada**: el `.md` solo existe en el estado de React o, al compartir, en la URL base64. Se quiere:

1. Persistir los decks en **Supabase** con CRUD: **Crear**, **Histórico (Abrir ▾)**, **Abrir** (con aviso de cambios sin guardar), **Duplicar**, **Eliminar**.
2. Una **barra de cabecera** nueva: `Nueva` · `Abrir ▾` · *título/ID editable* · `Guardar` · `Revisar Tono` · `Descargar ▾` / `Compartir ▾`.
3. **Sacar el Deck Maker fuera** de la guía: el menú de la Brand Guide deja solo un **enlace que abre el tool en una pestaña nueva**, sin sidebar ni chrome de marca.

Referencia de UI: wireframes lo-fi aportados (pantallas General, popups Crear/Editar/Duplicar, menú Abrir, aviso "sin guardar").

### Decisiones tomadas
- **Sin login en esta fase** (MVP abierto por URL). La API CRUD queda pública → se anota como deuda de seguridad a cerrar después (encaja con el [plan de login](presentaciones-login-acceso.md)).
- **Tabla `clients`**: el desplegable "Cliente" se alimenta de ella; al elegir cliente, prerellena logo y emails por defecto.
- **Logo (SVG): subida a Supabase Storage**.
- **Eliminar**: acción por fila en el desplegable **"Abrir"**, con confirmación.

### Restricción de diseño (innegociable)
- **Se mantiene el diseño visual exactamente como está.** Esta funcionalidad es de datos/flujos; **no** rediseña la interfaz.
- **Se reutiliza el sistema de estilos al 100% respetando el UI Kit** de la Brand Guide: tokens y variables existentes (colores `--c-*` / clases `dark`, `warm-light`, `warm-dark`, `ash`; tipografías `var(--font-ibm-plex-mono/serif)`; easing `expo`/`--ease`; reglas como *sin cursivas*), definidos en [tailwind.config.ts](../../tailwind.config.ts), [globals.css](../../app/globals.css) y los estilos del propio deck ([deck.css](../../components/deck/deck.css)).
- Los **nuevos elementos de UI** (barra `DeckToolbar`, popups, menú "Abrir", confirmaciones) se construyen con **los mismos estilos ya presentes en DeckStudio** (`btn`, `btnGhost`, `seg`/`segOn`, paneles mono sobre `#F5F2ED`) y los primitivos existentes (`CopyButton`, `Toast`, etc.). **Cero CSS nuevo de marca**; solo composición de lo que ya hay. Si un patrón no existe (p. ej. un modal), se estiliza con los mismos tokens/variables, sin introducir colores, fuentes ni medidas ajenas al UI Kit.
- El render del deck (layouts, `DeckRenderer`, `Chrome`) **no se toca** visualmente.

## Alcance

**Incluye:** modelo de datos + Storage, API CRUD de decks y clientes, refactor de DeckStudio (barra + popups + estado dirty), ruta standalone fuera del chrome, enlace en el menú a pestaña nueva.

**No incluye (fases siguientes):** login del editor, acceso del cliente con login y firma (planes ya escritos), analítica de visionado, versionado/histórico de cambios de un mismo deck.

---

## Arquitectura

### 1. Base de datos (Supabase, proyecto en la org Interactius, región UE)

**Tabla `clients`**
| campo | tipo | notas |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `name` | text | nombre mostrado en el desplegable |
| `default_logo_path` | text null | ruta en Storage del logo por defecto |
| `default_emails` | text[] null | emails de contacto por defecto |
| `created_at` | timestamptz | `now()` |

**Tabla `decks`**
| campo | tipo | notas |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `commercial_id` | text | "ID Comercial" (ej. `04826-QUALITAHUB-BR…`), es el título del header |
| `client_id` | uuid null fk → clients | cliente asociado |
| `contact_emails` | text[] | emails de contacto (input separado por comas → array) |
| `logo_path` | text null | logo del deck en Storage |
| `budget_url` | text null | "URL Presupuesto" |
| `type` | text | `comercial` \| `informe` \| `generica` (default `comercial`) |
| `md` | text | contenido Markdown |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | trigger a `now()` en update |

- **RLS:** en MVP abierto, política permisiva (o RLS desactivada) usando la **anon key**; dejar las tablas listas para endurecer con `auth.uid()` cuando llegue el login. Documentar explícitamente que es temporal.
- **Storage:** bucket `deck-assets` para logos SVG (público de lectura para mostrarlos en el deck).

### 2. Ruta standalone (sacar fuera del chrome)

- Nueva ruta **fuera de `[locale]`**: `app/deck/page.tsx` + `app/deck/layout.tsx` mínimo (sin Sidebar/MobileHeader/MenuOverlay). El tool es **solo en español** y no necesita next-intl.
- **Middleware:** excluir `deck` del matcher de i18n en [middleware.ts](../../middleware.ts) (igual que `api`, `llms.txt`) para que no redirija a `/es/deck`.
- **Menú de la Brand Guide:** en [Sidebar.tsx](../../components/chrome/Sidebar.tsx) (y su equivalente en [MenuOverlay.tsx](../../components/chrome/MenuOverlay.tsx)) el item "Presentaciones" pasa de `<Link href="/presentaciones">` a `<a href="/deck" target="_blank" rel="noopener noreferrer">` (abre pestaña nueva).
- Retirar/redirigir `app/[locale]/presentaciones/page.tsx`. El enlace de viewer compartido (`#view=...`) pasa a vivir en `/deck` (DeckStudio ya soporta el modo viewer; solo cambia la ruta base).

### 3. API (Route Handlers, serverless en Netlify)

Cliente Supabase de servidor en `lib/supabase/server.ts` (anon key en MVP). Endpoints en `app/api/decks/` y `app/api/clients/`:

| Método · ruta | Acción |
|---|---|
| `GET /api/decks` | Histórico: lista `{id, commercial_id, client, created_at, updated_at}` (orden por `updated_at` desc). |
| `POST /api/decks` | Crear: recibe metadata + `md` inicial (plantilla SAMPLE) → devuelve el deck creado. |
| `GET /api/decks/:id` | Abrir: deck completo (`md` + metadata). |
| `PATCH /api/decks/:id` | Guardar (botón Guardar y popup Editar): actualiza `md` y/o metadata. |
| `DELETE /api/decks/:id` | Eliminar. |
| `GET /api/clients` | Lista de clientes para el desplegable. |
| `POST /api/clients` | Alta rápida de cliente nuevo desde el popup Crear (si se escribe uno que no existe). |
| `POST /api/decks/:id/logo` (o subida directa a Storage) | Subir logo SVG. |

Duplicar se resuelve en cliente: `GET /api/decks/:id` → `POST /api/decks` con `commercial_id` + " Copy" y mismo `md`/metadata (lo que muestra el popup "Duplicar Deck").

### 4. Frontend — refactor de DeckStudio

DeckStudio gana estado y se divide en piezas. Estado nuevo: `currentDeckId`, `meta` (commercial_id, client, emails, logo, budget_url, type), `savedSnapshot` (para `dirty`), lista de decks, y control de modales.

**Barra de cabecera nueva** (`components/deck/DeckToolbar.tsx`):
- **`Nueva`** → modal **NewDeckModal** (ID Comercial, Cliente desplegable, Email contacto, Logo SVG, URL Presupuesto) → `POST /api/decks` → carga editor con plantilla y fija `currentDeckId`.
- **`Abrir ▾`** → **OpenMenu**: `GET /api/decks`, lista con fecha y **acción eliminar por fila** (con **DeleteConfirm**). Al elegir un deck, si `dirty` → **UnsavedGuardModal** ("No has guardado cambios. ¿Quieres continuar?") → `GET /api/decks/:id` y carga.
- **Título/ID** (click) → **EditDeckModal** (commercial_id, client, emails, logo) → `PATCH /api/decks/:id`.
- **`Guardar`** → `PATCH /api/decks/:id` con `md` + metadata; actualiza `savedSnapshot` (limpia `dirty`).
- **`Revisar Tono`** → muestra/oculta el panel `ToneReport` (hoy siempre visible; pasa a togglable).
- **`Descargar ▾`** → PDF (`window.print()`, ya existe). **`Compartir ▾`** → "Copiar URL" base64 (ya existe); preparado para el enlace seguro de los planes de login/firma.

**Panel izquierdo:** se mantiene el `textarea` de Markdown + `Generar`. El selector de tipo (comercial/informe/genérica) pasa a ser **metadata del deck** (se fija en Crear/Editar) en vez del segmented control siempre visible.

**`dirty` tracking:** comparar `md`+metadata actuales contra `savedSnapshot`; condiciona el aviso al Abrir/Nueva.

**Modales (componentes nuevos):** `NewDeckModal`, `EditDeckModal`, `DuplicateDeckModal`, `OpenMenu`, `UnsavedGuardModal`, `DeleteConfirm`. Reutilizan el sistema de estilos existente (mono, dark/warm-light).

---

## Archivos

**Nuevos**
- `lib/supabase/server.ts`, `lib/supabase/client.ts` — clientes Supabase.
- `lib/decks/api.ts` — wrappers fetch del CRUD (cliente).
- `app/api/decks/route.ts`, `app/api/decks/[id]/route.ts`, `app/api/clients/route.ts` — Route Handlers.
- `app/deck/layout.tsx`, `app/deck/page.tsx` — ruta standalone sin chrome.
- `components/deck/DeckToolbar.tsx` + modales (`NewDeckModal`, `EditDeckModal`, `DuplicateDeckModal`, `OpenMenu`, `UnsavedGuardModal`, `DeleteConfirm`).
- Migración SQL Supabase (tablas + bucket + políticas MVP).

**Modificados**
- [DeckStudio.tsx](../../components/deck/DeckStudio.tsx) — integra toolbar, estado de persistencia y modales.
- [Sidebar.tsx](../../components/chrome/Sidebar.tsx) y [MenuOverlay.tsx](../../components/chrome/MenuOverlay.tsx) — enlace "Presentaciones" → `/deck` en pestaña nueva.
- [middleware.ts](../../middleware.ts) — excluir `deck` del i18n.
- `app/[locale]/presentaciones/page.tsx` — eliminar o redirigir a `/deck`.
- `package.json` — `@supabase/supabase-js`; `.env.local` / Netlify env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Riesgos / notas
- **API pública en el MVP**: cualquiera con la URL puede crear/editar/borrar. Aceptado para esta fase; cerrar con el login del equipo cuanto antes (dejar tablas/políticas preparadas).
- **Refactor grande de DeckStudio**: hoy es un único componente con estado simple; conviene extraer toolbar/modales y, si crece, mover el estado a un store Zustand (ya es dependencia).
- **Coherencia de rutas** con los planes de login/firma: unificar en `/deck` (editor) y decidir la ruta del viewer del cliente (`/deck/v/<id>`).
- **Subida de SVG**: validar tipo/size; SVG conlleva riesgo XSS si se inyecta inline — preferir servirlo como `<img src>` desde Storage, no inline.

## Quién creó cada pieza — `created_by` (2026-08-18)

`decks`, `clients`, `images` y `forms` tienen una columna `created_by uuid references auth.users(id)`
con `default auth.uid()` y `on delete set null`
(`supabase/migrations/20260818100000_created_by_seam.sql`).

**No filtra nada.** Las políticas siguen siendo `for all to authenticated using (true)`: dentro del
workspace se sigue viendo y editando todo. La columna solo guarda el dato, que hasta ahora se
tiraba.

Se rellena sola, sin tocar los handlers, porque los seis de editor insertan con
`supabaseAuthServer()` —la sesión del usuario— y no con la clave anónima. Esa regla está escrita en
`lib/supabase/server.ts:16-27`.

Se añadió el mismo día que el login con Google, y a propósito: hasta entonces había **una sola
cuenta compartida**, así que el backfill de las 12 propuestas, 14 clientes, 44 imágenes y 1
formulario existentes era exacto. Con varias personas ya no se habría podido reconstruir — quién
creó qué no estaba en la base de datos, ni en git, ni en ningún log.

`signatures` y `responses` quedan fuera a propósito: quien firma una propuesta o responde un
formulario es un cliente sin cuenta.

Es el prerrequisito de los permisos que se decidieron ese día y todavía no existen — ver
[el plan](../superpowers/plans/2026-08-18-login-google-workspace.md) §Permisos.

## Fases de implementación (orden metódico)
1. **Supabase**: crear proyecto/tablas (`clients`, `decks`), bucket `deck-assets`, políticas MVP; variables de entorno.
2. **Capa de datos**: `lib/supabase/*` + Route Handlers CRUD (`/api/decks`, `/api/clients`) + `lib/decks/api.ts`. Probar con `curl`.
3. **Standalone**: ruta `/deck` sin chrome + exclusión en middleware + enlace en Sidebar/MenuOverlay a pestaña nueva.
4. **Toolbar + Guardar/Abrir**: barra nueva, cargar/guardar deck, `dirty` tracking y aviso "sin guardar".
5. **Crear / Editar / Duplicar / Eliminar**: los cuatro modales y la lista "Abrir" con borrado.
6. **Clientes y logo**: desplegable desde `clients` con prerelleno + subida de logo a Storage.
7. **Limpieza**: retirar `/[locale]/presentaciones`, ajustar el flujo de "Compartir/Descargar".

## Verificación
1. Migración aplicada: `clients` y `decks` existen; bucket creado. `npm run dev`.
2. Abrir la guía → el menú "Presentaciones" abre **pestaña nueva** en `/deck` **sin** sidebar de marca.
3. **Crear**: `Nueva` → rellenar popup → aparece el deck en el editor y una fila en `decks` (Supabase).
4. **Guardar**: editar el `md`, `Guardar` → `updated_at` cambia; recargar la página y reabrir → persiste.
5. **Abrir** con cambios sin guardar → aparece el aviso; al aceptar carga el otro deck.
6. **Duplicar**: genera un nuevo registro con sufijo "Copy".
7. **Eliminar** desde "Abrir" → confirmación → desaparece de la lista y de la BD.
8. **Cliente/logo**: el desplegable lista clientes; al elegir prerellena; el logo subido se ve en el deck.
9. `npm run type-check` y `npm run test` en verde.
