import type { CSSProperties, ReactNode } from 'react';
import { textOn } from '@/lib/ds/engine/contrast';
import { ArrowIcon, DotsIcon, focusRing, num, PlusIcon, px, radius, Spinner, tone, type Render } from './shared';

/* Button, Link, Pagination, Tags y Toggle (LC, XC, VC, PC y qC del prototipo). */

export const Button: Render = (t, c) => {
  const s = c.state;
  const disabled = s === 'Disabled';
  const loading = s === 'Loading';
  const scales: Record<string, Record<string, string>> = { Primary: t.P, Secondary: t.N, Tertiary: t.N, Destructive: t.sem.error };
  const scale = scales[c.variant ?? ''] ?? t.P;

  let look: CSSProperties;
  if (c.variant === 'Primary' || c.variant === 'Destructive') {
    const bg = s === 'Hover' ? tone(t, scale, '700', '300') : s === 'Active' ? tone(t, scale, '800', '200') : tone(t, scale, '600', '400');
    look = { background: bg, color: textOn(bg), border: '1px solid transparent' };
  } else if (c.variant === 'Secondary') {
    look = { background: s === 'Hover' ? tone(t, t.N, '50', '800') : t.s.surface, color: t.s.text, border: `1px solid ${t.s.border}` };
  } else {
    look = { background: s === 'Hover' ? tone(t, t.N, '100', '800') : 'transparent', color: t.s.text, border: '1px solid transparent' };
  }

  const icon = num(c, 'iconSize');
  const iconOnly = c.anatomy.icon === 'Solo icono';
  /* El prototipo tapaba el anillo de foco del primario con su sombra: aquí el foco manda. */
  const boxShadow = s === 'Focus' ? focusRing(t, 0.35) : c.variant === 'Primary' ? t.sh.sm : 'none';

  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      style={{
        ...look, boxShadow, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: px(num(c, 'gap')),
        fontFamily: t.body, fontSize: px(num(c, 'fontSize')), fontWeight: 500, lineHeight: 1,
        padding: iconOnly ? px(num(c, 'padY')) : `${px(num(c, 'padY'))} ${px(num(c, 'padX'))}`,
        borderRadius: radius(t, c.props.radiusToken), width: c.anatomy.width === 'Ancho completo' ? '100%' : 'auto',
        opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .15s',
      }}
    >
      {loading && <Spinner size={icon} />}
      {(c.anatomy.icon === 'Izquierda' || iconOnly) && !loading && <PlusIcon size={icon} />}
      {!iconOnly && <span>{loading ? 'Cargando' : 'Botón'}</span>}
      {c.anatomy.icon === 'Derecha' && !loading && <ArrowIcon size={icon} />}
    </button>
  );
};

export const Link: Render = (t, c) => {
  const s = c.state;
  const fs = num(c, 'fontSize');
  const base = c.variant === 'Neutral' ? t.s.text : tone(t, t.P, '600', '300');
  const color =
    s === 'Hover' ? tone(t, t.P, '700', '200') : s === 'Visited' ? tone(t, t.SEC, '700', '300') : s === 'Active' ? tone(t, t.P, '800', '100') : base;
  const underline = c.anatomy.underline === 'Siempre' || (c.anatomy.underline === 'En hover' && s === 'Hover');

  /* Sin href: en la previsualización no navega y en el styleguide no salta al principio de la página. */
  const link = (
    <a
      style={{
        color, fontFamily: t.body, fontSize: px(fs), fontWeight: c.variant === 'Standalone' ? 500 : 400, cursor: 'pointer',
        textDecoration: underline ? 'underline' : 'none', textUnderlineOffset: px(num(c, 'underlineOffset')),
        display: 'inline-flex', alignItems: 'center', gap: px(num(c, 'gap')),
        outline: s === 'Focus' ? `2px solid ${tone(t, t.P, '600', '400')}` : 'none', outlineOffset: 2, borderRadius: 2,
      }}
    >
      {c.anatomy.icon === 'Izquierda' && <PlusIcon size={fs} />}
      Ver documentación
      {c.anatomy.icon === 'Externo' && <span style={{ fontSize: fs * 0.85 }}>↗</span>}
    </a>
  );

  if (c.variant !== 'Inline') return link;
  return (
    <p style={{ fontFamily: t.body, fontSize: px(fs), color: t.s.text, margin: 0, maxWidth: 380, lineHeight: 1.6 }}>
      Texto de párrafo donde {link} aparece integrado en la línea base.
    </p>
  );
};

