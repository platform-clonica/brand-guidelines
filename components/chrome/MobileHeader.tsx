'use client';

import { useMenu } from '@/lib/store/menu';

type Props = { ariaOpen: string };

export function MobileHeader({ ariaOpen }: Props) {
  const { isOpen, toggle } = useMenu();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 md:hidden h-14 px-5
                 flex items-center justify-between
                 bg-warm-light/85 backdrop-blur-sm border-b border-dark/10"
    >
      <a href="#intro" aria-label="interactīus — al inicio">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/interactius-positivo.svg"
          alt=""
          aria-hidden
          className="h-[14px] w-auto"
        />
      </a>
      <button
        type="button"
        onClick={toggle}
        aria-label={ariaOpen}
        aria-expanded={isOpen}
        aria-controls="menu-overlay"
        className="h-10 w-10 flex flex-col items-center justify-center gap-[5px] text-dark"
      >
        <span
          className={`block h-[1.5px] w-5 bg-dark transition-transform duration-300 ease-expo
                      ${isOpen ? 'translate-y-[3.25px] rotate-45' : ''}`}
        />
        <span
          className={`block h-[1.5px] w-5 bg-dark transition-transform duration-300 ease-expo
                      ${isOpen ? '-translate-y-[3.25px] -rotate-45' : ''}`}
        />
      </button>
    </header>
  );
}
