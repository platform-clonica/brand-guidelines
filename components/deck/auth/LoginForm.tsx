'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeNext } from '@/lib/auth/safeNext';
import { TEAM_DOMAIN } from '@/lib/auth/team';
import * as s from './authUi';

/* Acceso al workspace: la cuenta de Google de Interactius, y nada más.

   El `hd` es SOLO comodidad de interfaz — le dice a Google que preseleccione la cuenta del dominio
   en el selector. No es una barrera y no debe contarse como tal: la persona puede editar la URL de
   consentimiento y quitarlo. Lo que de verdad cierra la puerta son el consent screen "Internal"
   del cliente OAuth, el hook before-user-created en Postgres, e isTeamEmail() en el gate.

   `prompt: 'select_account'` fuerza el selector en vez de reusar en silencio la última cuenta de
   Google del navegador. En equipos donde conviven la cuenta personal y la de empresa, entrar con
   la equivocada sin enterarse es el fallo más habitual. */

/* Tres motivos, tres mensajes. El genérico solo se usa cuando de verdad no sabemos qué pasó: un
   mensaje que no distingue causas convierte cualquier incidencia en una sesión de depuración. */
const ERRORS: Record<string, string> = {
  oauth: 'No se pudo completar el acceso. Inténtalo otra vez.',
  dominio: `Esa cuenta no es de ${TEAM_DOMAIN}. Entra con tu cuenta de Interactius.`,
  altas: 'Las altas están desactivadas en Supabase (Authentication → "Allow new users to sign up"). '
       + 'Tu cuenta no existe todavía y no se puede crear hasta que se reactiven.',
};

export function LoginForm({ next, error }: { next: string | null; error?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const message = failed ?? (error ? (ERRORS[error] ?? ERRORS.oauth) : null);

  async function onGoogle() {
    setBusy(true);
    setFailed(null);
    const { error: oauthError } = await supabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/workspace/callback?next=${encodeURIComponent(safeNext(next))}`,
        queryParams: { hd: TEAM_DOMAIN, prompt: 'select_account' },
      },
    });
    // En el camino feliz el navegador ya se ha ido a Google y esto no llega a ejecutarse.
    if (oauthError) {
      console.error('[auth:login] signInWithOAuth', oauthError.message);
      setBusy(false);
      setFailed(ERRORS.oauth);
    }
  }

  return (
    <div style={s.card}>
      <div style={s.title}>Iniciar sesión</div>
      <div style={s.subtitle}>Acceso a las herramientas de Interactius.</div>

      {message && <div style={s.errorBox}>{message}</div>}

      <button type="button" onClick={onGoogle} disabled={busy} style={busy ? s.submitBusy : s.submit}>
        {busy ? 'Conectando…' : 'Continuar con Google'}
      </button>

      <div style={s.footer}>Con tu cuenta @{TEAM_DOMAIN}.</div>
    </div>
  );
}
