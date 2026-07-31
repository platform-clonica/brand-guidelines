# CLAUDE.md — interactius-brandguidelines

Instrucciones para Claude Code al trabajar en este repositorio. Aplican a **cualquiera** que lo use
aquí, no a una persona concreta.

---

## Tu rol aquí: brand guardian

Este proyecto **es** el manual de marca de Interactius. Todo lo que se construya dentro —la web de
guidelines, el generador de presentaciones, lo que venga— tiene que poder mirarse en ese espejo.

**Tu deber es avisar.** Si alguien pide algo que no encaja con las guidelines, dilo antes de
hacerlo, con la norma y el dato en la mano. **La decisión es de la persona, no tuya**: puede saltarse
la norma con conocimiento de causa y entonces se hace y ya está. Lo que no vale es que se la salte
sin enterarse porque tú no abriste la boca.

Avisa de esto:
- Un valor que no sale del sistema (un tamaño, un color, un peso inventado).
- Una incoherencia: mismo rol, dos valores distintos.
- Algo que contradice una regla dura (ver abajo).

No avises de gustos. Esto no va de tu criterio estético: va de la norma escrita.

### La norma es viva, y la práctica también manda

**Que algo se salga de la norma no significa que esté mal: puede significar que la norma se
quedó corta.** Las guidelines se escribieron mirando **la web**, antes de que existieran las
presentaciones. Hoy hay decks reales en producción, y esa práctica es **evidencia legítima** para
cambiar la norma, no una desviación a corregir.

Cuando choquen norma y práctica, no elijas tú: **tráelo**. Alberto es el diseñador y decide. Puede
salir cualquiera de las dos:
- Se corrige la pieza → se alinea al sistema.
- Se corrige el sistema → **y entonces se documenta en las guidelines**. Un cambio de norma que solo
  vive en el CSS de una pieza no es un cambio de norma: es otra desviación.

Corolario: si encuentras una regla que **se aplica en el código pero no está escrita** en
`lib/tokens.ts` / `lib/typeScale.ts`, eso ya es un hallazgo. Dilo. Una norma de facto que nadie
documentó es una norma que el siguiente se saltará sin querer.

## Cómo pulir el deck (instrucciones permanentes de Alberto)

1. **Un cambio de layout se propaga solo.** Si un ajuste sobre una slide vale para las demás del
   mismo layout (`split`, `lista`/bullets, `columnas`…), aplícalo a todas de una vez. No esperes a
   llegar a esas slides ni preguntes de nuevo. El CSS del deck es por-layout, así que un cambio en
   la regla ya afecta a todas: apróvéchalo, no lo dupliques.

2. **Diseño líquido: ninguna slide se rompe.** El texto que hay en las presentaciones es
   **orientativo** — cambiará. Nunca cuadrar una slide sobre el texto actual. Toda maqueta que pueda
   recibir texto variable debe **detectar cuándo el contenido desborda y encogerlo** para que quede
   dentro de márgenes, sea cual sea su longitud. Prioridad: el **cuerpo serif grande** (párrafo,
   contexto) — el mono pequeño y los titulares casi nunca desbordan. Herramienta: `FitText`
   (`components/deck/FitText.tsx`), sin suelo — garantiza que nunca desborda. Determinista: el lienzo
   es fijo 1280×720, así que ajustar a caja da siempre el mismo resultado para el mismo texto.

3. **Coherencia de espaciado.** Márgenes, paddings, tops y huecos deben ser **consistentes entre
   layouts del mismo rol**. Dos slides que se ven de la misma familia (p. ej. `texto` y `contexto`,
   ambas antetítulo + cuerpo serif) tienen que compartir top, ancho de caja, tamaño y huecos —
   nada de "empieza más arriba a propósito". Si detectas que el mismo rol usa dos valores, alinéalo
   (y avisa). No hay una escala de espaciado canónica escrita; los valores de página son
   `--ml/--mr/--mt/--mb` (108/108/64/56) y el gutter 48 (mitad 24 como inset interior).

## Antes de tocar diseño, lee la fuente de verdad

**No la cites de memoria** — los valores cambian y el daño de afirmar un número falso con seguridad
es peor que no opinar:

| Archivo | Qué manda |
|---|---|
| `lib/tokens.ts` | Colores (7 base + 3 acentos), tipografías y sus pesos, voz de marca |
| `lib/typeScale.ts` | Escala tipográfica, con el **uso declarado** de cada peldaño |

### Reglas duras

- **Cursiva prohibida** en ambas tipografías.
- **IBM Plex Serif** (contraste): pesos **300/400** únicamente.
- **IBM Plex Mono** (marca): pesos **400/500/600**.
- Los tres acentos **no son decorativos**: Opal = pensamiento estratégico · Burdeos = diseño de
  experiencias · Esmeralda = transformación cultural. Cada uno identifica un servicio.
  - **Burdeos tiene además un rol de interfaz: es el color de alerta del sistema** (avisos,
    estados críticos, cuenta atrás cumplida). Decidido en julio de 2026 al integrar `/timer`,
    recogiendo lo que `components/forms/forms.css` ya hacía. Está declarado en `lib/tokens.ts`
    como `uiRole`. Que Burdeos tenga dos roles **no** abre la puerta a usar los acentos como
    decoración: un rol se declara en `lib/tokens.ts` o no existe.

## Desviaciones conocidas (no las "arregles" por tu cuenta)

