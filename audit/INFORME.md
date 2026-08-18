# Auditoría técnica · brand.interactius.com

> Commit `6a1b1ff`, rama `main`, árbol limpio. Ejecutada el 2026-08-17 íntegramente en local.
> Cinco ejes independientes → 85 hallazgos → 34 verificados adversarialmente → este informe.
>
> Documentos previos: [`00-inventario.md`](00-inventario.md) · [`01-hallazgos-fase1.md`](01-hallazgos-fase1.md) (sin verificar, superado por este).

---

## 0 · Estado de aplicación · 2026-08-18

**Las dos críticas y las cuatro altas están corregidas y desplegadas.** Commits `c722eca..c585a48`
en `main`. Lo que sigue describe los problemas tal como se encontraron; esta sección dice cuáles
siguen abiertos.

> **Actualizada el 2026-08-18.** La versión anterior de esta tabla se escribió a las 13:22 del 17/08
> y se quedó obsoleta esa misma tarde: tres commits posteriores (`d8b7dee`, `78fe530`, `79219ca`)
> cerraron TRV-06, TRV-11, TRV-12 y PERF-06 sin que nadie la tocara.

| Hallazgo | Estado |
|---|---|
| SEC-01 · RLS abierta | ✅ Cerrada. `anon` recibe 401 en `decks`, `clients`, `images`, `signatures`. Migración `20260817121000` |
| SEC-03 · Storage anónimo | ✅ Cerrado, más límites de tamaño y MIME. Migración `20260817122000` |
| SEC-17 · PII en el visor | ✅ Cero apariciones de `ip`, `user_agent` y `Mozilla` en el HTML servido |
| SEC-04 · Bypass del punto | ✅ `requireUser()` dentro de los seis handlers: `/api/decks/abc.json` → 401 |
| ESC-01 · Rate limiting | ✅ Por IP, 5/h en `/api/sign` y 10/h en `/forms/api/submit`. Verificado: 10 pasan, el 11 es 429 |
| SEC-09 · Tope saltable con `chunked` | ✅ Se mide el cuerpo. 400 KB troceados → 413 |
| PERF-03 · SDK en el visor | ✅ `/deck/[id]/view` de 181 kB a 115 kB |
| TRV-02 · `lang` ausente | ✅ `lang="es"` en la raíz, wrapper por locale para `/en` y `/ca` |
| TRV-05 · `¡Gracias!` | ✅ Fuera de los dos formularios publicados |
| TRV-03 · Sin CI ni linter | ✅ ESLint configurado (0 errores) y CI con type-check, tests, lint y build |
| SEC-06 · Cabeceras | ✅ Cinco cabeceras en producción, `DENY` en `/workspace`. Sin `X-Powered-By`. **CSP pendiente** |
| QA-01 · Errores sin registrar | ✅ `dbFail()` en los 21 retornos, con `console.error` |
| QA-02 · Autosave sin freno | ✅ Tres intentos con espera creciente, en las dos copias |
| QA-03 · Fallo de carga tragado | ✅ Estado de error en `DeckStudio` |
| TRV-14 · Sin error boundaries | ✅ `global-error.tsx` y uno propio para el visor |
| QA-07 · Rojo inventado | ✅ Burdeos, el `uiRole` declarado |
| TRV-09 · Esquema sin versionar | ⚠️ Existe `supabase/migrations/`, pero **faltan las 8 migraciones históricas** (`supabase db pull`) |
| SEC-02 · Registro abierto | ✅ **Cerrado el 18/08.** Se entra solo con la cuenta de Google de la empresa: proveedor de email desactivado, hook `before-user-created` que rechaza otros dominios (migración `20260818090000`) e `isTeamEmail()` en el gate. Ver §7 |
| PERF-01 · Imágenes | 🟡 **Parcial** (`d8b7dee`). `loading="lazy"` hecho: −82 % de peso, LCP 5,0 s → 3,7 s. Falta `next/image`: los rasters se sirven a 2400 px para huecos de 364 px |
| TRV-06 · Foco | ✅ Cerrado (`d8b7dee`). `lib/hooks/useFocusTrap.ts`, en el overlay y en el Modal |
| TRV-11 · `eval-content.ts` | ✅ Cerrado (`d8b7dee`). El script existe y está en `package.json` |
| TRV-12 · Encabezados | ✅ Cerrado (`78fe530`). `h1` en el manual, `<main>` en la pantalla de acceso |
| PERF-06 · framer-motion | ✅ Cerrado (`78fe530`). Fuera de la carga inicial vía `next/dynamic` |
| TRV-04 · Contraste | 🟡 **Parcial** (`79219ca`). Corregidos los fallos inequívocos. Quedan 148 nodos de texto secundario: eso es la escala de gris del manual y es decisión de Alberto (§4) |
| §4 · Decisiones de marca | ⏳ Abierto. Mono 700 sigue vivo en `Wordmark.tsx:48` y sin declarar en `lib/tokens.ts`; acentos de formulario; `prework-taller-acme` |
| — · Trazabilidad | ➕ **Nuevo el 18/08.** `created_by` en `decks`, `clients`, `images` y `forms` (migración `20260818100000`). No filtra nada todavía: es el prerrequisito de los permisos |

---

## 1 · Resumen ejecutivo

| Eje | Semáforo | Lectura en una línea |
|---|---|---|
| **Seguridad** | 🔴 | La base de datos está abierta a internet. Todo lo demás del eje es secundario |
| **Calidad** | 🟢 | Disciplina alta y sostenida. Los defectos son estrechos y localizados |
| **Escalabilidad** | 🟢 | Aguanta de sobra la escala real y la previsible. Ningún cuello de botella cerca |
| **Eficiencia** | 🟡 | Peso de transferencia mejorable. Ninguna métrica rota |
| **Transversal** | 🟡 | Sin CI ni linter, un fallo WCAG A, y el manual se salta su propia norma en dos formularios |

### Los cinco problemas que de verdad importan

1. **Las políticas RLS `*_open_mvp` dejan `decks`, `clients` e `images` abiertas a lectura y escritura con la clave publicada en el bundle.** Verificado: 12 propuestas comerciales completas — alcance, fases, presupuesto, condiciones — y 14 clientes con sus correos, descargados desde esta máquina sin ninguna credencial de equipo. **[SEC-01]**
2. **Storage permite a un anónimo sobrescribir cualquier imagen de `deck-assets` y `deck-images` sin que cambie la URL pública.** Son los logos y las portadas de propuestas que ya circulan por email entre clientes. **[SEC-03]**
3. **El visor público filtra la IP, el correo y el navegador del firmante en el HTML de la página.** Descubierto durante la verificación, no en la auditoría. **[SEC-17]**
4. **El registro en Supabase está abierto y el workspace autoriza a cualquiera que exista**, sin comprobación de dominio ni rol. Vía de gasto directo en `/api/translate` y `/api/rewrite`. **[SEC-02]**
5. **Nada ejecuta los 235 tests antes de desplegar**, y el linter no existe pese a estar anunciado en el README. **[TRV-03]**

