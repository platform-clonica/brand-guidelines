import { textOn } from '@/lib/ds/engine/contrast';
import type { ResolvedTokens } from '@/lib/ds/engine/resolve';
import { num, px, radius, shadow, sides, subtle, tone, type Render } from './shared';

/* Accordion y Modal (HC y ZC del prototipo). */

export const Accordion: Render = (t, c) => {
  const expanded = c.state === 'Expanded';
  const hovered = c.state === 'Hover';
  const disabled = c.state === 'Disabled';
  const cards = c.variant === 'Separated Cards';
  const flush = c.variant === 'Flush';
  const iconLeft = c.anatomy.iconSide === 'Izquierda';
  const icon = c.anatomy.iconType === 'Más / menos' ? (expanded ? '−' : '+') : expanded ? '⌃' : '⌄';
  const line = `1px solid ${t.s.border}`;
  const panels = ['Primer panel del acordeón', 'Segundo panel', 'Tercer panel'];

  return (
    <div
      style={{
        fontFamily: t.body, fontSize: px(t.ty['body-m'].size), color: t.s.text, width: 420, maxWidth: '100%',
        opacity: disabled ? 0.45 : 1, display: 'flex', flexDirection: 'column', gap: cards ? px(num(c, 'gap')) : 0,
      }}
    >
      {panels.map((title, i) => (
        <div
          key={title}
          style={{
            ...(flush ? { ...sides('none'), borderBottom: line } : { ...sides(line), borderTop: c.variant === 'Bordered' && i > 0 ? 'none' : line }),
            borderRadius: cards ? radius(t, 'lg') : 0,
            background: cards ? t.s.surface : 'transparent',
            boxShadow: cards ? t.sh.sm : 'none',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: px(num(c, 'gap')),
              flexDirection: iconLeft ? 'row-reverse' : 'row', padding: `${px(num(c, 'padY'))} ${px(num(c, 'padX'))}`,
              background: hovered && i === 0 ? subtle(t) : 'transparent', fontWeight: 500,
            }}
          >
            <span style={{ flex: iconLeft ? '1' : 'unset' }}>{title}</span>
            <span style={{ color: t.s.textMuted, fontSize: px(num(c, 'iconSize')), lineHeight: 1 }}>{i === 0 ? icon : '⌄'}</span>
          </div>
          {expanded && i === 0 && (
            <div style={{ padding: `0 ${px(num(c, 'padX'))} ${px(num(c, 'padY'))}`, color: t.s.textMuted, fontSize: px(t.ty['body-s'].size), lineHeight: 1.6 }}>
              Contenido del panel generado con los tokens de espaciado y tipografía del sistema.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const MODAL_WIDTH: Record<string, number> = { Small: 400, Medium: 600, Large: 800, 'Full screen': 900 };

export const Modal: Render = (t, c) => {
  const padX = px(num(c, 'padX'));
  const padY = num(c, 'padY');
  const blur = num(c, 'backdropBlur');
  return (
    <div
      style={{
        position: 'relative', width: '100%', maxWidth: Math.min(MODAL_WIDTH[c.size ?? ''] ?? 480, 620),
        borderRadius: radius(t, c.props.radiusToken), background: t.s.surface, boxShadow: shadow(t, c.props.elevation, t.sh.xl),
        border: `1px solid ${t.s.border}`, fontFamily: t.body, overflow: 'hidden',
      }}
    >
      {c.anatomy.header && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${px(padY)} ${padX}`, borderBottom: `1px solid ${t.s.border}` }}>
          <span style={{ fontFamily: t.heading, fontSize: px(t.ty.h4.size), fontWeight: t.ty.h4.weight, color: t.s.text }}>Título del modal</span>
          {c.anatomy.close && <span style={{ color: t.s.textMuted, fontSize: 18, lineHeight: 1 }}>×</span>}
        </div>
      )}
      <div
        style={{
          padding: `${px(padY)} ${padX}`, color: t.s.textMuted, fontSize: px(t.ty['body-m'].size), lineHeight: 1.6,
          maxHeight: c.anatomy.scroll ? 120 : 'none', overflowY: c.anatomy.scroll ? 'auto' : 'visible',
        }}
      >
        Contenido del modal generado con el espaciado, el radio y la elevación de los fundamentos del sistema. El fondo
        de detrás usa una opacidad del {Math.round(num(c, 'backdropOpacity') * 100)}%{blur > 0 ? ` y un desenfoque de ${blur}px` : ''}.
      </div>
      {c.anatomy.footer && (
        <div
          style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8, padding: `${px(padY * 0.75)} ${padX}`,
            borderTop: `1px solid ${t.s.border}`, background: subtle(t),
          }}
        >
          <ModalButton t={t} ghost>
            Cancelar
          </ModalButton>
          <ModalButton t={t}>Confirmar</ModalButton>
        </div>
      )}
    </div>
  );
};

function ModalButton({ t, ghost = false, children }: { t: ResolvedTokens; ghost?: boolean; children: string }) {
  const fill = tone(t, t.P, '600', '400');
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', padding: '7px 14px', borderRadius: radius(t, 'md'),
        fontSize: px(t.ty['body-s'].size), fontFamily: t.body, fontWeight: 500,
        background: ghost ? 'transparent' : fill, color: ghost ? t.s.text : textOn(fill),
        border: ghost ? `1px solid ${t.s.border}` : '1px solid transparent',
      }}
    >
      {children}
    </span>
  );
}