export const Pagination: Render = (t, c) => {
  const size = num(c, 'size');
  const fs = num(c, 'fontSize');
  const gap = px(num(c, 'gap'));
  const shapes: Record<string, string> = { Cuadrado: radius(t, 'xs'), Redondeado: radius(t, 'md'), Círculo: '999px' };
  const shape = shapes[String(c.anatomy.shape)] ?? radius(t, 'md');
  const current = tone(t, t.P, '600', '400');

  const cell = (key: string, label: ReactNode, opts: { current?: boolean; muted?: boolean } = {}) => (
    <span
      key={key}
      style={{
        minWidth: size, height: size, padding: '0 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: shape, fontSize: px(fs), fontFamily: t.body,
        background: opts.current ? current : c.state === 'Hover' && key === '3' ? tone(t, t.N, '100', '800') : 'transparent',
        color: opts.current ? textOn(current) : opts.muted ? t.s.textMuted : t.s.text,
        border: `1px solid ${opts.current ? 'transparent' : t.s.border}`, opacity: opts.muted ? 0.45 : 1,
      }}
    >
      {label}
    </span>
  );
  const row = (color: string, children: ReactNode) => (
    <div style={{ display: 'flex', gap, alignItems: 'center', fontFamily: t.body, fontSize: px(fs), color }}>{children}</div>
  );

  if (c.variant === 'Compact') return row(t.s.text, [cell('prev', '‹', { muted: true }), <span key="n">2 / 10</span>, cell('next', '›')]);
  if (c.variant === 'Simple') {
    return row(t.s.textMuted, [
      cell('prev', '‹ Anterior', { muted: true }),
      <span key="n" style={{ padding: '0 8px' }}>Página 2 de 10</span>,
      cell('next', 'Siguiente ›'),
    ]);
  }
  return row(t.s.text, [
    cell('prev', '‹', { muted: true }),
    cell('1', '1'),
    cell('2', '2', { current: true }),
    cell('3', '3'),
    cell('gap', <DotsIcon size={fs} />, { muted: true }),
    cell('10', '10'),
    cell('next', '›'),
  ]);
};

export const Tags: Render = (t, c) => {
  const s = c.state;
  const selected = s === 'Selected / Active';
  const fs = num(c, 'fontSize');
  const background = selected ? tone(t, t.P, '100', '700') : s === 'Hover' ? tone(t, t.N, '100', '700') : tone(t, t.N, '50', '800');
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: px(num(c, 'gap')), background,
        color: selected ? tone(t, t.P, '800', '100') : t.s.text, opacity: s === 'Disabled' ? 0.45 : 1,
        border: `1px solid ${selected ? tone(t, t.P, '300', '500') : t.s.border}`,
        borderRadius: c.anatomy.shape === 'Píldora' ? '999px' : radius(t, 'md'),
        padding: `${px(num(c, 'padY'))} ${px(num(c, 'padX'))}`, fontFamily: t.body, fontSize: px(fs),
        boxShadow: s === 'Focus' ? focusRing(t, 0.28) : 'none',
      }}
    >
      {c.anatomy.avatar && <span style={{ width: fs + 4, height: fs + 4, borderRadius: 999, background: tone(t, t.SEC, '300', '500'), display: 'block' }} />}
      <span>{c.variant === 'Filter tag' ? 'Filtro: Activos' : 'Etiqueta'}</span>
      {c.anatomy.close && c.variant !== 'Read-only tag' && <span style={{ opacity: 0.6 }}>×</span>}
    </span>
  );
};

export const Toggle: Render = (t, c) => {
  const segmented = c.anatomy.style === 'Segmentado';
  const fs = num(c, 'fontSize');
  const fill = tone(t, t.P, '600', '400');
  const options = ['Día', 'Semana', 'Mes'];
  return (
    <div
      style={{
        display: 'inline-flex', gap: segmented ? 0 : px(num(c, 'gap')), padding: segmented ? num(c, 'trackPad') : 0,
        background: segmented ? tone(t, t.N, '100', '800') : 'transparent', borderRadius: radius(t, 'md'),
        border: segmented ? `1px solid ${t.s.border}` : 'none',
      }}
    >
      {options.map((label, i) => {
        const on = c.state === 'Selected' ? i === 1 : i === 0;
        const hovered = c.state === 'Hover' && i === 2;
        return (
          <span
            key={label}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${px(num(c, 'padY'))} ${px(num(c, 'padX'))}`,
              fontFamily: t.body, fontSize: px(fs), borderRadius: radius(t, segmented ? 'sm' : 'md'),
              opacity: c.state === 'Disabled' ? 0.45 : 1,
              background: on ? (segmented ? t.s.surface : fill) : hovered ? tone(t, t.N, '200', '700') : 'transparent',
              color: on ? (segmented ? t.s.text : textOn(fill)) : t.s.textMuted,
              border: segmented ? 'none' : `1px solid ${on ? 'transparent' : t.s.border}`,
              boxShadow: on && segmented ? t.sh.sm : 'none', fontWeight: on ? 500 : 400,
            }}
          >
            {c.anatomy.content !== 'Solo texto' && <PlusIcon size={fs} />}
            {c.anatomy.content !== 'Solo icono' && label}
          </span>
        );
      })}
    </div>
  );
};
