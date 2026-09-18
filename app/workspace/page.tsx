import type { Metadata } from 'next';
import { GROUPS, appsIn } from '@/lib/workspace/catalog';
import { AppTile } from '@/components/workspace/AppTile';
import { ToolsMenu } from '@/components/workspace/ToolsMenu';
import { UserMenu, type SessionUser } from '@/components/studio/UserMenu';
import { getUser, supabaseAuthServer } from '@/lib/supabase/server';
import { overlayFor, type OverlayData } from '@/components/workspace/tileOverlays';
import { availableActions } from '@/lib/clock/actions';
import { compileDay } from '@/lib/clock/compile';
import type { ScheduleTramo } from '@/lib/clock/calendar';
import { todayIn } from '@/lib/clock/dates';
import '@/components/workspace/workspace.css';

/* Dispatcher: la pantalla a la que se llega al iniciar sesión (lib/auth/safeNext.ts).
   El acceso lo controla middleware.ts.

   Deja de ser estática y de ser JavaScript cero, y las dos cosas son consecuencia de lo mismo:
   la cabecera muestra la foto de quien ha entrado. Leer la sesión obliga a renderizar por
   petición, y el menú desplegable necesita cliente. Lo único que se envía al navegador es
   UserMenu; las tarjetas siguen siendo server components y los enlaces siguen siendo <a>. */

/* Descripción validada con el motor de tono del repo (lib/eval.ts): 21 palabras, dentro del rango
   de sentenceLength (15-22), score 100, sin lista roja ni puntuación prohibida.

   Lleva `openGraph` propio a propósito. Next NO fusiona ese objeto con el del layout raíz: sin
   esto, un enlace al workspace pegado en Slack se anunciaría como "Interactius · Brand Guidelines
   2026", que es otra cosa. La imagen se repite para que la tarjeta no salga vacía. */
export const metadata: Metadata = {
  title: 'Workspace de Interactius',
  description:
    'Punto de entrada a las herramientas internas de Interactius: presentaciones, formularios y reescritura de textos con la voz de la marca.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Workspace de Interactius',
    description:
      'Punto de entrada a las herramientas internas de Interactius: presentaciones, formularios y reescritura de textos con la voz de la marca.',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
};

/* Qué puede fichar quien mira el lanzador, resuelto en servidor para que la tarjeta no parpadee.

   SE LEE SIN CREAR, y es deliberado: `clock_ensure_person` daría de alta a cualquiera por el mero
   hecho de abrir el lanzador, o sea ANTES de haber visto el aviso de protección de datos. El alta
   ocurre dentro de Clock_r, que es su sitio. Sin ficha, la tarjeta solo enlaza.

   Esto hace que la home deje de ser gratis: dos consultas más para todo el equipo, incluida la
   gente que no use Clock_r. Es el coste de que fichar cueste un clic, que es la razón de existir de
   la herramienta. Se mitiga lo que se puede: sin ficha no se consulta ningún asiento. */
async function datosDeOverlay(userId: string | null): Promise<OverlayData> {
  if (!userId) return {};

  const sb = await supabaseAuthServer();

  /* SE FILTRA POR `user_id` EXPRESAMENTE, y no se deja que la RLS desambigüe. La política de
     lectura es `clock_is_admin() OR user_id = auth.uid()`, así que a administración le devuelve el
     equipo ENTERO: sin este filtro, `maybeSingle()` falla en cuanto hay una segunda persona en la
     tabla, y la tarjeta del lanzador se rompería solo para quien administra.

     La RLS decide SI puedo ver una fila, no CUÁL de ellas soy yo. Son dos preguntas distintas y
     confundirlas funciona mientras haya un único usuario. */
  const { data: persona } = await sb
    .from('clock_people')
    .select('id, schedules')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (!persona) return {};

  const hoy = todayIn();
  const { data: asientos } = await sb
    .from('clock_entries')
    .select('*')
    .eq('person_id', persona.id)
    .eq('work_date', hoy)
    .order('seq');

  const { day } = compileDay(asientos ?? [], {
    workDate: hoy,
    schedules: Array.isArray(persona.schedules) ? (persona.schedules as ScheduleTramo[]) : [],
    absences: [],
    holidays: [],
  });

  /* Solo hace falta la acción principal: la tarjeta es de un clic. Las secundarias —empezar una
     pausa— viven en la herramienta, donde hay sitio para explicarlas. */
  return { clock: { accion: availableActions(day)[0] ?? null } };
}

export default async function HomePage() {
  /* El middleware garantiza que aquí hay sesión de equipo; los `??` son por si acaso, no por si
     no. Google manda `full_name`/`name` y `avatar_url`/`picture` — se leen los dos nombres porque
     el proveedor puebla ambos y no conviene depender de cuál. */
  const user = await getUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string) : null);

  const overlays = await datosDeOverlay(user?.id ?? null);

  const sesion: SessionUser = {
    name: str('full_name') ?? str('name') ?? user?.email ?? 'Cuenta',
    email: user?.email ?? '',
    avatarUrl: str('avatar_url') ?? str('picture'),
  };

  return (
    <div className="ix-workspace">
      {/* Misma cabecera que las landings de las herramientas: barra con filete inferior,
          imagotipo a la izquierda y cerrar sesión a la derecha. */}
      <header className="ixw-header">
        {/* El imagotipo es el <h1> de la página y, al pasar por encima, el atajo a las Tools.
            Sigue enlazando a la home: el menú acompaña al enlace, no lo sustituye. */}
        <h1 className="ixw-header__title">
          <ToolsMenu />
          <span className="ixw-sr">Interactius</span>
        </h1>
        <UserMenu user={sesion} className="ixw-header__logout" />
      </header>

      <main className="ixw-main">
        {GROUPS.map((group) => (
          <section className="ixw-section" key={group.id} aria-labelledby={`grupo-${group.id}`}>
            <h2 className="ixw-section__title" id={`grupo-${group.id}`}>
              {group.title}
            </h2>
            <div className="ixw-grid">
              {appsIn(group.id).map((app) => (
                <AppTile key={app.id} app={app} overlay={overlayFor(app.overlay, overlays)} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
