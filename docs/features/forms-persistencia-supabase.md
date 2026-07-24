# Interactius Forms (MVP) — implementación

> Herramienta interna para **definir cuestionarios en Markdown** (versionados en el repo), **publicarlos
> como páginas privadas** bajo `brand.interactius.com/forms/f/{id}` con el branding de Interactius, y
> **recoger respuestas** en Supabase.

Basado en el PRD "Interactius Forms (MVP) v1.0" (Carlos Ruiz, 23-07-2026). Integrado como **Opción A**:
rutas dentro del proyecto Next.js existente (App Router).

## Contexto y decisiones

- **Opción A** (rutas dentro de este repo). Verificado: Next.js 15 App Router, deploy Netlify.
- **Insert con anon key desde el servidor** + RLS insert-only (sin service-role para el envío).
- **Export CSV en el MVP**, protegido por el **login de equipo del Deck Maker** (`requireUser`); lee
  como usuario **`authenticated`** (la sesión del deck) — no hace falta service-role.
- Firma **"by Interactius" en el hero**, junto al logo del cliente (no lo sustituye).
- **Supabase: se reutiliza el proyecto del Deck Maker** (`brand-guidelines`), NO uno dedicado. El PRD
  (§17) pedía proyecto aislado por la PII de clientes; se descartó porque la org estaba en el **límite
  de 2 proyectos free**. Decisión tomada con conocimiento del tradeoff (las respuestas comparten BD con
  los decks). El aislamiento real lo da la **RLS estricta** de `responses` (ver abajo): nadie puede
  leerlas desde el cliente, ni siquiera con la anon key. Migrar a proyecto dedicado en el futuro solo
  requiere reintroducir un cliente propio (había uno en `lib/forms/supabase.ts`, ver historial de git).

## Arquitectura (archivos)

| Área | Archivo |
|---|---|
| Esquema + Zod + validador de payload | [lib/forms/schema.ts](../../lib/forms/schema.ts) |
| Parser (gray-matter + hash de versión) | [lib/forms/parse.ts](../../lib/forms/parse.ts) |
| Registro `id → form` | [lib/forms/registry.ts](../../lib/forms/registry.ts) |
| Clientes Supabase | reutiliza [lib/supabase/server.ts](../../lib/supabase/server.ts): `supabaseServer()` (anon, insert) y `supabaseAuthServer()` (sesión de equipo, lectura del export) |
| Página pública (RSC) | [app/forms/f/[id]/page.tsx](../../app/forms/f/[id]/page.tsx) |
| Endpoint de envío | [app/forms/api/submit/route.ts](../../app/forms/api/submit/route.ts) |
| Export CSV (team-gated) | [app/forms/api/export/route.ts](../../app/forms/api/export/route.ts) |
| 404 del segmento | [app/forms/not-found.tsx](../../app/forms/not-found.tsx) |
| Componentes | [components/forms/](../../components/forms/) (`HeroPanel`, `FormRenderer`, `fields/FieldControl`, `SuccessPanel`, `Md`, `forms.css`) |
| Contenido (fuente de verdad de cada form) | [content/forms/](../../content/forms/) |
| Assets de cliente | `public/forms/assets/<cliente>/` |

- **Middleware**: rama `/forms` en [middleware.ts](../../middleware.ts) — salta next-intl y la auth del deck
  para las páginas públicas; `/forms/api/export` refresca la sesión de equipo (el 401 lo aplica
  `requireUser` en el handler); añade `X-Robots-Tag: noindex` a las páginas públicas.
- **Marca**: `forms.css` está scopeado en `.ix-forms`, usa los `clamp()` de `lib/typeScale.ts` y las
  CSS vars `--c-*` de `globals.css`. Al cambiar un color de marca, contrastar aquí (igual que `deck.css`).

## Modelo de datos (tabla `responses`, en el proyecto del deck)

Solo viven **respuestas** (los formularios son `.md` en el repo). El repo no tiene `supabase/migrations/`;
el esquema se gestiona por-docs y se aplica en el dashboard/MCP. **Migración ya aplicada** al proyecto
`brand-guidelines` (`forms_responses`):

```sql
create table public.responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      text not null,            -- id opaco del formulario (frontmatter)
  form_slug    text,                     -- nombre legible del formulario
  form_version text,                     -- hash del .md en el momento del envío
  answers      jsonb not null,           -- { fieldName: value, ... }
  meta         jsonb default '{}'::jsonb,-- user_agent, referer, locale (sin PII innecesaria; sin IP)
  created_at   timestamptz not null default now()
);

create index responses_form_id_idx on public.responses (form_id);
create index responses_created_at_idx on public.responses (created_at desc);

-- RLS estricta: anon SOLO INSERT; los miembros de equipo (authenticated) LEEN para el export.
-- Nadie puede SELECT desde el cliente con la anon key (verificado: devuelve []).
alter table public.responses enable row level security;

create policy "anon can insert responses"
  on public.responses for insert to anon with check (true);

create policy "authenticated can read responses"
  on public.responses for select to authenticated using (true);
```

## Variables de entorno

**Ninguna nueva.** Reutiliza las del deck ya presentes en `.env.local` y Netlify:
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. El insert va con la anon key desde el
servidor; el export lee con la sesión de equipo (`supabaseAuthServer`).

## Formato Markdown

Frontmatter (metadatos + branding + `fields`) + cuerpo Markdown como intro. Tipos de campo (15):
`text, email, number, tel, url, textarea, radio, checkbox, ranking, select, boolean, scale, date,
section, content`. `options` admite forma corta (`"Sí"`) o larga (`{ value, label }`). `accent`:
`opal | bordeaux | emerald`.

- **`ranking`** (extensión sobre los 14 del PRD): dada una `options[]` (mín. 2), el usuario ordena
  todos los items de arriba a abajo (arrastrar en desktop + botones ↑/↓ accesibles). Guarda un
  `string[]` con los valores en el orden elegido. El valor es **siempre una permutación completa** de
  las opciones — `normalizeAnswers` descarta valores desconocidos, deduplica y añade los que falten en
  orden declarado, así que es a prueba de manipulación.
Ejemplo de referencia: [content/forms/prework-taller-acme.md](../../content/forms/prework-taller-acme.md).

Nota de marca: `*x*` (énfasis Markdown) se renderiza **sin cursiva** (regla dura, `globals.css`
neutraliza `<em>`). Para enfatizar, usar **negrita**.

## Privacidad (§12 PRD)

- `noindex,nofollow` por metadata + `X-Robots-Tag` (middleware). No se crean `robots.txt`/`sitemap`
  (no existen y un robots que liste `/forms/` solo delataría el prefijo).
- URL opaca (`id` de alta entropía), no enumerable.
- RLS insert-only: nadie lee respuestas desde el cliente.
- Anti-abuso MVP: honeypot + límite de tamaño de payload. **Rate-limit por IP no es fiable en
  funciones stateless de Netlify** sin estado compartido → best-effort; endurecer en Fase 2.
- Sin auth para responder (riesgo aceptado y documentado): quien tenga el enlace, entra.

## Fase 2 (fuera del MVP)

Panel de administración, subida de assets por interfaz, visor/dashboard de respuestas, distribución,
autenticación del formulario, lógica condicional, multi-idioma, rate-limit robusto.
