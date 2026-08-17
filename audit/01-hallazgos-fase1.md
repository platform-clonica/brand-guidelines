# Fase 1 · Hallazgos en bruto (antes de verificación)

> **Estado: SIN VERIFICAR.** Son las cinco lecturas independientes de la Fase 1, tal como las
> devolvieron los cinco auditores. La Fase 2 refuta, matiza o confirma cada Crítica y cada Alta, y
> el resultado manda sobre este documento. No actúes sobre esta lista: espera al `INFORME.md`.
>
> 85 hallazgos. Commit auditado: `6a1b1ff`. Fecha: 2026-08-17.

---

## Cómo leer esto

`S` / `M` / `L` es esfuerzo. Los ejes corrieron en paralelo **sin verse entre sí**, así que hay
solapamientos: están marcados con **↔**, y son el dato más fiable de la fase — dos o tres auditores
ciegos que llegan al mismo sitio.

### Solapamientos entre ejes

| Tema | Hallazgos | Ejes |
|---|---|---|
| Pesos tipográficos fuera de `lib/tokens.ts` | ESC-07 · PERF-04 · TRV-07 | B · D · E |
| `/api/decks` devuelve el `md` completo | ESC-02 · QA-12 · PERF-05 | B · A · D |
| Colores fuera del sistema (`brick`, `#B4402E`) | QA-07 · TRV-08 | A · E |
| Mensajes de Postgres al cliente | QA-01 · SEC-10 | A · C |
| Sin rate limiting | ESC-01 · SEC-08 | B · C |
| Esquema de Supabase sin versionar | SEC-12 · TRV-09 | C · E |
| Doble consulta por render, sin `cache()` | ESC-04 · PERF-08 | B · D |
| Duplicación de tokens de marca | QA-06 · ESC-11 | A · B |
| Imágenes sin optimizar en la home | ESC-03 · PERF-01 | B · D |

---

## Eje C · Seguridad (16)

