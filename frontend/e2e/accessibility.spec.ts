import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function scan(page: Page, info: TestInfo, name: string) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await info.attach(`${name}-axe`, { body: JSON.stringify(result), contentType: 'application/json' });
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
}

async function fits(page: Page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function login(page: Page, role: 'buyer' | 'admin') {
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'باز کردن منو', exact: true });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('button', { name: 'ورود / ثبت‌نام', exact: true }).click();
    const auth = page.getByRole('dialog', { name: 'ورود به حساب', exact: true });
    await auth.getByLabel('ایمیل', { exact: true }).fill(`${role}@example.invalid`);
    await auth.getByLabel('رمز عبور', { exact: true }).fill('E2e-only-password-493!');
    await auth.getByRole('button', { name: 'ورود', exact: true }).click();
    await expect(auth).not.toBeVisible();
}

for (const width of [320, 390, 768, 1280]) {
    test(`public catalog/gallery are accessible and fit RTL at ${width}px`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/#/catalog');
        await expect(page.locator('.product-card').first()).toBeVisible();
        await fits(page); await scan(page, info, 'catalog');
        await page.goto('/#/product/e2e-suit');
        await expect(page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true })).toBeVisible();
        await expect(page.locator('h1')).toHaveCount(1);
        await fits(page); await scan(page, info, 'product');
        await page.screenshot({ path: info.outputPath(`product-${width}.png`), fullPage: true });
        await page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click();
        const cart = page.getByRole('dialog', { name: 'سبد خرید', exact: true });
        await expect(cart).toBeVisible(); await scan(page, info, 'mini-cart');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true })).toBeFocused();
    });
}

test('mobile menu/search/auth trap focus, restore it, and hide closed controls', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/catalog');
    await expect(page.locator('.product-card').first()).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'رفتن به محتوای اصلی' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#page-content')).toBeFocused();
    const menu = page.getByRole('button', { name: 'باز کردن منو', exact: true });
    await menu.click();
    const drawer = page.getByRole('dialog', { name: 'منوی اصلی' });
    await scan(page, info, 'menu');
    await drawer.getByRole('button', { name: 'بستن منو', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(drawer.getByRole('button', { name: 'حالت شب' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(drawer.getByRole('button', { name: 'بستن منو', exact: true })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(menu).toBeFocused();
    await expect(page.getByRole('button', { name: 'حالت شب' })).toHaveCount(0);
    await menu.click(); await drawer.getByRole('button', { name: 'ورود / ثبت‌نام', exact: true }).click();
    const auth = page.getByRole('dialog', { name: 'ورود به حساب', exact: true });
    await expect(auth.getByLabel('ایمیل', { exact: true })).toBeFocused();
    await scan(page, info, 'auth'); await page.keyboard.press('Escape');
    const search = page.getByRole('button', { name: 'جستجو', exact: true });
    await search.click(); await expect(page.getByLabel('جستجو در محصولات')).toBeFocused();
    await page.getByLabel('جستجو در محصولات').fill('E2E');
    await expect(page.getByRole('dialog').getByRole('link').first()).toBeVisible();
    await scan(page, info, 'search'); await page.keyboard.press('Escape'); await expect(search).toBeFocused();
});

for (const theme of ['light', 'dark']) {
    test(`checkout and account forms are labeled and responsive in ${theme}`, async ({ page }, info) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await login(page, 'buyer');
        if (theme === 'dark') {
            await page.getByRole('button', { name: 'باز کردن منو', exact: true }).click();
            await page.getByRole('dialog').getByRole('button', { name: 'حالت شب' }).click();
            await page.keyboard.press('Escape');
        }
        await page.goto('/#/product/e2e-suit');
        await page.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click();
        await page.keyboard.press('Escape');
        await page.goto('/#/cart');
        await expect(page.getByLabel('نام تحویل‌گیرنده', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'ثبت نهایی سفارش', exact: true })).toBeEnabled();
        let writes = 0;
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: info.outputPath(`checkout-${theme}.png`), fullPage: true });
        page.on('request', request => { if (request.url().endsWith('/api/orders/create/')) writes++; });
        await page.getByRole('button', { name: 'ثبت نهایی سفارش', exact: true }).click();
        await expect(page.getByLabel('شماره تماس', { exact: true })).toBeFocused();
        expect(writes).toBe(0);
        await fits(page); await scan(page, info, 'checkout');
        await page.goto('/#/profile');
        await page.getByRole('button', { name: 'نشانی‌ها', exact: true }).click();
        await expect(page.getByLabel('نام گیرنده', { exact: true })).toBeVisible();
        await scan(page, info, 'addresses'); await fits(page);
    });
}

test('admin table/forms/dialogs stay usable with narrow and long Persian content', async ({ page }, info) => {
    await login(page, 'admin');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/admin');
    await page.getByRole('button', { name: 'باز کردن منوی مدیریت' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'محصولات', exact: true }).click();
    await expect(page.getByRole('region', { name: 'جدول محصولات' })).toBeVisible();
    await fits(page); await scan(page, info, 'admin-products');
    await page.getByRole('button', { name: 'افزودن', exact: true }).click();
    await page.getByLabel('نام محصول', { exact: true }).fill('کت و شلوار رسمی با پارچه ویژه و عنوان طولانی برای بررسی چیدمان فارسی و Latin SKU-123');
    await scan(page, info, 'editor');
    await page.screenshot({ path: info.outputPath('editor-persian.png') });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'باز کردن منوی مدیریت' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'عملیات فروشگاه', exact: true }).click();
    await page.getByRole('button', { name: 'تخفیف‌ها', exact: true }).click();
    await expect(page.getByLabel('کد تخفیف', { exact: true })).toBeVisible();
    await scan(page, info, 'coupons'); await fits(page);
    await page.getByRole('button', { name: 'ارسال', exact: true }).click();
    await expect(page.getByLabel('نام روش ارسال', { exact: true })).toBeVisible();
    await scan(page, info, 'shipping');
    await page.getByRole('button', { name: 'باز کردن منوی مدیریت' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'تنظیمات سایت', exact: true }).click();
    await expect(page.getByLabel('عنوان صفحه "درباره ما"', { exact: true })).toBeVisible();
    await scan(page, info, 'settings'); await fits(page);
});

