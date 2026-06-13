import type { Theme } from '@/lib/deck/types';

/* Persistent brand furniture for interior slides: filete, vertical wordmark, page number. */
export function Chrome({ theme, page }: { theme: Theme; page: number }) {
  const wm = theme === 'dark' ? '/logo/interactius-negativo.svg' : '/logo/interactius-positivo.svg';
  return (
    <>
      <div className="rule" />
      <div className="mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wm} alt="interactīus" />
      </div>
      <div className="pageno">{String(page).padStart(2, '0')}</div>
    </>
  );
}
