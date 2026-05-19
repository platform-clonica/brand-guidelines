import { getLocale, getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { typeScale, type TypeScaleEntry } from '@/lib/typeScale';
import type { Locale } from '@/lib/i18n/routing';

function familyLabel(f: TypeScaleEntry['family']): string {
  return f === 'mono' ? 'IBM Plex Mono' : 'IBM Plex Serif';
}

function familyClass(f: TypeScaleEntry['family']): string {
  return f === 'mono' ? 'font-mono' : 'font-serif';
}

function defaultWeightClass(weights: readonly number[], family: TypeScaleEntry['family']): string {
  // Pick a representative weight for the visible sample.
  // Serif: prefer 400 if available, else first. Mono: prefer 500 if available, else first.
  const preferred = family === 'serif' ? 400 : 500;
  const w = weights.includes(preferred) ? preferred : weights[0];
  if (w === 300) return 'font-light';
  if (w === 400) return 'font-normal';
  if (w === 500) return 'font-medium';
  if (w === 600) return 'font-semibold';
  return 'font-normal';
}

export async function SectionSistemaTexto() {
  const t = await getTranslations('sistemaTexto');
  const locale = (await getLocale()) as Locale;

  return (
    <SectionShell id="sistema-texto" title={t('title')}>
      <div className="flex flex-col gap-5 mb-12 sm:mb-16 items-start">
        <p className="font-mono font-semibold text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('lead')}
        </p>
        <p className="font-mono text-body-sm text-dark leading-[1.7] max-w-[720px]">
          {t('body')}
        </p>
      </div>

      <div className="flex flex-col">
        {typeScale.map((entry) => (
          <div
            key={entry.id}
            className="grid grid-cols-12 gap-x-4 sm:gap-x-8 gap-y-6 py-10 sm:py-14 border-t border-dark/15 first:border-t-0"
          >
            {/* Meta column */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
              <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/50">
                {entry.id}
              </div>
              <div className="font-mono text-body-sm text-dark">
                .{entry.className}
              </div>
              <div className="flex flex-col gap-1 font-mono text-caption text-dark/60 leading-[1.4]">
                <div>size · {entry.clamp}</div>
                <div>line-height · {entry.lineHeight}</div>
                {entry.letterSpacing && <div>letter-spacing · {entry.letterSpacing}</div>}
              </div>
              <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/50">
                {familyLabel(entry.family)}
              </div>
              <div className="font-mono text-caption text-dark/60">
                {entry.weights.join(' · ')}
              </div>
            </div>

            {/* Sample column */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-5 min-w-0">
              <div
                className={`${entry.className} ${familyClass(entry.family)} ${defaultWeightClass(entry.weights, entry.family)} text-dark leading-[1.05] break-words`}
                style={{
                  lineHeight: entry.lineHeight,
                  letterSpacing: entry.letterSpacing,
                }}
              >
                {entry.sample}
              </div>
              <p className="font-mono text-body-sm text-dark/70 leading-[1.6] max-w-[520px]">
                {entry.usage[locale]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
