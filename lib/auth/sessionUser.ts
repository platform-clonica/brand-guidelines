import { getUser } from '@/lib/supabase/server';

/* Los datos de quien ha entrado, en la forma que la cabecera necesita.

   Vive aquí y no en cada página porque son cinco las que pintan el menú de usuario, y la parte
   frágil —de qué campo sale el nombre y de cuál la foto— no debe estar copiada cinco veces.

   Google puebla `full_name` y `name` con lo mismo, y `avatar_url` y `picture` también. Se leen
   los dos de cada par para no depender de cuál manda: el proveedor los rellena a la vez, pero
   nada garantiza que siga siendo así, y el coste de mirar los dos es cero. */
export type SessionUser = {
  name: string;
  email: string;
  /** `null` si la cuenta no tiene foto: la cabecera cae a las iniciales. */
  avatarUrl: string | null;
};

export async function getSessionUser(): Promise<SessionUser> {
  /* El middleware garantiza sesión de equipo en todo /workspace, así que los `??` son por si
     acaso, no por si no. Devolver un objeto y no `null` evita que cinco cabeceras tengan que
     resolver un caso que no ocurre. */
  const user = await getUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string) : null);

  return {
    name: str('full_name') ?? str('name') ?? user?.email ?? 'Cuenta',
    email: user?.email ?? '',
    avatarUrl: str('avatar_url') ?? str('picture'),
  };
}