### El riesgo global, en una frase

**El código de esta aplicación está bien escrito y la base de datos que hay debajo está abierta a internet**: los cuatro primeros problemas de la lista viven en el dashboard de Supabase, no en el repositorio, y se arreglan con una migración de veinte líneas que nadie ha escrito porque el proyecto no tiene dónde escribirla.

---

## 2 · Qué dijo la verificación

Esto es el dato de calidad del propio informe, y conviene leerlo antes que los hallazgos.

| | |
|---|---|
| Hallazgos de la Fase 1 | **85** |
| Críticos o altos, tras deduplicar solapamientos | **34** |
| Refutados por completo | **1** |
| Confirmados sin cambios | **5** |
| **Rebajados de severidad** | **28** (82 %) |
| Con alguna inexactitud en el enunciado | **24** |
| Hallazgos **nuevos** surgidos al verificar | **2** |

**Cuatro de cinco hallazgos graves estaban inflados.** El patrón es consistente y vale la pena nombrarlo: los hechos técnicos aguantaron casi siempre; lo que no aguantó fueron las **consecuencias**. Cada vez que un auditor saltó de "esto es posible" a "esto tumba el sistema", el verificador encontró el eslabón que falta.

Tres ejemplos, porque enseñan a leer el resto del informe:

- Se afirmó que la home puntúa **45/100** en Lighthouse. No es reproducible: la nota real es **0,80-0,83**. El 45 salió de medir con siete agentes compitiendo por la CPU.
- Se afirmó que el middleware arrastra **384 KB inalcanzables**. Esa cifra es tamaño de *fuente original* leído del sourcemap. Decodificando los `mappings`, lo emitido son **96 KB**.
- Se afirmó que `FitText` provoca *layout thrashing*. Medido en Chrome real: el thrashing aporta **0,09 ms** con ocho instancias, y el array de dependencias que "faltaba" es en realidad **el requisito** de la garantía de diseño líquido que declara `CLAUDE.md`. Aplicar ese arreglo habría roto una norma del proyecto.

Y una refutación que evitó un daño concreto: se propuso quitar la columna `md` de `GET /api/decks`. `DeckGallery.tsx:269` la compila para pintar la miniatura de cada tarjeta. El arreglo no habría dado ningún error — habría dejado **las doce tarjetas de la galería como rectángulos grises**.

---

## 3 · Hallazgos

### 🔴 Críticas

---

#### [SEC-01] Las políticas RLS dejan la base de datos abierta a internet

**Eje:** Seguridad · **Severidad:** Crítica · **Esfuerzo:** M · **Confianza:** Confirmado
**Ubicación:** políticas del proyecto `gcvzzpggpsnlwqnotfqv` · declarado en `lib/supabase/server.ts:17`

**Qué pasa.** `decks_open_mvp`, `clients_open_mvp` e `images_open_mvp` son `FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`. La clave publicable viaja en el bundle del cliente por diseño — `netlify.toml` lo declara y está bien que lo haga. La consecuencia es que el 401 del middleware protege la puerta de una casa que tiene la pared abierta al lado.

**Cómo falla.** Cualquiera abre `brand.interactius.com/workspace/login`, copia la clave del bundle y hace `GET /rest/v1/decks?select=*` contra el proyecto. Recibe las propuestas completas. Con la misma clave puede `PATCH` el markdown de una propuesta que un cliente está a punto de firmar — cambiar el precio, el alcance, el texto de aceptación — o borrarlas.

**Evidencia.**
```
curl "$U/rest/v1/decks?select=*" -H "apikey: $K" -H "Authorization: Bearer $K"
→ 200 · 97.936 B · 12 filas · md total 90.198 caracteres
curl "$U/rest/v1/clients?select=*"  → 200 · 14 filas con default_emails
```
El verificador descartó todas las mitigaciones posibles: no hay política `RESTRICTIVE`, no hay `pgrst.db_pre_request`, no hay JWT obligatorio, no hay restricción de red, y el único trigger sobre `decks` solo fija `updated_at`.

**Correcciones al enunciado original.** Dos agravantes que circularon y son irrelevantes: el `TRUNCATE` de los GRANT no es alcanzable por PostgREST porque no hay verbo HTTP que lo emita, y es el valor por defecto de Supabase; `relforcerowsecurity=false` solo cambia el comportamiento para el propietario de la tabla, que `anon` no es. Hay un badén parcial: la extensión `safeupdate` aborta `UPDATE`/`DELETE` sin `WHERE`, pero cualquier filtro trivial la esquiva.

**Arreglo.** Migración versionada:
```sql
drop policy decks_open_mvp on public.decks;
create policy decks_team on public.decks for all to authenticated using (true) with check (true);
-- ídem clients, images
revoke all on public.decks, public.clients, public.images from anon;
```
El visor público es lo único que necesita leer sin sesión: resolverlo con un RPC `SECURITY DEFINER` que devuelva solo `md`, `type`, `logo_path` y `commercial_id` de un id dado — **nunca** `contact_emails` ni `budget_url`.

**Dependencia crítica:** los seis handlers de `/api/decks`, `/api/clients` e `/api/images` usan `supabaseServer()`, que es la clave anon sin sesión. **Al aplicar esta migración dejan de funcionar de golpe.** Hay que migrarlos a `supabaseAuthServer()` antes o en el mismo PR. Ver [QA-15].

**Riesgo de no hacerlo.** Fuga completa de las propuestas comerciales de la empresa, y capacidad de modificar una propuesta en el momento de firmarla, sin rastro atribuible y sin observabilidad que lo detecte.

---

#### [SEC-03] Storage permite sobrescribir y borrar assets de propuestas ya enviadas

**Eje:** Seguridad · **Severidad:** Crítica · **Esfuerzo:** S · **Confianza:** Confirmado
**Ubicación:** políticas `deck_{assets,images}_{insert,update,delete}_mvp` sobre `storage.objects`

