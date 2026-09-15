'use client';
import { useState } from 'react';
import { colors, input } from '@/components/deck/studio/ui';
import { publicLogoUrl } from '@/lib/decks/publicApi';
import { addFamily, FIXED_FAMILIES, removeFamily, renameFamily } from '@/lib/ds/edit';
import { deriveColors } from '@/lib/ds/engine/derive';
import { BASE_SIZES, DENSITY, RADIUS_PRESETS, RATIOS, SHADOW_PRESETS, type Density, type RadiusStyle, type ShadowPreset } from '@/lib/ds/engine/presets';
import { NEUTRAL_PRESETS, type NeutralPreset } from '@/lib/ds/engine/ramp';
import type { ContrastWarning } from '@/lib/ds/engine/warnings';
import { CURATED_FONTS } from '@/lib/ds/fonts';
import type { Brand, Overrides } from '@/lib/ds/schema';
import {
  ALERT,
  Checkbox,
  ColorInput,
  Field,
  Grid,
  LinkButton,
  MONO,
  NumberInput,
  Section,
  Segmented,
  Select,
  TextInput,
  cell,
  headCell,
  hintText,
} from '../controls';
import { MODE_LABELS, NEUTRAL_LABELS, WEIGHT_OPTIONS } from '../labels';

export type LogoKind = 'light' | 'dark';

/* Los MIME que admite el bucket `deck-assets`. El prototipo aceptaba `image/*` y un GIF habría
   fallado en el servidor (plan, §1). */
const LOGO_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/svg+xml';

const keys = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as T[];

/* Paso 1 · Marca. Formulario a pantalla completa: todo lo estructural del sistema (`brand`, plan H1).
   Lo que se toca aquí regenera los tokens en vivo; los retoques del paso 2 se conservan. */