| ID | Sev | Esf | Qué | Dónde |
|---|---|---|---|---|
| SEC-01 | **Crítica** | M | Políticas `*_open_mvp` = `FOR ALL TO anon,authenticated USING(true) WITH CHECK(true)` en `decks`, `clients`, `images`; `signatures` con SELECT+INSERT `TO public`. La clave anon va en el bundle. GRANT a `anon` incluyen TRUNCATE; `relforcerowsecurity=false`. Leídas 12 propuestas completas sin sesión | `lib/supabase/server.ts:16-23` + políticas remotas |
| SEC-02 | **Crítica** | S | `/auth/v1/settings` devuelve `disable_signup: false`; el middleware solo comprueba `if (!user)`, sin dominio ni rol. Un desconocido se registra y entra al workspace, pasa las 7 APIs de editor y obtiene rol `authenticated` (SELECT sobre `responses`, ALL sobre `forms`). 1 usuario hoy, dominio `interactius.com` | `middleware.ts:41-47,88-92` |
| SEC-03 | **Crítica** | S | Seis políticas de `storage.objects` dan INSERT/UPDATE/**DELETE** a `anon`, acotadas solo por `bucket_id`. Buckets públicos sin `file_size_limit` ni `allowed_mime_types`. El listado sí está cerrado, pero `images.url` da el inventario | políticas remotas de storage |
| SEC-04 | Alta | S | El matcher excluye toda ruta con punto. `/workspace/deckmak_r/abc.json` → **200 con el editor completo**, sin cookie y sin `X-Robots-Tag`. Nueve variantes más probadas y descartadas | `middleware.ts:105-107` |
| SEC-05 | Alta | M | `signatures` guarda email, IP, user-agent y firma manuscrita, con SELECT `TO public`. Sin retención, sin base legal en el punto de recogida | `app/api/sign/route.ts:29-42` |
| SEC-06 | Alta | S | Cero cabeceras de seguridad declaradas en el repo. `X-Powered-By: Next.js` presente. HSTS lo pone Netlify; CSP, XFO, Referrer-Policy y Permissions-Policy no las pone nadie | `next.config.mjs` · `netlify.toml` |
| SEC-07 | Alta | M | Next 15.5.18 con 8 avisos propios (`isDirect`). Aplican "Unauthenticated disclosure of internal Server Function endpoints" y "Cache confusion of response bodies". No aplican los de Server Actions ni el SSRF de rewrites. `next-intl` con open redirect. `ws` es ruido (devDependency) | `package.json:24,25` |
| SEC-08 ↔ ESC-01 | Alta | M | Cero rate limiting. El único 429 es el reenvío del de Anthropic. 40 POST seguidos a `/api/sign` sin ralentización | 4 rutas |
| SEC-09 | Media | S | El tope de 200 KB se salta con `Transfer-Encoding: chunked`: solo mira `content-length`. Enviados 400.080 B → 200. `/api/sign` parsea el JSON entero antes de medir | `app/forms/api/submit/route.ts:16-20` |
| SEC-10 ↔ QA-01 | Media | S | 15 retornos con `error.message` de PostgREST sin filtrar. El patrón correcto ya existe en los endpoints públicos de forms | 7 ficheros |
| SEC-11 | Media | S | SSRF en `opengraph-image`: `fetch()` sobre cualquier URL http(s) del markdown de portada, sin lista blanca. Encadenado con SEC-01, un anónimo elige el destino. Oráculo ciego por las tres salidas distinguibles | `app/deck/[id]/view/opengraph-image.tsx:42-57` |
| SEC-12 ↔ TRV-09 | Media | M | 8 migraciones en remoto, 0 en el repo. Ninguna política RLS revisable en un PR. Explica por qué `responses`/`forms` están bien y las otras cuatro no | ausencia de `supabase/` |
| SEC-13 | Media | M | `/api/sign` acepta cualquier `data:image/*` y **no vincula al firmante con nadie**: `signer_email` es texto libre, no se contrasta con `deck.contact_emails` (que ya está cargado). La única barrera es conocer el UUID | `app/api/sign/route.ts:17-27,51-73` |
| SEC-14 | Baja | S | `/api/brand.json` y `/llms.txt` sin CORS. Para su propósito, abierto sería lo correcto; el problema es que falta sin decisión | los dos route handlers |
| SEC-15 | Baja | S | Mínimo de contraseña solo en cliente; protección contra contraseñas filtradas desactivada. Una sola cuenta protege el área interna, sin MFA | `ResetForm.tsx:51` + config de Auth |
| SEC-16 | Baja | S | `X-Powered-By: Next.js` en todas las respuestas | `next.config.mjs` |

---

## Eje A · Calidad y arquitectura (17)

| ID | Sev | Esf | Qué | Dónde |
|---|---|---|---|---|
| QA-01 ↔ SEC-10 | Alta | S | 21 handlers devuelven `error.message` y **no lo registran**: cero `console.*` en `app/api/**`. Los 5 `console.error` del repo están en componentes de cliente | 9 ficheros |
| QA-02 | Alta | S | Autosave en bucle de reintento infinito: `saveState` está en las dependencias del efecto. ~2.500 peticiones/hora por pestaña. En las dos copias, Deck y Form | `DeckStudio.tsx:332-338` · `FormStudio.tsx:157-162` |
| QA-03 | Alta | S | `DeckStudio` traga el fallo de carga; el editor sale vacío sin avisar y "Guardar" abre el modal de deck nuevo → **forkea la propuesta**. `FormStudio` ya lo hace bien | `DeckStudio.tsx:253` |
| QA-04 | Alta | M | Sin tipos generados: `createClient` sin `<Database>` → `.from().select()` devuelve `any`. Renombrar una columna pasa typecheck, tests y build | `lib/supabase/{server,client,middleware}.ts` |
| QA-05 | Alta | S | **Inyección CSV**: `csvEscape` no neutraliza `=`, `+`, `-`, `@`. El contenido lo escribe un visitante anónimo | `app/forms/api/export/route.ts:60-62` |
| QA-06 ↔ ESC-11 | Media | M | La duplicación de tokens son **29 ficheros**, no 3. Lo grave no es el CSS: `brand.json/route.ts:53` escribe `onLightBg: '#1C1A17'` a mano; igual `llms.ts:32` y `prompts.ts` ×3. Son *outputs* de la fuente de verdad | 5 ficheros clave |
| QA-07 ↔ TRV-08 | Media | S | 11 hex fuera del sistema. `DeckToolbar.tsx:138` usa `#B4402E` para el estado de error cuando `tokens.ts:28` declara Burdeos como color de alerta. `ui.ts:16` declara `brick: '#C24B36'` | 8 ficheros |
| QA-08 | Media | S | Cero error boundaries. Y `page.tsx:44` traduce cualquier fallo de Supabase a un 404 "no existe" en el visor que ve el cliente | `app/` sin `error.tsx` |
| QA-09 | Media | M | `components/deck/studio/` es de facto el design system: 20 ficheros de fuera dependen de él, y el **login del workspace vive dentro del Deck Maker**. `components/studio/` está aguas abajo | `ui.ts` · `deck/auth/` |
| QA-10 | Media | S | README sin tocar desde 2026-06-15: documenta `/[locale]/presentaciones` (404), no menciona workspace/forms/timer/Supabase/auth, y afirma "no hay variables de entorno obligatorias" | `README.md:45,142,231,262` |
| QA-11 | Media | S | El alias `@/` en `lib/prompts.ts` y `lib/llms.ts` los deja fuera del runner: el test del prompt **lee el fuente como texto** en vez de importarlo, y `/llms.txt` (30 KB de contrato público) no tiene ningún test | `lib/prompts.ts:1` · `lib/llms.ts:19-24` |
| QA-12 ↔ ESC-02 | Media | M | Las galerías cargan por `useEffect` lo que el RSC ya podía entregar. Cascada: HTML → JS → hidratación → fetch | `app/workspace/*/page.tsx` |
| QA-13 | Media | M | Deck y Form mantienen dos copias del motor de estudio y galería. El código lo declara ("Calco de lib/decks/api.ts"). QA-02 está en las dos; QA-03 se arregló en una | `lib/forms/api.ts` vs `lib/decks/api.ts` |
| QA-14 | Media | S | `DELETE /api/images/:id` no comprueba el uso en servidor, y borra el fichero de Storage **antes** que la fila: el orden peor de los dos | `app/api/images/[id]/route.ts:22-28` |
| QA-15 | Media | S | Dos clientes de Supabase sin regla escrita de cuál usar. Al endurecer la RLS, cinco handlers dejan de funcionar de golpe | `lib/supabase/server.ts:16-42` |
| QA-16 | Baja | S | Comentario que miente sobre privilegios: dice "service-role client" y usa `supabaseAuthServer()`. Único comentario desalineado del repo | `app/forms/api/export/route.ts:3` |
| QA-17 | Baja | S | La deuda declarada está bien dimensionada salvo dos puntos: los tokens (3 vs 29) y `deck-prototype.html` sin referenciar. Falta declarar la ausencia de migraciones | `docs/` · `CLAUDE.md` |

---

## Eje B · Escalabilidad (14)

| ID | Sev | Esf | Qué | Dónde |
|---|---|---|---|---|
| ESC-01 ↔ SEC-08 | **Crítica** | M | Dos endpoints públicos de escritura sin límite de frecuencia. `/api/sign` admite 2 MB y dispara un correo por petición. El disco lo comparte todo: agotarlo tumba también Deck Maker y login | `sign/route.ts` · `submit/route.ts` |
| ESC-02 ↔ QA-12 ↔ PERF-05 | Alta | S | `GET /api/decks` devuelve el `md` completo: 96.896 B con 12 decks frente a 3.289 B sin él. Tres llamadas por sesión. `statement_timeout` de `anon` = 3 s | `app/api/decks/route.ts:10-27` |
| ESC-03 ↔ PERF-01 | Alta | M | La portada carga 5,5 MB de imágenes: 33 `<img>`, cero `loading="lazy"`, cero `srcset`. PDF de 7,3 MB con `max-age=0` | `SectionAplicaciones` · `SectionUniversoVisual` |
| ESC-04 ↔ PERF-08 | Alta | S | Visor y formulario público consultan Supabase dos veces por render y compilan el markdown dos veces. Cero `cache()` en el repo | `deck/[id]/view/page.tsx` · `forms/f/[id]/page.tsx` |
| ESC-05 | Media | M | `/api/images/[id]/usage` hace `ILIKE '%…%'` sobre el `md` de dos tablas: Seq Scan sin índice posible, bajo timeout de 3 s | `usage/route.ts:30-33` |
| ESC-06 | Media | S | `brand.json` y `llms.txt` son `force-static` (solo cambian en despliegue) y declaran `max-age=300`. La home, igual de estática, declara un año. Sin CORS, sin versión de esquema | los dos handlers |
| ESC-07 ↔ PERF-04 ↔ TRV-07 | Media | S | 16 ficheros de fuente precargados en toda página. Mono 700 no lo pinta nadie. Serif 500 sí se usa, con justificación en `deck.css:70` — norma de facto sin documentar. Serif 600 está rechazado en `deck.css:76` y se descarga igual | `app/layout.tsx:5-18` |
| ESC-08 | Media | S | El listado de formularios descarga todas las filas de `responses` para contarlas en JS. Hoy 0 filas; es la tabla que crecerá sin techo | `app/api/forms/route.ts:31-36` |
| ESC-09 | Media | M | El middleware (550 KB en disco) corre en toda petición sin punto, incluidas páginas cacheadas. Con sesión añade un viaje a Supabase Auth por petición, y `/api/forms` lo repite con `requireUser()` | `middleware.ts:95-97` |
| ESC-10 | Media | S | `maxDuration = 60` es directiva de **Vercel**; esto despliega en Netlify y `netlify.toml` no declara `[functions]`. El comentario del código afirma un presupuesto sin respaldo, y el 504 ya mordió | `translate/route.ts:6` · `rewrite/route.ts:18` |
| ESC-11 ↔ QA-06 | Media | L | Cambiar un color de marca obliga a tocar 13 ficheros (`#1C1A17` ×17), 21 para Burdeos | 9 ficheros clave |
| ESC-12 | Media | L | Añadir un idioma exige tocar 82 literales `{es,en,ca}` en `lib/`, más seis registros paralelos. El catalán ya pagó ese coste (`1313a9a`) | `lib/sections.ts` · `lib/motion.ts` · `lib/tokens.ts` |
| ESC-13 | Baja | S | El OG se regenera cada 5 min a ~0,7-1 s por render, y `sharp` **no está en `package.json`**: llega por Next. Si deja de llegar, la preview pasa a 1,9 MB y desaparece de WhatsApp | `opengraph-image.tsx:110-121` |
| ESC-14 | Baja | S | `images` sin índice más allá de la PK (las tres tablas hermanas sí lo tienen). Y `/api/eval` declara caché pública en una ruta que el middleware cierra con 401 | `images/route.ts` · `eval/route.ts:34-38` |

