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
    description: 'Presentaciones',
    wordmark: { before: 'DeckMak', after: 'r' },
  },
  {
    id: 'formmakr',
    label: 'FormMakr',
    group: 'tools',
    href: '/workspace/formmak_r',
    description: 'Formularios',
    wordmark: { before: 'FormMak', after: 'r' },
  },
  {
    id: 'dsmakr',
    label: 'DSMakr',
    group: 'tools',
    href: null,
    description: 'Próximamente',
    wordmark: { before: 'DSMak', after: 'r' },
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
