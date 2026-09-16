'use client';
import { useState } from 'react';
import { colors } from '@/components/deck/studio/ui';
import {
  clearOverrideEntry,
  clearOverrideSection,
  clearRampTweak,
  clearSemanticBase,
  clearSwatch,
  clearSwatchesUnder,
  clearTypeOverride,
  lockFamily,
  randomRampTweak,
  setRadiusMapOverride,
  setRadiusOverride,
  setRampTweak,
  setSemanticBase,
  setShadowOverride,
  setSpacingOverride,
  setSwatch,
  setTypeOverride,
  unlockFamily,
} from '@/lib/ds/edit';
import { TYPE_ROLES } from '@/lib/ds/engine/presets';
import { radiusCss, shadowCss } from '@/lib/ds/engine/resolve';
import { SEMANTIC_KEYS } from '@/lib/ds/engine/semantic';
import type { ContrastWarning } from '@/lib/ds/engine/warnings';
import { cssString } from '@/lib/ds/escape';
import type { Brand, Overrides, Tokens } from '@/lib/ds/schema';
import { ColorInput, LinkButton, MONO, NumberInput, Section, Select, cell, headCell, hintText } from '../controls';
import { familyLabel, NEUTRAL_LABELS, RADIUS_COMPONENT_LABELS, SEMANTIC_LABELS, WEIGHT_OPTIONS } from '../labels';
import { Swatch } from '../Swatch';

type Props = {
  brand: Brand;
  overrides: Overrides;
  tokens: Tokens;
  contrast: ContrastWarning[];
  onOverrides: (o: Overrides) => void;
  onBrand: (b: Brand) => void;
};

