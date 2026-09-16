'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/deck/studio/ConfirmModal';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnDanger, btnGhost, colors } from '@/components/deck/studio/ui';
import { IssuesPanel } from '@/components/studio/IssuesPanel';
import { ConflictError, getDesignSystem, updateDesignSystem, uploadDsLogo } from '@/lib/ds/api';
import { compileSystem, type DsIssue } from '@/lib/ds/compile';
import { tokenDiff } from '@/lib/ds/diff';
import { composeTokens, ENGINE_VERSION } from '@/lib/ds/engine/index';
import { liveSystem } from '@/lib/ds/live';
import type { Brand, Configs, Overrides, Tokens } from '@/lib/ds/schema';
import { stepForPath, type DsStep } from '@/lib/ds/steps';
import type { DesignSystemRecord, DsStatus } from '@/lib/ds/types';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { ALERT, MONO } from './controls';
import { DsToolbar } from './DsToolbar';
import { Preview } from './preview/Preview';
import { BrandStep, type LogoKind } from './steps/BrandStep';
import { ComponentsStep } from './steps/ComponentsStep';
import { DeliveryStep } from './steps/DeliveryStep';
import { FoundationsStep } from './steps/FoundationsStep';

const GALLERY = '/workspace/dsmak_r';

/* Lo que guarda el autoguardado. `engine` no viaja al servidor como tal: marca con qué motor están
   calculados los tokens de la fila. Al cargar un sistema de otro motor la instantánea guardada lleva
   esa versión y el valor vivo la actual, así que al regenerar el documento pasa a `dirty` solo y se
   guarda por la vía normal, sin un guardado a mano aparte. */
type SaveValue = {
  brand: Brand | null;
  overrides: Overrides;
  configs: Configs;
  status: DsStatus;
  logo_path: string | null;
  logo_dark_path: string | null;
  engine: string;
};

const byLevel = (a: DsIssue, b: DsIssue) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1);

/* Editor de DSMak_r: carga, estado, autoguardado y paso activo. Ningún paso importa a otro: el paso
   activo es un número sobre este estado (definición, Interfaz).

   Tres situaciones que el editor tiene que contar:
   - Motor antiguo (plan, H4): se abre en solo lectura con los tokens guardados, y regenerar enseña
     antes cuántos valores van a cambiar.
   - Conflicto (plan, H7): otra pestaña guardó antes. No se reintenta; se ofrece recargar o guardar
     encima.
   - Errores de validación: el servidor los rechazaría, así que el autoguardado se pausa y la
     previsualización se queda en la última versión válida. */
