# Timer — herramienta pública en `/timer`

> Integrar en el repo un timer que Alberto había diseñado como artefacto de Claude (una página HTML
> autocontenida, con la UI de marca ya aplicada): ruta pública `/timer`, enlazada desde el menú de
> la brand guide justo debajo de "Presentaciones", abriéndose en pestaña nueva.

## Contexto

Es una herramienta de trabajo real —cuenta atrás para talleres y sesiones, con presets, suma en
caliente, alarma y modo "tiempo cumplido"— pero vivía en un enlace de artefacto de claude.ai, que
es incómodo de usar y de compartir. El objetivo es que sea **una herramienta más del ecosistema
Interactius**, al lado del Deck Maker.

Decisiones tomadas con Alberto:
- Ruta `/timer` literal, **sin i18n**, fuera de `app/[locale]/`.
- El aspecto **no se rediseña**: la UI de marca ya venía aplicada en el artefacto.

## La ruta es standalone porque cuelga fuera de `[locale]/`

`app/timer/` es **hermana** de `[locale]/`, `deck/` y `forms/`, no hija. Ese es el mecanismo de
"standalone" en este repo: `Sidebar`, `MobileHeader` y `MenuOverlay` solo se inyectan en
`app/[locale]/layout.tsx`, así que una ruta fuera de ese segmento hereda únicamente `app/layout.tsx`
—`<html>`, las fuentes IBM Plex y `globals.css`— y nada más. No hace falta layout propio ni ocultar
chrome a posteriori.

`middleware.ts` necesita una rama explícita (paso `0b`): su paso 3 manda a `next-intl` todo lo que
no reconoce, y sin ella `/timer` redirigiría a `/es/timer`. La rama **no** llama a `updateSession()`
a propósito: el timer no guarda nada, así que no debe heredar la dependencia dura de `/deck` con las
credenciales de Supabase. Añade `X-Robots-Tag: noindex, nofollow` en el edge, además del `robots` de
la metadata: público ≠ indexable, como el resto de superficies que no son la guía.

## Auditoría de marca del artefacto

El artefacto llegaba **muy bien alineado**: los ocho colores eran hex exactos de `lib/tokens.ts`,
los dos easings coincidían con los del repo, tres de los cuatro tamaños tipográficos eran peldaños
literales de `lib/typeScale.ts` (`body-sm` y `caption`, clamp a clamp), y todos los pesos eran
legales (serif 300/400, mono 500) sin una sola cursiva.

Quedaban cuatro desviaciones. Resoluciones:

### 1. Burdeos pasa a ser también el color de alerta del sistema

El timer usa Burdeos para aviso, tiempo cumplido y foco. `CLAUDE.md` decía que los tres acentos
identifican servicios y no son decorativos, y "alerta" no era ninguno de los tres: **era un rol que
el sistema no tenía**. Alberto decide que ahora lo tiene y que lo lleva Burdeos — la práctica ya iba
por ahí (`components/forms/forms.css` usaba `--accent: var(--c-bordeaux)` por defecto).

Como el cambio es de norma y no de pieza, se documentó donde manda:
- `lib/tokens.ts` — nuevo campo opcional `uiRole` en `ColorToken`, puesto en Bordeaux. Se propaga
  solo a `/api/brand.json`; `SectionColor.tsx` y `lib/prompts.ts` leen campos explícitos.
- `lib/llms.ts` — `colorLine` emite el rol, para que el manual para IA no siga diciendo que los
  acentos son solo de servicio.
- `CLAUDE.md` — matiz en la regla dura de los acentos.

Que Burdeos tenga dos roles **no** abre la puerta a usar los acentos como decoración: un rol se
declara en `lib/tokens.ts` o no existe.

### 2. Los botones grandes pasan a `title-sm`

`.lnk-lead` usaba `clamp(1.15rem, 0.9rem + 0.9vw, 1.7rem)`, fuera de escala y a un pelo de
`title-sm`. Se adopta el peldaño (serif 400, el peso que `title-sm` declara).

**El reloj sí se queda fuera de escala, y con coartada.** `--fs-clock:
clamp(3.4rem, 1.5rem + 11vw, 11rem)` porque es un número de 5–8 caracteres que debe llenar el
viewport: `super` (mín. 4rem) desborda en móvil con 8 caracteres y `display` (máx. 6rem) se queda
corto en desktop. Mismo argumento que los peldaños de lienzo fijo del deck. Es el **único** valor
tipográfico del timer fuera de `lib/typeScale.ts`.

### 3. El doble wipe sube a `globals.css` como `.hover-wipe-relay`

