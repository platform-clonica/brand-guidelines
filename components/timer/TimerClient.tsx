'use client';

/* Timer — countdown for workshops and sessions. Ported from a standalone HTML artefact.
   Styling lives in timer.css (.ix-timer); the underline animation is .hover-wipe-relay
   from globals.css.

   How the state is split, and why:
   - React owns what the UI reads: phase, showHours, warning, displayMs, and the three
     fields while they are being typed.
   - Refs own the clock: endAt, totalMs, configuredMs, remainingMs. They change every
     frame and must not trigger renders.
   - The rAF loop only runs in `running` / `overtime`, and calls setDisplayMs solely when
     the visible second changes — ~1 render per second instead of 60. The macrón is
     written straight to the DOM by ref because at 1 Hz it would step visibly.

   Timekeeping is an absolute `endAt` timestamp, never an accumulator, so the countdown
   survives the browser throttling timers in a background tab. */

import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'running' | 'paused' | 'overtime';
type Fields = { hh: string; mm: string; ss: string };

const LABELS: Record<Phase, string> = {
  idle: 'En espera',
  running: 'En marcha',
  paused: 'En pausa',
  overtime: 'Tiempo cumplido',
};

const PRESETS = [5, 10, 15, 30, 45];
const ADDENDS = [1, 2, 5, 10];

const DEFAULT_MS = 10 * 60_000;
const WARNING_MS = 60_000;
const HOUR_MS = 3_600_000;
const BASE_TITLE = 'Timer · Interactius';

const LNK = 'ixt-lnk hover-wipe-relay';

/* ---------- conversiones ---------- */

