'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { SocialLogo } from '@/components/studio/Wordmark';
import { UserMenu } from '@/components/studio/UserMenu';
import { SearchField } from '@/components/studio/GalleryFilters';
import type { SessionUser } from '@/lib/auth/sessionUser';
import { btn, colors, toolbarBtn } from '@/components/deck/studio/ui';
import { borrarPieza, crearPieza, duplicarPieza, listarPiezas } from '@/lib/social/api';
import type { SocialListItem } from '@/lib/social/server';
import { compileSocial } from '@/lib/social/compile';
import { CANVASES } from '@/lib/social/types';
import { SocialCard } from '../SocialCard';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const ANCHO_MINI = 200;

/* La lanzadera del Social Maker: la rejilla de piezas guardadas.
   ─────────────────────────────────────────────────────────────────────────
   Misma anatomía que la galería del Deck Maker: imagotipo, wordmark de la
   herramienta, buscador centrado y menú de usuario. El wordmark SÍ va aquí,
   que es su sitio: en la barra del editor no lo lleva ninguna herramienta.

   La miniatura es la PRIMERA SLIDE pintada de verdad, con los mismos
   componentes que el editor. No hay una imagen guardada aparte, así que no
   puede quedarse vieja cuando cambie un layout. */
export function SocialGallery({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [items, setItems] = useState<SocialListItem[] | null>(null);
  const [busca, setBusca] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aBorrar, setABorrar] = useState<SocialListItem | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await listarPiezas());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se han podido cargar las piezas.');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q || !items) return items ?? [];
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, busca]);

  const conGuardia = async (fn: () => Promise<void>) => {
    if (ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar la acción.');
    } finally {
      setOcupado(false);
    }
  };

  const nueva = () =>
    conGuardia(async () => {
      const p = await crearPieza({});
      router.push(`/workspace/socialmak_r/${p.id}`);
    });

  const duplicar = (id: string) =>
    conGuardia(async () => {
      await duplicarPieza(id);
      await cargar();
    });

  const borrar = (item: SocialListItem) =>
    conGuardia(async () => {
      await borrarPieza(item.id);
      setABorrar(null);
      await cargar();
    });

  return (
    <div style={{ minHeight: '100vh', background: colors.warmLight, color: colors.dark }}>
      <header
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight,
        }}
      >
        <BrandMark height={20} href="/workspace" label="Ir a la landing de aplicaciones" />
        <MarkDivider />
        <SocialLogo height={22} />
        <span style={{ marginLeft: 'auto' }} />
        <UserMenu user={user} />

        {/* Centrado respecto a la cabecera y no al hueco: en flujo se
            movería cada vez que cambie el ancho de lo que tiene al lado. */}
        <div
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(380px, 42%)',
          }}
        >
          <SearchField value={busca} onChange={setBusca} label="Buscar piezas por nombre" width={380} />
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 64px' }}>
        {error && (
          /* Burdeos: el color de alerta del sistema, declarado en lib/tokens.ts. */
          <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.bordeaux, marginBottom: 20 }}>{error}</div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${ANCHO_MINI}px), 1fr))`,
            gap: 28, alignItems: 'start',
          }}
        >
          <button
            type="button"
            onClick={nueva}
            disabled={ocupado}
            style={{
              appearance: 'none', cursor: ocupado ? 'wait' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, background: 'transparent', border: `2px solid ${colors.dark}`,
              aspectRatio: '4 / 5',
            }}
          >
            <span aria-hidden style={{ font: `300 40px/1 ${MONO}`, color: colors.dark }}>+</span>
            <span style={{ font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', color: colors.dark }}>
              Crear nueva pieza
            </span>
          </button>

          {items === null && (
            <div style={{ font: `400 12px/1.4 ${MONO}`, color: colors.ash, alignSelf: 'center' }}>Cargando…</div>
          )}

          {filtradas.map((it) => (
            <Tarjeta
              key={it.id}
              item={it}
              onAbrir={() => router.push(`/workspace/socialmak_r/${it.id}`)}
              onDuplicar={() => duplicar(it.id)}
              onBorrar={() => setABorrar(it)}
              ocupado={ocupado}
            />
          ))}
        </div>

        {items !== null && filtradas.length === 0 && (
          <p style={{ font: `400 12px/1.6 ${MONO}`, color: colors.ash, marginTop: 28 }}>
            {busca.trim()
              ? 'Ninguna pieza se llama así.'
              : 'Todavía no hay piezas guardadas. Crea la primera.'}
          </p>
        )}
      </div>

      {aBorrar && (
        <Confirmar
          nombre={aBorrar.name}
          onCancelar={() => setABorrar(null)}
          onConfirmar={() => borrar(aBorrar)}
          ocupado={ocupado}
        />
      )}
    </div>
  );
}

function Tarjeta({
  item,
  onAbrir,
  onDuplicar,
  onBorrar,
  ocupado,
}: {
  item: SocialListItem;
  onAbrir: () => void;
  onDuplicar: () => void;
  onBorrar: () => void;
  ocupado: boolean;
}) {
  /* La primera slide, pintada con los mismos componentes que el editor. */
  const portada = useMemo(() => compileSocial(item.md, item.canvas).slides[0], [item.md, item.canvas]);
  const escala = ANCHO_MINI / CANVASES[item.canvas].w;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        onClick={onAbrir}
        title={`Abrir «${item.name}»`}
        style={{
          appearance: 'none', border: `1px solid ${colors.warmDark}`, background: colors.white,
          padding: 0, cursor: 'pointer', lineHeight: 0, display: 'block', width: '100%',
        }}
      >
        <div className="ix-social" style={{ width: '100%', overflow: 'hidden' }}>
          {portada ? (
            <SocialCard slide={portada} canvas={item.canvas} scale={escala} />
          ) : (
            <div style={{ aspectRatio: '4 / 5' }} />
          )}
        </div>
      </button>

      <div style={{ font: `500 12px/1.4 ${MONO}`, color: colors.dark, wordBreak: 'break-word' }}>
        {item.name}
      </div>
      <div style={{ font: `400 10px/1.4 ${MONO}`, color: colors.ash }}>
        {item.slides} slide{item.slides === 1 ? '' : 's'} · {CANVASES[item.canvas].nombre}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={{ ...toolbarBtn, padding: '6px 9px' }} onClick={onDuplicar} disabled={ocupado}>
          Duplicar
        </button>
        <button
          type="button"
          style={{ ...toolbarBtn, padding: '6px 9px', color: colors.bordeaux, borderColor: colors.bordeaux }}
          onClick={onBorrar}
          disabled={ocupado}
        >
          Borrar
        </button>
      </div>
    </div>
  );
}

/* Borrar es irreversible, así que se pregunta diciendo QUÉ se borra. */
function Confirmar({
  nombre,
  onCancelar,
  onConfirmar,
  ocupado,
}: {
  nombre: string;
  onCancelar: () => void;
  onConfirmar: () => void;
  ocupado: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(28,26,23,.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onCancelar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, 100%)', background: colors.warmLight,
          border: `1px solid ${colors.dark}`, padding: 28,
        }}
      >
        <h2 style={{ font: `600 13px/1.3 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 16px' }}>
          Borrar la pieza
        </h2>
        <p style={{ font: `400 12px/1.6 ${MONO}`, color: colors.dark, margin: '0 0 24px' }}>
          Se borra «{nombre}» y no se puede deshacer. Las imágenes que use no se tocan: siguen en el banco.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" style={toolbarBtn} onClick={onCancelar}>Cancelar</button>
          <button
            type="button"
            style={{ ...btn, borderColor: colors.bordeaux, background: colors.bordeaux }}
            onClick={onConfirmar}
            disabled={ocupado}
          >
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
}
