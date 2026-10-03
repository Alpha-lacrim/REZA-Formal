import { createStore } from './store';

export function createUI() {
  let initial: 'light' | 'dark' = 'light';
  try { if (localStorage.getItem('reza_theme_pref') === 'dark') initial = 'dark'; } catch { /* Optional persistence. */ }
  const theme = createStore(initial);
  const overlays = createStore({ isCartOpen: false, isAuthModalOpen: false });
  const toast = createStore<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const applyTheme = () => {
    document.documentElement.classList.toggle('dark', theme.getSnapshot() === 'dark');
    try { localStorage.setItem('reza_theme_pref', theme.getSnapshot()); } catch { /* In-memory theme still works. */ }
  };
  return {
    theme, overlays, toast,
    start: applyTheme,
    stop: () => clearTimeout(timer),
    toggleTheme() { theme.set(theme.getSnapshot() === 'light' ? 'dark' : 'light'); applyTheme(); },
    toggleCart(open?: boolean) { overlays.set({ ...overlays.getSnapshot(), isCartOpen: open ?? !overlays.getSnapshot().isCartOpen }); },
    setAuthModalOpen(open: boolean) { overlays.set({ ...overlays.getSnapshot(), isAuthModalOpen: open }); },
    showToast(message: string) {
      clearTimeout(timer);
      toast.set(message);
      timer = setTimeout(() => toast.set(null), 3000);
    },
  };
}
