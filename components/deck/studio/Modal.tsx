'use client';
import { useRef } from 'react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { overlay, card, cardTitle } from './ui';

/* Minimal modal shell: dimmed overlay + warm-light card, closes on Escape / backdrop click. */
export function Modal({
  title,
  onClose,
  children,
  width,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  /* Declaraba role="dialog" aria-modal y tenía el mismo hueco que el overlay del menú: Escape sí,
     pero sin foco inicial, sin ciclado del Tab, sin `inert` fuera y sin devolver el foco al
     cerrar. El hook lo cubre todo, incluido el Escape que estaba aquí. */
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true, onClose);

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div ref={panelRef} style={{ ...card, ...(width ? { width: `min(${width}px, 100%)` } : {}) }} role="dialog" aria-modal aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div style={cardTitle}>{title}</div>
        {children}
      </div>
    </div>
  );
}
