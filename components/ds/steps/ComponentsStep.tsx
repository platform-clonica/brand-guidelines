'use client';
import { useMemo, useState } from 'react';
import { colors, input, label as labelStyle } from '@/components/deck/studio/ui';
import {
  COMPONENTS,
  componentAxes,
  componentSummary,
  configFor,
  getComponent,
  propControl,
  resolveProps,
  type ComponentSpec,
} from '@/lib/ds/components';
import { clearProp, resetComponent, setAnatomy, setAxis, setNote, setProp } from '@/lib/ds/configs';
import { resolveTokens, type ResolvedTokens } from '@/lib/ds/engine/resolve';
import { fontStylesheets } from '@/lib/ds/fonts';
import type { ComponentConfig, Configs, Tokens } from '@/lib/ds/schema';
import { Checkbox, Field, Grid, LinkButton, MONO, NumberInput, Section, Segmented, Select, TextInput, cell, hintText } from '../controls';
import { renderComponent } from '../previews';

type Props = {
  tokens: Tokens;
  configs: Configs;
  readOnly: boolean;
  onConfigs: (c: Configs) => void;
};

const touchedMark = <span aria-label="Retocado a mano" title="Retocado a mano"> ●</span>;

/* Paso 3 · Componentes. Lista con buscador a la izquierda y, a la derecha, el componente elegido:
   previsualización, ejes, anatomía, propiedades y nota (decidido en 5c; el prototipo usaba tarjetas y
   un modal que tapaba la previsualización).

   Cada edición pasa por lib/ds/configs.ts y la recoge el autoguardado. `configs` es disperso: lo que
   vuelve al valor por defecto desaparece, y la marca ● señala lo que se ha tocado. No hay botón de
   "regenerar componente" como en el prototipo: las props que nadie tocó salen siempre de los tokens.

   En solo lectura la lista se puede recorrer; lo que queda desactivado son los controles. */
export function ComponentsStep({ tokens, configs, readOnly, onConfigs }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(COMPONENTS[0].key);
  const [picked, setPicked] = useState<'light' | 'dark'>('light');

  const mode = tokens.modes === 'both' ? picked : tokens.modes;
  const resolved = useMemo(() => resolveTokens(tokens, mode), [tokens, mode]);
  const fonts = useMemo(() => fontStylesheets(tokens), [tokens]);

  const q = query.trim().toLowerCase();
  const visible = COMPONENTS.filter((c) => !q || c.name.toLowerCase().includes(q));
  const spec = getComponent(selected) ?? COMPONENTS[0];

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
      {fonts.map((f) => (
        <link key={f.url} rel="stylesheet" href={f.url} precedence="ds-fonts" />
      ))}

      <aside style={{ width: 240, flexShrink: 0, overflowY: 'auto', padding: 16, borderRight: `1px solid ${colors.warmDark}` }}>
        <TextInput value={query} onChange={setQuery} ariaLabel="Buscar componente" placeholder="Buscar componente" />
        <nav aria-label="Componentes" style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          {visible.map((c) => {
            const on = c.key === spec.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => setSelected(c.key)}
                style={{
                  appearance: 'none', textAlign: 'left', cursor: 'pointer', padding: '8px 10px',
                  borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: `2px solid ${on ? colors.dark : 'transparent'}`,
                  background: on ? colors.white : 'transparent',
                }}
              >
                <span style={{ display: 'block', font: `500 12px/1.3 ${MONO}`, color: colors.dark }}>
                  {c.name}
                  {Object.hasOwn(configs, c.key) && touchedMark}
                </span>
                <span style={{ ...hintText, display: 'block' }}>{componentSummary(c)}</span>
              </button>
            );
          })}
          {visible.length === 0 && <p style={{ ...hintText, margin: '8px 10px' }}>Ningún componente coincide con «{query.trim()}».</p>}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 24px 64px' }}>
        <ComponentDetail
          key={spec.key}
          spec={spec}
          tokens={tokens}
          resolved={resolved}
          configs={configs}
          readOnly={readOnly}
          onConfigs={onConfigs}
          mode={mode}
          onMode={tokens.modes === 'both' ? setPicked : undefined}
        />
      </div>
    </div>
  );
}

