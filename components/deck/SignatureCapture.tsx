'use client';
import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
/* Desde publicApi, NO desde api: este componente lo monta el visor público, y api.ts arrastra el
   SDK de Supabase entero. Ver la cabecera de lib/decks/publicApi.ts. */
import { signDeck } from '@/lib/decks/publicApi';
import type { DeckSignature } from '@/lib/decks/types';

/* Client-facing signature pad on the Acceptance page (viewer route only). Draws on a canvas,
   captures name/email, and POSTs to /api/sign. Once signed, the deck shows the immutable
   signed state to anyone who reopens the link. */
export function SignatureCapture({ deckId, initial }: { deckId: string; initial: DeckSignature | null }) {
  const [signed, setSigned] = useState<DeckSignature | null>(initial);
  if (signed) return <SignedState sig={signed} />;
  return <Pad deckId={deckId} onSigned={setSigned} />;
}

function SignedState({ sig }: { sig: DeckSignature }) {
  const when = new Date(sig.signed_at).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <div className="signpad signed">
      <div className="lab">Firmado por el cliente</div>
      <div className="signbox done">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sig.signature_png} alt={`Firma de ${sig.signer_name}`} />
      </div>
      <div className="meta">
        <strong>{sig.signer_name}</strong>
        <span>{sig.signer_email}</span>
        <span>{when}</span>
      </div>
    </div>
  );
}

function Pad({ deckId, onSigned }: { deckId: string; onSigned: (s: DeckSignature) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctx = () => canvasRef.current?.getContext('2d') ?? null;
  // Map a pointer event to canvas-space, absorbing both the deck's CSS scale and the 2× backing.
  const pos = (e: ReactPointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const start = (e: ReactPointerEvent) => {
    const g = ctx(); if (!g) return;
    drawing.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = pos(e);
    g.beginPath(); g.moveTo(p.x, p.y);
    g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1C1A17';
  };
  const move = (e: ReactPointerEvent) => {
    if (!drawing.current) return;
    const g = ctx(); if (!g) return;
    const p = pos(e);
    g.lineTo(p.x, p.y); g.stroke();
    if (!hasInk) setHasInk(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current, g = ctx();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Indica tu nombre.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Indica un email válido.');
    if (!hasInk || !canvasRef.current) return setError('Dibuja tu firma.');
    setBusy(true);
    try {
      const rec = await signDeck(deckId, {
        signer_name: name.trim(),
        signer_email: email.trim(),
        signature_png: canvasRef.current.toDataURL('image/png'),
      });
      onSigned(rec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la firma.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signpad">
      <div className="lab">Firma del cliente</div>
      <div className="signbox">
        <canvas
          ref={canvasRef}
          width={720}
          height={240}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && <span className="hint">Dibuja tu firma aquí</span>}
        {hasInk && <button type="button" className="clear" onClick={clear}>Borrar</button>}
      </div>
      <div className="fields">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellidos" aria-label="Nombre" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" inputMode="email" />
      </div>
      {error && <div className="err">{error}</div>}
      <button type="button" className="firmar" onClick={submit} disabled={busy}>
        {busy ? 'Registrando…' : 'Firmar'}
      </button>
    </div>
  );
}