const familyTitle = { font: `600 11px/1 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', color: colors.dark } as const;
const touchedMark = <span aria-label="Retocado a mano" title="Retocado a mano"> ●</span>;

/* Paso 2 · Fundamentos. Los tokens generados, editables uno a uno. Cada edición es un override
   disperso (lib/ds/edit.ts) y se guarda sola: aquí no hay "Guardar cambios" por sección como en el
   prototipo, que además tiraba el borrador al abrir otra. "Restablecer" deja el valor del motor.

   Lo estructural (familias, fuentes, unidad, radios, breakpoints) es de `brand` y se cambia en el
   paso 1 (plan, H1). La única excepción es el color base de cada familia, que el plan permite tocar
   aquí también porque es lo que se está mirando. */
export function FoundationsStep({ brand, overrides: o, tokens, contrast, onOverrides, onBrand }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const toggle = (path: string) => setSelected((cur) => (cur === path ? null : path));
  const warnAt = (path: string) => contrast.some((w) => w.kind === 'text-on-swatch' && w.path === path);

  return (
    <div style={{ padding: '24px 24px 64px' }}>
      <Section
        title="Paleta"
        description="Pulsa una muestra para retocarla. Bloquear congela la familia tal como se ve: ni el paso 1 ni el motor la vuelven a tocar."
      >
        {Object.entries(tokens.palette).map(([family, ramp]) => {
          const locked = !!o.locks?.[family];
          const tweak = o.rampTweaks?.[family];
          const fromBrand = Object.hasOwn(brand.colors, family);
          const prefix = `palette.${family}.`;
          const retouched = Object.keys(o.swatches ?? {}).filter((p) => p.startsWith(prefix)).length;
          return (
            <div key={family} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ ...familyTitle, minWidth: 96 }}>{familyLabel(family)}</span>
                {fromBrand ? (
                  <ColorInput
                    value={brand.colors[family]}
                    onChange={(hex) => onBrand({ ...brand, colors: { ...brand.colors, [family]: hex } })}
                    ariaLabel={`Color base de ${familyLabel(family)}`}
                    width={132}
                  />
                ) : (
                  <span style={hintText}>{NEUTRAL_LABELS[brand.neutralPreset]} · se elige en Marca</span>
                )}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {retouched > 0 && !locked && (
                    <LinkButton onClick={() => onOverrides(clearSwatchesUnder(o, prefix))}>Quitar retoques ({retouched})</LinkButton>
                  )}
                  {fromBrand && !locked && tweak && <LinkButton onClick={() => onOverrides(clearRampTweak(o, family))}>Quitar variación</LinkButton>}
                  {fromBrand && !locked && (
                    <LinkButton onClick={() => onOverrides(setRampTweak(o, family, randomRampTweak()))}>Variar rampa</LinkButton>
                  )}
                  <LinkButton onClick={() => onOverrides(locked ? unlockFamily(o, family) : lockFamily(o, family, ramp))}>
                    {locked ? 'Desbloquear' : 'Bloquear'}
                  </LinkButton>
                </span>
              </div>
              <RampGrid
                group="palette"
                name={family}
                ramp={ramp}
                overrides={o}
                selected={selected}
                onSelect={locked ? undefined : toggle}
                warnAt={warnAt}
              />
              {locked && <p style={{ ...hintText, margin: '8px 0 0' }}>Bloqueada. Desbloquéala para retocar muestras o variar la rampa.</p>}
              {!locked && selected?.startsWith(prefix) && (
                <SwatchEditor path={selected} hex={ramp[selected.slice(prefix.length) as keyof typeof ramp]} overrides={o} onOverrides={onOverrides} onClose={() => setSelected(null)} />
              )}
            </div>
          );
        })}
      </Section>

      <Section
        title="Semánticos"
        description="El color base rehace la rampa entera. Los tonos 50, 100 y 200 son los fondos suaves de avisos y estados."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 28 }}>
          {SEMANTIC_KEYS.map((key) => {
            const base = o.semanticBase?.[key];
            const prefix = `semanticScale.${key}.`;
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ ...familyTitle, minWidth: 96 }}>{SEMANTIC_LABELS[key]}</span>
                  <ColorInput
                    value={base ?? tokens.semantic[key]['500']}
                    onChange={(hex) => onOverrides(setSemanticBase(o, key, hex))}
                    ariaLabel={`Color base de ${SEMANTIC_LABELS[key]}`}
                    width={132}
                  />
                  {base && <LinkButton onClick={() => onOverrides(clearSemanticBase(o, key))}>Restablecer</LinkButton>}
                </div>
                <RampGrid group="semanticScale" name={key} ramp={tokens.semanticScale[key]} overrides={o} selected={selected} onSelect={toggle} warnAt={warnAt} />
                {selected?.startsWith(prefix) && (
                  <SwatchEditor
                    path={selected}
                    hex={tokens.semanticScale[key][selected.slice(prefix.length) as keyof (typeof tokens.semanticScale)[typeof key]]}
                    overrides={o}
                    onOverrides={onOverrides}
                    onClose={() => setSelected(null)}
                  />
                )}
                <div aria-hidden style={{ display: 'flex', height: 8, marginTop: 10 }} title="Rampa completa">
                  {Object.values(tokens.semantic[key]).map((hex, i) => (
                    <span key={i} style={{ flex: 1, background: hex }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Tipografía"
        description={`Titulares en ${tokens.fonts.heading} y texto en ${tokens.fonts.body}. Las familias, el tamaño base y el ratio se eligen en Marca.`}
        actions={o.typography && <LinkButton onClick={() => onOverrides(clearOverrideSection(o, 'typography'))}>Restablecer todo</LinkButton>}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={headCell}>Rol</th>
                <th style={headCell}>Muestra</th>
                <th style={headCell}>Tamaño</th>
                <th style={headCell}>Peso</th>
                <th style={headCell}>Interlineado</th>
                <th style={headCell}>Tracking</th>
                <th style={headCell} aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {tokens.typography.map((t) => {
                const role = TYPE_ROLES.find((r) => r.key === t.key);
                const touched = !!o.typography?.[t.key];
                const family = t.family === 'heading' ? tokens.fonts.heading : tokens.fonts.body;
                const label = role?.label ?? t.key;
                return (
                  <tr key={t.key} style={{ borderTop: `1px solid ${colors.warmDark}` }}>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                      {label}
                      {touched && touchedMark}
                    </td>
                    <td style={{ ...cell, maxWidth: 320, overflow: 'hidden' }}>
                      {/* Fuente y peso del CLIENTE: no aplica la norma de pesos del chrome. */}
                      <span
                        style={{
                          display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          fontFamily: `"${cssString(family)}", Georgia, serif`, fontSize: Math.min(t.size, 40), fontWeight: t.weight,
                          lineHeight: 1.15, letterSpacing: t.letterSpacing, color: colors.dark,
                        }}
                      >
                        {role?.preview ?? 'Aa'}
                      </span>
                    </td>
                    <td style={cell}>
                      <NumberInput value={t.size} min={1} max={400} suffix="px" width={60} ariaLabel={`${label}: tamaño`} onChange={(v) => v !== null && onOverrides(setTypeOverride(o, t.key, 'size', v))} />
                    </td>
                    <td style={cell}>
                      <Select value={t.weight} options={WEIGHT_OPTIONS} width={80} ariaLabel={`${label}: peso`} onChange={(v) => onOverrides(setTypeOverride(o, t.key, 'weight', v))} />
                    </td>
                    <td style={cell}>
                      <NumberInput value={t.lineHeight} min={1} max={600} suffix="px" width={60} ariaLabel={`${label}: interlineado`} onChange={(v) => v !== null && onOverrides(setTypeOverride(o, t.key, 'lineHeight', v))} />
                    </td>
                    <td style={cell}>
                      <NumberInput value={t.letterSpacing} integer={false} min={-20} max={20} suffix="px" width={60} ariaLabel={`${label}: tracking`} onChange={(v) => v !== null && onOverrides(setTypeOverride(o, t.key, 'letterSpacing', v))} />
                    </td>
                    <td style={{ ...cell, textAlign: 'right' }}>
                      {touched && <LinkButton onClick={() => onOverrides(clearTypeOverride(o, t.key))}>Restablecer</LinkButton>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Espaciado"
        description="Sale de la unidad base y la densidad, que se eligen en Marca."
        actions={o.spacing && <LinkButton onClick={() => onOverrides(clearOverrideSection(o, 'spacing'))}>Restablecer todo</LinkButton>}
      >
        {tokens.spacing.map((s) => {
          const touched = o.spacing?.[s.name] !== undefined;
          return (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 0', borderTop: `1px solid ${colors.warmDark}` }}>
              <span style={{ ...cell, width: 56, padding: 0 }}>
                {s.name}
                {touched && touchedMark}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span aria-hidden style={{ display: 'block', width: Math.min(s.value, 320), height: 12, background: colors.dark, opacity: 0.18 }} />
              </span>
              <NumberInput value={s.value} min={0} max={512} suffix="px" width={60} ariaLabel={`Espaciado ${s.name}`} onChange={(v) => v !== null && onOverrides(setSpacingOverride(o, s.name, v))} />
              <span style={{ width: 90, textAlign: 'right' }}>
                {touched && <LinkButton onClick={() => onOverrides(clearOverrideEntry(o, 'spacing', s.name))}>Restablecer</LinkButton>}
              </span>
            </div>
          );
        })}
      </Section>

      <Section
        title="Radios"
        description="La escala sale del estilo elegido en Marca. Debajo, qué escalón usa cada componente."
        actions={
          (o.radius || o.radiusMap) && (
            <LinkButton onClick={() => onOverrides(clearOverrideSection(clearOverrideSection(o, 'radius'), 'radiusMap'))}>Restablecer todo</LinkButton>
          )
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16, marginBottom: 24 }}>
          {Object.entries(tokens.radius).map(([name, value]) => {
            const touched = o.radius?.[name] !== undefined;
            return (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span aria-hidden style={{ width: 64, height: 44, border: `1.5px solid ${colors.dark}`, borderRadius: radiusCss(value) }} />
                <span style={{ ...cell, padding: 0 }}>
                  {name}
                  {touched && touchedMark}
                </span>
                <NumberInput value={value} min={0} max={999} suffix="px" width={60} ariaLabel={`Radio ${name}`} onChange={(v) => v !== null && onOverrides(setRadiusOverride(o, name, v))} />
                {touched && <LinkButton onClick={() => onOverrides(clearOverrideEntry(o, 'radius', name))}>Restablecer</LinkButton>}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '4px 20px' }}>
          {Object.entries(tokens.radiusMap).map(([component, radiusName]) => {
            const touched = o.radiusMap?.[component] !== undefined;
            const label = RADIUS_COMPONENT_LABELS[component] ?? component;
            return (
              <div key={component} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                <span style={{ ...cell, padding: 0, flex: 1 }}>
                  {label}
                  {touched && touchedMark}
                </span>
                <Select
                  value={radiusName}
                  width={84}
                  ariaLabel={`Radio de ${label}`}
                  options={Object.keys(tokens.radius).map((r) => ({ value: r, label: r }))}
                  onChange={(r) => onOverrides(setRadiusMapOverride(o, component, r))}
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Sombras"
        description="La intensidad sale del estilo de Marca, y el color, del neutro 900."
        actions={o.shadows && <LinkButton onClick={() => onOverrides(clearOverrideSection(o, 'shadows'))}>Restablecer todo</LinkButton>}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Muestra', 'X', 'Y', 'Desenfoque', 'Extensión', 'Opacidad', ''].map((h, i) => (
                  <th key={i} style={headCell} aria-label={h || 'Acciones'}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.shadows.map((s) => {
                const touched = !!o.shadows?.[s.name];
                const field = (key: 'x' | 'y' | 'blur' | 'spread', label: string, min?: number) => (
                  <td style={cell}>
                    <NumberInput value={s[key]} min={min} max={200} width={52} ariaLabel={`Sombra ${s.name}: ${label}`} onChange={(v) => v !== null && onOverrides(setShadowOverride(o, s.name, key, v))} />
                  </td>
                );
                return (
                  <tr key={s.name} style={{ borderTop: `1px solid ${colors.warmDark}` }}>
                    <td style={cell}>
                      {s.name}
                      {touched && touchedMark}
                    </td>
                    <td style={cell}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 72, height: 44, background: colors.warmLight }}>
                        <span aria-hidden style={{ width: 44, height: 26, background: colors.white, boxShadow: shadowCss(s) }} />
                      </span>
                    </td>
                    {field('x', 'X')}
                    {field('y', 'Y')}
                    {field('blur', 'desenfoque', 0)}
                    {field('spread', 'extensión')}
                    <td style={cell}>
                      <NumberInput value={s.opacity} integer={false} min={0} max={1} width={52} ariaLabel={`Sombra ${s.name}: opacidad`} onChange={(v) => v !== null && onOverrides(setShadowOverride(o, s.name, 'opacity', v))} />
                    </td>
                    <td style={{ ...cell, textAlign: 'right' }}>
                      {touched && <LinkButton onClick={() => onOverrides(clearOverrideEntry(o, 'shadows', s.name))}>Restablecer</LinkButton>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

/* Rampa en fila. Definida fuera del paso a propósito: un componente declarado dentro del render se
   remonta en cada tecla y el campo de color perdería el foco. */
function RampGrid({
  group,
  name,
  ramp,
  overrides,
  selected,
  onSelect,
  warnAt,
}: {
  group: 'palette' | 'semanticScale';
  name: string;
  ramp: Record<string, string>;
  overrides: Overrides;
  selected: string | null;
  onSelect?: (path: string) => void;
  warnAt: (path: string) => boolean;
}) {
  const entries = Object.entries(ramp);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))`, gap: 6 }}>
      {entries.map(([step, hex]) => {
        const path = `${group}.${name}.${step}`;
        return (
          <Swatch
            key={step}
            hex={hex}
            step={step}
            label={`${group === 'palette' ? familyLabel(name) : SEMANTIC_LABELS[name as keyof typeof SEMANTIC_LABELS]} ${step}`}
            overridden={overrides.swatches?.[path] !== undefined}
            warn={warnAt(path)}
            selected={selected === path}
            onSelect={onSelect && (() => onSelect(path))}
          />
        );
      })}
    </div>
  );
}

function SwatchEditor({
  path,
  hex,
  overrides,
  onOverrides,
  onClose,
}: {
  path: string;
  hex: string;
  overrides: Overrides;
  onOverrides: (o: Overrides) => void;
  onClose: () => void;
}) {
  const touched = overrides.swatches?.[path] !== undefined;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 12, padding: '10px 12px', background: colors.warmLight }}>
      <span style={{ ...hintText, color: colors.dark }}>{path}</span>
      <ColorInput value={hex} onChange={(v) => onOverrides(setSwatch(overrides, path, v))} ariaLabel={`Retocar ${path}`} width={132} />
      {touched && <LinkButton onClick={() => onOverrides(clearSwatch(overrides, path))}>Volver al del motor</LinkButton>}
      <span style={{ marginLeft: 'auto' }}>
        <LinkButton onClick={onClose}>Cerrar</LinkButton>
      </span>
    </div>
  );
}