test('home, mixed-direction long product copy and gallery keyboard choices fit a narrow viewport', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    await expect(page.getByLabel('آدرس ایمیل', { exact: true })).toBeVisible();
    await scan(page, info, 'home'); await fits(page);
    let newsletterAttempts = 0;
    await page.route('**/api/newsletter/subscribe/', async route => {
        expect(route.request().postDataJSON()).toEqual({ email: 'newsletter@example.invalid' });
        newsletterAttempts++;
        if (newsletterAttempts === 1) await route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"Fixture newsletter outage"}' });
        else await route.continue();
    });
    const newsletter = page.locator('form').filter({ has: page.getByLabel('آدرس ایمیل', { exact: true }) });
    await newsletter.getByLabel('آدرس ایمیل', { exact: true }).fill('newsletter@example.invalid');
    await newsletter.getByRole('button').click();
    await expect(page.getByRole('alert')).toHaveText('The service is temporarily unavailable.');
    await expect(newsletter.getByRole('button')).toBeEnabled();
    await newsletter.getByRole('button').click();
    await expect(page.getByRole('status').filter({ hasText: 'عضویت شما ثبت شد.' }).last()).toBeVisible();
    await expect(newsletter.getByLabel('آدرس ایمیل', { exact: true })).toHaveValue('');
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(newsletterAttempts).toBe(2);
    await page.route('**/api/products/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname !== '/api/products/' || url.searchParams.get('category') !== 'suits') return route.continue();
        // The isolated seed uses singular "suit"; fetch its unfiltered record.
        url.searchParams.delete('category');
        const response = await route.fetch({ url: url.href });
        const body = await response.json();
        expect(body.results[0]?.name).toBeTruthy();
        // Read-only stress state: enough cards to expose the desktop RTL arrows.
        const results = Array.from({ length: 4 }, (_, index) => ({ ...body.results[0], id: `carousel-${index}` }));
        await route.fulfill({ response, json: { ...body, results, count: results.length } });
    });
    await page.setViewportSize({ width: 1280, height: 844 });
    await page.reload();
    const carousel = page.getByRole('region', { name: 'محصولات کت و شلوار', exact: true });
    await expect(carousel.getByRole('article')).toHaveCount(4);
    const next = page.getByRole('button', { name: 'محصولات بعدی کت و شلوار', exact: true });
    await next.focus(); await expect(next).toHaveCSS('opacity', '1');
    await page.keyboard.press('Enter');
    await expect.poll(() => carousel.evaluate(element => element.scrollLeft)).toBeLessThan(0);
    await page.getByRole('button', { name: 'محصولات قبلی کت و شلوار', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => carousel.evaluate(element => element.scrollLeft)).toBe(0);
    await fits(page); await scan(page, info, 'home-carousel');
    await page.unroute('**/api/products/**');
    await page.setViewportSize({ width: 320, height: 720 });
    await page.route('**/api/products/e2e-suit/', async route => {
        const response = await route.fetch();
        const product = await response.json();
        await route.fulfill({ response, json: { ...product, name: 'کت و شلوار رسمی مدل REZA Classic 50 با عنوان طولانی فارسی',
            short: 'شرح طولانی فارسی همراه Latin SKU-123 و شماره ۵۰ برای بررسی چیدمان'.repeat(3),
            image: '/images/suit/midnight.jpg', images: ['/images/suit/midnight.jpg', '/images/suit/charcoal-check.jpg'] } });
    });
    await page.goto('/#/product/e2e-suit');
    const second = page.getByRole('button', { name: /^نمایش تصویر ۲/ });
    await second.focus(); await page.keyboard.press('Enter'); await expect(second).toHaveAttribute('aria-pressed', 'true');
    await fits(page); await scan(page, info, 'long-gallery');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('long-persian-gallery.png'), fullPage: true });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('REZA Classic');
    const schema = JSON.parse(await page.locator('#schema-json-ld').textContent() || '{}');
    expect(schema.offers.priceCurrency).toBe('IRR'); expect(schema.offers.price).toBe(1000);
    expect(schema.image.every((url: string) => url.startsWith('http://127.0.0.1:'))).toBe(true);
});

test('unknown routes and product transport failures have distinct recovery and metadata', async ({ page }, info) => {
    await page.goto('/#/missing');
    await expect(page.getByRole('heading', { name: 'صفحه یافت نشد' })).toBeVisible();
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow');
    await scan(page, info, 'not-found');
    await page.getByRole('link', { name: 'بازگشت به فروشگاه' }).click();
    await expect(page.locator('.product-card').first()).toBeVisible();
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'index, follow');
    await page.route('**/api/products/unknown-id/', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"Temporary outage"}' }));
    await page.goto('/#/product/unknown-id');
    await expect(page.getByRole('heading', { name: 'دریافت محصول انجام نشد' })).toBeVisible();
    await page.unroute('**/api/products/unknown-id/');
    await page.getByRole('button', { name: 'تلاش دوباره' }).click();
    await expect(page.getByRole('heading', { name: 'محصول یافت نشد' })).toBeVisible();
    await expect(page.locator('#schema-json-ld')).toHaveCount(0);
});
