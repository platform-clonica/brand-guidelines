import { create } from 'zustand';

type MenuState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useMenu = create<MenuState>((set, get) => ({
  isOpen: false,
  open: () => {
    set({ isOpen: true });
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = 'hidden';
    }
  },
  close: () => {
    set({ isOpen: false });
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = '';
    }
  },
  toggle: () => (get().isOpen ? get().close() : get().open()),
}));
