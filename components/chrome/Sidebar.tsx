'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { sections } from '@/lib/sections';
import type { Locale } from '@/lib/i18n/routing';
import { scrollToSection } from '@/lib/hooks/useScrollToSection';
import { LocaleSwitch } from './LocaleSwitch';

export function Sidebar() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [active, setActive] = useState<string>('intro');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden md:flex h-dvh w-[240px] lg:w-[260px]
                 flex-col bg-pure-white border-r border-dark/10"
      aria-label={t('menu.index')}
    >
      <div className="px-7 pt-8 pb-5 border-b border-dark/10">
        <a
          href="#intro"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('intro');
          }}
          className="block hover:opacity-80 transition-opacity duration-300 ease-expo"
          aria-label="interactīus"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/interactius-positivo.svg"
            alt="interactīus"
            className="block w-[180px] h-auto"
          />
        </a>
        <div className="mt-4">
          <LocaleSwitch />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-7 py-6">
        <ul className="flex flex-col gap-[2px]">
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className={`group w-full flex items-baseline gap-3 py-[7px]
                              text-left font-mono text-[12px] leading-snug
                              transition-colors duration-300 ease-expo
                              ${isActive ? 'text-dark' : 'text-dark/55 hover:text-dark'}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span
                    className={`tabular-nums text-[10px] transition-colors duration-300 ease-expo
                                ${isActive ? 'text-dark/70' : 'text-dark/35'}`}
                  >
                    {s.num}/
                  </span>
                  <span className="flex-1">{s.label[locale]}</span>
                  <span
                    aria-hidden
                    className={`block w-1 h-1 rounded-full bg-dark transition-opacity duration-300 ease-expo
                                ${isActive ? 'opacity-100' : 'opacity-0'}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-7 py-7">
        <div className="font-serif font-normal text-[28px] leading-[1.05] text-dark tracking-tight">
          Brand<br />Guidelines<br />2026
        </div>
        <div className="mt-3 font-mono text-[11px] tracking-wide text-dark/40">
          v1_05.26
        </div>
        <div className="mt-1.5 flex items-center gap-x-2 font-mono text-[11px] tracking-wide">
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
        </div>
      </div>
    </aside>
  );
}
