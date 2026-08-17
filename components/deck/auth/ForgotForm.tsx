'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import * as s from './authUi';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/workspace/reset`,
    });
    setBusy(false);
    // Neutral confirmation regardless of whether the email exists (no account enumeration).
    if (error) setError('No se pudo enviar el email. Inténtalo de nuevo en unos minutos.');
    else setSent(true);
  }

  if (sent) {
    return (
      <div style={s.card}>
        <div style={s.title}>Revisa tu email</div>
        <div style={s.noticeBox}>
          Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña.
        </div>
        <div style={s.footer}>
          <Link href="/workspace/login" style={s.link}>Volver a iniciar sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={s.card}>
      <div style={s.title}>Recuperar contraseña</div>
      <div style={s.subtitle}>Te enviaremos un enlace para crear una nueva.</div>

      {error && <div style={s.errorBox}>{error}</div>}

      <div style={s.field}>
        <label style={s.label} htmlFor="email">Email</label>
        <input
          id="email" type="email" autoComplete="username" required
          value={email} onChange={(e) => setEmail(e.target.value)} style={s.input}
        />
      </div>

      <button type="submit" disabled={busy} style={busy ? s.submitBusy : s.submit}>
        {busy ? 'Enviando…' : 'Enviar enlace'}
      </button>

      <div style={s.footer}>
        <Link href="/workspace/login" style={s.link}>Volver a iniciar sesión</Link>
      </div>
    </form>
  );
}
