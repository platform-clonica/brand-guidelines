'use client';

import { useTranslations } from 'next-intl';
import { useToast } from './Toast';

type Props = {
  value: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
  /** Mensaje a mostrar en el toast. Si no se especifica, se muestra el valor. */
  toastMessage?: string;
};

export function CopyButton({ value, label, className, children, toastMessage }: Props) {
  const t = useTranslations('ui');
  const { show } = useToast();

  const handle = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback para contextos no seguros (http en LAN durante desarrollo)
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      show(toastMessage ?? `${t('copied')} ${value}`);
    } catch {
      show('Error');
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label ?? `${t('copy')} ${value}`}
      className={className ?? 'font-mono text-caption uppercase tracking-[0.04em] hover-wipe-underline'}
    >
      {children ?? value}
    </button>
  );
}
