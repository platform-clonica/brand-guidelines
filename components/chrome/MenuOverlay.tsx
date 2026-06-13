'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';

import { useMenu } from '@/lib/store/menu';
import { scrollToSection } from '@/lib/hooks/useScrollToSection';
import { sections } from '@/lib/sections';
import type { Locale } from '@/lib/i18n/routing';
import { Link, usePathname } from '@/lib/i18n/routing';
import { LocaleSwitch } from './LocaleSwitch';

const EASE = [0.16, 1, 0.3, 1] as const;
const PRESENTACIONES = { es: 'Presentaciones', en: 'Presentations', ca: 'Presentacions' } as const;

export function MenuOverlay() {
  const { isOpen, close } = useMenu();
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const onHome = usePathname() === '/';

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

  // Fade inferior: visible mientras queden ítems ocultos bajo el borde del scroll
  const navRef = useRef<HTMLElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const checkScrollEnd = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // tras el mount del drawer, evaluar si la lista desborda
    const raf = requestAnimationFrame(checkScrollEnd);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, checkScrollEnd]);

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
          <div className="px-6 pt-0 pb-3.5 border-b border-dark/10">
            <div className="font-serif font-normal text-[16px] leading-[1] text-dark tracking-tight">
              Brand Guidelines 2026
            </div>
            <div className="mt-2.5">
              <LocaleSwitch />
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            <nav
              ref={navRef}
              onScroll={checkScrollEnd}
              className="h-full overflow-y-auto px-6 py-4"
            >
            <ul className="flex flex-col gap-[2px]">
              {sections.map((s) => {
                const cls = `group w-full flex items-baseline gap-3 py-[8px] text-left font-mono text-[13px] leading-snug text-dark/70 hover:text-dark transition-colors duration-300 ease-expo`;
                const inner = (
                  <>
                    <span className="tabular-nums text-[10px] text-dark/35">{s.num}/</span>
                    <span className="flex-1">{s.label[locale]}</span>
                  </>
                );
                return (
                  <li key={s.id}>
                    {onHome ? (
                      <button type="button" onClick={() => handleClick(s.id)} className={cls}>{inner}</button>
                    ) : (
                      <Link href={`/#${s.id}`} onClick={() => close()} className={cls}>{inner}</Link>
                    )}
                  </li>
                );
              })}
              <li className="mt-3 pt-3 border-t border-dark/10">
                <Link
                  href="/presentaciones"
                  onClick={() => close()}
                  className="group w-full flex items-baseline gap-3 py-[8px]
                             text-left font-mono text-[13px] leading-snug
                             text-dark/70 hover:text-dark
                             transition-colors duration-300 ease-expo"
                >
                  <span className="text-[10px] text-dark/35" aria-hidden>→</span>
                  <span className="flex-1">{PRESENTACIONES[locale]}</span>
                </Link>
              </li>
              </ul>
            </nav>
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-12
                          bg-gradient-to-t from-pure-white to-transparent
                          transition-opacity duration-300 ease-expo
                          ${atEnd ? 'opacity-0' : 'opacity-100'}`}
            />
          </div>

          <div className="px-6 py-3.5 border-t border-dark/10">
            <div className="flex items-baseline gap-x-3 font-mono text-[11px] tracking-wide">
              <span className="text-dark/40 mr-auto">v1_05.26</span>
              <a
                href="/Brand-Kit.zip"
                download
                className="text-dark/70 hover:text-dark transition-colors duration-300 ease-expo inline-flex items-center gap-2"
              >
                <span aria-hidden>↓</span>
                <span>BRAND KIT</span>
              </a>
              <span aria-hidden className="text-dark/25">·</span>
              <a
                href="/brand-guidelines-2026.pdf"
                download
                className="text-dark/70 hover:text-dark transition-colors duration-300 ease-expo inline-flex items-center gap-2"
              >
                <span aria-hidden>↓</span>
                <span>PDF</span>
              </a>
              <span aria-hidden className="text-dark/25">·</span>
              <a
                href="/AI-Kit.zip"
                download
                className="text-dark/70 hover:text-dark transition-colors duration-300 ease-expo inline-flex items-center gap-2"
              >
                <span aria-hidden>↓</span>
                <span>AI KIT</span>
              </a>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