**Qué pasa.** Seis políticas conceden `INSERT`, `UPDATE` y `DELETE` a `anon`, acotadas únicamente por `bucket_id`. Los dos buckets son `public=true` sin `file_size_limit` ni `allowed_mime_types`.

**Cómo falla.** Ordenado por daño real, que no es el orden que se supone:

1. **`UPDATE` es lo peor.** Un anónimo sobrescribe un objeto existente y **la URL pública no cambia**. El cliente que reabra el enlace de su propuesta ve la imagen nueva. Es defacement de material firmado y enviado.
2. **`INSERT` sin límite de tamaño ni de MIME** es alojamiento arbitrario bajo el dominio del proyecto, y coste de almacenamiento.
3. **`DELETE`** tiene una vía ya cerrada: el trigger `protect_objects_delete` que Supabase instala de serie aborta el borrado por PostgREST con un 42501. Sigue vigente por la Storage API.

**Evidencia.** `pg_policies` sobre `storage` devuelve las seis políticas, todas `PERMISSIVE` con `roles={anon,authenticated}`. `storage.buckets` confirma `public=true, file_size_limit=null, allowed_mime_types=null` en ambos. El inventario del bucket no hace falta adivinarlo: la tabla `images` es legible por [SEC-01] y trae las 44 rutas.

**Arreglo.** `DROP` de las seis y recrearlas `TO authenticated`. `anon` no necesita ninguna: la lectura por URL pública la da el flag `public=true` del bucket, no una política. Añadir `file_size_limit` (10 MB) y `allowed_mime_types`. La subida la hace el navegador con la sesión del equipo, así que cerrar `anon` no rompe el flujo.

---

### 🟠 Altas

---

#### [SEC-17] El visor público filtra la IP y el correo del firmante · **HALLAZGO NUEVO**

**Eje:** Seguridad · **Severidad:** Alta · **Esfuerzo:** S · **Confianza:** Confirmado
**Ubicación:** `app/deck/[id]/view/page.tsx:47-49`

Surgió al verificar un hallazgo de rendimiento. Ningún auditor lo vio.

**Qué pasa.** `sb.from('signatures').select('*')` se ejecuta en **toda** visita al visor, y el resultado entra en el payload RSC del HTML servido.

**Cómo falla.** Cualquiera con el enlace de una propuesta firmada — el mismo enlace que se envía al cliente, y que se reenvía dentro de su organización — se lleva el correo, la dirección IP y el user-agent del firmante leyendo el código fuente de la página.

**Evidencia.**
```
curl -s http://localhost:3100/deck/<uuid>/view   →  59.840 B
contiene: user_agent · signer_email · "ip" · Mozilla
```

**Por qué es independiente de SEC-01.** Aunque se cierre la RLS, esto persiste: la consulta la hace el servidor con credenciales legítimas y el dato viaja igualmente al HTML.

**Arreglo.** `select('id, signer_name, signed_at, signature_png')`. El PNG sí hace falta — se pinta el estado firmado. La IP y el user-agent no pintan nada.

---

#### [SEC-02] Registro abierto, y el workspace autoriza a cualquiera que exista

**Eje:** Seguridad · **Severidad:** Alta · **Esfuerzo:** S · **Confianza:** **Hipótesis**
**Ubicación:** `middleware.ts:41-47,88-92` + configuración de Auth

**Qué pasa.** `/auth/v1/settings` devuelve `disable_signup: false` con el proveedor de email activo. Y el único control de autorización de toda el área interna es `if (!user)`: no hay comprobación de dominio, ni de rol, ni lista blanca. `lib/auth/` contiene solo `legacyRoutes.ts` y `safeNext.ts`.

**Restricción confirmada por Alberto (2026-08-17): todos los usuarios serán de la organización.** Eso resuelve el hallazgo sin ambigüedad y cierra la incógnita del SMTP, que deja de importar. Si nadie de fuera debe tener cuenta, el registro público no sirve a ningún usuario legítimo: **desactivarlo no tiene coste ni contrapartida**. Las cuentas se crean a mano en el panel, que es justo lo que `.env.example` ya documenta ("Create users manually in Supabase → Auth → Users").

**Consecuencia para el segundo arreglo.** Con el registro cerrado, el `if (!user)` del middleware pasa a ser **suficiente**: si solo existen cuentas del equipo, "autenticado" y "del equipo" sí son sinónimos. El `requireTeam()` deja de ser necesario y pasa a ser defensa en profundidad — recomendable, no obligatorio.

**Lo que hay que escribir en alguna parte.** A partir de ese cambio, la seguridad del área interna descansa en una **convención operativa** ("solo damos de alta cuentas del equipo") y no en el código. Hoy es cierta; el día que alguien reabra el registro para una prueba, el `if (!user)` vuelve a ser insuficiente **sin que nada avise**. Es exactamente el caso que `CLAUDE.md` describe: una norma de facto que nadie documentó es una norma que el siguiente se saltará sin querer. O se declara en el README, o se implementa el `requireTeam()` y deja de depender de la memoria de nadie.

**Qué se gana realmente al entrar** — menos de lo que se dijo, y conviene ser preciso: las seis APIs de editor leen con `supabaseServer()`, la clave anon sin sesión, así que sobre `decks`, `clients` e `images` no otorgan nada que [SEC-01] no dé ya sin autenticarse. Lo que sí gana: `responses`, `forms`, la interfaz interna, y **gasto directo de cuota de Anthropic** por `/api/translate` y `/api/rewrite`, que no tienen límite de frecuencia.

**Dato tranquilizador.** `auth.users` tiene **exactamente un usuario**, dominio `interactius.com`, creado el 15 de julio. Nadie ha entrado por ahí.

**Arreglo.** Dos, y hacen falta los dos. (a) Desactivar "Allow new users to sign up" en el panel — es un interruptor. (b) Dejar de tratar "autenticado" como sinónimo de "del equipo": un `requireTeam()` junto a `requireUser()` que compruebe dominio o un claim explícito, usado en el middleware, y reflejado en las políticas de `forms` y `responses` que hoy confían en el rol `authenticated` a secas.

---

**RESUELTO · 2026-08-18.** Se cierra por una vía distinta a la propuesta aquí. En vez de
desactivar el registro y confiar en la convención operativa, **el acceso pasa a ser la cuenta de
Google de la empresa**, con tres capas: el consent screen *Internal* del cliente OAuth en Google
Cloud, un hook `before-user-created` en Postgres que rechaza cualquier dominio que no sea
`interactius.com` (migración `20260818090000`), e `isTeamEmail()` en el middleware, en las APIs de
editor y en `requireUser()`. El proveedor de email queda desactivado.

