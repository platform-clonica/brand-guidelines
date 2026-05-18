import { useTranslations } from 'next-intl';

export function PromptCardPlaceholder() {
  const t = useTranslations('prompts');
  return (
    <aside className="border border-dashed border-dark/20 p-6 sm:p-8 bg-warm-light/40">
      <div className="font-mono text-caption uppercase tracking-[0.08em] text-dark/50 mb-2">
        {t('title')}
      </div>
      <p className="font-mono text-body-sm text-dark/70 max-w-prose">{t('soon')}</p>
    </aside>
  );
}
