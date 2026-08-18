# Fase 0 · Inventario — brand.interactius.com

> Auditoría técnica. Estado: **Fase 0 cerrada**, solo lectura, nada modificado en el proyecto.
> Fecha de ejecución: 2026-08-17. Commit auditado: `6a1b1ff`, rama `main`, árbol limpio.

---

## 0 · Correcciones a la configuración de partida

Tres cosas de la configuración que me diste no cuadran con el repo. Las corrijo aquí y trabajo con
los valores reales.

| Campo | Lo que decía | Lo real | Consecuencia |
|---|---|---|---|
| Plataforma | Vercel | **Netlify** (`netlify.toml`, plugin `@netlify/plugin-nextjs`, sitio `brand.interactius.com`) | Cambia qué cabeceras inyecta la plataforma, cómo funciona la caché de borde y dónde están los logs. Lo audito como Netlify |
| `URL_LOCAL_PROD` | `http://localhost:3000` | Lo he levantado en **`http://localhost:3100`** | El 3000 estaba ocupado por `next dev`. Mezclarlos habría contaminado las medidas |
| `SUPABASE_LOCAL` | `no` | correcto, pero **el repo no tiene `supabase/`** | No hay migraciones versionadas contra las que auditar. Ver §4 |

Una nota de método: he parado `next dev` antes de compilar. Está documentado en `CLAUDE.md` que
construir con el servidor de desarrollo vivo corrompe `.next`, y ya pasó una vez en este repo.

---

## 1 · Mapa del repo

Monorepo no. Un solo paquete, `interactius-brandguidelines@0.1.0`, privado.

```
app/                     App Router puro (sin Pages Router, sin src/)
  [locale]/              manual de marca público, trilingüe (es · en · ca)
  api/                   14 route handlers
  deck/[id]/view/        visor público de presentaciones + opengraph-image
  forms/                 formularios públicos + sus dos APIs
  timer/                 herramienta suelta, pública
  workspace/             área interna con login (deckmak_r · formmak_r · rewrit_r)
components/              117 ficheros .tsx, 54 de ellos "use client"
lib/                     fuente de verdad + lógica de dominio + 6 carpetas de tests
messages/                es.json · en.json · ca.json (next-intl)
content/                 MDX de blog y fixtures de forms
public/                  14 MB de assets
docs/                    24 documentos, uno por feature
scripts/                 3 scripts (kit de IA, formas SVG, sync con `produccion`)
```

**Router:** App Router exclusivamente. `pageExtensions: ['ts','tsx','mdx']`.

**Dos remotos**, como avisa `CLAUDE.md`: `origin` (personal) y `produccion`
(`platform-clonica/brand-guidelines`, el que despliega Netlify).

---

## 2 · Stack real y versiones

Medido con `npm outdated` sobre el `node_modules` instalado, no sobre los rangos del
`package.json`.

| Pieza | Instalada | Última | Comentario |
|---|---|---|---|
| next | **15.5.18** | 16.3.1 | Un major por detrás |
| react / react-dom | 19.2.6 | 19.2.8 | Al día |
| typescript | 5.7.x | — | `strict: true`, `moduleResolution: bundler` |
| next-intl | **3.26.5** | 4.13.7 | Un major por detrás |
| @supabase/supabase-js | 2.110.5 | 2.112.3 | Al día |
| @supabase/ssr | 0.12.3 | 0.12.4 | Al día |
| @anthropic-ai/sdk | **0.102.0** | 0.117.1 | 15 minors por detrás |
| framer-motion | **11.18.2** | 13.1.0 | Dos majors por detrás |
| tailwindcss | 3.4.x | — | v3, conviviendo con CSS plano y estilos inline |
| zustand | 5.0.x | — | Solo para el estado del menú |
| zod | 4.4.x | — | Presente en dependencias |
| Node | 24 en local | — | El README pide 18+ |

Gestor de paquetes: **npm**, con `package-lock.json` versionado (331 KB).

