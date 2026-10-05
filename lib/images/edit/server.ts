import type { SupabaseClient } from '@supabase/supabase-js';
import { IMAGE_BUCKET } from '@/lib/storage/paths';
import { EDIT_LIMIT, EDIT_WINDOW_SECONDS, quotaKey, remainingEdits, resetDay, resetLabel } from '@/lib/images/quota';
import { staleTmp } from './files';

/* Lo que comparten las rutas de la edición en servidor: la cuota y los temporales. */

export const EDIT_FAILED =
  'No se ha podido editar la imagen. Este intento no cuenta para tu límite. Vuelve a intentarlo en un momento.';
export const SAVE_FAILED = 'No se ha podido guardar la edición. Vuelve a intentarlo.';

export const limitReached = () =>
  `Has llegado a las ${EDIT_LIMIT} ediciones de este mes. El contador se reinicia ${resetLabel(resetDay())}.`;

/* La cuota de quien llama: sesión de equipo, así que peek y refund solo aceptan su clave
   (20261002120000_images_ai.sql). */
export function quota(sb: SupabaseClient, userId: string) {
  const key = quotaKey(userId);
  return {
    key,
    /** Suma un intento; false si ya no caben (check_rate_limit suma igual: hay que devolverlo). */
    async take(): Promise<boolean> {
      const { data, error } = await sb.rpc('check_rate_limit', { p_key: key, p_limit: EDIT_LIMIT, p_window_seconds: EDIT_WINDOW_SECONDS });
      if (error) throw error;
      return data !== false;
    },
    async refund(): Promise<void> {
      const { error } = await sb.rpc('refund_rate_limit', { p_key: key });
      if (error) console.error('[images/edit:refund]', error.code ?? '-', error.message);
    },
    async remaining(): Promise<number> {
      const { data, error } = await sb.rpc('peek_rate_limit', { p_key: key, p_window_seconds: EDIT_WINDOW_SECONDS });
      if (error) throw error;
      return remainingEdits(Number(data ?? 0));
    },
    state(remaining: number) {
      const day = resetDay();
      return { limit: EDIT_LIMIT, remaining, resetsOn: day, resetLabel: resetLabel(day) };
    },
  };
}

/* Cada petición de edición purga antes los temporales de más de 24 horas (docs/features/img-r.md). Es
   limpieza: si falla, la edición sigue. 100 por pasada, los más viejos primero. */
export async function purgeStaleTmp(sb: SupabaseClient): Promise<void> {
  try {
    const { data, error } = await sb.storage
      .from(IMAGE_BUCKET)
      .list('images/_tmp', { limit: 100, sortBy: { column: 'created_at', order: 'asc' } });
    if (error) throw error;
    const stale = staleTmp((data ?? []).map((o) => ({ name: o.name, created_at: o.created_at ?? null })));
    if (stale.length) await sb.storage.from(IMAGE_BUCKET).remove(stale);
  } catch (e) {
    console.error('[images/edit:purge]', e);
  }
}

/* Los temporales de una edición que hay en Storage, con su peso: `list` con el id como búsqueda. */
export async function tmpObjects(sb: SupabaseClient, tmpId: string): Promise<Map<string, number>> {
  const { data, error } = await sb.storage.from(IMAGE_BUCKET).list('images/_tmp', { search: tmpId, limit: 10 });
  if (error) throw error;
  return new Map((data ?? []).map((o) => [`images/_tmp/${o.name}`, Number((o.metadata as { size?: number } | null)?.size ?? 0)]));
}