El artefacto traía un hover propio —el subrayado sale a la derecha y entra otro desde la izquierda—
distinto del `.hover-wipe-underline` canónico (una pasada + `opacity 0.6 → 1`). Funciona mejor en
botones grandes, así que se promovió a `globals.css` como **clase hermana documentada**, disponible
para todo el repo, en vez de dejarla suelta dentro de `.ix-timer`.

Es hermana y no modificador porque la canónica fija `opacity: 0.6`, que apagaría una acción
primaria. `--wipe-offset` (por defecto `-4px`) permite ajustar la separación de la línea base; el
timer lo pone a `0`.

`:focus-visible` se alineó con el global (`2px solid var(--c-dark)`) en lugar del `1px` burdeos del
artefacto.

### 4. Ash y Ash Dark faltaban en los tokens CSS

`lib/tokens.ts` declara **7 colores base**; `app/globals.css` solo mirrorizaba 5. Por eso
`deck.css` los redeclaraba a mano y el timer iba a ser el tercer fichero en hardcodearlos. Se
añadieron `--c-ash: #75706B` y `--c-ash-dark: #46433F` a `globals.css` y el timer los consume por
`var()`, como hace `forms.css`.

## El port a React

`components/timer/TimerClient.tsx` es un port de verdad, no el JS del artefacto metido en un
`useEffect` con `getElementById`. El reparto:

- **Estado React** (lo que lee la UI): `phase` (`idle | running | paused | overtime`), `showHours`,
  `warning`, `displayMs`, y los tres campos como strings mientras se teclean (hay que poder escribir
  `1` antes de `10`; el normalizado va en `blur`).
- **Refs** (lo que solo importa al reloj): `endAt`, `totalMs`, `configuredMs`, `remainingMs`, el id
  del rAF, el `AudioContext` y el interval de la alarma.
- **El bucle** vive en un `useEffect` con `phase` en deps y **solo se monta en `running` /
  `overtime`**. Dentro, `setDisplayMs` se llama solo cuando cambia el segundo visible: **~1 render
  por segundo en vez de 60**.
- **El macrón se escribe por ref** (`fillRef.current.style.transform`) cada frame, fuera de React:
  es puramente visual y a 1 Hz se vería a saltos.
- **Cleanup al desmontar**: cancelar rAF, limpiar la alarma, cerrar el `AudioContext` y restaurar
  `document.title`.

Se conserva lo que hace bueno al timer: el `endAt` **absoluto** vía `Date.now()` (nunca un
acumulador, así sobrevive a que el navegador estrangule los timers en pestaña de fondo), el tiempo
en negativo con el signo `−`, la alarma de 12 repeticiones con auto-apagado, el pulso `breathe`,
`prefers-reduced-motion` y `aria-live="polite"` en el estado.

Del CSS se eliminó lo que en una página suelta daba igual y aquí no: el `<link>` a Google Fonts (las
fuentes ya cuelgan de `<html>` desde `next/font`), el reset `*{margin;padding;box-sizing}` y
`html,body{height:100%}` (el preflight de Tailwind ya lo cubre, y global rompería el sitio), y las
reglas de spin-button, que eran código muerto. Las clases de estado (`is-running`, `is-warning`…)
**dejaron de vivir en `<body>`** y cuelgan del contenedor `.ix-timer`.

## Defectos del artefacto corregidos al portar

1. **"Mostrar horas" borraba minutos.** Con las horas ocultas el campo admite hasta 999; al mostrar
   horas, el handler releía los campos y clampaba los minutos a 59, de modo que `90:00` quedaba en
   `59:00` sin aviso. Ahora `toggleHours()` **convierte el total** en h/m/s en vez de releer campos
   ya clampados: 90 min → `01:30:00`.
2. **La barra espaciadora secuestraba los botones.** El handler global solo exceptuaba `INPUT` y
   `TEXTAREA`, así que tabular a "+5 min" y pulsar Espacio arrancaba el timer en vez de sumar. Ver
   abajo — la solución final tiene matiz.
3. **Sin limpieza en una SPA.** El artefacto nunca cerraba el `AudioContext` ni cancelaba el
   interval de la alarma, y machacaba `document.title`. Salir de `/timer` con la alarma sonando la
   habría dejado sonando.
4. **rAF girando en vacío.** El bucle seguía pidiendo frames en pausa sin pintar nada, y `paint()`
   mutaba estado (`setHours(true)`) como efecto colateral. Ahora el bucle solo corre en
   `running`/`overtime` y la promoción a horas es un efecto declarativo aparte.