Convivencia de sistemas de estilo: Tailwind v3, `app/globals.css` con tokens `--c-*`,
CSS plano por feature (`deck.css`, `forms.css`, `timer.css`) y estilos inline en el studio
(`components/deck/studio/ui.ts`). Cuatro capas.

---

## 3 · Superficie pública

Runtime: **todo Node**. No hay ni una ruta declarada como Edge.

### Páginas

| Ruta | Render | Auth | Notas |
|---|---|---|---|
| `/[locale]` (es·en·ca) | **SSG** | no | El manual. 245 KB de HTML, 46 KB comprimido |
| `/[locale]/lab` | **SSG** | no | 238 KB First Load JS, la ruta más pesada |
| `/timer` | Static | no | `X-Robots-Tag: noindex` desde el middleware |
| `/deck/[id]/view` | Dinámica | **no, público a propósito** | Visor de propuestas. La URL se manda a clientes |
| `/deck/[id]/view/opengraph-image` | Dinámica | no | Portada redibujada con satori |
| `/forms/f/[id]` | Dinámica | no | Formulario público |
| `/workspace` | Static | **sí** | Lanzador |
| `/workspace/deckmak_r` | Static | sí | + `/[id]` dinámica, 237 KB |
| `/workspace/formmak_r` | Static | sí | + `/[id]` dinámica, **265 KB, la más pesada de todas** |
| `/workspace/rewrit_r` | Static | sí | 108 KB |
| `/workspace/{login,callback}` | Dinámica | no (son la puerta) | `forgot` y `reset` se retiraron el 18/08 con el login de Google |
| `/workspace/logout` | Dinámica | sí | |

### API

| Ruta | Métodos | Gate | Cómo se protege |
|---|---|---|---|
| `/api/brand.json` | GET | **público** | `force-static`. Contrato de marca |
| `/llms.txt` | GET | **público** | `force-static`. Contrato de marca |
| `/api/sign` | POST | **público a propósito** | Sin auth. Valida tamaño (2 MB) y `data:image/` |
| `/forms/api/submit` | POST | **público a propósito** | Honeypot + validación de esquema + tope de 200 KB |
| `/forms/api/export` | GET | sesión | `requireUser()` **dentro del handler** |
| `/api/forms`, `/api/forms/[id]` | GET POST PUT DELETE | sesión | middleware **y** `requireUser()` |
| `/api/decks`, `/api/decks/[id]` | GET POST PUT DELETE | sesión | **solo middleware** |
| `/api/clients` | GET POST | sesión | **solo middleware** |
| `/api/images`, `/api/images/[id]`, `/api/images/[id]/usage` | varios | sesión | **solo middleware** |
| `/api/translate` | POST | sesión | **solo middleware**. Gasta cuota de Anthropic |
| `/api/rewrite` | POST | sesión | **solo middleware**. Gasta cuota de Anthropic |
| `/api/eval`, `/api/eval/manual` | POST GET | sesión | **solo middleware** |

Verificado con `curl` sin cookie contra el build local: `/api/decks`, `/api/clients`,
`/api/images`, `/api/rewrite` y `/api/eval` devuelven **401**. El gate funciona.

**Observación con consecuencias, para verificar en Fase 1.** El matcher del middleware es
`'/((?!_next|_vercel|.*\\..*).*)'`: excluye **cualquier ruta que contenga un punto**. Una petición
a `/api/decks/abc.json` no pasa por el middleware y llega al handler sin comprobación de sesión.
Lo he reproducido: devuelve `{"error":"invalid input syntax for type uuid: \"abc.json\""}` en vez
de 401, o sea, ejecutó la consulta. No es explotable con UUIDs reales (no llevan punto), pero
significa que la única defensa de seis endpoints es un matcher de expresión regular.

### Contrato de datos de marca

Los dos endpoints públicos, capturados con `curl -i` contra el build de producción local.