function ComponentDetail({
  spec,
  tokens,
  resolved,
  configs,
  readOnly,
  onConfigs,
  mode,
  onMode,
}: {
  spec: ComponentSpec;
  tokens: Tokens;
  resolved: ResolvedTokens;
  configs: Configs;
  readOnly: boolean;
  onConfigs: (c: Configs) => void;
  mode: 'light' | 'dark';
  onMode?: (mode: 'light' | 'dark') => void;
}) {
  const config = configFor(configs, spec);
  const props = resolveProps(spec, resolved, config);
  const touched = Object.hasOwn(configs, spec.key);
  const axes = componentAxes(spec);

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={{ margin: 0, font: `600 14px/1.3 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', color: colors.dark }}>{spec.name}</h2>
        <span style={hintText}>{componentSummary(spec)}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          {touched && (
            <LinkButton disabled={readOnly} onClick={() => onConfigs(resetComponent(configs, spec.key))} title="Volver a la configuración por defecto del catálogo">
              Restablecer componente
            </LinkButton>
          )}
        </span>
      </header>

      <Stage spec={spec} resolved={resolved} config={config} mode={mode} onMode={onMode} />

      <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        {axes.length > 0 && (
          <Section title="Ejes" description="Qué combinación se muestra y cuál queda seleccionada en el styleguide. Los valores van en inglés: son los nombres que se usan en código.">
            {axes.map((a) => (
              <div key={a.key} style={{ marginBottom: 14 }}>
                <span style={labelStyle}>{a.label}</span>
                <Segmented
                  ariaLabel={`${spec.name}: ${a.label}`}
                  value={config[a.key] ?? ''}
                  options={a.values.map((v) => ({ value: v, label: v }))}
                  onChange={(v) => onConfigs(setAxis(configs, spec, a.key, v))}
                />
              </div>
            ))}
          </Section>
        )}

        {Object.keys(spec.anatomy).length > 0 && (
          <Section title="Anatomía">
            <Grid cols={2}>
              {Object.entries(spec.anatomy).map(([key, option]) =>
                option.type === 'bool' ? (
                  <Checkbox
                    key={key}
                    checked={config.anatomy[key] === true}
                    label={option.label}
                    onChange={(v) => onConfigs(setAnatomy(configs, spec, key, v))}
                  />
                ) : (
                  <Field key={key} label={option.label} htmlFor={`ds-anatomy-${spec.key}-${key}`}>
                    <Select
                      id={`ds-anatomy-${spec.key}-${key}`}
                      value={String(config.anatomy[key] ?? option.def)}
                      options={option.options.map((o) => ({ value: o, label: o }))}
                      onChange={(v) => onConfigs(setAnatomy(configs, spec, key, v))}
                    />
                  </Field>
                ),
              )}
            </Grid>
          </Section>
        )}

        <Section
          title="Propiedades"
          description={`Calculadas desde los tokens${config.size ? ` para la talla ${config.size}` : ''}. Lo que cambies a mano se queda fijo en todas las tallas.`}
          actions={
            Object.keys(config.props).length > 0 && (
              <LinkButton onClick={() => onConfigs(Object.keys(config.props).reduce((acc, key) => clearProp(acc, spec, key), configs))}>
                Restablecer todo
              </LinkButton>
            )
          }
        >
          {Object.entries(spec.propMeta).map(([key, label]) => (
            <PropRow
              key={key}
              name={key}
              label={label}
              value={props[key]}
              edited={Object.hasOwn(config.props, key)}
              spec={spec}
              tokens={tokens}
              onChange={(v) => onConfigs(setProp(configs, spec, resolved, key, v))}
              onReset={() => onConfigs(clearProp(configs, spec, key))}
            />
          ))}
        </Section>

        <Section title="Comportamiento específico">
          <textarea
            aria-label={`Nota de implementación de ${spec.name}`}
            rows={3}
            value={config.note}
            placeholder="Ej.: el botón primario crece un poco al pasar por encima"
            onChange={(e) => onConfigs(setNote(configs, spec, e.target.value))}
            style={{ ...input, resize: 'vertical', font: `400 12px/1.5 ${MONO}` }}
          />
          <p style={{ ...hintText, margin: '6px 0 0' }}>Sale en el styleguide como nota de implementación para quien lo desarrolle.</p>
        </Section>
      </fieldset>
    </>
  );
}

/* La previsualización: el componente en cada valor de su primer eje (variante, intención o talla),
   con el resto de la configuración elegida, como el prototipo (l4). El modal va solo: su talla cambia
   el lienzo entero. Todo lo de dentro del lienzo es del CLIENTE; la franja de arriba es chrome. */
function Stage({
  spec,
  resolved,
  config,
  mode,
  onMode,
}: {
  spec: ComponentSpec;
  resolved: ResolvedTokens;
  config: ComponentConfig;
  mode: 'light' | 'dark';
  onMode?: (mode: 'light' | 'dark') => void;
}) {
  const axis = spec.previewAxis === 'none' ? null : (componentAxes(spec).find((a) => a.key !== 'state') ?? null);
  const cells = axis
    ? axis.values.map((value) => ({ id: value, label: value, on: config[axis.key] === value, config: { ...config, [axis.key]: value } }))
    : [{ id: 'single', label: null, on: true, config }];

  return (
    <div style={{ border: `1px solid ${colors.warmDark}`, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: colors.warmLight, borderBottom: `1px solid ${colors.warmDark}` }}>
        <span style={{ font: `500 10px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase', color: colors.ash }}>
          Previsualización{axis ? ` · por ${axis.label.toLowerCase()}` : ''}
        </span>
        {onMode && (
          <span style={{ marginLeft: 'auto', width: 180 }}>
            <Segmented
              ariaLabel="Modo de la previsualización"
              value={mode}
              onChange={onMode}
              options={[
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Oscuro' },
              ]}
            />
          </span>
        )}
      </div>
      <div style={{ background: resolved.s.canvas, padding: 32, display: 'flex', flexWrap: 'wrap', gap: '28px 40px', alignItems: 'flex-start' }}>
        {cells.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, maxWidth: '100%', flex: axis ? '0 1 auto' : '1 1 100%' }}>
            {c.label && (
              <span
                style={{
                  font: `${c.on ? 600 : 400} 10px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase',
                  color: c.on ? resolved.s.text : resolved.s.textMuted,
                }}
              >
                {c.label}
                {c.on ? ' · elegida' : ''}
              </span>
            )}
            {renderComponent(spec, resolved, c.config)}
          </div>
        ))}
      </div>
    </div>
  );
}

function PropRow({
  name,
  label,
  value,
  edited,
  spec,
  tokens,
  onChange,
  onReset,
}: {
  name: string;
  label: string;
  value: number | string | undefined;
  edited: boolean;
  spec: ComponentSpec;
  tokens: Tokens;
  onChange: (v: number | string) => void;
  onReset: () => void;
}) {
  const control = propControl(name);
  const ariaLabel = `${spec.name}: ${label}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: `1px solid ${colors.warmDark}` }}>
      <span style={{ ...cell, padding: 0, flex: 1, minWidth: 0 }}>
        {label}
        {edited && touchedMark}
      </span>
      {control.kind === 'number' ? (
        <NumberInput
          value={Number(value)}
          integer={false}
          min={control.min}
          max={control.max}
          suffix={control.max === 1 ? undefined : 'px'}
          width={64}
          ariaLabel={ariaLabel}
          onChange={(v) => v !== null && onChange(v)}
        />
      ) : (
        <Select
          value={String(value)}
          width={96}
          ariaLabel={ariaLabel}
          options={(control.kind === 'radius' ? Object.keys(tokens.radius) : tokens.shadows.map((s) => s.name)).map((n) => ({ value: n, label: n }))}
          onChange={onChange}
        />
      )}
      <span style={{ width: 90, textAlign: 'right' }}>{edited && <LinkButton onClick={onReset}>Restablecer</LinkButton>}</span>
    </div>
  );
}
