import React from 'react';
import { useActions } from '../state/AppState';

export default function SyncNotice({ status }: { status: string }) {
  const { retrySync } = useActions();
  if (status !== 'error' && status !== 'loading' && status !== 'pending') return null;
  return <div role="status" className="my-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-zinc-700">
    {status === 'error' ? <>
      تغییرات روی این دستگاه باقی مانده است؛ همگام‌سازی حساب انجام نشد.
      <button type="button" className="mx-2 underline" onClick={() => void retrySync()}>تلاش دوباره</button>
    </> : 'در حال همگام‌سازی حساب…'}
  </div>;
}
