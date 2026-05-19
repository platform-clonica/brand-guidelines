'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';

import { useMenu } from '@/lib/store/menu';
import { scrollToSection } from '@/lib/hooks/useScrollToSection';
import { sections } from '@/lib/sections';
import type { Locale } from '@/lib/i18n/routing';
import { LocaleSwitch } from './LocaleSwitch';

const EASE = [0.16, 1, 0.3, 1] as const;

export function MenuOverlay() {
  const { isOpen, close } = useMenu();
  const t = useTranslations();
  const locale = useLocale() as Locale;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const handleClick = (id: string) => {
    close();
    setTimeout(() => scrollToSection(id), 240);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="drawer"
          id="menu-overlay"
          role="dialog"
          aria-modal
          aria-label={t('menu.index')}
          initial={{ x: '-100%' }}
          animate={{ x: 0, transition: { duration: 0.45, ease: EASE } }}
          exit={{ x: '-100%', transition: { duration: 0.35, ease: EASE } }}
          className="fixed left-0 right-0 top-14 z-40 h-[calc(100dvh-3.5rem)]
                     flex flex-col bg-pure-white md:hidden"
        >
          <div className="px-6 pt-7 pb-5">
            <LocaleSwitch />
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-5">
            <ul className="flex flex-col gap-[2px]">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(s.id)}
                    className="group w-full flex items-baseline gap-3 py-[8px]
                               text-left font-mono text-[13px] leading-snug
                               text-dark/70 hover:text-dark
                               transition-colors duration-300 ease-expo"
                  >
                    <span className="tabular-nums text-[10px] text-dark/35">{s.num}/</span>
                    <span className="flex-1">{s.label[locale]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="px-6 py-7">
            <div className="font-serif font-normal text-[28px] leading-[1.05] text-dark tracking-tight">
              Brand<br />Guidelines<br />2026
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-wide">
              <span className="text-dark/40">v1_05.26</span>
              <span aria-hidden className="text-dark/25">·</span>
              <a
                href="/brand-guidelines-2026.pdf"
                download
                className="text-dark/70 hover:text-dark transition-colors duration-300 ease-expo inline-flex items-center gap-1.5"
              >
                <span aria-hidden>↓</span>
                <span>PDF</span>
              </a>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