**`/api/brand.json`** — `force-static`, 53.580 bytes, `application/json`.

```
HTTP/1.1 200 OK
cache-control: public, max-age=300, s-maxage=300
content-type: application/json
```

Esquema de primer nivel: `brand`, `voice`, `colors`, `typography`, `typeScale`, `motion`,
`graphics`, `logo`, `prompts` (master y tone × 3 idiomas), `examples` (approved / rejected),
`sections`, `documents`. Se compone en `app/api/brand.json/route.ts` desde `lib/tokens.ts`,
`lib/sections.ts`, `lib/prompts.ts`, `lib/typeScale.ts`, `lib/motion.ts` y `lib/graphics.ts`.

**`/llms.txt`** — `force-static`, 30.158 bytes, `text/plain`, mismo `Cache-Control`.

Tres cosas que este contrato **no** tiene, y que condicionan a cualquier consumidor externo:

1. **Sin CORS.** No hay `Access-Control-Allow-Origin` en la respuesta ni preflight configurado.
   `OPTIONS` responde 204 con `allow: GET, HEAD, OPTIONS` y ninguna cabecera CORS. Un
   `fetch()` desde el navegador en otro origen falla. Solo sirve para consumidores de servidor.
   El README lo llama "API pública de marca": hoy es pública para servidores, no para navegadores.
2. **Sin versionado de esquema.** Hay `brand.version: "v2"` y `brand.versionDate`, pero describen
   la marca, no la forma del JSON. Renombrar una clave rompe a todo consumidor en silencio.
3. **Sin compresión en local.** Con `Accept-Encoding: gzip, br` se descargan los 53.580 bytes
   íntegros, mientras que `/` sí baja de 245 KB a 46 KB. `next start` no comprime las respuestas de
   los route handlers. En Netlify probablemente sí lo hace el CDN: **HIPÓTESIS**, no verificable
   desde local.

---

## 4 · Modelo de datos

Proyecto Supabase `gcvzzpggpsnlwqnotfqv`, consultado **en solo lectura**.

### Tablas (`public`)

| Tabla | Filas | RLS | Para qué |
|---|---|---|---|
| `decks` | 12 | activo | Propuestas comerciales, campo `md` con el Markdown |
| `clients` | 14 | activo | Clientes, con `default_emails` |
| `images` | 44 | activo | Galería de imágenes del deck |
| `signatures` | 1 | activo | Firmas de aceptación: nombre, email, PNG, **IP**, user-agent |
| `responses` | **10** | activo | Respuestas de formularios (`answers` jsonb) |
| `forms` | **1** (0 publicados) | activo | Formularios editables, `md` manda |

> **Corrección posterior (Fase 2).** Aquí puse 0 y 0 visibles. Ese era el recuento **con la clave
> anon**, a la que la RLS de las dos tablas le bloquea el SELECT — o sea, el cero era la prueba de
> que la política funciona, no el dato. Consultado con credenciales de lectura: `responses` tiene
> 10 filas y `forms` tiene 1, ninguna publicada. Los cuatro formularios que se sirven hoy salen de
> `content/forms/*.md`, no de la tabla.

Buckets de storage: `deck-assets` y `deck-images`.

### Políticas RLS — lo importante

RLS está **activo en todas las tablas** y el advisor de seguridad de Supabase no reporta ninguna
tabla desprotegida. El problema no es que falte RLS: es lo que dicen las políticas.

| Tabla | Política | Roles | Comando | `USING` / `WITH CHECK` |
|---|---|---|---|---|
| `decks` | `decks_open_mvp` | anon, authenticated | **ALL** | `true` / `true` |
| `clients` | `clients_open_mvp` | anon, authenticated | **ALL** | `true` / `true` |
| `images` | `images_open_mvp` | anon, authenticated | **ALL** | `true` / `true` |
| `signatures` | `MVP open read/insert` | **public** | SELECT, INSERT | `true` |
| `storage.objects` | `deck_{assets,images}_{insert,update,delete}_mvp` | anon, authenticated | INSERT UPDATE **DELETE** | por `bucket_id` |
| `responses` | dos políticas | anon INSERT · authenticated SELECT | correcto | |
| `forms` | dos políticas | anon SELECT solo `published` · authenticated ALL | correcto | |

