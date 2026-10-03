import { useEffect, useRef, type ReactNode } from 'react';

// Native modality makes the page behind every customer/staff overlay inert.
export function Dialog({ title, onClose, busy = false, children, size = 'editor', className = '' }: {
  title: string; onClose: () => void; busy?: boolean; children: ReactNode;
  size?: 'editor' | 'order' | 'confirm' | 'drawer' | 'fullscreen' | 'compact'; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} tabIndex={-1} aria-label={title} aria-busy={busy} dir="rtl"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from((event.currentTarget as HTMLDialogElement).querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))
        .filter(control => control.tabIndex >= 0 && !control.matches(':disabled') && control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); event.currentTarget.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus(); }
    }}
    className={`app-dialog dialog-${size} bg-white text-lux-black shadow-2xl backdrop:bg-black/60 dark:bg-zinc-900 dark:text-white ${className}`}>
    {children}
  </dialog>;
}