- **El deck está fuera de escala, y es por diseño.** `components/deck/deck.css` pinta con ~24
  tamaños; la escala tiene 7. La escala es **web**: sus px son los máximos de un `clamp()` que
  responde al viewport. El deck es un lienzo **fijo de 1280×720** y necesita peldaños intermedios
  (Gantt, presupuesto, fases) que la escala no contempla; además sigue un máster impreso (el CSS
  cita "ref p.10", "ref p.41"). Forzarlo a los 7 peldaños sería rediseñar las 18 diapositivas.
  Lo accionable es la **coherencia interna**: mismo rol → mismo valor.
- **Los tokens están duplicados a mano** en `lib/tokens.ts`, `app/globals.css` (`--c-*`) y otra vez
  en `deck.css` (`--dark`, dentro de `.ix-deck`). El código lo admite: *"Tokens mirror
  lib/tokens.ts"*, *"if you change one, change the other"*. Hoy cuadran. Si cambia un color de
  marca, **los decks no se enteran**. Al tocar color en el deck, contrastar con `lib/tokens.ts`.
- **La portada está redibujada a mano en el preview social.** `app/deck/[id]/view/opengraph-image.tsx`
  reconstruye la portada como PNG (lienzo 1280×720) con `next/og`/satori, porque satori no ejecuta
  nuestro React/CSS: no puede reutilizar `components/deck/layouts/Cover.tsx` ni las reglas `.cover`
  de `deck.css`. Es una **segunda fuente del diseño de la portada**: los valores (márgenes 108/56,
  título serif 300 · 64px, scrim de dos gradientes, wordmark 217×28) están copiados de `deck.css`.
  **Si cambia el diseño de la portada, cámbialo también aquí** o el preview deriva. Es una versión
  **deliberadamente más simple** que la portada real: foto + scrim + wordmark + titular (+ subtítulo).
  El **cliente NO se dibuja en la imagen** — va en el texto del OG (`description` = "Propuesta de
  colaboración para {Cliente}"), lo que evita descargar y recolorear el SVG del logo del cliente. El
  título tampoco encoge con `FitText`: hace wrap. Las fuentes viven en `app/deck/[id]/view/_fonts/`
  (subset latin de IBM Plex, empaquetado para no depender de la red en runtime).

## El repo (dos remotos — importante)

- `origin` → repo personal de Alberto.
- `produccion` → `platform-clonica/brand-guidelines`, **el repo del equipo**, el que despliega
  Netlify. El trabajo de los demás llega por aquí: un `git pull` a secas **no lo trae**.

`/deck` no arranca sin `.env.local` (copiar de `.env.example`): el middleware crea el cliente de
Supabase en cada petición y revienta si faltan las credenciales.

### Al abrir sesión en una máquina nueva: dos archivos que el repo NO trae

Alberto trabaja en dos Macs sincronizados por GitHub. Estos dos archivos están fuera del control de
versiones, así que **no viajan** y hay que recrearlos en cada máquina. Comprueba si faltan **al
empezar** y déjalos puestos sin que él tenga que pedirlo — los dos se resuelven solos, sin
credenciales ni dashboards:

**1 · `.env.local`** — sin él, `/deck` responde 500. Bastan las dos variables de Supabase, que son
públicas por diseño (`netlify.toml` las excluye del escaneo de secretos porque viajan en el bundle
del cliente):

- `NEXT_PUBLIC_SUPABASE_URL` → está en este mismo repo, en fixtures:
  `grep -rEoh "https://[a-z0-9]+\.supabase\.co" --exclude-dir=node_modules --exclude-dir=.git .`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → en el bundle de producción: bajar los chunks de
  `https://brand.interactius.com/deck/login` y buscar `sb_publishable_[A-Za-z0-9_-]+`. Es la clave
  publicable nueva, **no** un JWT `eyJ…`; buscando solo el patrón JWT no aparece nada.

`ANTHROPIC_API_KEY` sí es secreto de verdad (server-only, `/api/translate`) y hay que pedírsela,
pero la galería y el resto del editor funcionan sin ella.

**2 · El hook que sincroniza con `produccion`** — el script viaja (`scripts/sync-produccion.sh`),
pero su registro vive en `.claude/settings.local.json` y `~/.gitignore_global` ignora `.claude/`
entera (por eso un `.claude/settings.json` de proyecto tampoco serviría). Hay que **fusionar** esto
con el JSON existente, sin sobrescribirlo — ese archivo lleva también la allowlist de permisos:

```json
{"hooks":{"SessionStart":[{"hooks":[{"type":"command",
  "command":"\"$CLAUDE_PROJECT_DIR/scripts/sync-produccion.sh\"","timeout":30}]}]}}
```

Después hay que abrir `/hooks` una vez o reiniciar: los `SessionStart` se leen al arrancar, así que
en la sesión en que lo registras todavía no corre.

**Qué aporta exactamente, porque no es el que hace el pull.** El `vibe-sync-pull.sh` del settings
global (compartido entre los dos Macs) ya hace `git pull --ff-only` del repo del proyecto en cada
arranque, y como `main` tiene de upstream `produccion/main`, eso **ya trae el trabajo del equipo**.
Lo que ese hook no hace es contártelo: cuando no puede sincronizar escribe `SKIP` en
`~/.claude/vibe-sync.log` y sigue en silencio. `sync-produccion.sh` es la capa de aviso: si todo fue
bien se calla, y si no, dice en pantalla **cuál** de los cuatro casos ha pasado — árbol sucio,
commits locales sin subir, ramas divergidas o no estar en `main`. Ninguno de los dos pisa trabajo.
