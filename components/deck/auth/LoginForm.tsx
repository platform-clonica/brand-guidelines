'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeNext } from '@/lib/auth/safeNext';
import * as s from './authUi';

/* Only allow same-app redirects into the team tools (avoid open-redirect) — lib/auth/safeNext.ts. */

export function LoginForm({ next }: { next: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setError('Email o contraseña incorrectos.');
      return;
    }
    // Full navigation so the fresh session cookie reaches the middleware gate.
    window.location.assign(safeNext(next));
  }

  return (
    <form onSubmit={onSubmit} style={s.card}>
      <div style={s.title}>Iniciar sesión</div>
      {/* Este login ya no es solo del DeckMaker: da acceso a todas las herramientas internas. */}
      <div style={s.subtitle}>Acceso a las herramientas de Interactius.</div>

      {error && <div style={s.errorBox}>{error}</div>}

      <div style={s.field}>
        <label style={s.label} htmlFor="email">Email</label>
        <input
          id="email" type="email" autoComplete="username" required
          value={email} onChange={(e) => setEmail(e.target.value)} style={s.input}
        />
      </div>
      <div style={s.field}>
        <label style={s.label} htmlFor="password">Contraseña</label>
        <input
          id="password" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} style={s.input}
        />
      </div>

      <button type="submit" disabled={busy} style={busy ? s.submitBusy : s.submit}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>

      <div style={s.footer}>
        <Link href="/workspace/forgot" style={s.link}>¿Olvidaste tu contraseña?</Link>
      </div>
    </form>
  );
}
