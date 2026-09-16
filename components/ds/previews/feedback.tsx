import type { CSSProperties } from 'react';
import { textOn } from '@/lib/ds/engine/contrast';
import { num, PlusIcon, px, radius, shadow, sides, tone, type Render } from './shared';

/* Badge, Notification y Tooltip (UC, QC y jC del prototipo). */

export const Badge: Render = (t, c) => {
  const scales: Record<string, Record<string, string>> = {
    Neutral: t.N, Primary: t.P, Success: t.sem.success, Warning: t.sem.warning, Error: t.sem.error, Info: t.sem.info,
  };
  const scale = scales[c.intention ?? ''] ?? t.P;
  const strong = tone(t, scale, '600', '400');
  const looks: Record<string, CSSProperties> = {
    Solid: { background: strong, color: textOn(strong), border: '1px solid transparent' },
    'Soft / Subtle': { background: tone(t, scale, '100', '800'), color: tone(t, scale, '800', '200'), border: '1px solid transparent' },
    Outline: { background: 'transparent', color: tone(t, scale, '700', '300'), border: `1px solid ${tone(t, scale, '300', '600')}` },
  };
  const anatomy = c.anatomy.anatomy;
  const fs = num(c, 'fontSize');
  const dotOnly = anatomy === 'Solo punto';

  return (
    <span
      style={{
        ...(looks[c.variant ?? ''] ?? looks.Solid),
        display: 'inline-flex', alignItems: 'center', gap: px(num(c, 'gap')), fontFamily: t.body, fontSize: px(fs), fontWeight: 500,
        lineHeight: 1, padding: dotOnly ? px(num(c, 'padY')) : `${px(num(c, 'padY'))} ${px(num(c, 'padX'))}`,
        borderRadius: c.anatomy.shape === 'Recta' ? radius(t, 'xs') : '999px',
      }}
    >
      {(anatomy === 'Punto + texto' || dotOnly) && <i style={{ width: fs * 0.5, height: fs * 0.5, borderRadius: 99, background: 'currentColor', display: 'block' }} />}
      {!dotOnly && <span>Etiqueta</span>}
      {anatomy === 'Con cierre (X)' && <span style={{ opacity: 0.7, fontWeight: 400 }}>×</span>}
    </span>
  );
};

export const Notification: Render = (t, c) => {
  const scales: Record<string, Record<string, string>> = {
    Info: t.sem.info, Success: t.sem.success, Warning: t.sem.warning, 'Error / Critical': t.sem.error,
  };
  const scale = scales[c.intention ?? ''] ?? t.sem.info;
  const strong = tone(t, scale, '600', '400');

  let look: CSSProperties;
  if (c.variant === 'Solid') look = { background: strong, color: textOn(strong), ...sides('1px solid transparent') };
  else if (c.variant === 'Left-border accent') look = { background: t.s.surface, color: t.s.text, ...sides(`1px solid ${t.s.border}`), borderLeft: `4px solid ${strong}` };
  else look = { background: tone(t, scale, '50', '800'), color: tone(t, scale, '900', '100'), ...sides(`1px solid ${tone(t, scale, '200', '700')}`) };

  return (
    <div
      style={{
        ...look, display: 'flex', gap: px(num(c, 'gap')), alignItems: 'flex-start', width: 400, maxWidth: '100%',
        padding: `${px(num(c, 'padY'))} ${px(num(c, 'padX'))}`, borderRadius: radius(t, c.props.radiusToken),
        boxShadow: shadow(t, c.props.elevation), fontFamily: t.body, fontSize: px(t.ty['body-s'].size),
      }}
    >
      {c.anatomy.icon && (
        <span style={{ marginTop: 1, display: 'flex' }}>
          <PlusIcon size={t.ty['body-m'].size} />
        </span>
      )}
      <div style={{ flex: 1 }}>
        {c.anatomy.title && <div style={{ fontWeight: 600, fontSize: px(t.ty['body-m'].size), marginBottom: 2 }}>Título de la notificación</div>}
        {c.anatomy.desc && <div style={{ opacity: 0.85, lineHeight: 1.55 }}>Mensaje que explica qué ha ocurrido y qué puede hacer la persona usuaria.</div>}
        {c.anatomy.action && <div style={{ marginTop: 8, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>Ver detalles</div>}
      </div>
      {c.anatomy.close && <span style={{ opacity: 0.6, lineHeight: 1 }}>×</span>}
    </div>
  );
};

export const Tooltip: Render = (t, c) => {
  const light = c.variant === 'Light';
  const background = c.variant === 'Accent' ? tone(t, t.P, '600', '400') : c.variant === 'Dark' ? tone(t, t.N, '900', '700') : t.s.surface;
  const arrow = num(c, 'arrowSize');
  const half = -arrow / 2;
  const positions: Record<string, CSSProperties> = {
    Arriba: { bottom: half, left: '50%', marginLeft: half },
    Abajo: { top: half, left: '50%', marginLeft: half },
    Izquierda: { right: half, top: '50%', marginTop: half },
    Derecha: { left: half, top: '50%', marginTop: half },
  };
  const fs = num(c, 'fontSize');

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          position: 'relative', background, color: light ? t.s.text : textOn(background), maxWidth: num(c, 'maxWidth'),
          padding: `${px(num(c, 'padY'))} ${px(num(c, 'padX'))}`, borderRadius: radius(t, c.props.radiusToken),
          fontFamily: t.body, fontSize: px(fs), lineHeight: 1.5, boxShadow: t.sh.md, border: light ? `1px solid ${t.s.border}` : 'none',
          display: 'flex', gap: 7, alignItems: 'flex-start',
        }}
      >
        {c.anatomy.icon && (
          <span style={{ marginTop: 1, display: 'flex' }}>
            <PlusIcon size={fs} />
          </span>
        )}
        <span>Texto explicativo del tooltip</span>
        {c.anatomy.arrow && (
          <i
            style={{
              position: 'absolute', width: arrow, height: arrow, background, transform: 'rotate(45deg)',
              border: light ? `1px solid ${t.s.border}` : 'none', ...(positions[String(c.anatomy.position)] ?? positions.Arriba),
            }}
          />
        )}
      </div>
    </div>
  );
};