Además, `maxLength` de los minutos era `2` mientras la lógica permitía 999: la afordancia no
funcionaba. Ahora es `3` con las horas ocultas, y el campo se ensancha a `3ch`.

### El matiz del defecto 2: `:focus-visible` no basta

La primera versión exceptuaba cualquier `BUTTON` enfocado. Eso rompía el atajo principal: al clicar
"10 min" con el ratón el botón queda enfocado, así que Espacio reaplicaba el preset en vez de
arrancar — justo lo contrario de lo que anuncia el pie.

El segundo intento fue `el.matches(':focus-visible')`, que sí distingue clic de tabulación… pero
**la heurística de Chrome es pegajosa**: comprobado en el navegador, una vez que el usuario ha
tocado el teclado, un clic posterior sigue marcando `:focus-visible`. En una secuencia real
(teclear los minutos → clicar un preset → Espacio) volvía a fallar.

La solución es determinista y no depende de la heurística: **un clic de ratón suelta el foco**
(`e.detail > 0`), mientras que la activación por teclado (`detail === 0`) lo conserva. El chequeo de
`:focus-visible` se mantiene para el caso de tabular a un botón sin haberlo clicado nunca. Ambos
comportamientos están cubiertos por test.

## Ficheros

| Fichero | Qué |
|---|---|
| `app/timer/page.tsx` | **nuevo** — RSC: metadata (noindex) + render del cliente |
| `components/timer/TimerClient.tsx` | **nuevo** — toda la lógica, `'use client'` |
| `components/timer/timer.css` | **nuevo** — CSS namespaced `.ix-timer` / `.ixt-*` |
| `middleware.ts` | rama `0b` para `/timer` |
| `components/chrome/Sidebar.tsx` | `<li>` "Timer" |
| `components/chrome/MenuOverlay.tsx` | `<li>` "Timer" |
| `app/globals.css` | `--c-ash`, `--c-ash-dark`, `.hover-wipe-relay` |
| `lib/tokens.ts` | `uiRole` en `ColorToken` + rol de alerta en Bordeaux |
| `lib/llms.ts` | `colorLine` emite `uiRole` |
| `CLAUDE.md` | matiz en la regla dura de los acentos |

## Ajustes de diseño posteriores

Pedidos por Alberto al ver la primera versión:
- **Wordmark de Interactius centrado arriba** (`interactius-positivo.svg`).
- **Los atajos al pie, centrados.** Estaban en `position: fixed`, que los hacía **pisar los
  controles** en viewports cortos. El layout pasó a tres bandas en columna —wordmark, `.ixt-stage`
  con `flex: 1`, atajos— así el reloj queda ópticamente centrado y el pie está en el flujo: no puede
  solaparse a ninguna altura, y la página crece si hiciera falta.

## Deuda señalada, no ejecutada

El enlace "Presentaciones" está duplicado a mano en `Sidebar.tsx` y `MenuOverlay.tsx`, con la
constante `PRESENTACIONES = { es, en, ca }` copiada en ambos; "Timer" sigue el mismo patrón (sin
diccionario: se escribe igual en los tres idiomas). Con dos herramientas, el copy-paste deja de ser
anécdota: lo limpio sería un `tools: ToolDef[]` en `lib/sections.ts` —donde ya vive el SSOT del
menú— del que ambos componentes iteren.

También queda pendiente reflejar el rol de alerta de Burdeos en la **sección de color visible** del
sitio (`components/sections/SectionColor.tsx`), que es un cambio de copy en tres idiomas.

## Verificación

Suite de Playwright de 41 comprobaciones ejecutada contra el dev server (41/41): ausencia de
peticiones a Google Fonts, posición y centrado del wordmark, **no solapamiento del pie con los
controles a 1440×900 / 1280×620 / 1024×560 / 390×844**, ausencia de scroll horizontal, el botón
grande resolviendo a 32 px (`title-sm`), los dos defectos con sus dos ramas, el ciclo completo
(preset → iniciar → pausar → reanudar → +N min → detener), el paso a tiempo cumplido con signo y
título en negativo, los atajos de teclado, `<body>` sin clases de estado tras salir de la ruta, el
enlace del sidebar justo debajo de Presentaciones, y `.hover-wipe-relay` funcionando fuera del
timer.

Además: `npx tsc --noEmit` limpio, `npm test` 95/95, y `npm run build` con `/timer` prerenderizada
como ruta estática (2,84 kB).

Nota: `npm run lint` **no es utilizable en este repo** — no hay configuración de ESLint y el script
arranca el asistente interactivo de `next lint`. No es una regresión de esta feature.
