import React from 'react';
export default function CollectionPager({ page, totalPages, busy, onPage }: {
  page: number; totalPages: number; busy?: boolean; onPage: (page: number) => void;
}) {
  return <nav aria-label="صفحه‌بندی" className="flex justify-center items-center gap-4 py-4">
    <button disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>قبلی</button>
    <span>{page} / {totalPages}</span>
    <button disabled={busy || page >= totalPages} onClick={() => onPage(page + 1)}>بعدی</button>
  </nav>;
}
