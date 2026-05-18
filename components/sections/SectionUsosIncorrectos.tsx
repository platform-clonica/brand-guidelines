import { getTranslations } from 'next-intl/server';

import { SectionShell } from './SectionShell';
import { DontGrid } from '@/components/brand/DontGrid';

export async function SectionUsosIncorrectos() {
  const t = await getTranslations('usosIncorrectos');

  const items = ['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => ({
    num: n.padStart(2, '0'),
    description: t(`rules.${n}`),
  }));

  return (
    <SectionShell id="usos-incorrectos" title={t('title')}>
      <div className="grid grid-cols-12 gap-6 mb-10">
        <p className="col-span-12 lg:col-span-7 font-mono text-body-sm text-dark/80 leading-relaxed">
          {t('body')}
        </p>
      </div>
      <DontGrid items={items} />
    </SectionShell>
  );
}