export function BrandStep({
  brand,
  overrides,
  contrast,
  logos,
  logoBusy,
  logoError,
  onSystem,
  onLogo,
}: {
  brand: Brand;
  overrides: Overrides;
  contrast: ContrastWarning[];
  logos: { light: string | null; dark: string | null };
  logoBusy: LogoKind | null;
  logoError: string | null;
  /** Renombrar o quitar una familia toca también `overrides`, para no dejar ajustes huérfanos. */
  onSystem: (brand: Brand, overrides?: Overrides) => void;
  onLogo: (kind: LogoKind, file: File | null) => void;
}) {
  const set = (patch: Partial<Brand>) => onSystem({ ...brand, ...patch });
  const extras = Object.keys(brand.colors).filter((f) => !(FIXED_FAMILIES as readonly string[]).includes(f));
  const canvasWarnings = contrast.filter((w) => w.kind === 'color-on-canvas');

  const setColor = (family: string, hex: string) => set({ colors: { ...brand.colors, [family]: hex } });

  const derive = () => {
    const { secondary, accent } = deriveColors(brand.colors.primary);
    set({ colors: { ...brand.colors, secondary, accent } });
  };

  const updateBreakpoint = (i: number, patch: Partial<Brand['breakpoints'][number]>) =>
    set({ breakpoints: brand.breakpoints.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const updateGrid = (i: number, patch: Partial<Brand['grid'][number]>) =>
    set({ grid: brand.grid.map((g, j) => (j === i ? { ...g, ...patch } : g)) });

  /* El nuevo empieza donde acababa el último; si el último no tenía máximo, se lo pone. */
  const addBreakpoint = () => {
    const bps = brand.breakpoints.map((b) => ({ ...b }));
    const last = bps[bps.length - 1];
    const min = (last.max ?? last.min + 400) + 1;
    if (last.max === null) last.max = min - 1;
    set({ breakpoints: [...bps, { name: 'Nuevo', min, max: null }] });
  };

  /* La retícula se cruza con los breakpoints por nombre (plan, H8): se propone el primero que no tenga. */
  const addGrid = () => {
    const free = brand.breakpoints.find((b) => !brand.grid.some((g) => g.name === b.name));
    set({ grid: [...brand.grid, { name: free?.name ?? 'Nuevo', columns: 12, margin: 24, gutter: 24 }] });
  };

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px 64px' }}>
      <Section title="Identidad">
        <Grid cols={2}>
          <Field label="Nombre del sistema" htmlFor="ds-name">
            <TextInput id="ds-name" value={brand.name} onChange={(name) => set({ name })} placeholder="Acme web" />
          </Field>
          <Field label="Cliente" htmlFor="ds-client">
            <TextInput id="ds-client" value={brand.client ?? ''} onChange={(v) => set({ client: v || null })} placeholder="Opcional" />
          </Field>
          <LogoField label="Logo sobre fondo claro" kind="light" path={logos.light} busy={logoBusy === 'light'} onLogo={onLogo} />
          <LogoField label="Logo sobre fondo oscuro" kind="dark" path={logos.dark} busy={logoBusy === 'dark'} onLogo={onLogo} />
        </Grid>
        {logoError && (
          <div role="alert" style={{ ...hintText, color: ALERT }}>
            {logoError}
          </div>
        )}
      </Section>

      <Section title="Modo">
        <Field label="Modos que genera">
          <Segmented
            ariaLabel="Modos que genera"
            value={brand.mode}
            onChange={(mode) => set({ mode })}
            options={keys(MODE_LABELS).map((m) => ({ value: m, label: MODE_LABELS[m] }))}
          />
        </Field>
        <Checkbox
          checked={brand.highContrast}
          onChange={(highContrast) => set({ highContrast })}
          label="Alto contraste"
          hint="Separa más los claros de los oscuros en todas las rampas. Empuja hacia AAA pero no lo garantiza: los ratios reales están en el paso 2."
        />
      </Section>

      <Section
        title="Color"
        actions={
          <>
            <LinkButton onClick={() => onSystem(addFamily(brand, '#7C5CFF').brand)}>Añadir color</LinkButton>
            <LinkButton onClick={derive} title="Sustituye el secundario y crea o sustituye el acento">
              Derivar secundario y acento del primario
            </LinkButton>
          </>
        }
      >
        <Grid cols={3}>
          <Field label="Primario">
            <ColorInput value={brand.colors.primary} onChange={(hex) => setColor('primary', hex)} ariaLabel="Color primario" width={180} />
          </Field>
          <Field label="Secundario">
            <ColorInput value={brand.colors.secondary} onChange={(hex) => setColor('secondary', hex)} ariaLabel="Color secundario" width={180} />
          </Field>
        </Grid>
        {canvasWarnings.map((w) => (
          <p key={w.mode} role="status" style={{ ...hintText, color: ALERT, margin: '-6px 0 14px' }}>
            El primario sobre el fondo {w.mode === 'dark' ? 'oscuro' : 'claro'} da {String(w.ratio).replace('.', ',')}:1 y no llega a AA
            (4,5:1): no sirve como color de texto o de enlace.
          </p>
        ))}

        {extras.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...hintText, marginBottom: 8 }}>
              El nombre acaba en una variable CSS (<code>--ds-nombre-500</code>): minúsculas, números y guiones.
            </div>
            {extras.map((family) => (
              <FamilyRow
                key={family}
                family={family}
                hex={brand.colors[family]}
                onHex={(hex) => setColor(family, hex)}
                onRename={(to) => {
                  const res = renameFamily(brand, overrides, family, to);
                  if (!res.ok) return res.error;
                  onSystem(res.brand, res.overrides);
                  return null;
                }}
                onRemove={() => {
                  const res = removeFamily(brand, overrides, family);
                  onSystem(res.brand, res.overrides);
                }}
              />
            ))}
          </div>
        )}

        <Grid cols={2}>
          <Field label="Neutros" htmlFor="ds-neutral">
            <Select<NeutralPreset>
              id="ds-neutral"
              value={brand.neutralPreset}
              onChange={(neutralPreset) => set({ neutralPreset })}
              options={keys(NEUTRAL_PRESETS).map((k) => ({ value: k, label: NEUTRAL_LABELS[k] }))}
            />
          </Field>
        </Grid>
        <Checkbox
          checked={brand.harmonize}
          onChange={(harmonize) => set({ harmonize })}
          label="Armonizar los semánticos con el primario"
          hint="Acerca la saturación de éxito, aviso, error e información a la del primario. No cambia su tono."
        />
      </Section>

      <Section title="Tipografía" description="Google Fonts: elige de la lista o escribe el nombre exacto de la familia.">
        <datalist id="ds-fonts">
          {CURATED_FONTS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <Grid cols={2}>
          <Field label="Titulares" htmlFor="ds-font-heading">
            <TextInput id="ds-font-heading" list="ds-fonts" value={brand.fonts.heading} onChange={(heading) => set({ fonts: { ...brand.fonts, heading } })} />
          </Field>
          <Field label="Texto" htmlFor="ds-font-body">
            <TextInput id="ds-font-body" list="ds-fonts" value={brand.fonts.body} onChange={(body) => set({ fonts: { ...brand.fonts, body } })} />
          </Field>
        </Grid>
        <Grid cols={3}>
          <Field label="Peso de display, H1 y H2" htmlFor="ds-w-display">
            <Select id="ds-w-display" value={brand.weights.display} options={WEIGHT_OPTIONS} onChange={(display) => set({ weights: { ...brand.weights, display } })} />
          </Field>
          <Field label="Peso de H3 a H6" htmlFor="ds-w-heading">
            <Select id="ds-w-heading" value={brand.weights.heading} options={WEIGHT_OPTIONS} onChange={(heading) => set({ weights: { ...brand.weights, heading } })} />
          </Field>
          <Field label="Peso del texto" htmlFor="ds-w-body">
            <Select id="ds-w-body" value={brand.weights.body} options={WEIGHT_OPTIONS} onChange={(body) => set({ weights: { ...brand.weights, body } })} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Tamaño base" htmlFor="ds-base">
            <Select
              id="ds-base"
              value={brand.baseSize}
              onChange={(baseSize) => set({ baseSize })}
              options={BASE_SIZES.map((b) => ({ value: b.value, label: `${b.label} · ${b.value}px` }))}
            />
          </Field>
          <Field label="Ratio de escala" htmlFor="ds-ratio">
            <Select
              id="ds-ratio"
              value={brand.ratio}
              onChange={(ratio) => set({ ratio })}
              options={RATIOS.map((r) => ({ value: r.value, label: `${r.name} · ${r.value} · ${r.desc}` }))}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Forma y espacio">
        <Field label="Sombras">
          <Segmented<ShadowPreset>
            ariaLabel="Sombras"
            value={brand.shadow}
            onChange={(shadow) => set({ shadow })}
            options={keys(SHADOW_PRESETS).map((k) => ({ value: k, label: SHADOW_PRESETS[k].label }))}
          />
        </Field>
        <Field
          label="Radios"
          hint={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Muestra
              <span
                style={{
                  display: 'inline-block', padding: '6px 14px', border: `1px solid ${colors.dark}`,
                  borderRadius: Math.min(RADIUS_PRESETS[brand.radiusStyle].sample, 999), font: `500 10px/1 ${MONO}`, color: colors.dark,
                }}
              >
                Botón
              </span>
            </span>
          }
        >
          <Segmented<RadiusStyle>
            ariaLabel="Radios"
            value={brand.radiusStyle}
            onChange={(radiusStyle) => set({ radiusStyle })}
            options={keys(RADIUS_PRESETS).map((k) => ({ value: k, label: RADIUS_PRESETS[k].label }))}
          />
        </Field>
        <Grid cols={2}>
          <Field label="Unidad de espaciado">
            <Segmented
              ariaLabel="Unidad de espaciado"
              value={brand.spacingUnit}
              onChange={(spacingUnit) => set({ spacingUnit })}
              options={[4, 8].map((v) => ({ value: v, label: `${v}px` }))}
            />
          </Field>
          <Field label="Densidad">
            <Segmented<Density>
              ariaLabel="Densidad"
              value={brand.density}
              onChange={(density) => set({ density })}
              options={keys(DENSITY).map((k) => ({ value: k, label: DENSITY[k].label }))}
            />
          </Field>
        </Grid>
      </Section>

      <Section
        title="Breakpoints"
        description="El último no tiene máximo: déjalo vacío. La retícula se cruza con los breakpoints por nombre."
        actions={<LinkButton onClick={addBreakpoint}>Añadir breakpoint</LinkButton>}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headCell}>Nombre</th>
              <th style={headCell}>Desde</th>
              <th style={headCell}>Hasta</th>
              <th style={headCell} aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {brand.breakpoints.map((b, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${colors.warmDark}` }}>
                <td style={cell}>
                  <TextInput value={b.name} onChange={(name) => updateBreakpoint(i, { name })} ariaLabel={`Nombre del breakpoint ${i + 1}`} width={180} />
                </td>
                <td style={cell}>
                  <NumberInput value={b.min} min={0} suffix="px" ariaLabel={`${b.name}: desde`} onChange={(v) => v !== null && updateBreakpoint(i, { min: v })} />
                </td>
                <td style={cell}>
                  <NumberInput value={b.max} min={0} nullable placeholder="∞" suffix="px" ariaLabel={`${b.name}: hasta`} onChange={(max) => updateBreakpoint(i, { max })} />
                </td>
                <td style={{ ...cell, textAlign: 'right' }}>
                  <LinkButton danger disabled={brand.breakpoints.length === 1} onClick={() => set({ breakpoints: brand.breakpoints.filter((_, j) => j !== i) })}>
                    Quitar
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Retícula" actions={<LinkButton onClick={addGrid}>Añadir retícula</LinkButton>}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headCell}>Nombre</th>
              <th style={headCell}>Columnas</th>
              <th style={headCell}>Margen</th>
              <th style={headCell}>Medianil</th>
              <th style={headCell} aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {brand.grid.map((g, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${colors.warmDark}` }}>
                <td style={cell}>
                  <TextInput value={g.name} onChange={(name) => updateGrid(i, { name })} ariaLabel={`Nombre de la retícula ${i + 1}`} width={180} />
                </td>
                <td style={cell}>
                  <NumberInput value={g.columns} min={1} max={24} ariaLabel={`${g.name}: columnas`} onChange={(v) => v !== null && updateGrid(i, { columns: v })} />
                </td>
                <td style={cell}>
                  <NumberInput value={g.margin} min={0} suffix="px" ariaLabel={`${g.name}: margen`} onChange={(v) => v !== null && updateGrid(i, { margin: v })} />
                </td>
                <td style={cell}>
                  <NumberInput value={g.gutter} min={0} suffix="px" ariaLabel={`${g.name}: medianil`} onChange={(v) => v !== null && updateGrid(i, { gutter: v })} />
                </td>
                <td style={{ ...cell, textAlign: 'right' }}>
                  <LinkButton danger onClick={() => set({ grid: brand.grid.filter((_, j) => j !== i) })}>
                    Quitar
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function LogoField({
  label,
  kind,
  path,
  busy,
  onLogo,
}: {
  label: string;
  kind: LogoKind;
  path: string | null;
  busy: boolean;
  onLogo: (kind: LogoKind, file: File | null) => void;
}) {
  const url = publicLogoUrl(path);
  return (
    <Field label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Siempre como <img>, nunca como SVG inline: regla de XSS de los logos (plan, §1). */}
        <span
          style={{
            width: 104, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: kind === 'dark' ? colors.dark : colors.warmLight, border: `1px solid ${colors.warmDark}`,
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" style={{ maxWidth: 88, maxHeight: 32, objectFit: 'contain' }} />
          ) : (
            <span style={{ ...hintText, color: kind === 'dark' ? colors.warmDark : colors.ash }}>Sin logo</span>
          )}
        </span>
        <label style={{ font: `500 11px/1.4 ${MONO}`, textDecoration: 'underline', textUnderlineOffset: 3, color: colors.dark, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Subiendo' : url ? 'Cambiar' : 'Subir archivo'}
          <input
            type="file"
            accept={LOGO_ACCEPT}
            disabled={busy}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onLogo(kind, file);
            }}
          />
        </label>
        {url && !busy && (
          <LinkButton danger onClick={() => onLogo(kind, null)}>
            Quitar
          </LinkButton>
        )}
      </div>
    </Field>
  );
}

function FamilyRow({
  family,
  hex,
  onHex,
  onRename,
  onRemove,
}: {
  family: string;
  hex: string;
  onHex: (hex: string) => void;
  /** Devuelve el motivo si el nombre no vale. */
  onRename: (to: string) => string | null;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(family);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const to = draft.trim();
    setError(to === family ? null : onRename(to));
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
      <div>
        <input
          value={draft}
          aria-label={`Nombre de la familia ${family}`}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            commit();
          }}
          style={{ ...input, width: 180, padding: '8px 10px' }}
        />
        {error && <div role="alert" style={{ ...hintText, color: ALERT, marginTop: 4, maxWidth: 260 }}>{error}</div>}
      </div>
      <ColorInput value={hex} onChange={onHex} ariaLabel={`Color de ${family}`} width={180} />
      <span style={{ paddingTop: 9 }}>
        <LinkButton danger onClick={onRemove}>
          Quitar
        </LinkButton>
      </span>
    </div>
  );
}
