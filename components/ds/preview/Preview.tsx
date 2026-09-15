'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';
import { publicLogoUrl } from '@/lib/decks/publicApi';
import { textOn } from '@/lib/ds/engine/contrast';
import { SEMANTIC_KEYS } from '@/lib/ds/engine/semantic';
import { slug } from '@/lib/ds/escape';
import { fontStylesheets } from '@/lib/ds/fonts';
import { previewVars } from '@/lib/ds/preview';
import type { Tokens } from '@/lib/ds/schema';
import { MONO, Segmented } from '../controls';
import { SEMANTIC_LABELS } from '../labels';

/* Previsualización viva del sistema, al lado del paso 2.

   Un contenedor con las variables `--ds-*` (lib/ds/preview.ts) y una pequeña muestra de interfaz
   que las usa: titulares, texto, botones, campo, tarjeta y avisos. No hay iframe: el prefijo no
   colisiona con el workspace. Los componentes de verdad llegan con el paso 3; esto es para ver de un
   vistazo cómo encajan color, tipografía, espacio, radios y sombras.

   Todo lo de dentro del lienzo es del CLIENTE (fuentes, pesos, colores): las normas de marca de
   lib/tokens.ts mandan sobre la franja de arriba, que es chrome, no sobre la muestra. */
export function Preview({
  tokens,
  name,
  logoPath,
  logoDarkPath,
}: {
  tokens: Tokens;
  name: string;
  logoPath: string | null;
  logoDarkPath: string | null;
}) {
  const [picked, setPicked] = useState<'light' | 'dark'>('light');
  const mode = tokens.modes === 'both' ? picked : tokens.modes;

  const vars = useMemo(() => previewVars(tokens, mode), [tokens, mode]);
  const fonts = useMemo(() => fontStylesheets(tokens), [tokens]);

  const logo = publicLogoUrl(mode === 'dark' ? (logoDarkPath ?? logoPath) : logoPath);
  const primary = tokens.palette.primary['600'];
  const radius = (component: string) => `var(--ds-radius-${slug(tokens.radiusMap[component] ?? 'md')})`;
  const type = (key: string): CSSProperties => {
    const t = tokens.typography.find((x) => x.key === key);
    const k = slug(key);
    return {
      margin: 0,
      fontFamily: `var(--ds-font-${t?.family ?? 'body'})`,
      fontSize: `var(--ds-font-size-${k})`,
      lineHeight: `var(--ds-line-height-${k})`,
      fontWeight: `var(--ds-font-weight-${k})` as CSSProperties['fontWeight'],
      letterSpacing: t ? `${t.letterSpacing}px` : undefined,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {fonts.map((f) => (
        <link key={f.url} rel="stylesheet" href={f.url} precedence="ds-fonts" />
      ))}

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', flexShrink: 0,
          borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight,
        }}
      >
        <span style={{ font: `500 10px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase', color: colors.ash }}>
          Previsualización
        </span>
        {tokens.modes === 'both' && (
          <span style={{ marginLeft: 'auto', width: 180 }}>
            <Segmented
              ariaLabel="Modo de la previsualización"
              value={picked}
              onChange={setPicked}
              options={[
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Oscuro' },
              ]}
            />
          </span>
        )}
      </div>

      <div
        style={{
          ...vars,
          flex: 1, background: 'var(--ds-canvas)', color: 'var(--ds-text)', fontFamily: 'var(--ds-font-body)',
          padding: 'var(--ds-space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-sm)', minHeight: 32 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={name} style={{ maxHeight: 32, maxWidth: 160, objectFit: 'contain' }} />
          ) : (
            <span style={type('h6')}>{name}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-xs)' }}>
          <span style={{ ...type('caption'), color: 'var(--ds-text-muted)', textTransform: 'uppercase' }}>Antetítulo</span>
          <h3 style={type('h2')}>Un titular que se lee de lejos</h3>
          <p style={{ ...type('body-m'), color: 'var(--ds-text-muted)' }}>
            Texto de párrafo con el tamaño base del sistema. Así se ve una frase larga, con su interlineado y su color
            atenuado, junto a un <span style={{ color: 'var(--ds-primary-600)', textDecoration: 'underline' }}>enlace</span>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--ds-space-sm)', flexWrap: 'wrap' }}>
          <span
            style={{
              ...type('body-s'), fontWeight: 600, background: primary, color: textOn(primary), borderRadius: radius('button'),
              padding: 'var(--ds-space-xs) var(--ds-space-md)', boxShadow: 'var(--ds-shadow-sm)',
            }}
          >
            Acción principal
          </span>
          <span
            style={{
              ...type('body-s'), fontWeight: 600, color: 'var(--ds-text)', borderRadius: radius('button'),
              border: '1px solid var(--ds-secondary-600)', padding: 'var(--ds-space-xs) var(--ds-space-md)',
            }}
          >
            Secundaria
          </span>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-2xs)' }}>
          <span style={type('body-s')}>Correo electrónico</span>
          <span
            style={{
              ...type('body-m'), color: 'var(--ds-text-muted)', background: 'var(--ds-surface)', border: '1px solid var(--ds-border)',
              borderRadius: radius('input'), padding: 'var(--ds-space-xs) var(--ds-space-sm)',
            }}
          >
            nombre@empresa.com
          </span>
        </label>

        <div
          style={{
            background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: radius('card'),
            boxShadow: 'var(--ds-shadow-md)', padding: 'var(--ds-space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-xs)',
          }}
        >
          <span
            style={{
              ...type('caption'), alignSelf: 'flex-start', background: 'var(--ds-primary-100)', color: 'var(--ds-primary-800)',
              borderRadius: radius('badge'), padding: '2px var(--ds-space-xs)',
            }}
          >
            Novedad
          </span>
          <h4 style={type('h5')}>Tarjeta</h4>
          <p style={{ ...type('body-s'), color: 'var(--ds-text-muted)' }}>Superficie, borde, radio y sombra del sistema.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ds-space-xs)' }}>
          {SEMANTIC_KEYS.map((key) => (
            <span
              key={key}
              style={{
                ...type('body-s'), background: `var(--ds-${key}-50)`, color: `var(--ds-${key}-800)`,
                borderLeft: `3px solid var(--ds-${key}-500)`, borderRadius: radius('notification'),
                padding: 'var(--ds-space-xs) var(--ds-space-sm)',
              }}
            >
              {SEMANTIC_LABELS[key]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