El código lo dice de sí mismo, en `lib/supabase/server.ts:17`:

> *"Uses the public (anon) key with no session — RLS policies are permissive for now."*

**Comprobado empíricamente**, con la clave anon y sin sesión de equipo, contra el proyecto remoto
(solo `count`, ningún dato descargado ni impreso, ninguna escritura):

```
decks       HTTP 200   content-range: 0-0/12
clients     HTTP 200   content-range: 0-0/14
images      HTTP 200   content-range: 0-0/44
signatures  HTTP 200   content-range: 0-0/1
responses   HTTP 200   content-range: */0      ← la política bloquea, correcto
forms       HTTP 200   content-range: */0      ← la política bloquea, correcto
```

La clave anon viaja en el bundle del cliente **por diseño** (confirmado en `.next/static`, y
`netlify.toml` la excluye del escáner de secretos precisamente por eso). O sea: el 401 del
middleware protege la puerta de la aplicación mientras la puerta de la base de datos está abierta
al lado. `responses` y `forms` demuestran que el equipo ya sabe escribir políticas correctas.

Esto va a Fase 1 · Eje C como candidato a **Crítica**. Lo dejo señalado aquí porque cambia la
lectura de todo lo demás.

### Migraciones

El proyecto remoto tiene **8 migraciones aplicadas**:

```
20260615201852 deck_persistence_schema      20260617095051 create_signatures_table
20260615201932 deck_assets_storage          20260715090823 add_tags_to_decks
20260615202104 harden_function_and_storage  20260724080732 forms_responses
20260617080106 image_gallery                20260805073529 create_forms_table
```

El repo tiene **cero ficheros `.sql`**. No existe `supabase/`.

**Corrección posterior (Fase 2).** Escribí aquí que "el esquema, las políticas RLS y los buckets
viven solo en el dashboard". **Es falso.** `docs/features/*.md` llevan el DDL ejecutable en bloques
`sql`: `forms-persistencia-supabase.md:46-77` tiene la tabla `responses` completa con sus dos
índices, el `enable row level security` y las dos políticas literales; `form-maker.md:58-70`
documenta `create_forms_table`. Y la decisión está escrita, no es un descuido: *"El repo no tiene
`supabase/migrations/`; el esquema se gestiona por-docs y se aplica en el dashboard/MCP"*.

El hallazgo correcto no es "no está versionado" sino **"está versionado en un formato que nada
verifica ni aplica"**: los docs no se ejecutan, no llevan orden ni checksum, y nada obliga a que
coincidan con el remoto. La deriva ya existe — el doc de `responses` presume "sin PII innecesaria;
sin IP" mientras `signatures` almacena IP y user-agent sin política de retención.

---

## 5 · Build y despliegue

**Scripts** (`package.json`):

| Script | Comando | Estado |
|---|---|---|
| `dev` | `next dev` | funciona |
| `build` | `next build` | funciona, 30,5 s en frío |
| `start` | `next start` | funciona, listo en 508 ms |
| `type-check` | `tsc --noEmit` | limpio, 6,4 s |
| `test` | `node --test --experimental-strip-types` sobre 6 globs | 235/235, 2,4 s |
| `lint` | `next lint` | **roto, ver abajo** |
| `build:ai-kit` | `node scripts/build-ai-kit.mjs` | no ejecutado |

**`npm run lint` no funciona.** No hay `.eslintrc*` ni `eslint.config.*` ni `eslintConfig` en el
`package.json`. `next lint` entra en su asistente interactivo y se queda esperando una respuesta:

```
? How would you like to configure ESLint?
❯  Strict (recommended)
```