Eso responde al párrafo *"lo que hay que escribir en alguna parte"*: la regla ya no descansa en una
convención no codificada, sino en un fichero del repositorio que se revisa en un PR. El
`requireTeam()` que aquí se planteaba como opcional **sí se implementó**, con otro nombre.

Verificado: alta con un `@gmail.com` → **403** con el mensaje del hook, y `auth.users` no sube.

**Riesgo residual, y no es pequeño: la baja no es instantánea.** Supabase no revalida contra Google
en cada refresco y sus refresh tokens no caducan por defecto, así que **suspender a alguien en
Google Admin no le cierra la sesión del workspace**. Los controles que lo resolverían —*time-box
user sessions* e *inactivity timeout*— son de plan **Pro**, y la organización está en **free**. Al
dar de baja a alguien hay que **borrar o banear su fila en Supabase → Auth → Users**. Está escrito
en `README.md`, en `.env.example` y en `docs/features/workspace-login-google.md`, que es donde lo
va a buscar quien lo necesite.

---

#### [ESC-01 · SEC-08] Cero rate limiting en los endpoints públicos de escritura

**Eje:** Escalabilidad · Seguridad · **Severidad:** Alta · **Esfuerzo:** M · **Confianza:** Confirmado
**Ubicación:** `app/api/sign/route.ts` · `app/forms/api/submit/route.ts` · `/api/translate` · `/api/rewrite`

**Qué pasa.** No hay ni una línea de limitación de tasa en el repositorio. El único `429` es el reenvío del `RateLimitError` de Anthropic — su límite hacia nosotros, no el nuestro hacia el cliente.

**Evidencia.** 60 POST seguidos a cada endpoint sin un solo 429 ni ralentización. Ninguna prueba escribió: los cuerpos usados fallan la validación o disparan el honeypot antes del acceso a datos.

**Corrección al escenario.** El relato de "7,2 GB/hora y 3.600 correos/hora que tumban el login" **no se sostiene tal cual**: `/api/sign` hace `.single()` sobre el deck y devuelve 404 **antes** de insertar y antes de enviar el correo, así que el ataque exige conocer un UUID válido — que lo tiene cualquiera con una URL de propuesta reenviada, pero no un bot ciego. Y que el disco lleno deje Supabase Auth en solo lectura es plausible, no demostrado.

**Arreglo.** Límite por IP en el middleware, que ya corre en el camino. Sin dependencia nueva: tabla `rate_limits` con un RPC de contador atómico. Presupuestos distintos: `/api/sign` 5/hora por IP; `/forms/api/submit` 10/hora; `/api/translate` y `/api/rewrite` 30/hora por `user.id`, que el middleware ya tiene en la mano. Y un tope de gasto en la consola de Anthropic, que es la red que no depende de nuestro código.

---

#### [PERF-03] El visor público carga 65 kB del SDK de Supabase para concatenar una cadena

**Eje:** Eficiencia · **Severidad:** Alta · **Esfuerzo:** S · **Confianza:** Confirmado
**Ubicación:** `app/deck/[id]/view/DeckViewerClient.tsx:6` → `lib/decks/api.ts:121-125`

El **único hallazgo de rendimiento que sobrevivió intacto** a la verificación.

**Qué pasa.** `DeckViewerClient` importa `publicLogoUrl`, que llama a `supabaseBrowser()`. Eso arrastra `@supabase/ssr` + supabase-js completos — auth, postgrest, realtime, storage, functions — al bundle de la ruta. Lo único que se usa es `getPublicUrl`, que el verificador leyó en el fuente: `encodeURI(\`${this.url}/${renderPath}/public/${_path}\`)`. Concatenación pura, sin `fetch`, sin firma, sin `await`.

**Evidencia.** Chunks `6962` (188.147 raw / **52.061 gzip**) y `44530001` (62.891 / **13.331 gzip**) = **65.392 B gzip**. El verificador comprobó que `6962` no es un chunk mixto al que se le cargue peso ajeno: 37 apariciones de `@supabase`, y **cero** de `compileDeck`, `DeckRenderer`, `ix-deck` o `FitText`. El tree-shaking no puede quitarlo porque el constructor de `SupabaseClient` instancia storage, realtime, postgrest y functions como efecto de construcción.

**Por qué importa aquí y no en el workspace.** Es la URL que se manda a clientes, a menudo abierta desde el móvil, y a menudo **una sola vez** — que es justo el caso en el que la caché de chunks compartidos no ayuda.

**Arreglo.** Una función pura en un módulo nuevo, sin SDK:
```ts
export const publicLogoUrl = (p: string | null) =>
  p ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${p}` : null;
