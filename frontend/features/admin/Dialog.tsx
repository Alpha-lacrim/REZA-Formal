import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ title, onClose, busy = false, children, size = 'editor' }: {
  title: string; onClose: () => void; busy?: boolean; children: ReactNode; size?: 'editor' | 'order' | 'confirm' | 'drawer';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
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
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    style={size === 'drawer' ? { margin: 0, marginLeft: 'auto', height: '100vh', maxHeight: '100vh', width: '18rem', borderRadius: 0 } : undefined}
    className={`m-auto max-h-[95vh] w-[calc(100%-2rem)] ${size === 'order' ? 'max-w-4xl' : size === 'confirm' ? 'max-w-md' : 'max-w-3xl'} overflow-y-auto rounded-2xl bg-white p-0 text-lux-black shadow-2xl backdrop:bg-black/60 dark:bg-zinc-900 dark:text-white`}>
    {children}
  </dialog>;
}
