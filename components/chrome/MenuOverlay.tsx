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
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE } }}
            onClick={close}
            className="fixed inset-0 z-40 bg-dark/30 md:hidden"
            aria-hidden
          />
          <motion.aside
            key="drawer"
            id="menu-overlay"
            role="dialog"
            aria-modal
            aria-label={t('menu.index')}
            initial={{ x: '-100%' }}
            animate={{ x: 0, transition: { duration: 0.45, ease: EASE } }}
            exit={{ x: '-100%', transition: { duration: 0.35, ease: EASE } }}
            className="fixed left-0 top-0 z-50 h-dvh w-[82vw] max-w-[320px]
                       flex flex-col bg-pure-white border-r border-dark/10 md:hidden"
          >
            <div className="px-6 pt-7 pb-4 border-b border-dark/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/interactius-positivo.svg"
                alt="interactīus"
                className="block w-[110px] h-auto"
              />
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-dark/50">
                Brand Guidelines · {t('chrome.version')}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-6 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-dark/40 mb-4">
                {t('menu.index')}
              </div>
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

            <div className="px-6 py-5 border-t border-dark/10 flex flex-col gap-3">
              <LocaleSwitch />
              <a
                href="/brand-guidelines-2026.pdf"
                download
                className="font-mono text-[11px] text-dark/70 hover:text-dark
                           transition-colors duration-300 ease-expo inline-flex items-center gap-2"
              >
                <span aria-hidden>↓</span>
                <span>PDF</span>
                <span className="text-dark/30">·</span>
                <span>v1 / 2026</span>
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