---

## Eje D · Eficiencia (20)

| ID | Sev | Esf | Qué | Dónde |
|---|---|---|---|---|
| PERF-01 ↔ ESC-03 | **Crítica** | M | 5,33 MB de imágenes, 26 peticiones antes de `load` para 2 imágenes visibles. React 19 emite 20 `<link rel=preload as=image>` en el SSR. **Lighthouse móvil 45/100, LCP 5,28 s, TBT 3,2 s.** Escritorio 0,99: solo se ve en móvil. Medido con `sharp`: 5.331.026 B → 319.724 B en WebP | `components/sections/*` |
| PERF-02 | Alta | M | El middleware arrastra el cliente Supabase completo: 869.956 de 1.724.161 B del sourcemap son `@supabase/*`, y 384.207 (storage, realtime, postgrest, phoenix, functions) son inalcanzables | `lib/supabase/middleware.ts` |
| PERF-03 | Alta | S | El visor público carga 65 kB gzip del SDK de Supabase para construir una URL que es concatenación de cadenas | `DeckViewerClient.tsx:6` → `lib/decks/api.ts:121-125` |
| PERF-04 ↔ ESC-07 ↔ TRV-07 | Alta | S | 16 woff2 precargados = 180.972 B en toda página; **71.740 B (39,6%) son pesos prohibidos**. En `/timer` las fuentes son el 61% del peso | `app/layout.tsx:5-22` |
| PERF-05 ↔ ESC-02 | Alta | M | `/api/decks` con `md` = 96.896 B vs 3.289 B sin él. `DeckStudio` lo pide **dos veces** al montar, una solo para las etiquetas de un modal que puede no abrirse | `decks/route.ts` · `DeckStudio.tsx:257-266` |
| PERF-06 | Alta | S | framer-motion: 37 kB gzip en todo el manual público, **89% sin ejecutar**, para una animación `translateX` de tres líneas de CSS | `MenuOverlay.tsx:4,53-63` |
| PERF-07 | Alta | M | Cascada en todo `/workspace`: 7 viajes a Supabase para abrir el editor, 4 de ellos el mismo `getUser()`. +71 ms por petición | `app/workspace/*/page.tsx` · `DeckStudio.tsx` |
| PERF-08 ↔ ESC-04 | Alta | S | Cero `cache()`, `unstable_cache` y `revalidate` en todo el repo. 21 de 23 rutas son `force-dynamic` | `deck/[id]/view/page.tsx:18,41-49` |
| PERF-09 | Alta | S | `FitText` cierra el `useLayoutEffect` sin array de dependencias y hace write→read→write→read: reflow forzado por instancia en cada render del padre | `FitText.tsx:34-46` |
| PERF-10 | Alta | S | `ToneReport` compila **274 regex Unicode** y escanea el texto 274 veces en cada render, sin `useMemo`, alimentado del `md` en vivo. Cero `memo()` en el proyecto | `ToneReport.tsx:6` · `lib/eval.ts:64-83` |
| PERF-11 | Media | S | Arrastrar el divisor: un `getBoundingClientRect`, un `setState` global y un `localStorage.setItem` por evento de puntero (hasta 120/s) | `DeckStudio.tsx:160-165,180-182` |
| PERF-12 | Media | S | `public/` (14 MB, PDF de 7,4 MB) se sirve con `max-age=0`; `_next/static` con `immutable`. `netlify.toml` sin `[[headers]]` | `netlify.toml` |
| PERF-13 | Media | S | El vídeo del manual sale de `www.interactius.com` con `preload="metadata"`, sin `preconnect` y sin `poster`: 154 KB en tres peticiones de rango durante la carga | `SectionMovimiento.tsx:86-95` |
| PERF-14 | Media | S | `/api/sign` retiene la respuesta al firmante hasta que Resend contesta, pese a que el comentario dice lo contrario. Sin timeout | `app/api/sign/route.ts:45-46` |
| PERF-15 | Media | M | Sin paginación en ningún listado. El conteo de respuestas trae una fila por respuesta. El export CSV se construye entero en memoria | 6 handlers |
| PERF-16 | Media | M | El formulario público carga react-markdown + micromark (43 kB gzip) y zod (17,5 kB) para pintar etiquetas. `Md` recrea props en cada render. **Cero `next/dynamic` en el repo** | `components/forms/Md.tsx:5-13` |
| PERF-17 | Baja | S | `NextIntlClientProvider` serializa el archivo de mensajes completo (~5,4 kB gzip) para dos componentes cliente. El 60% del HTML de la home es payload RSC | `app/[locale]/layout.tsx:27,29` |
| PERF-18 | Baja | S | **Corrección a la línea base**: `/[locale]/lab` (238 kB, la "más pesada") devuelve 404 en producción por diseño. La tabla del build encabeza con una ruta fantasma | `app/[locale]/lab/page.tsx:8-11` |
| PERF-19 | Baja | S | Los avisos de webpack sobre cadenas grandes vienen de las dos fuentes en base64 de `ogAssets.ts` (136.749 B, 4× el siguiente fichero). El base64 pesa un 33% más que el `.ttf` | `lib/decks/ogAssets.ts:7-9` |
| PERF-20 | Baja | S | `ToastProvider` recrea su `value` en cada render (cascada sobre 11 `CopyButton`), su `setTimeout` no se limpia (y otros cinco igual), y `menu.ts` bloquea el scroll del `<html>` desde el store sin restaurarlo | `Toast.tsx:18,22` · `lib/store/menu.ts:12-23` |

