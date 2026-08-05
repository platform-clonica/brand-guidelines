'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import * as s from './authUi';

/* Reached from the password-recovery email link. Supabase establishes a temporary
   recovery session (via the URL code/hash); we then let the user set a new password. */
export function ResetForm() {
  const [ready, setReady] = useState(false); // recovery session detected
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    let active = true;

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });

    (async () => {
      const url = new URL(window.location.href);
      // PKCE flow: exchange the ?code=… for a session.
      if (url.searchParams.get('code')) {
        try {
          await sb.auth.exchangeCodeForSession(window.location.search);
        } catch {
          /* falls through to the getSession check below */
        }
      }
      const { data } = await sb.auth.getSession();
      if (!active) return;
      if (data.session) setReady(true);
      setChecking(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) {
      setBusy(false);
      setError('No se pudo actualizar la contraseña. Solicita un enlace nuevo.');
      return;
    }
    setDone(true);
    setBusy(false);
    setTimeout(() => window.location.assign('/workspace'), 1200);
  }

  if (done) {
    return (
      <div style={s.card}>
        <div style={s.title}>Contraseña actualizada</div>
        <div style={s.noticeBox}>Entrando…</div>
      </div>
    );
  }

  if (!checking && !ready) {
    return (
      <div style={s.card}>
        <div style={s.title}>Enlace no válido</div>
        <div style={s.noticeBox}>
          El enlace ha caducado o ya se ha usado. Solicita uno nuevo.
        </div>
        <div style={s.footer}>
          <a href="/workspace/forgot" style={s.link}>Solicitar enlace</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={s.card}>
      <div style={s.title}>Nueva contraseña</div>
      <div style={s.subtitle}>Elige una contraseña de al menos 8 caracteres.</div>

      {error && <div style={s.errorBox}>{error}</div>}

      <div style={s.field}>
        <label style={s.label} htmlFor="password">Nueva contraseña</label>
        <input
          id="password" type="password" autoComplete="new-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} style={s.input}
        />
      </div>
      <div style={s.field}>
        <label style={s.label} htmlFor="confirm">Repetir contraseña</label>
        <input
          id="confirm" type="password" autoComplete="new-password" required
          value={confirm} onChange={(e) => setConfirm(e.target.value)} style={s.input}
        />
      </div>

      <button type="submit" disabled={busy || checking} style={busy || checking ? s.submitBusy : s.submit}>
        {checking ? 'Comprobando…' : busy ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  );
}