Es decir: **el proyecto no tiene linter**, pese a llevar `eslint` y `eslint-config-next` en
devDependencies y a que el README lo anuncia como comprobación de salud. En un entorno no
interactivo el comando se colgaría. Añadido: `next lint` queda eliminado en Next 16.

**Netlify** (`netlify.toml`): `next build`, publish `.next`, plugin oficial de Next. Un solo ajuste
de entorno, `SECRETS_SCAN_OMIT_KEYS` para las dos variables `NEXT_PUBLIC_*`, bien razonado en un
comentario.

**Variables de entorno esperadas** (nombres, ningún valor):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
`INTERACTIUS_NOTIFY_EMAIL`, `RESEND_FROM`.

**CI: no hay.** No existe `.github/`. Nada verifica typecheck, tests ni build antes de que un commit
llegue a `main` y Netlify despliegue.

`next.config.mjs` hace algo poco común y bien pensado: ejecuta `git log` en tiempo de build para
sacar la fecha del manual del último commit que tocó **contenido de marca**, no del último commit a
secas. Está razonado en el propio archivo y degrada a `null` si git no está.

---

## 6 · Salud del proyecto

| Señal | Dato |
|---|---|
| Tests | **235**, todos en verde, 2,4 s. Cubren `lib/deck`, `lib/forms`, `lib/auth`, `lib/workspace`, `lib/rewriter`, `lib/prompts` |
| Cobertura de rutas | **cero**. Ningún test toca un route handler ni el middleware |
| Cobertura de componentes | **cero**. Ningún test de UI |
| Typecheck | limpio |
| Linter | inexistente (ver §5) |
| CI | inexistente |
| `any` / `as any` | 40 apariciones, **la gran mayoría en ficheros de test** |
| Tipos generados de Supabase | **no existen**. `app/api/decks/route.ts:17` castea a `Record<string, unknown>` a mano |
| `catch` vacíos | 0 |
| TODO / FIXME / HACK | 1 |
| Observabilidad | **ninguna herramienta**. Sin Sentry, sin logging estructurado. En `app/` y `lib/` no hay ni un `console.error`; los 5 que existen están en componentes de cliente, o sea, en la consola del navegador del usuario y no en el servidor |
| Rate limiting | **ninguno**. Solo un honeypot en `/forms/api/submit` |
| Documentación | 24 docs en `docs/`, uno por feature, y un README de 13,5 KB |
| Ramas | solo `main`. Árbol limpio |
| Código muerto | `deck-prototype.html` (18 KB) en la raíz, y `app/api/eval/route.ts:12` documenta un parámetro `type` sin implementar |

Los ficheros más grandes: `DeckStudio.tsx` (639), `TimerClient.tsx` (575), `FormStudio.tsx` (483),
`lib/tokens.ts` (465), `Rewriter.tsx` (453).

**Secretos.** Revisado el árbol actual y el historial de git: ninguna clave commiteada. Los 194
aciertos de `SUPABASE_SERVICE` son menciones del **nombre** de la variable en dos documentos, sin
valor. El bundle de cliente (`.next/static`) no contiene `sk-ant-*`, ni `service_role`, ni JWT, ni
`RESEND_API_KEY`. Solo la URL de Supabase y la clave publicable, que van ahí por diseño.

---

## 7 · Comandos base ejecutados

Todo sobre el commit `6a1b1ff`, con `.next` borrado antes de compilar.

| Comando | Resultado | Tiempo |
|---|---|---|
| `npm test` | 235 pass, 0 fail | **2,4 s** |
| `npm run type-check` | limpio | **6,4 s** |
| `npm run build` (frío) | éxito, 16 páginas estáticas | **30,5 s** |
| `npm run lint` | **no completa**, pide configurar ESLint | — |
| `npx next start -p 3100` | listo | **508 ms** |
| `npm audit` | 8 vulnerabilidades: 1 moderada, 7 altas | — |

