import { textOn } from '@/lib/ds/engine/contrast';
import { ArrowIcon, focusRing, num, PlusIcon, px, radius, shadow, Spinner, subtle, tone, type Render } from './shared';

/* Checkbox, Radio, Switch, Input, Dropdown, Search y Slider (FC, JC, KC, GC, YC, IC y WC del prototipo).

   Diferencia deliberada: el menú del Dropdown y el autocompletado del Search van en el flujo, no en
   posición absoluta. En el styleguide cada tarjeta recorta lo que se sale (`overflow: hidden`), y un
   menú absoluto se quedaría cortado. */

export const Checkbox: Render = (t, c) => {
  const s = c.state;
  const checked = s === 'Checked';
  const mixed = s === 'Indeterminate';
  const error = s === 'Error';
  const disabled = s === 'Disabled';
  const right = c.anatomy.layout === 'Control derecha';
  const size = num(c, 'size');
  const on = tone(t, t.P, '600', '400');
  const border = error ? t.sem.error['600'] : checked || mixed ? on : s === 'Hover' ? tone(t, t.N, '500', '400') : t.s.border;

  return (
    <label
      style={{
        display: 'inline-flex', gap: px(num(c, 'gap')), alignItems: 'flex-start', opacity: disabled ? 0.45 : 1,
        fontFamily: t.body, fontSize: px(num(c, 'fontSize')), color: t.s.text, cursor: disabled ? 'not-allowed' : 'pointer',
        flexDirection: right ? 'row-reverse' : 'row', justifyContent: right ? 'space-between' : 'flex-start', minWidth: right ? 220 : 0,
      }}
    >
      <span
        style={{
          width: size, height: size, flexShrink: 0, borderRadius: px(num(c, 'radius')), border: `${num(c, 'borderWidth')}px solid ${border}`,
          background: checked || mixed ? on : t.s.surface, display: 'grid', placeItems: 'center', color: textOn(on),
          boxShadow: s === 'Focus' ? focusRing(t, 0.3) : 'none', transition: '.14s',
        }}
      >
        {mixed && <span style={{ width: size * 0.5, height: 2, background: 'currentColor', borderRadius: 2 }} />}
        {checked && (
          <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={c.anatomy.check === 'Fino' ? 2 : 3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12 5 5L20 6" />
          </svg>
        )}
      </span>
      <span>
        <span>Acepto los términos</span>
        {c.anatomy.helper && (
          <span style={{ display: 'block', fontSize: px(t.ty.caption.size), color: error ? t.sem.error['600'] : t.s.textMuted, marginTop: 2 }}>
            {error ? 'Debes aceptar para continuar' : 'Texto de ayuda opcional'}
          </span>
        )}
      </span>
    </label>
  );
};

export const Radio: Render = (t, c) => {
  const s = c.state;
  const checked = s === 'Checked';
  const error = s === 'Error';
  const right = c.anatomy.layout === 'Control derecha';
  const size = num(c, 'size');
  const dot = size * num(c, 'dotRatio');
  const on = tone(t, t.P, '600', '400');
  const border = error ? t.sem.error['600'] : checked ? on : s === 'Hover' ? tone(t, t.N, '500', '400') : t.s.border;

  return (
    <label
      style={{
        display: 'inline-flex', gap: px(num(c, 'gap')), alignItems: 'flex-start', opacity: s === 'Disabled' ? 0.45 : 1,
        fontFamily: t.body, fontSize: px(num(c, 'fontSize')), color: t.s.text,
        flexDirection: right ? 'row-reverse' : 'row', justifyContent: right ? 'space-between' : 'flex-start', minWidth: right ? 220 : 0,
      }}
    >
      <span
        style={{
          width: size, height: size, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center',
          border: `${num(c, 'borderWidth')}px solid ${border}`, background: t.s.surface,
          boxShadow: s === 'Focus' ? focusRing(t, 0.3) : 'none',
        }}
      >
        {checked && <span style={{ width: dot, height: dot, borderRadius: 999, background: on, display: 'block' }} />}
      </span>
      <span>
        <span>Opción de radio</span>
        {c.anatomy.helper && (
          <span style={{ display: 'block', fontSize: px(t.ty.caption.size), color: error ? t.sem.error['600'] : t.s.textMuted, marginTop: 2 }}>
            Texto de ayuda opcional
          </span>
        )}
      </span>
    </label>
  );
};

export const Switch: Render = (t, c) => {
  const s = c.state;
  const on = s === 'On';
  const fill = tone(t, t.P, '600', '400');
  const trackW = num(c, 'trackW');
  const thumb = num(c, 'thumb');
  const pad = num(c, 'trackPad');
  const track = on ? fill : s === 'Hover' ? tone(t, t.N, '400', '600') : tone(t, t.N, '300', '700');

  return (
    <label
      style={{
        display: 'inline-flex', alignItems: 'center', gap: px(num(c, 'gap')), fontFamily: t.body, fontSize: px(num(c, 'fontSize')),
        color: t.s.text, opacity: s === 'Disabled' ? 0.45 : 1,
      }}
    >
      <span
        style={{
          width: trackW, height: num(c, 'trackH'), borderRadius: 999, position: 'relative', flexShrink: 0, background: track,
          boxShadow: s === 'Focus' ? focusRing(t, 0.3) : 'none', transition: '.16s', display: 'flex', alignItems: 'center', padding: pad,
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            width: thumb, height: thumb, borderRadius: 999, background: '#FFFFFF', boxShadow: t.sh.sm,
            transform: on ? `translateX(${trackW - thumb - pad * 2}px)` : 'none', transition: '.16s',
            display: 'grid', placeItems: 'center', fontSize: thumb * 0.55, color: fill, lineHeight: 1,
          }}
        >
          {c.anatomy.icons ? (on ? '✓' : '×') : null}
        </span>
      </span>
      {c.anatomy.label && <span>Activar notificaciones</span>}
    </label>
  );
};

export const Input: Render = (t, c) => {
  const s = c.state;
  const error = s === 'Error';
  const success = s === 'Success';
  const disabled = s === 'Disabled';
  const readOnly = s === 'Read-only';
  const floating = c.anatomy.labelLayout === 'Flotante';
  const leftLabel = c.anatomy.labelLayout === 'Izquierda';
  const fs = num(c, 'fontSize');
  const accent = tone(t, t.P, '600', '400');
  const border = error ? t.sem.error['600'] : success ? t.sem.success['600'] : s === 'Focus' ? accent : s === 'Hover' ? tone(t, t.N, '400', '500') : t.s.border;

  return (
    <div style={{ fontFamily: t.body, width: 300, display: 'flex', flexDirection: leftLabel ? 'row' : 'column', gap: 6, alignItems: leftLabel ? 'center' : 'stretch' }}>
      {c.anatomy.label && !floating && (
        <label style={{ fontSize: px(t.ty['body-s'].size), color: t.s.text, width: leftLabel ? 80 : 'auto' }}>Etiqueta</label>
      )}
      <div style={{ position: 'relative', flex: 1 }}>
        {floating && c.anatomy.label && (
          <span
            style={{
              position: 'absolute', top: -7, left: 10, padding: '0 4px', background: t.s.surface, fontFamily: t.body,
              fontSize: px(t.ty.caption.size), color: s === 'Focus' ? accent : t.s.textMuted,
            }}
          >
            Etiqueta
          </span>
        )}
        <div
          style={{
            height: num(c, 'height'), display: 'flex', alignItems: 'center', gap: 8, padding: `0 ${px(num(c, 'padX'))}`,
            borderRadius: radius(t, c.props.radiusToken), background: disabled || readOnly ? subtle(t) : t.s.surface,
            borderWidth: px(num(c, 'borderWidth')), borderStyle: 'solid', borderColor: border,
            boxShadow: s === 'Focus' ? focusRing(t, 0.28) : 'none', opacity: disabled ? 0.6 : 1,
          }}
        >
          {c.anatomy.leadingIcon && (
            <span style={{ color: t.s.textMuted, display: 'flex' }}>
              <PlusIcon size={fs} />
            </span>
          )}
          <span style={{ flex: 1, fontFamily: t.body, fontSize: px(fs), color: s === 'Typing' || readOnly ? t.s.text : t.s.textMuted }}>
            {readOnly ? 'Valor de solo lectura' : s === 'Typing' ? 'Escribiendo' : 'Escribe aquí'}
          </span>
          {c.anatomy.trailingIcon && (
            <span style={{ color: t.s.textMuted, display: 'flex' }}>
              <ArrowIcon size={fs} />
            </span>
          )}
        </div>
      </div>
      {(c.anatomy.helper || c.anatomy.counter) && (
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', fontSize: px(t.ty.caption.size),
            color: error ? t.sem.error['600'] : success ? t.sem.success['700'] : t.s.textMuted,
          }}
        >
          {c.anatomy.helper && <span>{error ? 'Este campo es obligatorio' : success ? 'Todo correcto' : 'Texto de ayuda'}</span>}
          {c.anatomy.counter && <span>0/120</span>}
        </div>
      )}
    </div>
  );
};

