import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Page } from '../../types';
import { useAuth, useRuntime } from '../../state/AppState';
import { identityKey } from '../../state/remote';
import { toPersianDigits } from '../../utils';

export function useAdminPage<T>(name: string, params: Record<string, unknown>, fetch: (params: Record<string, unknown>, signal?: AbortSignal) => Promise<Page<T>>) {
  const { authState } = useAuth();
  const { queries } = useRuntime();
  const prefix = ['admin', identityKey(authState)];
  const query = useQuery({ queryKey: [...prefix, name, params], queryFn: ({ signal }) => fetch(params, signal),
    enabled: authState.status === 'admin', gcTime: 5 * 60_000 }, queries);
  return { ...query, invalidate: () => queries.invalidateQueries({ queryKey: prefix }) };
}

export function Pagination({ page, current, onChange, busy }: {
  page?: Pick<Page<unknown>, 'count' | 'totalPages'>; current: number; onChange: (page: number) => void; busy: boolean;
}) {
  const total = page?.totalPages || 1;
  useEffect(() => { if (page && current > total) onChange(total); }, [current, total, page, onChange]);
  return <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-4 border-t border-gray-100 p-4 dark:border-zinc-800">
    <button type="button" aria-label="صفحه قبل" disabled={busy || current <= 1} onClick={() => onChange(current - 1)} className="rounded-lg p-2 disabled:opacity-30"><ChevronRight size={20} /></button>
    <span aria-live="polite">{toPersianDigits(current)} / {toPersianDigits(total)} · {toPersianDigits(page?.count || 0)} مورد</span>
    <button type="button" aria-label="صفحه بعد" disabled={busy || current >= total} onClick={() => onChange(current + 1)} className="rounded-lg p-2 disabled:opacity-30"><ChevronLeft size={20} /></button>
  </nav>;
}

export function QueryStatus({ query }: { query: { isFetching: boolean; isError: boolean; refetch: () => unknown } }) {
  if (query.isError) return <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">دریافت اطلاعات انجام نشد. <button type="button" onClick={() => void query.refetch()} className="underline">تلاش مجدد</button></div>;
  return query.isFetching ? <p role="status">در حال دریافت اطلاعات…</p> : null;
}