export function DsStudio({ systemId }: { systemId: string }) {
  const router = useRouter();

  const [loadError, setLoadError] = useState<string | null>(null);
  const [unrecoverable, setUnrecoverable] = useState<DsIssue[] | null>(null);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [configs, setConfigs] = useState<Configs>({});
  const [status, setStatus] = useState<DsStatus>('draft');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoDarkPath, setLogoDarkPath] = useState<string | null>(null);

  const [storedTokens, setStoredTokens] = useState<Tokens | null>(null);
  const [rowEngine, setRowEngine] = useState(ENGINE_VERSION);
  const [loadIssues, setLoadIssues] = useState<DsIssue[]>([]);
  const [readOnly, setReadOnly] = useState(false);

  const [step, setStep] = useState<DsStep>(1);
  const [guard, setGuard] = useState<null | { run: () => void }>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [logoBusy, setLogoBusy] = useState<LogoKind | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  /* `updated_at` de la última versión que este editor conoce: la condición del PATCH (plan, H7). */
  const updatedAtRef = useRef('');
  /* `updated_at` que devolvió el 409, para "Guardar encima". `null` si el 409 fue por versión del motor. */
  const conflictAtRef = useRef<string | null>(null);

  /* ── En vivo ─────────────────────────────────────────────────────────────── */
  const live = useMemo(() => (brand ? liveSystem({ brand, overrides, configs }) : null), [brand, overrides, configs]);

  /* Última versión válida de los tokens, para no dejar la pantalla en blanco mientras hay un error. */
  const lastGood = useRef<Tokens | null>(null);
  if (live?.tokens) lastGood.current = live.tokens;
  const tokens = readOnly ? (storedTokens ?? lastGood.current) : (live?.tokens ?? lastGood.current);

  /* ── Guardado ────────────────────────────────────────────────────────────── */
  const saveValue = useMemo<SaveValue>(
    () => ({ brand, overrides, configs, status, logo_path: logoPath, logo_dark_path: logoDarkPath, engine: ENGINE_VERSION }),
    [brand, overrides, configs, status, logoPath, logoDarkPath],
  );

  const { saveState, dirty, retry, markSaved } = useAutosave<SaveValue>({
    enabled: !!brand && !readOnly,
    paused: live?.blocking ?? false,
    value: saveValue,
    isConflict: (e) => e instanceof ConflictError,
    save: async (v) => {
      if (!v.brand) return;
      try {
        const rec = await updateDesignSystem(systemId, {
          expectedUpdatedAt: updatedAtRef.current,
          engineVersion: ENGINE_VERSION,
          brand: v.brand,
          overrides: v.overrides,
          configs: v.configs,
          status: v.status,
          logo_path: v.logo_path,
          logo_dark_path: v.logo_dark_path,
        });
        updatedAtRef.current = rec.updated_at;
        setRowEngine(rec.engine_version);
      } catch (e) {
        if (e instanceof ConflictError) conflictAtRef.current = e.updatedAt;
        throw e;
      }
    },
  });

  /* ── Carga ───────────────────────────────────────────────────────────────── */
  const applyRecord = useCallback(
    (rec: DesignSystemRecord) => {
      const compiled = compileSystem(rec);
      updatedAtRef.current = rec.updated_at;
      setRowEngine(rec.engine_version);
      setLoadIssues(compiled.issues);
      if (!compiled.system) {
        setUnrecoverable(compiled.issues);
        return;
      }
      const s = compiled.system;
      setBrand(s.brand);
      setOverrides(s.overrides);
      setConfigs(s.configs);
      setStatus(rec.status);
      setLogoPath(rec.logo_path);
      setLogoDarkPath(rec.logo_dark_path);
      setStoredTokens(s.tokens);
      setReadOnly(compiled.engineMismatch);
      markSaved({
        brand: s.brand,
        overrides: s.overrides,
        configs: s.configs,
        status: rec.status,
        logo_path: rec.logo_path,
        logo_dark_path: rec.logo_dark_path,
        engine: rec.engine_version,
      });
    },
    [markSaved],
  );

  useEffect(() => {
    let alive = true;
    getDesignSystem(systemId)
      .then((rec) => alive && applyRecord(rec))
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el sistema'));
    return () => {
      alive = false;
    };
  }, [systemId, applyRecord]);

  const [prevSaveState, setPrevSaveState] = useState(saveState);
  if (prevSaveState !== saveState) {
    setPrevSaveState(saveState);
    if (saveState === 'conflict') setConflictOpen(true);
  }

  /* ── Acciones ────────────────────────────────────────────────────────────── */
  const pending = dirty && !readOnly;
  const withGuard = (run: () => void) => (pending ? setGuard({ run }) : run());

  const onSystem = (nextBrand: Brand, nextOverrides?: Overrides) => {
    setBrand(nextBrand);
    if (nextOverrides) setOverrides(nextOverrides);
  };

  /* El logo se sube al momento (necesita la ruta para guardarla) y la fila la recoge el autoguardado.
     Cambiarlo deja el fichero anterior en el bucket: ver Pendiente en el plan. */
  const onLogo = async (kind: LogoKind, file: File | null) => {
    const setPath = kind === 'light' ? setLogoPath : setLogoDarkPath;
    setLogoError(null);
    if (!file) {
      setPath(null);
      return;
    }
    setLogoBusy(kind);
    try {
      setPath(await uploadDsLogo(systemId, file));
    } catch (e) {
      setLogoError(e instanceof Error ? `No se pudo subir el logo: ${e.message}` : 'No se pudo subir el logo.');
    } finally {
      setLogoBusy(null);
    }
  };

  const reloadFromServer = async () => {
    setConflictOpen(false);
    try {
      applyRecord(await getDesignSystem(systemId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'No se pudo recargar el sistema');
    }
  };

  const overwrite = () => {
    if (conflictAtRef.current) updatedAtRef.current = conflictAtRef.current;
    setConflictOpen(false);
    void retry();
  };

  const regenDiff = useMemo(() => {
    if (!regenOpen || !brand) return [];
    return tokenDiff(storedTokens, composeTokens(brand, overrides).tokens);
  }, [regenOpen, brand, overrides, storedTokens]);

  const issues = useMemo(() => [...(readOnly ? loadIssues : (live?.issues ?? []))].sort(byLevel), [readOnly, loadIssues, live]);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  const textStyle = { padding: 40, font: `400 13px/1.6 ${MONO}` } as const;
  const backLink = (
    <button
      onClick={() => router.push(GALLERY)}
      style={{ font: `400 13px/1.6 ${MONO}`, color: colors.dark, background: 'none', border: 0, padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
    >
      Volver a la galería
    </button>
  );

  if (loadError) {
    return (
      <div style={{ ...textStyle, color: ALERT }}>
        {loadError} {backLink}
      </div>
    );
  }

  if (unrecoverable) {
    return (
      <div style={{ ...textStyle, color: colors.dark, maxWidth: 720 }}>
        <p style={{ color: ALERT, marginTop: 0 }}>Este sistema no se puede abrir: su marca está dañada y no se puede reconstruir.</p>
        <ul style={{ paddingLeft: 18 }}>
          {unrecoverable.map((i, n) => (
            <li key={n}>
              <span style={{ color: colors.ash }}>{i.path}</span> {i.message}
            </li>
          ))}
        </ul>
        {backLink}
      </div>
    );
  }

  if (!brand || !tokens) {
    return <div style={{ ...textStyle, color: colors.ash }}>Cargando</div>;
  }

  const name = brand.name.trim() || 'Sistema sin nombre';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: colors.warmLight }}>
      <DsToolbar
        name={name}
        step={step}
        onStep={setStep}
        status={status}
        onToggleStatus={() => setStatus((s) => (s === 'published' ? 'draft' : 'published'))}
        saveState={saveState}
        dirty={pending}
        paused={live?.blocking ?? false}
        readOnly={readOnly}
        onHome={() => withGuard(() => router.push(GALLERY))}
        onRetry={() => void retry()}
        onConflict={() => setConflictOpen(true)}
      />

      {readOnly && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '10px 16px', flexShrink: 0,
            background: 'rgba(153,51,95,.06)', borderBottom: `1px solid ${colors.warmDark}`,
            font: `400 12px/1.5 ${MONO}`, color: colors.dark,
          }}
        >
          <span style={{ flex: 1, minWidth: 280 }}>
            Este sistema se generó con la versión {rowEngine} del motor y la actual es la {ENGINE_VERSION}. Se muestra tal como se guardó y no
            se puede editar hasta regenerarlo.
          </span>
          <button type="button" style={btn} onClick={() => setRegenOpen(true)}>
            Regenerar con el motor actual
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Paso 3: lleva su propio `fieldset`, porque en solo lectura la lista de componentes tiene que
            poder recorrerse aunque sus controles no respondan. */}
        {step === 3 && <ComponentsStep tokens={tokens} configs={configs} readOnly={readOnly} onConfigs={setConfigs} />}

        {/* Paso 4: no edita nada, así que tampoco necesita desactivarse en solo lectura. Un sistema de
            motor antiguo se entrega tal como se guardó, que es justo lo que pide H4. */}
        {step === 4 && <DeliveryStep name={name} brand={brand} tokens={tokens} configs={configs} />}

        {/* Solo lectura = los controles no responden. `fieldset` los desactiva todos de una vez. */}
        {step < 3 && (
        <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, flex: 1, display: 'flex', minHeight: 0 }}>
          {step === 1 && (
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
              <BrandStep
                brand={brand}
                overrides={overrides}
                contrast={live?.contrast ?? []}
                logos={{ light: logoPath, dark: logoDarkPath }}
                logoBusy={logoBusy}
                logoError={logoError}
                onSystem={onSystem}
                onLogo={(kind, file) => void onLogo(kind, file)}
              />
            </div>
          )}
          {step === 2 && (
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
              <FoundationsStep
                brand={brand}
                overrides={overrides}
                tokens={tokens}
                contrast={live?.contrast ?? []}
                onOverrides={setOverrides}
                onBrand={(b) => onSystem(b)}
              />
            </div>
          )}
        </fieldset>
        )}

        {step === 2 && (
          <aside style={{ width: 'min(440px, 40vw)', flexShrink: 0, overflowY: 'auto', borderLeft: `1px solid ${colors.warmDark}` }}>
            <Preview tokens={tokens} name={name} logoPath={logoPath} logoDarkPath={logoDarkPath} />
          </aside>
        )}
      </div>

      <IssuesPanel
        issues={issues}
        stale={!readOnly && !live?.tokens}
        staleMessage="Hay valores no válidos: la pantalla muestra la última versión válida y no se guarda nada hasta corregirlos."
        locate={(issue) => {
          const target = stepForPath(issue.path);
          return target ? { label: `P${target}`, title: `Ir al paso ${target}` } : null;
        }}
        onJump={(issue) => {
          const target = stepForPath(issue.path);
          if (target) setStep(target);
        }}
      />

      {regenOpen && (
        <Modal title="Regenerar con el motor actual" onClose={() => setRegenOpen(false)}>
          <div style={{ font: `400 13px/1.55 ${MONO}`, color: colors.dark, marginBottom: 16 }}>
            {regenDiff.length === 0
              ? 'No cambia ningún valor: solo se actualiza la versión del motor.'
              : `Cambian ${regenDiff.length} ${regenDiff.length === 1 ? 'valor' : 'valores'}. Si este sistema ya se entregó, los ficheros nuevos no coincidirán con los que tiene el cliente.`}
          </div>
          {regenDiff.length > 0 && (
            <ul style={{ margin: '0 0 20px', paddingLeft: 18, maxHeight: 180, overflowY: 'auto', font: `400 11px/1.6 ${MONO}`, color: colors.ash }}>
              {regenDiff.slice(0, 40).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {regenDiff.length > 40 && <li>y {regenDiff.length - 40} más</li>}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnGhost} onClick={() => setRegenOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              style={btn}
              onClick={() => {
                setRegenOpen(false);
                setReadOnly(false);
              }}
            >
              Regenerar
            </button>
          </div>
        </Modal>
      )}

      {conflictOpen && (
        <Modal title="Otra pestaña ha guardado" onClose={() => setConflictOpen(false)}>
          <div style={{ font: `400 13px/1.55 ${MONO}`, color: colors.dark, marginBottom: 24 }}>
            {conflictAtRef.current
              ? 'Este sistema se ha guardado desde otra pestaña después de que lo abrieras. Recargar trae esa versión y descarta tus cambios de aquí. Guardar encima conserva los tuyos y pisa los de la otra pestaña.'
              : 'El servidor ya usa otra versión del motor. Recarga la página para seguir: tus últimos cambios no se han guardado.'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" style={btnGhost} onClick={() => setConflictOpen(false)}>
              Cerrar
            </button>
            {conflictAtRef.current ? (
              <>
                <button type="button" style={btnGhost} onClick={() => void reloadFromServer()}>
                  Recargar
                </button>
                <button type="button" style={btnDanger} onClick={overwrite}>
                  Guardar encima
                </button>
              </>
            ) : (
              <button type="button" style={btn} onClick={() => window.location.reload()}>
                Recargar la página
              </button>
            )}
          </div>
        </Modal>
      )}

      {guard && (
        <ConfirmModal
          title="Cambios sin guardar"
          message="Hay cambios que aún no se han guardado. Si sales ahora se perderán."
          confirmLabel="Salir sin guardar"
          danger
          onConfirm={() => {
            const run = guard.run;
            setGuard(null);
            run();
          }}
          onClose={() => setGuard(null)}
        />
      )}
    </div>
  );
}