export const Dropdown: Render = (t, c) => {
  const s = c.state;
  const open = s === 'Open';
  const disabled = s === 'Disabled';
  const fs = num(c, 'fontSize');
  const accent = tone(t, t.P, '600', '400');
  const border = s === 'Error' ? t.sem.error['600'] : open || s === 'Focus' ? accent : s === 'Hover' ? tone(t, t.N, '400', '500') : t.s.border;
  const itemPad = `${px(num(c, 'itemPadY'))} ${px(num(c, 'itemPadX'))}`;
  const options = ['Opción uno', 'Opción dos', 'Opción tres', 'Opción cuatro'];

  return (
    <div style={{ fontFamily: t.body, width: 260 }}>
      <div
        style={{
          height: num(c, 'height'), display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `0 ${px(num(c, 'padX'))}`, borderRadius: radius(t, 'md'), fontSize: px(fs),
          background: disabled ? subtle(t) : t.s.surface, color: disabled ? t.s.textMuted : t.s.text, border: `1px solid ${border}`,
          boxShadow: s === 'Focus' || open ? focusRing(t, 0.28) : 'none', opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>{open ? 'Opción dos' : 'Selecciona una opción'}</span>
        <span style={{ color: t.s.textMuted, transform: open ? 'rotate(180deg)' : 'none', lineHeight: 1 }}>⌄</span>
      </div>
      {open && (
        <div
          style={{
            marginTop: 6, background: t.s.surface, border: `1px solid ${t.s.border}`, borderRadius: radius(t, c.props.menuRadiusToken),
            boxShadow: shadow(t, c.props.elevation, t.sh.lg), overflowX: 'hidden', overflowY: 'auto', maxHeight: num(c, 'maxHeight'),
          }}
        >
          {c.anatomy.search && (
            <div style={{ padding: px(num(c, 'itemPadY')), borderBottom: `1px solid ${t.s.border}` }}>
              <div
                style={{
                  height: 28, borderRadius: radius(t, 'sm'), border: `1px solid ${t.s.border}`, display: 'flex', alignItems: 'center',
                  padding: '0 8px', fontSize: px(t.ty.caption.size), color: t.s.textMuted,
                }}
              >
                Buscar
              </div>
            </div>
          )}
          {c.anatomy.categories && (
            <div
              style={{
                padding: `6px ${px(num(c, 'itemPadX'))} 2px`, fontSize: px(t.ty.caption.size), color: t.s.textMuted,
                letterSpacing: '.06em', textTransform: 'uppercase',
              }}
            >
              Categoría
            </div>
          )}
          {options.map((label, i) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: itemPad, fontSize: px(fs), color: t.s.text, background: i === 1 ? subtle(t) : 'transparent' }}
            >
              {c.anatomy.itemIcon && <PlusIcon size={fs} />}
              <span style={{ flex: 1 }}>
                {label}
                {c.anatomy.itemDesc && <span style={{ display: 'block', fontSize: px(t.ty.caption.size), color: t.s.textMuted }}>Descripción secundaria</span>}
              </span>
              {c.anatomy.itemBadge && (
                <span style={{ fontSize: px(t.ty.caption.size), background: tone(t, t.P, '100', '800'), color: tone(t, t.P, '800', '200'), borderRadius: 99, padding: '1px 7px' }}>
                  3
                </span>
              )}
              {c.anatomy.checkmark && i === 1 && <span style={{ color: accent }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Search: Render = (t, c) => {
  const s = c.state;
  const active = s === 'Typing' || s === 'Loading';
  const fs = num(c, 'fontSize');

  return (
    <div style={{ width: 320, fontFamily: t.body }}>
      <div
        style={{
          height: num(c, 'height'), display: 'flex', alignItems: 'center', gap: 9, padding: `0 ${px(num(c, 'padX'))}`,
          background: t.s.surface, borderRadius: radius(t, c.props.radiusToken),
          border: `1px solid ${s === 'Focus' || active ? tone(t, t.P, '600', '400') : t.s.border}`,
          boxShadow: s === 'Focus' || active ? focusRing(t, 0.26) : 'none',
        }}
      >
        {c.anatomy.icon && (
          <span style={{ color: t.s.textMuted, display: 'flex' }}>
            <svg width={fs + 2} height={fs + 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" />
            </svg>
          </span>
        )}
        <span style={{ flex: 1, fontSize: px(fs), color: active ? t.s.text : t.s.textMuted }}>{active ? 'design sys' : 'Buscar'}</span>
        {s === 'Loading' && (
          <span style={{ color: t.s.textMuted, display: 'flex' }}>
            <Spinner size={fs} />
          </span>
        )}
        {(s === 'Clearable' || s === 'Typing') && c.anatomy.clear && <span style={{ color: t.s.textMuted }}>×</span>}
        {c.anatomy.shortcut && s === 'Default' && (
          <span style={{ fontSize: px(t.ty.caption.size), color: t.s.textMuted, border: `1px solid ${t.s.border}`, borderRadius: radius(t, 'xs'), padding: '1px 5px' }}>
            ⌘K
          </span>
        )}
      </div>
      {active && c.anatomy.autocomplete && (
        <div style={{ marginTop: 6, background: t.s.surface, border: `1px solid ${t.s.border}`, borderRadius: radius(t, 'md'), boxShadow: t.sh.lg, overflow: 'hidden' }}>
          {['design system', 'design tokens', 'design ops'].map((label, i) => (
            <div key={label} style={{ padding: '8px 12px', fontSize: px(t.ty['body-s'].size), color: t.s.text, background: i === 0 ? subtle(t) : 'transparent' }}>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Slider: Render = (t, c) => {
  const s = c.state;
  const disabled = s === 'Disabled';
  const dual = c.variant === 'Dual thumb';
  const fill = disabled ? tone(t, t.N, '400', '600') : tone(t, t.P, '600', '400');
  const thumbSize = num(c, 'thumbSize');
  const trackHeight = num(c, 'trackHeight');
  const hi = 62;
  const lo = 26;

  const thumb = (at: number) => (
    <span
      style={{
        position: 'absolute', left: `${at}%`, top: '50%', transform: 'translate(-50%,-50%)', width: thumbSize, height: thumbSize,
        borderRadius: 999, background: t.s.surface, border: `2px solid ${fill}`,
        boxShadow: s === 'Active / Dragging' ? focusRing(t, 0.18, 6) : shadow(t, c.props.thumbShadow, t.sh.sm),
      }}
    />
  );

  return (
    <div style={{ width: 300, fontFamily: t.body, opacity: disabled ? 0.5 : 1 }}>
      {c.anatomy.label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: px(t.ty['body-s'].size), color: t.s.text, marginBottom: 10 }}>
          <span>Volumen</span>
          {c.anatomy.value && <span style={{ color: t.s.textMuted }}>{hi}</span>}
        </div>
      )}
      <div style={{ position: 'relative', height: Math.max(thumbSize, 20), display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 0, right: 0, height: trackHeight, borderRadius: 999, background: tone(t, t.N, '200', '700') }} />
        <span style={{ position: 'absolute', left: dual ? `${lo}%` : 0, width: dual ? `${hi - lo}%` : `${hi}%`, height: trackHeight, borderRadius: 999, background: fill }} />
        {dual && thumb(lo)}
        {thumb(hi)}
      </div>
      {c.variant === 'Discrete' && c.anatomy.ticks && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} style={{ width: 1, height: 5, background: t.s.border }} />
          ))}
        </div>
      )}
    </div>
  );
};