function clampInt(value: string, max: number): number {
  const n = parseInt(value.replace(/\D/g, ''), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/* With hours hidden the minutes field absorbs them, so it accepts up to 999. */
function msFromFields(f: Fields, hours: boolean): number {
  const h = hours ? clampInt(f.hh, 99) : 0;
  const m = clampInt(f.mm, hours ? 59 : 999);
  const s = clampInt(f.ss, 59);
  return (h * 3600 + m * 60 + s) * 1000;
}

function fieldsFromMs(ms: number, hours: boolean): Fields {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return hours
    ? { hh: pad(h), mm: pad(m), ss: pad(s) }
    : { hh: '00', mm: pad(h * 60 + m), ss: pad(s) };
}

function shortLabel(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h > 0 ? `${h}:${pad(m)}` : pad(m)}:${pad(s)}`;
}

/* ---------- componente ---------- */

export function TimerClient() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [showHours, setShowHours] = useState(false);
  const [warning, setWarning] = useState(false);
  const [displayMs, setDisplayMs] = useState(DEFAULT_MS);
  const [fields, setFields] = useState<Fields>(() => fieldsFromMs(DEFAULT_MS, false));

  const endAtRef = useRef(0);
  const totalMsRef = useRef(DEFAULT_MS);
  const configuredMsRef = useRef(DEFAULT_MS);
  const remainingMsRef = useRef(DEFAULT_MS);
  const fillRef = useRef<HTMLSpanElement>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const alarmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------- macrón (fuera de React: se repinta cada frame) ---------- */

  const setFill = useCallback((ratio: number) => {
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
    }
  }, []);

  /* ---------- audio ---------- */

  const ensureAudio = useCallback((): AudioContext | null => {
    try {
      const existing = audioRef.current;
      if (!existing || existing.state === 'closed') {
        const Ctx =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        audioRef.current = new Ctx();
      }
      if (audioRef.current && audioRef.current.state === 'suspended') {
        void audioRef.current.resume();
      }
      return audioRef.current;
    } catch {
      audioRef.current = null;
      return null;
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (alarmTimerRef.current) {
      clearInterval(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }
  }, []);

  const startAlarm = useCallback(() => {
    const ac = ensureAudio();
    if (!ac) return;

    const beep = (freq: number, at: number, dur: number, peak: number) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(peak, at + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(at);
      osc.stop(at + dur + 0.03);
    };

    const group = () => {
      const t = ac.currentTime + 0.02;
      beep(587.33, t, 0.13, 0.11);
      beep(587.33, t + 0.26, 0.13, 0.11);
      beep(440.0, t + 0.52, 0.34, 0.1);
    };

    stopAlarm();
    let count = 0;
    group();
    // Self-limiting: it stops after ~30 s so an unattended room is not held hostage.
    alarmTimerRef.current = setInterval(() => {
      count += 1;
      if (count > 12) {
        stopAlarm();
        return;
      }
      group();
    }, 2600);
  }, [ensureAudio, stopAlarm]);

  /* ---------- bucle ---------- */

  useEffect(() => {
    if (phase !== 'running' && phase !== 'overtime') return;

    let raf = 0;
    let lastSec = -1;

    const frame = () => {
      const now = Date.now();

      if (phase === 'running') {
        const remaining = endAtRef.current - now;

        if (remaining <= 0) {
          remainingMsRef.current = 0;
          setFill(0);
          setDisplayMs(0);
          setWarning(false);
          setPhase('overtime');
          document.title = '00:00 · Interactius';
          startAlarm();
          return; // the effect re-runs for `overtime`
        }

        remainingMsRef.current = remaining;
        setFill(totalMsRef.current > 0 ? remaining / totalMsRef.current : 0);

        const sec = Math.round(remaining / 1000);
        if (sec !== lastSec) {
          lastSec = sec;
          setDisplayMs(remaining);
          setWarning(remaining <= WARNING_MS);
          document.title = `${LABELS.running} · ${shortLabel(remaining)}`;
        }
      } else {
        const over = now - endAtRef.current;
        const sec = Math.round(over / 1000);
        if (sec !== lastSec) {
          lastSec = sec;
          setDisplayMs(over);
          document.title = `−${shortLabel(over)} · Interactius`;
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, setFill, startAlarm]);

  /* Once the clock passes an hour it grows the hours field and keeps it, so the
     display never shrinks back mid-count. Idle is excluded: there the minutes
     field deliberately absorbs up to 999. */
  useEffect(() => {
    if (phase !== 'idle' && !showHours && displayMs >= HOUR_MS) setShowHours(true);
  }, [phase, showHours, displayMs]);

  /* Leaving the page must not leave the alarm ringing or the tab title hijacked. */
  useEffect(
    () => () => {
      if (alarmTimerRef.current) clearInterval(alarmTimerRef.current);
      const ac = audioRef.current;
      if (ac && ac.state !== 'closed') ac.close().catch(() => {});
      document.title = BASE_TITLE;
    },
    []
  );

  /* ---------- acciones ---------- */

  const commit = (ms: number) => {
    configuredMsRef.current = ms;
    totalMsRef.current = ms;
    remainingMsRef.current = ms;
  };

  const start = () => {
    if (phase !== 'idle') return;
    const ms = msFromFields(fields, showHours);
    if (ms <= 0) return;
    ensureAudio(); // the click is the user gesture that unlocks WebAudio
    commit(ms);
    endAtRef.current = Date.now() + ms;
    setDisplayMs(ms);
    setWarning(ms <= WARNING_MS);
    setFill(1);
    setPhase('running');
  };

  const pause = () => {
    if (phase !== 'running') return;
    const remaining = Math.max(0, endAtRef.current - Date.now());
    remainingMsRef.current = remaining;
    setDisplayMs(remaining);
    setPhase('paused');
  };

  const resume = () => {
    if (phase !== 'paused') return;
    endAtRef.current = Date.now() + remainingMsRef.current;
    setPhase('running');
  };

  const stop = () => {
    if (phase === 'idle') return;
    stopAlarm();
    const ms = configuredMsRef.current;
    totalMsRef.current = ms;
    remainingMsRef.current = ms;
    setPhase('idle');
    setWarning(false);
    setDisplayMs(ms);
    setFields(fieldsFromMs(ms, showHours));
    setFill(1);
    document.title = BASE_TITLE;
  };

  const addMinutes = (min: number) => {
    const ms = min * 60_000;

    if (phase === 'idle') {
      const next = msFromFields(fields, showHours) + ms;
      commit(next);
      setFields(fieldsFromMs(next, showHours));
      setDisplayMs(next);
      setFill(1);
      return;
    }

    // Past zero, adding time is a fresh stretch: reset the bar rather than
    // measuring the new minutes against the original total.
    if (phase === 'overtime') {
      stopAlarm();
      totalMsRef.current = ms;
      remainingMsRef.current = ms;
      endAtRef.current = Date.now() + ms;
      setDisplayMs(ms);
      setWarning(ms <= WARNING_MS);
      setFill(1);
      setPhase('running');
      return;
    }

    totalMsRef.current += ms;
    if (phase === 'running') {
      endAtRef.current += ms;
      remainingMsRef.current = endAtRef.current - Date.now();
    } else {
      remainingMsRef.current += ms;
    }
    const remaining = remainingMsRef.current;
    setDisplayMs(remaining);
    setWarning(remaining <= WARNING_MS);
    setFill(totalMsRef.current > 0 ? remaining / totalMsRef.current : 0);
  };

  const applyPreset = (min: number) => {
    const ms = min * 60_000;
    setShowHours(false);
    commit(ms);
    setFields(fieldsFromMs(ms, false));
    setDisplayMs(ms);
    setFill(1);
  };

  /* Converts the current total into the new layout instead of re-reading the fields,
     which the other mode would clamp: 90 minutes must become 01:30:00, not 00:59:00. */
  const toggleHours = () => {
    const ms = msFromFields(fields, showHours);
    const next = !showHours;
    setShowHours(next);
    commit(ms);
    setFields(fieldsFromMs(ms, next));
    setDisplayMs(ms);
    setFill(1);
  };

  const normalize = () => {
    if (phase !== 'idle') return;
    const ms = msFromFields(fields, showHours);
    commit(ms);
    setFields(fieldsFromMs(ms, showHours));
    setDisplayMs(ms);
    setFill(1);
  };

  /* ---------- teclado ---------- */

  const onKeyDown = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    const tag = el?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    /* A button *reached by keyboard* owns its own Space: without this, tabbing to
       "+5 min" and pressing Space would start the timer instead of adding time.
       :focus-visible is the distinction that matters — a button merely left focused
       by a mouse click is not keyboard navigation, and there Space must still be the
       start/pause shortcut the hint advertises. */
    const onFocusedButton = tag === 'BUTTON' && !!el && el.matches(':focus-visible');

    if (e.code === 'Space' && !typing && !onFocusedButton) {
      e.preventDefault();
      if (phase === 'idle') start();
      else if (phase === 'running') pause();
      else if (phase === 'paused') resume();
      else stopAlarm();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typing) el?.blur();
      stop();
      return;
    }
    if (e.key === 'ArrowUp' && !typing) {
      e.preventDefault();
      addMinutes(1);
    }
  };

  // The listener is registered once; the ref keeps it pointing at the latest closure.
  const keyRef = useRef(onKeyDown);
  useEffect(() => {
    keyRef.current = onKeyDown;
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyRef.current(e);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);

  /* ---------- render ---------- */

  const idle = phase === 'idle';
  const shown = idle ? fields : fieldsFromMs(displayMs, showHours);

  const onFieldChange = (key: keyof Fields, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, max);
    setFields((prev) => ({ ...prev, [key]: digits }));
  };

  const onFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
      start();
    }
  };

  const fieldProps = {
    inputMode: 'numeric' as const,
    readOnly: !idle,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      if (idle) e.currentTarget.select();
    },
    onBlur: normalize,
    onKeyDown: onFieldKeyDown,
  };

  /* A pointer click leaves the button focused, and Chrome's :focus-visible heuristic is
     sticky once the user has touched the keyboard — so "type the minutes, click a preset,
     press Space" would re-fire the preset instead of starting. Dropping focus on a real
     pointer click (detail > 0) makes it deterministic; keyboard activation reports 0 and
     keeps its place in the tab order. */
  const act = (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail > 0) e.currentTarget.blur();
    fn();
  };

  const className = [
    'ix-timer',
    `is-${phase}`,
    phase === 'running' && warning ? 'is-warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main className={className}>
      <div className="ixt-pulse" aria-hidden />

      <div className="ixt-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/interactius-positivo.svg" alt="interactīus" />
      </div>

      <div className="ixt-stage">
        <p className="ixt-eyebrow" role="status" aria-live="polite">
          {LABELS[phase]}
        </p>

        <div className="ixt-stack">
          <div className="ixt-macron">
            <span ref={fillRef} />
          </div>

          <div className="ixt-display">
            {phase === 'overtime' && <span className="ixt-sign">−</span>}
            {showHours && (
              <>
                <input
                  {...fieldProps}
                  value={shown.hh}
                  maxLength={2}
                  aria-label="Horas"
                  onChange={onFieldChange('hh', 2)}
                />
                <span className="ixt-sep">:</span>
              </>
            )}
            <input
              {...fieldProps}
              value={shown.mm}
              maxLength={showHours ? 2 : 3}
              className={shown.mm.length > 2 ? 'ixt-input--wide' : undefined}
              aria-label="Minutos"
              onChange={onFieldChange('mm', showHours ? 2 : 3)}
            />
            <span className="ixt-sep">:</span>
            <input
              {...fieldProps}
              value={shown.ss}
              maxLength={2}
              aria-label="Segundos"
              onChange={onFieldChange('ss', 2)}
            />
          </div>
        </div>

        <div className="ixt-row ixt-row--primary">
          {idle && (
            <button type="button" className={`${LNK} ixt-lnk--lead`} onClick={act(start)}>
              Iniciar
            </button>
          )}
          {phase === 'running' && (
            <button type="button" className={`${LNK} ixt-lnk--lead`} onClick={act(pause)}>
              Pausar
            </button>
          )}
          {phase === 'paused' && (
            <button type="button" className={`${LNK} ixt-lnk--lead`} onClick={act(resume)}>
              Reanudar
            </button>
          )}
          {phase === 'overtime' && (
            <button
              type="button"
              className={`${LNK} ixt-lnk--lead ixt-lnk--accent`}
              onClick={act(stopAlarm)}
            >
              Silenciar
            </button>
          )}
          {!idle && (
            <button
              type="button"
              className={`${LNK} ixt-lnk--lead ixt-lnk--quiet`}
              onClick={act(stop)}
            >
              Detener
            </button>
          )}
        </div>

        {idle && (
          <div className="ixt-row ixt-row--secondary">
            <span className="ixt-group-label">Rápidos</span>
            {PRESETS.map((min) => (
              <button key={min} type="button" className={LNK} onClick={act(() => applyPreset(min))}>
                {min} min
              </button>
            ))}
          </div>
        )}

        <div className="ixt-row ixt-row--secondary">
          <span className="ixt-group-label">Añadir</span>
          {ADDENDS.map((min) => (
            <button key={min} type="button" className={LNK} onClick={act(() => addMinutes(min))}>
              +{min} min
            </button>
          ))}
        </div>

        {idle && (
          <div className="ixt-row ixt-row--tertiary">
            <button type="button" className={`${LNK} ixt-lnk--tiny`} onClick={act(toggleHours)}>
              {showHours ? 'Ocultar horas' : 'Mostrar horas'}
            </button>
          </div>
        )}
      </div>

      <p className="ixt-hint">
        <span>Espacio · iniciar y pausar</span>
        <span>Esc · detener</span>
        <span>↑ · +1 min</span>
      </p>
    </main>
  );
}
