import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { ColorSwatch } from '@/components/brand/ColorSwatch';
import { colorsBase, colorsAccent } from '@/lib/tokens';

export async function SectionColor() {
  const t = await getTranslations('color');
  return (
    <SectionShell
      id="color"
      title={t('title')}
      headerRight={
        <span className="font-mono text-caption text-dark/40">{t('clickHint')}</span>
      }
    >
      <div className="flex flex-col gap-16 sm:gap-20">
        <div className="flex flex-col gap-6">
          <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
            {t('baseTitle')}
          </h3>
          <p className="font-mono text-body-sm text-dark/80 leading-relaxed max-w-3xl">
            {t('baseBody')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mt-2">
            {colorsBase.map((c) => (
              <ColorSwatch key={c.hex} token={c} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
            {t('accentTitle')}
          </h3>
          <p className="font-mono text-body-sm text-dark/80 leading-relaxed max-w-3xl">
            {t('accentBody')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mt-2">
            {colorsAccent.map((c) => (
              <ColorSwatch key={c.hex} token={c} />
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