```
**Antes de dar por hecho el ahorro**, comprobar que `DeckRenderer` y `SignatureCapture` no tocan Supabase por su cuenta.

---

#### [TRV-02] El `<html>` no declara `lang` en ninguna página

**Eje:** Transversal · a11y · **Severidad:** Alta · **Esfuerzo:** S · **Confianza:** Confirmado
**Ubicación:** `app/layout.tsx:44`

**Qué pasa.** El layout raíz emite `<html className={...}>` sin `lang`, y es el único `<html>` del árbol. Sin mitigación en ninguna capa: un `grep` de `lang` sobre todo `app/` no devuelve una sola aparición.

**Agravante propio de este proyecto.** El sitio sirve tres idiomas con `localePrefix: 'as-needed'`, así que `/` responde en español o en inglés según negociación. El idioma real varía por petición y el documento no lo declara nunca.

**Cómo falla.** Un cliente abre `/forms/f/<id>` o `/deck/<id>/view` con lector de pantalla. El lector aplica la fonética del idioma por defecto del sistema y lee el documento entero mal pronunciado. WCAG 2.1 SC 3.1.1, nivel A, el más básico que existe.

**Evidencia.** Las seis rutas devuelven `<html class="__variable_517c19 __variable_9d8d8a">`. axe-core: `html-has-lang | serious | nodes=1`.

**Arreglo.** `<html lang="es">` en `app/layout.tsx:44`, y sobrescribir por segmento en `app/[locale]/layout.tsx`, que ya conoce el locale. Para las rutas sin locale, `es` es correcto: su copy es español fijo.

**Nota de severidad.** Se marcó como crítica y no lo es: esta escala reserva "crítica" para lo explotable o la rotura inminente. Es un fallo permanente, sin mitigación y para el 100 % de las páginas — alta.

---

### 🟡 Medias

Diecisiete hallazgos. Los agrupo por lo que hay que hacer con ellos.

#### Se arreglan en el mismo PR que las críticas

| ID | Qué | Dónde |
|---|---|---|
| **QA-15** | Dos clientes de Supabase sin regla escrita de cuál usar. **Bloquea el arreglo de SEC-01**: al endurecer la RLS, cinco handlers dejan de funcionar. Hacerlo ahora es invisible; hacerlo entonces es urgente | `lib/supabase/server.ts:16-42` |
| **SEC-05** | PII de firmantes legible con la clave anon. Subconjunto de SEC-01, mismo arreglo. Lo propio: retención, base legal y aviso al firmante — hoy no hay ninguno. Una sola fila afectada | política `MVP open read signatures` |
| **SEC-04** | El matcher excluye toda ruta con punto. **Mucho menos grave de lo que pareció**: el 200 de `/workspace/deckmak_r/abc.json` es un cascarón sin datos (cero UUIDs, cero correos), y los `id` son columnas `uuid`, que rechazan el punto. Queda defensa en profundidad y dos rutas indexables | `middleware.ts:105-107` |
| **SEC-06** | Cero cabeceras de seguridad declaradas. **La fuga del UUID por `Referer` que se afirmó es falsa**: `Closing.tsx:17` ya lleva `rel="noopener noreferrer"`, y el defecto del navegador no manda la ruta. Queda hardening preventivo | `next.config.mjs` |

#### Observabilidad — hoy nadie se entera de nada

| ID | Qué | Dónde |
|---|---|---|
| **QA-01 · SEC-10** | **21** retornos propagan un mensaje ajeno y **cero `console.*`** en los 18 handlers. Lo que justifica el hallazgo no es la confidencialidad (marginal con la RLS abierta) sino que estos errores no se registran en ningún sitio. Además, **4 de los 21 devuelven `Claude API: ${e.message}`**, una fuga distinta que no estaba en el informe | 9 ficheros |
| **TRV-13** | `/api/sign` no comprueba la respuesta de Resend: `await fetch(...)` sin asignar, y `fetch` no lanza con 422 ni 401. Un cliente puede firmar y que nadie se entere | `sign/route.ts:59` |
| **TRV-01** | `/api/forms:31` no captura el `error` y el `?? 0` convierte un fallo de lectura en "0 respuestas" con 200 OK. **Se marcó crítica y no lo es.** Y el hueco real es otro: el contador solo cubre la tabla `forms` (1 fila, 0 publicadas) mientras los cuatro formularios que se sirven viven en `content/forms/` y **no aparecen en el dispatcher en absoluto** | `app/api/forms/route.ts:31` |
| **TRV-14 · QA-08** | Cero error boundaries. El visor traduce cualquier fallo de Supabase a un 404 "no existe" — falso y comercialmente pésimo. La miniatura del OG está mejor protegida que la propuesta | ausencia de `error.tsx` |
| **TRV-17** | `getUser()` sin `try/catch` ni comprobación de `error`: un hipo de red desloguea a usuarios válidos sin dejar rastro. Y `logout` no comprueba si cerró la sesión | `lib/supabase/middleware.ts:29` |

#### Proceso

| ID | Qué | Dónde |
|---|---|---|
| **TRV-03** | Sin CI, sin linter (no hay configuración de ESLint), sin hooks. **"Nada verifica nada" es falso**: `next build` type-checkea y un build fallido no despliega. Lo que no corre son los 235 tests y el linter inexistente | `netlify.toml` · ausencia de `.github/` |
| **TRV-09 · SEC-12** | Cero `.sql` en el repo frente a 8 migraciones aplicadas. **Corrección importante**: el esquema **sí** está en `docs/features/*.md` como DDL ejecutable, y la decisión está escrita. El hallazgo no es "no está versionado" sino "está versionado en un formato que nada verifica ni aplica" | ausencia de `supabase/` |

#### Rendimiento — todos rebajados desde alta o crítica

| ID | Qué | Dónde |
|---|---|---|
| **PERF-01 · ESC-03** | 5,4 MB de imágenes y 26 peticiones antes de `load` para 2 imágenes visibles. **Pero el 45/100 no es reproducible (0,80-0,83 real)**, y bloquear el 100 % de los rasters solo baja el LCP de 5,0 s a 4,4 s. Las imágenes explican ~0,5 s, no el LCP. El ahorro en WebP está sobreestimado: q80 da 493.736 B, no 319.724 | `components/sections/*` |
| **PERF-02** | El middleware emite código de realtime, storage, postgrest y functions que no puede ejecutar, y el tree-shaking no lo quita. **La cifra estaba inflada 4×**: los 384 KB son tamaño de fuente del sourcemap; lo emitido son **96 KB** (17,5 %). Y el arreglo propuesto — validar el JWT a mano — **no es seguro** y no debe aplicarse | `lib/supabase/middleware.ts` |
| **PERF-04 · ESC-07 · TRV-07** | 16 woff2 precargados = 180.972 B en toda página. **Solo 52.864 B son peso muerto** (Serif 500 y 600). Ver la nota de marca abajo | `app/layout.tsx:5-22` |
| **PERF-06** | framer-motion, 37 kB gzip en el manual público, para una animación. **El "89 % sin usar" no es fiable** — mide cobertura en la carga inicial. Y el arreglo está subestimado: `AnimatePresence` retrasa el desmontaje y CSS no hace eso solo. Salida barata: `next/dynamic` con `ssr: false` | `MenuOverlay.tsx:4` |
| **PERF-07** | `auth.getUser()` **no cachea**: sale a la red en cada petición con sesión (55-60 ms medidos). 4 de los 7 viajes del editor son el mismo `getUser()`. "Cascada" es impreciso: la profundidad real son 2 saltos | `app/workspace/*/page.tsx` |
| **ESC-04 · PERF-08** | El visor hace 3 consultas en serie. **`/forms/f/[id]` NO duplica** — Next ya deduplica, verificado con los logs del gateway. Y `cache()` no arregla el visor: los dos selects piden columnas distintas | `deck/[id]/view/page.tsx` |

#### Editor y contenido

| ID | Qué | Dónde |
|---|---|---|
| **QA-02** | Autosave reintenta sin backoff ni tope mientras dure el fallo. **No es "bucle infinito"**: cadencia fija, sin escalada, y se autocura. **No hay pérdida de datos** y el indicador muestra "Error · reintentar" | `DeckStudio.tsx:333` · `FormStudio.tsx:158` |
| **QA-03** | `DeckStudio` traga el fallo de carga y sale vacío sin avisar. **"Deja la original huérfana" es falso**: el autosave está bloqueado por el guard `!currentDeckId`, la fila original no se toca y sigue en la galería. Peor caso: un duplicado confuso. `FormStudio` ya lo hace bien | `DeckStudio.tsx:253` |
| **QA-14** | `DELETE /api/images/:id` no comprueba el uso en servidor y borra de Storage **antes** que la fila — el orden peor de los dos | `images/[id]/route.ts:22-28` |
| **TRV-05** | **Dos formularios publicados llevan `¡Gracias!`**, regla dura y hard fail. La hipótesis de "son fixtures" queda **descartada**: con la tabla `forms` vacía, `content/forms/*.md` es la única fuente que sirve formularios. Massimo Dutti es cliente real (URLs de producción, commit dedicado de copy) | `content/forms/massimo-dutti.md:12` |
| **TRV-04** | Opal como texto da **1,87:1** y Esmeralda 2,88. **Bordeaux (6,28:1) es el valor por defecto y pasa AA**: solo se rompe cuando el frontmatter elige otro. Y Ash sobre Warm Light da 4,39 contra el 4,5 de AA, que es el defecto de todo el texto secundario | `forms.css:104` · `Sidebar.tsx:78` |
| **TRV-06** | El overlay declara `aria-modal` sin trampa de foco: fuga confirmada en el **Tab 24**. **Escape funciona desde cualquier punto** porque el listener está en `window`, así que hay salida siempre. Peor de lo enunciado en un punto: tras cerrar, el foco no vuelve al disparador | `MenuOverlay.tsx:55-66` |
| **QA-07 · TRV-08** | `ui.ts:5` dice *"No new brand tokens"* y once líneas después declara `brick: '#C24B36'`. Y `DeckToolbar.tsx:138` pinta el error con `#B4402E` frente a **26 usos correctos** de Burdeos. **Son 9 hex fuera de sistema, no 2** | `ui.ts:16` |
| **QA-06 · ESC-11** | La duplicación de tokens son 29 ficheros. Lo grave no es el CSS: `brand.json/route.ts:53` escribe `#1C1A17` a mano. El endpoint cuya única función es publicar `lib/tokens.ts` tiene su propia copia | `brand.json/route.ts:53` |
| **SEC-09** | El tope de 200 KB se salta con `Transfer-Encoding: chunked`. **Acotado**: el runtime corta hacia 8-16 MB (medido: 8 MB pasa, 16 MB da 400) | `submit/route.ts:16-20` |
| **SEC-11** | SSRF en `opengraph-image`: `fetch()` sobre cualquier URL del markdown de portada. Encadenado con SEC-01, el destino lo elige un anónimo | `opengraph-image.tsx:42-57` |
| **SEC-13** | `/api/sign` **no vincula al firmante con nadie**: `signer_email` es texto libre y no se contrasta con `deck.contact_emails`, que el handler ya tiene cargado. La única barrera es conocer el UUID | `sign/route.ts:17-27` |
| **PERF-14** | `/api/sign` retiene la respuesta al firmante hasta que Resend contesta. El comentario garantiza que la firma no **falle**, no que no se **retrase**. Sin timeout | `sign/route.ts:45-46` |
| **QA-09** | El login de todo el workspace vive en `components/deck/auth/`. 20 ficheros de fuera dependen de `components/deck/studio/`, y `components/studio/` está aguas abajo | `ui.ts` · `deck/auth/` |
| **QA-10** | README sin tocar desde el 15 de junio: documenta una ruta que da 404, no menciona workspace, forms, timer, Supabase ni auth, y afirma que no hay variables de entorno obligatorias | `README.md:45,142,231,262` |
| **TRV-11** | `lib/eval.ts:4` documenta `scripts/eval-content.ts` — **ese fichero no existe**. Y la autoevaluación excluye el 55 % de los strings y reporta `totalHardFail: 0` | `eval/manual/route.ts:20-56` |
| **TRV-12** | Cuatro de seis rutas sin `<h1>`; el manual encadena 35 encabezados sin raíz. `/workspace/login` sin ningún landmark | `app/[locale]/page.tsx` |

---

### 🟢 Bajas

Trece hallazgos. **Cuatro llegaron aquí desde "alta"**, y merecen mención por lo que enseñan:

- **[PERF-09] `FitText` — REFUTADO.** Medido en Chrome real: 0,07 ms con 1 instancia, 1,50 ms con 20. El thrashing aporta 0,09 ms. Y el array de dependencias que "faltaba" **es el requisito** del diseño líquido que declara `CLAUDE.md`.
- **[PERF-10] Las 274 regex.** 1,39 ms sobre el tamaño real de un deck, 5,05 ms sobre 22.000 caracteres — bajo el presupuesto de 16 ms. Compilarlas es el **3 %** del coste. Y `ToneReport` solo se monta con el panel abierto, que arranca cerrado.
- **[QA-04] `Database = any`.** No significa que `.select()` devuelva `any`: supabase-js parsea la cadena del select, así que **los nombres de columna sí se comprueban**. El riesgo real y estrecho es la cardinalidad de las relaciones embebidas, que por defecto es array mientras `decks/route.ts:20` castea a objeto.
- **[SEC-07] Los avisos de Next.** Cero `'use server'` invalida cuatro de los ocho; cero `new Request(` invalida los dos de caché; `/_next/image` devuelve 400 y anula el del SVG. De los ocho, solo tres son altos y son justo los descartables. Residual: subir a 15.5.21.
- **[ESC-02 · QA-12 · PERF-05]** El `md` del listado **sí se usa** para las miniaturas.
- **[ESC-05]** El `ILIKE`: 97,7 ms con 1.008 filas simuladas, 30× bajo el timeout. Harían falta ~30.000 decks.
- **[ESC-08]** El conteo trae una columna `uuid`, no las respuestas. Y el comentario ya declara la decisión y su umbral.

Y los que nacieron bajos: **SEC-14** (sin CORS en el contrato público), **SEC-15** (contraseñas sin contraste con HIBP, una sola cuenta sin MFA), **SEC-16** (`X-Powered-By`), **ESC-13** (`sharp` no declarado en `package.json`), **ESC-14** (`images` sin índice; `/api/eval` con caché pública tras un 401), **PERF-12** (`public/` con `max-age=0`), **PERF-17** (mensajes completos en el payload RSC), **PERF-18** (`/lab` encabeza la tabla del build y da 404 en producción), **PERF-19** (los avisos de webpack vienen de las fuentes base64), **PERF-20** (`ToastProvider` sin memoizar; el store bloquea el scroll sin restaurarlo), **QA-16** (comentario que miente sobre privilegios), **TRV-18** (el script de sync es inerte aquí), **TRV-15**, **TRV-16**, **TRV-10**.

---

## 4 · Decisiones que son de Alberto, no mías

Cuatro cosas donde norma y práctica chocan. `CLAUDE.md` dice que las traiga en vez de resolverlas.

**1 · Mono 700 está vivo y no está declarado.** `lib/tokens.ts:36` declara Mono `[400,500,600]`. `components/studio/Wordmark.tsx:47` pinta `fontWeight={700}` como atributo SVG — invisible a un `grep` de CSS, por eso el auditor lo dio por muerto. Es el wordmark de DeckMak_r, FormMak_r y ReWrit_r: **una marca dibujada en un peso que la marca no tiene**. O el wordmark baja a 600, o el 700 entra en `lib/tokens.ts`.

**2 · Serif 500 y 600 sí son peso muerto, y hay un comentario que miente.** Ninguna regla usa Serif por encima de 400. Y `deck.css:70` advierte de un *"500 on serif is outside lib/tokens.ts"* cuya regla, justo debajo, es `font-weight:400`. **El comentario está obsoleto** y documenta una decisión ya revertida: quien lo lea creerá que hay una desviación viva que no existe.

**3 · Los acentos tematizan formularios sin relación con el servicio.** `lib/forms/schema.ts:78` deja elegir el acento por frontmatter. La prueba de que no significa nada: el mismo cliente y el mismo tipo de pieza con dos acentos distintos. O `accent` pasa a ser `service`, o el segundo rol se declara en `lib/tokens.ts` como se hizo con el `uiRole` de Burdeos.

**4 · `prework-taller-acme.md` es a la vez documentación y entrega.** `docs/features/forms-persistencia-supabase.md` lo cita como "ejemplo de referencia" del formato, y a la vez está publicado con `client: Massimo Dutti` — y su `slug` dice `acme`. Nadie decidió si era muestra o entrega, y así es como se coló el `¡Gracias!`.

---

## 5 · Matriz de priorización

```
            ESFUERZO S              M                      L
  ALTO   ┌──────────────────┬──────────────────┬──────────────────┐
         │ SEC-03 Storage   │ SEC-01 RLS       │                  │
IMPACTO  │ SEC-17 PII visor │ ESC-01 rate lim. │                  │
         │ SEC-02 registro  │ QA-15 dos clien. │                  │
         ├──────────────────┼──────────────────┼──────────────────┤
  MEDIO  │ TRV-02 lang      │ TRV-03 CI+lint   │ QA-09 mover      │
         │ PERF-03 SDK      │ TRV-09 migrac.   │   studio/ y auth │
         │ TRV-05 ¡Gracias! │ TRV-04 contraste │ ESC-12 idiomas   │
         │ QA-01 logging    │ PERF-01 imágenes │                  │
         │ QA-02/03 editor  │ TRV-06 foco      │                  │
         ├──────────────────┼──────────────────┼──────────────────┤
  BAJO   │ SEC-16, ESC-13   │ PERF-06 framer   │ QA-06 29 ficheros│
         │ PERF-12, PERF-17 │ PERF-02 middlew. │   de tokens      │
         │ QA-16, TRV-18    │ TRV-11 eval-cont.│                  │
         └──────────────────┴──────────────────┴──────────────────┘
```

El cuadrante que manda es el de arriba a la izquierda: **tres arreglos de esfuerzo S con impacto alto**, y los tres viven en el panel de Supabase o en tres líneas de código.

---

## 6 · Roadmap en tres olas

### Ahora — crítico y barato · ~1 día

| # | Qué | Esfuerzo |
|---|---|---|
| 1 | Desactivar el registro público en Supabase | 1 min |
| 2 | `select('id, signer_name, signed_at, signature_png')` en el visor | 5 min |
| 3 | Migrar los seis handlers a `supabaseAuthServer()` **[QA-15]** | 1 h |
| 4 | Migración RLS: `decks`, `clients`, `images`, `signatures` **[SEC-01]** + RPC para el visor público | 3 h |
| 5 | Migración Storage: seis políticas a `authenticated`, más límites de tamaño y MIME **[SEC-03]** | 1 h |
| 6 | `<html lang="es">` **[TRV-02]** y quitar los dos `¡Gracias!` **[TRV-05]** | 10 min |

Los pasos 3, 4 y 5 van **en el mismo PR y en ese orden**: invertirlo deja el workspace inoperativo.

### Siguiente — importante, requiere planificación · ~1 semana

CI con `type-check` + `test` + `build` y protección de rama **[TRV-03]** · configurar ESLint y arreglar el script · `supabase db pull` para materializar las 8 migraciones **[TRV-09]** · helper `dbFail()` con `console.error` en los 21 retornos **[QA-01]** · rate limiting por IP **[ESC-01]** · `requireTeam()` **[SEC-02b]** (hecho el 18/08 como `isTeamEmail()`) · error boundaries **[TRV-14]** · backoff y tope en el autosave **[QA-02]** · estado de error de carga en `DeckStudio` **[QA-03]** · quitar el SDK del visor **[PERF-03]** · cabeceras de seguridad **[SEC-06]**.

### Después — deuda estructural · a decidir

`loading="lazy"` y `width`/`height` en las 24 imágenes bajo el pliegue, que es el arreglo barato y sin riesgo estético **[PERF-01]** · trampa de foco extraída a un hook **[TRV-06]** · contraste **[TRV-04]** · mover `studio/` y `auth/` fuera de `components/deck/` **[QA-09]** · `scripts/eval-content.ts` **[TRV-11]** · README **[QA-10]**.

---

## 7 · Deuda arquitectónica

Tres cambios de fondo que evitarían familias enteras de problemas futuros.

**1 · La autorización vive en dos sitios que no se hablan.** El middleware decide con `if (!user)` y la base de datos decide con políticas que están en un dashboard. Ninguna de las dos capas sabe lo que hace la otra, y por eso conviven políticas correctas (`responses`, `forms`) con políticas MVP abiertas: nadie las ha visto juntas en una pantalla. **Coste honesto: 1-2 días** para traer el esquema al repo, unificar el cliente de datos y escribir la regla. Elimina de raíz SEC-01, SEC-03, SEC-05, SEC-11 y QA-15.

**2 · No hay ningún artefacto ejecutable que verifique nada antes de producción.** `next build` type-checkea, y eso es todo: los 235 tests no corren, el linter no existe, y el esquema se aplica a mano. **Coste: medio día** para el workflow más la configuración de ESLint. Es lo que convierte los 235 tests de decorativos en útiles.

**3 · La fuente de verdad tiene 29 copias, y cuatro de ellas están en sus propios outputs.** Que `deck.css` duplique los colores es una desviación declarada y aceptada. Que `/api/brand.json` escriba `#1C1A17` a mano no lo es: el contrato público puede contradecir al manual sin que nada falle. **Coste: 2 horas** para cerrar las cuatro fugas de output más un test que compare `lib/tokens.ts` contra los espejos.

---

## 8 · Lo que está bien y no hay que tocar

**Seguridad.** Ningún secreto de servidor en el bundle. Historial de git limpio en 156 commits. Cero funciones `SECURITY DEFINER`. `safeNext` resiste ocho variantes de open redirect. El flujo de recuperación de contraseña no enumera usuarios, usa PKCE y construye el `redirectTo` desde el origen. Ni un `dangerouslySetInnerHTML`. `usage/route.ts:28` escapa los comodines de LIKE, que casi nadie ve venir. `decks/[id]/route.ts:29` usa lista blanca de campos. **Y `responses` y `forms` tienen políticas RLS correctas**: el equipo sabe escribirlas.

**Calidad.** Cero `any` explícitos en producción. Ningún componente contiene una consulta de Supabase. El compilador de decks aguanta seis entradas malformadas sin lanzar. La guarda de `/lab` funciona. Los comentarios explican el porqué y varios fechan el incidente que los motivó; en todo el repo solo uno está desalineado.

**Escalabilidad.** Sin riesgo de agotamiento de conexiones: todo va por PostgREST. Los índices que importan existen. Ninguna ruta se volvió dinámica por accidente. **Cero N+1** en todo el repositorio.

**Rendimiento.** CLS = 0 en móvil y escritorio. Cero fugas de listeners y observers. `TimerClient.tsx:175-223` es el mejor código de rendimiento del proyecto. Las 15 secciones del manual son server components. `font-display: swap` en todas las caras.

**Marca y accesibilidad.** Los CTA usan el elemento semántico correcto: cero `role="button"`, cero `<a>` sin `href`, cero `onClick` sobre elementos no interactivos. Foco visible verificado en 48 posiciones. **La prohibición de cursiva es la única regla dura garantizada mecánicamente.** El copy del sitio está limpio de vocabulario prohibido en 438 strings. Y los diez colores de `lib/tokens.ts` **siguen cuadrando exactamente** con `globals.css` y `deck.css`: la desviación declarada no ha derivado.

---

## 9 · Puntos ciegos · comprobaciones de 15 minutos para ti

Lo que no pude verificar desde local, convertido en tareas concretas.

| # | Comprobación | Dónde | Por qué importa |
|---|---|---|---|
| 1 | ~~¿El SMTP de Auth es el de Supabase o uno propio?~~ **Resuelto**: Alberto confirma que todos los usuarios serán de la organización, así que el registro público se desactiva y el SMTP deja de condicionar nada | — | — |
| 2 | ¿Qué cabeceras manda producción de verdad? | `curl -sI https://brand.interactius.com/` | Netlify añade HSTS por su cuenta. CSP, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy` no las añade nadie |
| 3 | ¿`/api/brand.json` se comprime en el borde? | `curl -sI -H 'Accept-Encoding: br' .../api/brand.json` | En local baja 53.580 B sin comprimir. Si el CDN tampoco comprime, es ancho de banda en cada consumidor |
| 4 | ¿Cuál es el timeout real de las funciones? | Panel de Netlify → Functions → duración de `/api/translate` | `maxDuration = 60` es directiva de **Vercel**. Si el tope real es menor, una traducción larga se corta a mitad de stream y se guarda truncada **[ESC-10]** |
| 5 | ¿Hay protección de rama en `main`? | GitHub → Settings → Branches | No es verificable desde local. Sin ella, el CI de la ola 2 es una sugerencia |
| 6 | ¿Cuánto tráfico tiene el manual? | Netlify → Analytics | Decide si las imágenes son un problema de coste o una anécdota. Con tráfico bajo, [PERF-01] baja a "cuando toque" |
| 7 | ¿Hay copia de seguridad de los buckets? | Panel de Supabase → Storage | [SEC-03] permite sobrescribir assets. Sin copia, no hay vuelta atrás |

---

## 10 · Línea base

Todo sobre `next build` + `next start` en `localhost:3100`. Laboratorio local: sin CDN, sin latencia real, sin cold starts. Sirve para comparar antes y después, no como cifra de producción.

| Métrica | Valor |
|---|---|
| Build en frío | 30,5 s |
| Type-check | 6,4 s · limpio |
| Tests | 2,4 s · 235/235 |
| Arranque de `next start` | 508 ms |
| **Lighthouse móvil `/`** | **0,80-0,83** · LCP 4,8-5,1 s · FCP 1,2 s · TBT 30-150 ms · CLS 0 |
| Lighthouse escritorio `/` | 0,98 · LCP 1,0 s |
| Lighthouse móvil `/timer` · `/workspace/login` | 0,89 · 0,90 |
| First Load JS compartido | 102 kB |
| Ruta más pesada real | `/workspace/formmak_r/[id]` 265 kB |
| Ruta pública más pesada | `/deck/[id]/view` 181 kB, de los que **65,4 kB gzip son SDK de Supabase** |
| Middleware | 550.364 B en disco · @supabase emite 212.403 B (38,6 %) · inalcanzable 96.447 B (17,5 %) |
| Fuentes precargadas | 16 ficheros · 180.972 B · **52.864 B muertos** (Serif 500/600) |
| Imágenes de la home | 26 peticiones · 5.407.335 B · 2 visibles · WebP q80 → 493.736 B |
| `/api/brand.json` | 53.580 B **sin comprimir** · 6 ms |
| `/deck/<id>/view` | 137-692 ms · 3 consultas en serie a Supabase |
| RTT a Supabase | ~70 ms en caliente · `getUser()` 55-60 ms |
| `GET /api/decks` | 96.896 B con `md` · 3.289 B sin él (12 filas) |
| `evalText()` | 1,39 ms a 3.716 caracteres · 5,05 ms a 22.331 |
| Datos reales | 12 decks · 14 clientes · 44 imágenes · 1 firma · 10 respuestas · 1 formulario (0 publicados) · 1 usuario |
