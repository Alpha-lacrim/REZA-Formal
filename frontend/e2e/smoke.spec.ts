import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // External fonts/assets are irrelevant to commerce smoke checks. No remote API
  // or payment provider is contacted; local Django responses are never mocked.
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
});

async function login(page: Page, role: 'buyer' | 'admin') {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'ورود / ثبت‌نام', exact: true }).click();
  await page.getByPlaceholder('ایمیل', { exact: true }).fill(`${role}@example.invalid`);
  await page.getByPlaceholder('رمز عبور', { exact: true }).fill('E2e-only-password-493!');
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page.getByRole('navigation').getByRole('button', { name: role === 'buyer' ? 'Smoke Buyer' : 'Smoke Admin', exact: true })).toBeVisible();
}

test('storefront loads its server catalog', async ({ page }) => {
  await page.goto('/#/catalog');
  await expect(page.getByText('E2E Suit', { exact: true }).first()).toBeVisible();
});

test('customer authenticates, adds product, checks out with COD and sees order history', async ({ page }) => {
  await login(page, 'buyer');
  await page.goto('/#/product/e2e-suit');
  await page.getByRole('button', { name: /افزودن به سبد/ }).click();
  await page.goto('/#/cart');
  // Reload closes the global mini-cart and also exercises cart persistence.
  await page.reload();
  await expect(page.getByRole('button', { name: 'حذف کالا' })).toBeVisible();
  for (const [placeholder, value] of [
    ['نام تحویل‌گیرنده', 'Smoke Buyer'], ['شماره تماس', '09120000000'],
    ['استان', 'Tehran'], ['شهر', 'Tehran'], ['کد پستی', '1234567890'],
    ['نشانی کامل، پلاک و واحد', 'Synthetic test street 1'],
  ]) await page.getByPlaceholder(placeholder, { exact: true }).fill(value);
  await page.getByRole('radio', { name: 'پرداخت در محل', exact: true }).check();
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/orders/create/') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'ثبت نهایی سفارش', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const { order } = await response.json();
  expect(order.payment_method).toBe('cod');
  expect(order.payment_status).toBe('unpaid');
  await expect(page.getByRole('heading', { name: 'سفارش شما ثبت شد' })).toBeVisible();
  await page.getByRole('link', { name: 'پیگیری سفارش', exact: true }).click();
  const persianId = order.id.replace(/\d/g, (digit: string) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  await page.getByRole('button').filter({ hasText: persianId }).click();
  await expect(page.getByText('E2E Suit', { exact: true }).first()).toBeVisible();
});

test('administrator authenticates and persists a product edit', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/#/admin');
  await page.getByRole('button', { name: 'محصولات', exact: true }).click();
  await page.getByRole('button', { name: 'ویرایش E2E Suit', exact: true }).click();
  await page.getByPlaceholder('نام کامل محصول...').fill('E2E Edited Suit');
  const saved = page.waitForResponse(r => r.url().includes('/api/admin/products/e2e-suit/') && r.request().method() === 'PUT');
  await page.getByRole('button', { name: 'ذخیره تغییرات', exact: true }).click();
  expect((await saved).ok()).toBeTruthy();
  await page.reload();
  await page.getByRole('button', { name: 'محصولات', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ویرایش E2E Edited Suit', exact: true })).toBeVisible();
});
