/* Home dispatcher — el catálogo de aplicaciones.

   Una sola tabla declarativa: añadir una herramienta en el futuro es UNA entrada aquí, no tocar
   maquetación. Mismo patrón que LAYOUT_CATALOG en lib/deck/catalog.ts.

   Las invariantes (ids únicos, externos absolutos, deshabilitados sin href, tools con wordmark)
   están cubiertas por __tests__/catalog.test.ts, no por tipos: TypeScript no puede expresar
   "external implica https://". */

export type AppGroup = 'links' | 'tools';

export type AppEntry = {
  /** Único y estable: es la key de React y el gancho de los tests. */
  id: string;
  /** Nombre accesible y, en `links`, el texto visible de la tarjeta. */
  label: string;
  group: AppGroup;
  /** `null` ⇒ la herramienta aún no existe: tarjeta apagada, sin enlace. */
  href: string | null;
  /** Abre en pestaña nueva. Solo para destinos fuera de este dominio. */
  external?: boolean;
  /** Línea bajo el logotipo, en `tools`. */
  description?: string;
  /** Wordmark de la herramienta, partido por el guión bajo (ver components/studio/Wordmark.tsx). */
  wordmark?: { before: string; after: string };
  /* Una tarjeta que además HACE algo, no solo lleva a un sitio. Es un DATO y no JSX, por lo mismo
     que los iconos no están aquí: este módulo es tabla de datos pura y lo importan los tests. El
     componente que le corresponde vive en components/workspace/tileOverlays.tsx, igual que el mapa
     de iconos vive en AppIcon.tsx. Así el dispatcher no necesita un `if` sobre un id concreto. */
  overlay?: 'clock';
};

export const APPS: AppEntry[] = [
  {
    id: 'starmeapp',
    label: 'StarMeApp!',
    group: 'links',
    href: 'https://star-me.app/',
    external: true,
  },
  {
    id: 'timer',
    label: 'Timer',
    group: 'links',
    href: '/timer',
  },
  {
    id: 'deckmakr',
    label: 'DeckMakr',
    group: 'tools',
    href: '/workspace/deckmak_r',
    description: 'Presentaciones comerciales',
    wordmark: { before: 'DeckMak', after: 'r' },
  },
  {
    id: 'formmakr',
    label: 'FormMakr',
    group: 'tools',
    href: '/workspace/formmak_r',
    description: 'Crea formularios',
    wordmark: { before: 'FormMak', after: 'r' },
  },
  {
    id: 'rewritr',
    label: 'ReWritr',
    group: 'tools',
    href: '/workspace/rewrit_r',
    description: 'Mejora tus textos',
    wordmark: { before: 'ReWrit', after: 'r' },
  },
  {
    id: 'dsmakr',
    label: 'DSMakr',
    group: 'tools',
    href: '/workspace/dsmak_r',
    description: 'Design systems',
    wordmark: { before: 'DSMak', after: 'r' },
  },
  {
    id: 'clockr',
    label: 'Clockr',
    group: 'tools',
    href: '/workspace/clock_r',
    description: 'Registro horario',
    wordmark: { before: 'Clock', after: 'r' },
    /* Se ficha desde aquí, sin entrar. La fricción de fichar es la razón de existir de la
       herramienta: un registro que cuesta abrir se llena de olvidos. */
    overlay: 'clock',
  },
  {
    id: 'socialmakr',
    label: 'SocialMakr',
    group: 'tools',
    href: null,
    description: 'Próximamente',
    wordmark: { before: 'SocialMak', after: 'r' },
  },
];

/* Los grupos, en el orden en el que se pintan. El título es el del wireframe. */
export const GROUPS: { id: AppGroup; title: string }[] = [
  { id: 'links', title: 'Links' },
  { id: 'tools', title: 'Tools' },
];

export function appsIn(group: AppGroup): AppEntry[] {
  return APPS.filter((a) => a.group === group);
}
