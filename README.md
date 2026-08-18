# Interactius · Brand Guidelines 2026

Manual de marca **vivo y _AI-ready_** de Interactius. Una sola fuente de verdad (escrita en TypeScript) alimenta a la vez:

- un **sitio web multilingüe** (ES · EN · CA) que documenta logo, color, tipografía, movimiento, tono verbal y aplicaciones;
- una **API pública de marca** (`/api/brand.json`, `/llms.txt`) pensada para que modelos de lenguaje "lean y apliquen" la marca;
- un **validador de tono** (`/api/eval`) que puntúa copy contra las reglas de voz;
- un **generador de presentaciones** que convierte Markdown en decks comerciales 16:9 listos para imprimir a PDF.

> **Stack:** Next.js 15 · React 19 · TypeScript · Tailwind CSS · next-intl · Zustand · Framer Motion
> **Deploy:** Netlify → <https://brand.interactius.com>

---

## Tabla de contenidos

- [Inicio rápido](#inicio-rápido)
- [Qué hace el proyecto](#qué-hace-el-proyecto)
- [Arquitectura en una pantalla](#arquitectura-en-una-pantalla)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Fuente de verdad (`lib/tokens.ts`)](#fuente-de-verdad-libtokensts)
- [Internacionalización](#internacionalización)
- [Endpoints públicos](#endpoints-públicos)
- [Generador de presentaciones](#generador-de-presentaciones)
- [Generación de assets (kits y formas)](#generación-de-assets-kits-y-formas)
- [Despliegue](#despliegue)
- [Acceso al workspace](#acceso-al-workspace)
- [Documentación ampliada](#documentación-ampliada)

---

## Inicio rápido

Requisitos: **Node 18+** (probado con Node 24) y npm.

```bash
npm install                    # instalar dependencias
cp .env.example .env.local     # y rellenar las dos variables de Supabase
npm run dev                    # servidor de desarrollo en http://localhost:3000
```

**`.env.local` no es opcional.** Sin `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
el área `/workspace` responde 500: el middleware crea el cliente de Supabase en cada petición y
`lib/supabase/server.ts` lanza si faltan. El manual público y `/timer` sí funcionan sin ellas.
`ANTHROPIC_API_KEY` solo hace falta para traducir decks y para ReWrit_r; `.env.example` explica
cada variable.

Comprobaciones de salud:

```bash
npm run type-check # TypeScript sin emitir
npm run lint       # ESLint (config plana, preset de Next.js)
npm run test       # 235 tests de lib/ (node:test, sin framework)
npm run build      # build de producción
```

Las cuatro corren en CI (`.github/workflows/ci.yml`) en cada PR y en cada push a `main`.

---

## Qué hace el proyecto

El proyecto tiene **dos productos** que comparten el mismo sistema de marca:

### 1. Manual de marca (`/[locale]`)

Una página de scroll continuo con **15 secciones** documentadas, navegables desde el sidebar (desktop) o el menú overlay (móvil):

| # | Sección | Documenta |
|---|---------|-----------|
| 01 | Introducción | Logo, tagline y presentación de la marca |
| 02 | Tono de marca | Principio de voz, 4 ejes, vocabulario prohibido, reglas de puntuación |
| 03 | Concepto | Construcción del logotipo y función fonética del macrón (`interactīus`) |
| 04 | Logo | Versiones positiva/negativa, vertical e isotipo |
| 05 | Área de reserva | Clear space mínimo alrededor del logo |
| 06 | Tamaño mínimo | 10 mm (impresión) · 20 px (digital) |
| 07 | Usos incorrectos | 8 reglas de qué **no** hacer con el logo |
| 08 | Tipografía | IBM Plex Mono (marca) + IBM Plex Serif (contraste) |
| 09 | Sistema de texto | Escala tipográfica fluida de 7 niveles |
| 10 | Color | 7 colores base + 3 de acento (por servicio), con HEX/RGB/CMYK |
| 11 | Universo visual | Dirección de fotografía liminal + prompt de imagen |
| 12 | Sistema gráfico | 3 formas SVG asociadas a los servicios |
| 13 | Aplicaciones | Mockups de móvil, tarjetas, redes sociales |
| 14 | Movimiento | 3 curvas de easing + 6 duraciones canónicas |
| 15 | Manual para IA | Cómo cargar la marca en un LLM (llms.txt, brand.json, prompt maestro) |

### 2. Generador de presentaciones (`/workspace/deckmak_r`)

Un editor (**DeckStudio**) que compila **Markdown → deck de diapositivas** de forma totalmente determinista (sin IA en runtime). Detecta automáticamente el tipo de cada slide, inyecta páginas comerciales de marca, audita el tono del texto y permite exportar a PDF o compartir por URL. Ver [Generador de presentaciones](#generador-de-presentaciones).

### 3. Capa _AI-ready_

Todo el manual se publica además en formatos legibles por máquina para que cualquier LLM (Claude Projects, NotebookLM, GPTs, RAG propios) pueda ingerir la marca y generar contenido conforme. Ver [Endpoints públicos](#endpoints-públicos).

---

## Arquitectura en una pantalla

```
                       lib/tokens.ts  ← FUENTE DE VERDAD ÚNICA
          (colores · tipografía · voz · vocabulario · ejemplos · marca)
                              │
        ┌─────────────────────┼──────────────────────────┐
        │                     │                          │
        ▼                     ▼                          ▼
  Sitio web (UI)        /api/brand.json            /llms.txt
  components/sections    JSON tipado (máquina)     Markdown (LLM)
  + i18n (ES/EN/CA)                                       │
                                                          ▼
                              lib/eval.ts ──► /api/eval (valida copy)
                                    │
                                    └──► ToneReport del generador de decks

  lib/deck/*  ──►  parse → classify → compile → render  ──►  DeckStudio (PDF / URL)
```

- **`lib/tokens.ts`** es el _single source of truth_. Cambias un color o una regla ahí y se propaga al sitio, a la API, a `/llms.txt`, a los prompts y a los kits exportables.
- Las **APIs** (`/api/brand.json`, `/llms.txt`) son estáticas y cacheadas; el **validador** (`/api/eval`) es dinámico.
- El **generador de decks** es un módulo aparte (`lib/deck/`) con su propio pipeline determinista y suite de tests.

---

## Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Desarrollo | `npm run dev` | Servidor Next.js con HMR en `:3000` |
| Build | `npm run build` | Build de producción a `.next/` |
| Start | `npm run start` | Sirve el build de producción |
| Type-check | `npm run type-check` | `tsc --noEmit` |
| Lint | `npm run lint` | ESLint (`eslint-config-next`) |
| Test | `npm run test` | Tests del deck con `node --test` (TS nativo) |
| AI-Kit | `npm run build:ai-kit` | Genera `public/AI-Kit.zip` (**requiere `npm run dev` activo**) |

Generación manual de las formas del sistema gráfico (no está en `package.json`):

```bash
node scripts/generate-shapes.mjs   # → public/sistema-grafico/shape-*.svg
```

---

## Estructura del repositorio

```
app/
  layout.tsx                 Root layout: fuentes (IBM Plex), metadata, OpenGraph
  globals.css                Variables CSS de marca, reset, hover-wipe, toast
  [locale]/
    layout.tsx               Provider i18n + Sidebar + MobileHeader + MenuOverlay
    page.tsx                 Las 15 secciones en secuencia
  workspace/                 Área interna, con acceso por cuenta de Google (ver más abajo)
    page.tsx                 Lanzador de herramientas
    deckmak_r/               Generador de presentaciones
    formmak_r/               Editor de formularios
    rewrit_r/                Reescritura de textos con la voz de marca
  deck/[id]/view/            Visor PÚBLICO de una propuesta guardada + su imagen social
  forms/f/[id]/              Formulario público
  timer/                     Temporizador de sesiones, público
  api/
    brand.json/route.ts      GET → tokens de marca en JSON
    eval/route.ts            GET (docs) · POST (valida copy)
    eval/manual/route.ts     GET → audita todos los mensajes i18n
  llms.txt/route.ts          GET → manual completo en Markdown para LLMs

components/
  sections/                  Una sección de marca por archivo (SectionXxx.tsx)
  brand/                     Piezas visuales: LogoStage, ColorSwatch, EasingDemo…
  chrome/                    Navegación: Sidebar, MenuOverlay, MobileHeader, LocaleSwitch
  ui/                        Primitivos: CopyButton, DownloadButton, Toast…
  deck/                      Editor, renderer y 17 layouts del generador de decks

lib/
  tokens.ts                  ★ Fuente de verdad: color, tipografía, voz, ejemplos
  typeScale.ts               Escala tipográfica fluida (7 niveles)
  motion.ts                  Easings + duraciones
  graphics.ts                Formas del sistema gráfico (3 servicios)
  prompts.ts                 getTonePrompt / getImagePrompt / getMasterPrompt
  llms.ts                    buildLlmsMarkdown() → contenido de /llms.txt
  eval.ts                    evalText(): motor de validación de tono
  sections.ts                Catálogo de las 15 secciones (índice de navegación)
  i18n/                      Routing y carga de mensajes (next-intl)
  store/ · hooks/            Estado del menú (Zustand) y scroll a sección
  deck/                      Pipeline del generador: parse, classify, blocks, theme…

messages/                    Traducciones: es.json · en.json · ca.json
public/                      Logos, formas, mockups, PDF, AI-Kit.zip, Brand-Kit.zip
scripts/                     build-ai-kit.mjs · generate-shapes.mjs
docs/                        Documentación (ver más abajo)
```

---

## Fuente de verdad (`lib/tokens.ts`)

Toda la identidad vive en TypeScript tipado. Lo más importante:

- **Marca:** `name: 'Interactius'`, `wordmark: 'interactīus'`, `tagline: 'Actitud liminal'`, `version: 'v1'` (`2026-05`).
- **Color:** 7 base (`Dark #1C1A17`, `Warm Light #F5F2ED`, `Ash`…) + 3 de acento ligados a servicio:
  - **Opal** `#B0B5B0` → Pensamiento estratégico
  - **Bordeaux** `#99335F` → Diseño de experiencias
  - **Emerald** `#5999A6` → Transformación cultural
- **Tipografía:** IBM Plex Mono (400/500/600, marca) e IBM Plex Serif (300/400, contraste). **Sin cursivas** (regla forzada en `globals.css`).
- **Voz:** principio multilingüe + 4 ejes (directos·reflexivos, cercanos·profesionales, críticos·constructivos, sobrios·sugerentes).
- **Vocabulario prohibido:** lista roja (innovación, disruptivo, soluciones, holístico, empoderar…) con matriz de sustitución.
- **Reglas duras:** frases de **15–22 palabras**, prohibidos `!`/`¡` y `…`.
- **Ejemplos few-shot:** casos aprobados y rechazados con su justificación y reescritura.

Estos mismos tokens se exponen como tema de Tailwind en [tailwind.config.ts](tailwind.config.ts) y como variables CSS en [app/globals.css](app/globals.css).

---

## Internacionalización

Gestionada con **next-intl**:

- Locales: **`es`** (por defecto) · `en` · `ca`.
- Estrategia de prefijo `as-needed`: `/` es español, `/en` y `/ca` llevan prefijo.
- El [middleware.ts](middleware.ts) aplica el routing salvo en `/api/*`, `/llms.txt`, assets y `_next`.
- Los textos viven en [messages/](messages/) (`es.json`, `en.json`, `ca.json`), estructuralmente idénticos.

---

## Endpoints públicos

| Endpoint | Método | Qué devuelve | Caché |
|----------|--------|--------------|-------|
| [`/api/brand.json`](app/api/brand.json/route.ts) | GET | Todos los tokens de marca en JSON tipado (color, tipografía, voz, motion, logo, ejemplos, secciones) | 5 min |
| [`/llms.txt`](app/llms.txt/route.ts) | GET | El manual completo en Markdown plano, optimizado para ingesta por LLMs | 5 min |
| [`/api/eval`](app/api/eval/route.ts) | GET · POST | GET: documentación. POST `{text}`: puntúa el copy (0–100) y lista violaciones | sin caché |
| [`/api/eval/manual`](app/api/eval/manual/route.ts) | GET | Audita todos los strings i18n contra las reglas de tono | sin caché |

Ejemplo de validación de tono:

```bash
curl -s -X POST http://localhost:3000/api/eval \
  -H 'content-type: application/json' \
  -d '{"text":"Diseñamos soluciones innovadoras para empresas líderes."}'
# → score bajo + hardFail:true (usa vocabulario prohibido)
```

Detalle completo en [docs/API.md](docs/API.md).

---

## Generador de presentaciones

Disponible en `/workspace/deckmak_r`, detrás del acceso de equipo. Escribes Markdown a la izquierda y obtienes un deck 16:9 a la derecha. El pipeline es **`parse → classify → compile → render`**, 100 % determinista:

- **17 layouts** detectados automáticamente: portada, statement, bullets, columnas, split, gantt, presupuesto, roadmap por fases, contexto, el reto, objetivos, cierre, y páginas comerciales inyectadas (manifesto, equipo, clientes, aceptación).
- **Diagramas Gantt** y **tablas de presupuesto** con autosuma, escritos en bloques de código.
- **Tono auditado** en vivo reutilizando `lib/eval.ts` (panel _ToneReport_).
- **Exportar a PDF** (`window.print()`, una diapositiva por página) o **Copiar URL** (deck codificado en base64url, sin servidor).

Sintaxis para autores en [docs/presentaciones-md-guia.md](docs/presentaciones-md-guia.md); arquitectura técnica en [docs/PRESENTACIONES.md](docs/PRESENTACIONES.md).

---

## Generación de assets (kits y formas)

- **`AI-Kit.zip`** — paquete para herramientas de IA (`llms.txt` + `brand.json` + logos + formas). Se regenera con `npm run build:ai-kit` (con el dev server activo) cada vez que cambian los tokens.
- **`Brand-Kit.zip`** — paquete para diseñadores (logos SVG/PNG, isotipos, favicons).
- **Formas del sistema gráfico** — `scripts/generate-shapes.mjs` genera por matemática pura los tres SVG (`shape-polygon`, `shape-ellipse`, `shape-wave`) con gradiente del color de acento al blanco cálido.

---

## Despliegue

Configurado para **Netlify** ([netlify.toml](netlify.toml)):

```toml
[build]
  command = "next build"
  publish = ".next"
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Producción: <https://brand.interactius.com>, desplegado desde `main`.

**Variables de entorno.** Las dos de Supabase son obligatorias para `/workspace`, `/forms` y el
visor de propuestas, y son públicas por diseño: viajan en el bundle del cliente, y `netlify.toml`
las excluye del escaneo de secretos por eso. `ANTHROPIC_API_KEY` y las tres de Resend son
server-only. Ver `.env.example`.

**El esquema de la base de datos vive en `supabase/migrations/`** y se cambia por PR, nunca desde
el panel. Ojo con el rollback: revertir un despliegue en Netlify **no** revierte el esquema.

---

## Acceso al workspace

Se entra con la **cuenta de Google de Interactius**. No hay contraseña, ni recuperación, ni panel de
alta: **la primera vez que alguien de `@interactius.com` entra, su usuario se crea solo**.

Tres capas garantizan que solo entre gente de la casa — el consent screen *Internal* del cliente
OAuth en Google Cloud, un hook `before-user-created` en Postgres, y `isTeamEmail()` en el gate del
middleware. Las dos primeras miran el alta; la tercera, cada petición.

> **La baja NO es automática.** Suspender a alguien en Google Admin **no le cierra la sesión**:
> Supabase no revalida contra Google y sus refresh tokens no caducan por defecto. Hay que borrar o
> banear su fila en **Supabase → Auth → Users**. Es el único paso manual que queda.

Dentro del workspace **no hay permisos**: quien entra lo ve todo. Las piezas guardan quién las creó
(`created_by`), pero ese dato todavía no filtra nada.

El detalle completo —configuración de Google Cloud y Supabase, y por qué el PKCE se cierra en el
servidor— está en
[docs/features/workspace-login-google.md](docs/features/workspace-login-google.md).

---

## Documentación ampliada

- [docs/features/workspace-login-google.md](docs/features/workspace-login-google.md) — el acceso al workspace: las tres capas, la configuración manual y por qué la baja no es automática.
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — arquitectura técnica completa, flujo de datos y convenciones.
- [docs/API.md](docs/API.md) — referencia de los endpoints `brand.json`, `llms.txt` y `eval`.
- [docs/PRESENTACIONES.md](docs/PRESENTACIONES.md) — interno del generador de decks (pipeline, layouts, tests).
- [docs/presentaciones-md-guia.md](docs/presentaciones-md-guia.md) — guía de sintaxis Markdown para autores de presentaciones.