---

## Eje E · Transversal (18)

| ID | Sub | Sev | Esf | Qué | Dónde |
|---|---|---|---|---|---|
| TRV-01 | observ. | **Crítica**? | S | Un formulario puede dejar de guardar y el sistema **fabrica la evidencia que descarta la sospecha**: el `?? 0` convierte un fallo de lectura en "0 respuestas" con 200 OK. De cara al usuario sí avisa | `submit/route.ts:60` · `forms/route.ts:31` |
| TRV-02 | a11y | **Crítica**? | S | El `<html>` no declara `lang` en ninguna página, en un sitio trilingüe con `as-needed`. WCAG 3.1.1 nivel A | `app/layout.tsx:44` |
| TRV-03 | ci/cd | Alta | M | Sin `.github/`, `npm run lint` roto, sin hooks, `netlify.toml` sin contextos de preview, `main` conectada a Netlify, dos ramas remotas vivas | `netlify.toml` · ausencia de CI |
| TRV-04 | a11y | Alta | M | Opal como texto = **1,86:1**; Esmeralda 2,88. Ash sobre Warm Light 4,39 contra el 4,5 de AA, y es el defecto de todo el texto secundario. 178 nodos en `/` | `forms.css:104` · `Sidebar.tsx:78` |
| TRV-05 | marca | Alta | S | **Dos formularios publicados llevan `¡Gracias!`**, con `client: Massimo Dutti`. Regla dura, hard fail en `lib/eval.ts`. Los otros dos usan `Listo` y `Gracias` | `content/forms/massimo-dutti.md:12` |
| TRV-06 | a11y | Alta | M | El overlay declara `aria-modal` sin trampa de foco: fuga en el Tab 24 a contenido invisible detrás. Escape cierra pero no restaura el foco. `GalleryFilters.tsx:133` ya lo hace bien | `MenuOverlay.tsx:55-66` |
| TRV-07 ↔ | marca | Alta | S | `app/layout.tsx:13` lleva **un comentario que declara una norma contraria a `lib/tokens.ts`**. Y `Wordmark.tsx:48` pinta el logo de las herramientas en Mono 700 | `app/layout.tsx:6,13,14` |
| TRV-08 ↔ QA-07 | marca | Alta | S | `ui.ts:5-6` dice "No new brand tokens" y tres líneas después declara `brick: '#C24B36'` | `ui.ts:16` · `DeckToolbar.tsx:138` |
| TRV-09 ↔ SEC-12 | ci/cd | Alta | M | Rollback asimétrico: Netlify revierte el código en un clic, la base de datos no vuelve con él. Y reproducibilidad nula: `.env.local` conecta al proyecto compartido | ausencia de `supabase/` |
| TRV-10 | marca | Media | M | Los tres acentos son seleccionables como decoración por formulario. Prueba: el mismo cliente y el mismo tipo de pieza con dos acentos distintos | `lib/forms/schema.ts:78` |
| TRV-11 | marca | Media | M | `lib/eval.ts:4` documenta `scripts/eval-content.ts` — **ese fichero no existe**. Y la autoevaluación excluye 81 de 146 strings (55%) y reporta `totalHardFail: 0` | `eval/manual/route.ts:20-56` |
| TRV-12 | a11y | Media | S | Cuatro de seis rutas sin `<h1>`; el manual arranca en H2 y encadena 35 encabezados sin raíz. `/workspace/login` sin ningún landmark | `app/[locale]/page.tsx` |
| TRV-13 | observ. | Media | S | `/api/sign` no comprueba la respuesta de Resend: `await fetch(...)` sin asignar, y `fetch` no lanza con 422 ni 401. Un cliente puede firmar y que nadie se entere | `app/api/sign/route.ts:46,52-54,59` |
| TRV-14 | observ. | Media | S | Cero error boundaries. La miniatura del OG está mejor protegida que la propuesta | ausencia de `error.tsx` |
| TRV-15 | marca | Media | S | La columna derecha de la tabla de sustitución usa **dos palabras de su propia lista roja**. Y el eval es ciego en catalán: las familias son solo ES+EN | `messages/es.json:46,50` · `lib/tokens.ts:110-160` |
| TRV-16 | marca | Media | M | El 29% de las frases de prosa se sale del rango declarado. La peor tiene **43 palabras**, a cuatro del contraejemplo canónico de `lib/tokens.ts:392` | `messages/es.json` `concepto.*` |
| TRV-17 | observ. | Media | S | `getUser()` sin `try/catch` ni comprobación de `error`: un hipo de red desloguea a usuarios válidos sin dejar rastro. Y `logout` no comprueba si cerró la sesión | `lib/supabase/middleware.ts:29-30` |
| TRV-18 | ci/cd | Baja | S | El remoto `produccion` no existe en esta máquina: el script sale por su guarda y **nunca dice nada**. `CLAUDE.md` describe una máquina distinta de la que se usa | `scripts/sync-produccion.sh:29` |

