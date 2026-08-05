# Home dispatcher — el lanzador de aplicaciones

> La pantalla a la que se llega al iniciar sesión. Reúne en un sitio las herramientas internas
> (DeckMak_r, FormMak_r, DSMak_r) y los enlaces de uso frecuente (StarMeApp!, Timer).

Estado: **especificación**, pendiente de implementar.

## Contexto

Las herramientas internas han ido creciendo sueltas: `/workspace/deckmak_r`, `/workspace/formmak_r` y `/timer` existen cada
una por su lado y no hay ningún sitio desde el que verlas juntas. Al iniciar sesión aterrizas
directamente en la galería de presentaciones (`DEFAULT_NEXT = '/deck'`), como si el DeckMaker fuera
la única herramienta — algo que dejó de ser cierto al llegar FormMaker.

El dispatcher pone una puerta de entrada común: entras, ves qué hay, eliges. Y da sitio a lo que
todavía no existe (DSMak_r) sin tener que rediseñar nada cuando llegue.

## Alcance

**Sí:** una página estática con dos grupos de tarjetas, el botón de cerrar sesión, y el cambio del
aterrizaje tras el login.

**No:** datos en vivo en las tarjetas (contadores de presentaciones o formularios), permisos por
herramienta, personalización por usuario, buscador. Nada de eso hace falta con cinco tarjetas.

## Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Ruta | `/workspace` | Fuera de `/workspace/deckmak_r` y de `/forms`: el lanzador no pertenece a ninguna herramienta |
| Aterrizaje tras login | `/workspace` | Deja de asumirse que el DeckMaker es la única herramienta |
| DSMak_r | tarjeta deshabilitada, "Próximamente" | Reserva el sitio sin llevar a un 404 |
| StarMeApp! | `https://star-me.app/`, pestaña nueva | Vive fuera de este dominio |
| Círculo superior derecho | botón directo de cerrar sesión | Decisión de Carlos, avisado del riesgo de clic accidental |
| Tarjetas de herramienta | wordmark real + descripción | Reconoces el destino antes de llegar; los wordmarks ya existen |
| Color | solo paleta base | Los tres acentos identifican **servicios** (`lib/tokens.ts`); una herramienta interna no lo es |
| Cliente/servidor | server component, sin JS de cliente | Enlaces `<a>` y logout `<form method="post">`: no hace falta interactividad |

## Arquitectura

### Catálogo declarativo

Una sola tabla, `lib/workspace/catalog.ts`. Añadir una app en el futuro es **una entrada**, no tocar
maquetación. Es el patrón que el repo ya usa en `lib/deck/catalog.ts`, donde la tabla de layouts
alimenta a la vez el mapa de marcadores, la galería y los docs.

```ts
export type AppGroup = 'links' | 'tools';

export type AppEntry = {
  id: string;                                  // único, estable
  label: string;                               // nombre accesible
  group: AppGroup;
  href: string | null;                         // null ⇒ deshabilitada
  external?: boolean;                          // abre en pestaña nueva
  description?: string;                        // línea bajo el título (tools)
  wordmark?: { before: string; after: string }; // solo tools
};
```

| id | grupo | href | external | wordmark | descripción |
|---|---|---|---|---|---|
| `starmeapp` | links | `https://star-me.app/` | sí | — | — |
| `timer` | links | `/timer` | — | — | — |
| `deckmakr` | tools | `/workspace/deckmak_r` | — | `DeckMak` + `r` | Presentaciones |
| `formmakr` | tools | `/workspace/formmak_r` | — | `FormMak` + `r` | Formularios |
| `dsmakr` | tools | `null` | — | `DSMak` + `r` | Próximamente |

Invariantes (verificadas por test): ids únicos; `href` interno empieza por `/`; `external` implica
`href` absoluto `https://`; `href: null` implica sin `external`; toda entrada de `tools` tiene
`wordmark`.

### Ficheros

```
NUEVO
  lib/workspace/catalog.ts                     la tabla de arriba
  lib/workspace/__tests__/catalog.test.ts      invariantes del catálogo
  app/workspace/page.tsx                       server component: cabecera + dos rejillas
  components/workspace/AppTile.tsx             una tarjeta (enlace o deshabilitada)
  components/studio/LogoutButton.tsx      variantes 'bar' y 'avatar'

MODIFICADO
  middleware.ts                           rama de auth para /home
  lib/auth/safeNext.ts                    /home en ALLOWED; DEFAULT_NEXT → '/home'
  lib/auth/__tests__/safeNext.test.ts     casos de /home
  components/studio/Wordmark.tsx          prop `muted` para la tarjeta apagada
  components/deck/gallery/DeckGallery.tsx    "← Inicio" + usa LogoutButton
  components/forms/maker/FormGallery.tsx     "← Inicio" + usa LogoutButton (quita "Presentaciones")
```

### Middleware

`/workspace` no cae hoy en ninguna rama: acaba en el fallback de next-intl. Con `localePrefix:
'as-needed'` eso da 404, no una redirección, pero igualmente hay que interceptarlo **antes** del
fallback, junto a la rama de `/timer`:

```ts
if (pathname === '/home' || pathname.startsWith('/home/')) {
  const { response, user } = await updateSession(request);
  if (!user) → redirect a /deck/login?next=/home
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
```