`npm audit`, sin tocar nada: `postcss` (moderada, path traversal por `sourceMappingURL`),
`sharp` <0.35.0 (alta, CVEs heredados de libvips), `ws` 8.0.0–8.20.1 (alta, DoS por agotamiento de
memoria). Las tres son transitivas y las tres declaran arreglo disponible. `sharp` y `ws` entran por
la cadena de Next y puppeteer, no por código nuestro: el impacto real es de Fase 1 · Eje C.

---

## 8 · Arranque en local

Funciona. `.env.local` está presente en esta máquina con las seis variables, y `.env.example` las
documenta **todas**, con comentarios que explican para qué sirve cada una y qué pasa si falta.

El camino `git clone` → sitio funcionando es: `npm install`, copiar `.env.example` a `.env.local`,
rellenar las dos de Supabase, `npm run dev`. Un par de minutos más la instalación.

Dos fricciones documentadas en `CLAUDE.md` pero **no en el README**, que es donde miraría alguien
nuevo:

- Sin `.env.local` el `/workspace` responde 500, porque el middleware crea el cliente de Supabase en
  cada petición y `lib/supabase/server.ts:10` lanza si faltan las credenciales.
- El hook que sincroniza con el remoto `produccion` vive en `.claude/settings.local.json`, que está
  ignorado, así que no viaja entre máquinas.

El README, además, anuncia `npm run lint` como comprobación de salud y ese comando no funciona.

---

## 9 · Verificación de humo (build de producción, `localhost:3100`)

| Ruta | Código | Destino |
|---|---|---|
| `/` | 200 | reescribe a `/es`, `x-nextjs-cache: HIT` |
| `/en`, `/ca` | 200 | |
| `/es`, `/es/lab` | 307 | a `/` y `/lab`: `localePrefix: 'as-needed'`, correcto |
| `/timer` | 200 | |
| `/llms.txt`, `/api/brand.json` | 200 | |
| `/workspace` | 307 | `→ /workspace/login?next=%2Fworkspace` |
| `/workspace/{rewrit_r,deckmak_r,formmak_r}` | 307 | igual, con su `next` |
| `/workspace/login` | 200 | |
| `/forms/f/noexiste` | 404 | correcto |
| `/deck/abc/view` | 404 | correcto |

Sin errores de consola en el arranque del servidor. Sin peticiones fallidas. Los avisos de
hidratación no se ven desde `curl`: quedan para Fase 1 · Eje E, con navegador.

Un aviso durante los tests, no bloqueante: `MODULE_TYPELESS_PACKAGE_JSON`, porque falta
`"type": "module"` en el `package.json`. Node reparsea cada test como ES module, con su coste.

---

## 10 · Línea base (para comparar después de los arreglos)

Todo medido sobre **`next build` + `next start` en `localhost:3100`**, nunca en modo desarrollo.
Cifras de laboratorio, sin latencia de red ni CDN.

**Tiempos de respuesta** (5 tomas, en segundos; la primera incluye el arranque en frío):

| Ruta | Tomas |
|---|---|
| `/` | 0,030 · 0,008 · 0,007 · 0,011 · 0,008 |
| `/api/brand.json` | 0,012 · 0,003 · 0,004 · 0,003 · 0,003 |
| `/llms.txt` | 0,007 · 0,003 · 0,003 · 0,003 · 0,002 |
| `/timer` | 0,004 · 0,003 · 0,003 · 0,003 · 0,002 |
| `/workspace/login` | 0,018 · 0,009 · 0,012 · 0,010 · 0,010 |

**Transferencia:** `/` 46.428 bytes comprimidos (de 245.489 de HTML) · `/api/brand.json` 53.580 sin
comprimir · `/llms.txt` 30.158 sin comprimir.

**First Load JS** — la tabla literal de `next build`:

```
+ First Load JS shared by all             102 kB
  ├ chunks/1255-b28ea36bf0cdbd65.js      46.3 kB
  ├ chunks/4bd1b696-f785427dddbba9fb.js  54.2 kB
  └ other shared chunks (total)          1.96 kB

ƒ Middleware                              160 kB
```

Las rutas más pesadas: `/workspace/formmak_r/[id]` 265 kB · `/[locale]/lab` 238 kB ·
`/workspace/deckmak_r/[id]` 237 kB · `/workspace/deckmak_r` 191 kB · `/deck/[id]/view` 181 kB ·
`/forms/f/[id]` 168 kB · `/[locale]` 125 kB · `/workspace/rewrit_r` 108 kB.

El **middleware pesa 160 kB** y corre en toda petición que no lleve punto en la ruta.

**Build:** 30,5 s en frío. Compilación 15,5 s, el resto tipos, 16 páginas estáticas y trazas.

**Lighthouse:** no ejecutado todavía. Hay Chrome en `/Applications`, no hay `lighthouse` instalado.
Queda para Fase 1 · Eje D, con `npx lighthouse` contra el 3100.

**Assets:** `public/` pesa 14 MB, de los que 7,2 MB son el PDF del manual. Después,
`presentaciones/team.png` (1,4 MB) y `aplicaciones/aplicaciones-movil.png` (1,0 MB). Solo **2**
ficheros usan `next/image`, frente a **26** `<img>` crudos. Las fuentes sí van bien: `next/font/google`
con IBM Plex Mono y Serif en `app/layout.tsx`, self-hosted por Next, sin `@import` a Google.

---

## 11 · Lo que ya se ve, y va a Fase 1

Sin adelantar veredictos, esto es lo que la Fase 0 deja sobre la mesa para que lo verifiquen los
ejes. Ninguno está confirmado como hallazgo todavía.

1. **Políticas RLS `*_open_mvp`** en `decks`, `clients`, `images` y `signatures`, con la clave anon
   publicada en el bundle. Candidato a Crítica. → Eje C
2. **Cero migraciones en el repo** frente a 8 aplicadas en remoto. → Ejes A y C
3. **Sin linter y sin CI.** Nada verifica nada antes de desplegar. → Ejes A y E
4. **El matcher del middleware excluye rutas con punto**, y seis endpoints dependen solo de él. → Eje C
5. **Sin cabeceras de seguridad declaradas.** Ni CSP, ni HSTS, ni `X-Frame-Options`, ni
   `Referrer-Policy` en `next.config.mjs`, `netlify.toml` ni el middleware. Lo que añada Netlify por
   su cuenta no se ve desde local. → Eje C
6. **`/api/brand.json` sin CORS ni versionado de esquema**, siendo el contrato público. → Ejes A y B
7. **Sin rate limiting** en dos endpoints públicos de escritura y en dos que gastan cuota de
   Anthropic. → Ejes B y C
8. **Sin observabilidad.** Hoy nadie se entera de que algo se ha roto. → Eje E
9. **26 `<img>` crudos y 14 MB de assets** sin pasar por `next/image`. → Eje D
10. **Middleware de 160 kB** en el camino de toda petición. → Eje D
11. **Cobertura cero de rutas y componentes**, con 235 tests concentrados en `lib/`. → Eje A
12. **PII en `signatures`** (email, IP, user-agent) sin política de retención escrita. → Eje C

---

## 12 · Puntos ciegos de esta fase

Lo que localhost no puede decir, y por tanto no afirmo:

- Qué cabeceras inyecta Netlify por su cuenta (HSTS, compresión, `X-Frame-Options`).
- Comportamiento real de la caché de borde y del CDN.
- Latencias reales, cold starts de las funciones y concurrencia.
- Volumen y tráfico de producción: aquí hay 12 decks y 44 imágenes, no una carga real.
- Logs de Netlify y de Supabase.

---

**Fase 0 cerrada.** Nada del proyecto modificado; el único archivo creado es este.
El servidor de producción sigue levantado en `localhost:3100` para las fases siguientes.