---

## Lo que los cinco ejes dieron por sano

Consolidado de los cinco bloques `*-OK`. Esto **no se toca**:

**Seguridad.** Ningún secreto de servidor en el bundle (verificado sobre `.next/static`). Historial de
git limpio en 156 commits. Cero funciones `SECURITY DEFINER`. `safeNext` resiste ocho variantes de
open redirect. El flujo de recuperación de contraseña no enumera usuarios, usa PKCE y construye el
`redirectTo` desde el origen. Ni un `dangerouslySetInnerHTML`. `usage/route.ts:28` escapa los
comodines de LIKE. `decks/[id]/route.ts:29` usa lista blanca de campos: no hay mass-assignment.

**Arquitectura.** Cero `any` explícitos en producción (los 40 están en tests). Ningún componente
contiene una consulta de Supabase. El compilador de decks aguanta seis entradas malformadas sin
lanzar. La guarda de `/lab` funciona en producción. Los comentarios explican el porqué y varios
fechan el incidente que los motivó; solo uno está desalineado.

**Escalabilidad.** Sin riesgo de agotamiento de conexiones: todo va por PostgREST, no hay `pg` ni
ORM. Los índices que importan existen y el `EXPLAIN` del join resuelve con `Memoize`. Ninguna ruta
se volvió dinámica por accidente. Las cabeceras `no-store` están donde deben.

**Rendimiento.** CLS = 0 en móvil y escritorio pese a no haber `width`/`height`: los contenedores con
`aspect-[...]` reservan bien. Cero fugas de listeners y observers. **Cero N+1** en todo el repo.
`TimerClient.tsx:175-223` es el mejor código de rendimiento del proyecto. Las 15 secciones del manual
son server components. `font-display: swap` en todas las caras.

**Marca y accesibilidad.** Los CTA usan el elemento semántico correcto: cero `role="button"`, cero
`<a>` sin `href`, cero `onClick` sobre elementos no interactivos. Foco visible verificado en 48
posiciones. **La cursiva prohibida es la única regla dura garantizada mecánicamente.** El copy del
sitio está limpio de vocabulario prohibido (438 strings barridos). Los diez colores de `lib/tokens.ts`
siguen cuadrando exactamente con `globals.css` y `deck.css`: la desviación declarada **no ha derivado**.