Mismo patrón exacto que la rama de `/workspace/formmak_r`.

Además, `app/workspace/page.tsx` declara `robots: { index: false, follow: false }` en su `metadata`,
igual que `/workspace/deckmak_r` y `/workspace/formmak_r`: el `X-Robots-Tag` del middleware es el cinturón, no el tirante.

### Cambio en `Wordmark`

Hoy fija `colors.dark` y `colors.brick`. Se le añade un prop opcional `muted` que pinta el texto y
el acento en `colors.ash`, para la tarjeta de DSMak_r. La tarjeta llama a
`<Wordmark {...entry.wordmark} muted={!entry.href} />`: no hace falta un componente `DSLogo`.

`DeckLogo` y `FormLogo` se quedan como están, para las cabeceras de sus herramientas.

### `LogoutButton`

El mismo `<form action="/deck/logout" method="post">` está copiado en `DeckGallery` y en
`FormGallery`; el dispatcher sería la tercera copia. Se extrae con dos variantes:

- `bar` — el botón rectangular con borde que usan hoy las dos galerías.
- `avatar` — el círculo del dispatcher: `title` y `aria-label` "Cerrar sesión".

Sigue siendo un `form` POST, así que funciona sin JavaScript y no necesita `'use client'`.

## Maqueta

Fiel al wireframe:

```
┌────────────────────────────────────────────────────────────┐
│                       Interactius                      ( ) │  cabecera
│                                                            │
│  Links                                                     │  etiqueta de grupo
│  ┌──────────┐ ┌──────────┐                                 │
│  │StarMeApp!│ │  Timer   │                                 │  ~2.4:1, apaisadas
│  └──────────┘ └──────────┘                                 │
│                                                            │
│  Tools                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │DeckMak_r │ │FormMak_r │ │ DSMak_r  │                    │  ~1.15:1, casi cuadradas
│  │Presentac.│ │Formulari.│ │Próximame.│                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└────────────────────────────────────────────────────────────┘
```

- Contenedor `max-width: 1120`, el mismo que usan las dos galerías.
- Título "Interactius" centrado en IBM Plex Mono; el círculo de logout a la derecha.
- Las tarjetas son de **ancho fijo con `flex-wrap`**, no una rejilla que estira: así quedan
  alineadas a la izquierda como en el wireframe en vez de repartirse el ancho.
- Etiquetas de grupo "Links" y "Tools" en el idioma del wireframe, tal cual.
- Tarjeta activa: fondo blanco, borde `warm-dark` que pasa a `dark` al pasar por encima, con el
  mismo desplazamiento y sombra que las tarjetas de la galería del deck.
- Tarjeta deshabilitada: fondo `warm-light`, borde `warm-dark`, contenido en `ash`.

## Accesibilidad

- La tarjeta deshabilitada es un `<div aria-disabled="true">`, **no** un `<a>`: no es focusable y no
  hay enlace muerto. La palabra "Próximamente" es visible, no solo un atributo.
- El enlace externo lleva `target="_blank"` y `rel="noopener noreferrer"`, y su nombre accesible
  indica que abre en una ventana nueva.
- El círculo de logout es un `<button>` real con `aria-label`, no un icono pulsable.
- Los grupos son `<section>` con su `<h2>`, para que el título del grupo no sea solo un estilo.

## Verificación

**Automática**

- `lib/workspace/__tests__/catalog.test.ts` — las invariantes del catálogo listadas arriba.
- `lib/auth/__tests__/safeNext.test.ts` — `/workspace` y `/home/loquesea` pasan; `/homefoo` no; el
  destino por defecto pasa a ser `/workspace`.
- `npm run type-check` y `npm run build` limpios.

**Manual**

1. Sin sesión, `/workspace` → 307 a `/deck/login?next=%2Fhome`.
2. Iniciar sesión sin `next` → aterrizas en `/workspace`, no en `/workspace/deckmak_r`.
3. Iniciar sesión con `next=/forms/maker` → sigue respetándose.
4. Las cinco tarjetas: DeckMak_r → `/workspace/deckmak_r`, FormMak_r → `/workspace/formmak_r`, Timer → `/timer`,
   StarMeApp! → `star-me.app` en pestaña nueva, DSMak_r no responde al clic ni al tabulador.
5. El círculo cierra sesión y deja en `/deck/login`.
6. "← Inicio" desde las dos galerías vuelve a `/workspace`.
7. Con el teclado: el orden de tabulación recorre las cuatro tarjetas activas y el logout, saltándose
   DSMak_r.

## Avisos de marca

- `Wordmark` usa **IBM Plex Mono 700** y `lib/tokens.ts` declara 400/500/600 para la tipografía de
  marca. Viene del `DeckLogo` original y esta pantalla lo hace más visible al mostrar tres wordmarks
  juntos. Sigue pendiente de decisión (ver [form-maker.md](form-maker.md)).
- `colors.brick` (`#C24B36`), el acento del guión bajo de los wordmarks, sigue sin estar en
  `lib/tokens.ts`.
- Esta pantalla **no** usa acentos de marca, a propósito: identifican servicios, no herramientas.
