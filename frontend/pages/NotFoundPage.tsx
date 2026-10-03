import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFoundPage() {
    return <main className="min-h-[60vh] pt-32 pb-16 px-4 text-center dark:bg-zinc-900 dark:text-white">
        <SEO title="صفحه یافت نشد" description="صفحه موردنظر در فروشگاه رضا فرمال یافت نشد." noIndex />
        <h1 className="text-3xl font-bold mb-4">صفحه یافت نشد</h1>
        <p className="mb-6">نشانی را بررسی کنید یا به فروشگاه بازگردید.</p>
        <Link to="/catalog" className="inline-block rounded-lg bg-lux-black dark:bg-lux-gold px-6 py-3 text-white dark:text-black">بازگشت به فروشگاه</Link>
    </main>;
}
