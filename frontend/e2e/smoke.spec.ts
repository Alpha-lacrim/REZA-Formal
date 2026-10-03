import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  let detailReads = 0;
  let orderDetailReads = 0;
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path === '/api/products/e2e-suit/') detailReads++;
    if (request.method() === 'GET' && /^\/api\/orders\/ORD-[^/]+\/$/.test(path)) orderDetailReads++;
  });
  await login(page, 'buyer');
  await page.goto('/#/product/e2e-suit');
  await page.getByRole('button', { name: /افزودن به سبد/ }).click();
  expect(detailReads).toBe(1);
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
  expect(orderDetailReads).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
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

test('administrator creates managed gallery images, edits them after reload and cancels with Escape', async ({ page }, testInfo) => {
  await login(page, 'admin');
  await page.goto('/#/admin');
  await page.getByRole('button', { name: 'محصولات', exact: true }).click();
  const add = page.getByRole('button', { name: 'افزودن', exact: true });
  await add.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'ذخیره تغییرات', exact: true }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByLabel('نام محصول', { exact: true }).fill('E2E Gallery Suit');
  await page.getByLabel('قیمت (تومان)', { exact: true }).fill('200');
  await page.getByLabel('موجودی انبار', { exact: true }).fill('3');
  const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('آپلود تصاویر', { exact: true }).setInputFiles([
    { name: 'primary.png', mimeType: 'image/png', buffer }, { name: 'gallery.png', mimeType: 'image/png', buffer },
  ]);
  await expect(dialog.locator('img[src^="blob:"]')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('product-editor.png') });
  const createdPromise = page.waitForResponse(r => r.url().endsWith('/api/admin/products/') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'ذخیره تغییرات', exact: true }).click();
  const createdResponse = await createdPromise;
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json();
  expect(created.image).toContain('/media/products/');
  expect(created.images).toHaveLength(1);
  expect(JSON.stringify(created)).not.toMatch(/data:|blob:/);
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'محصولات', exact: true }).click();
  const edit = page.getByRole('button', { name: 'ویرایش E2E Gallery Suit', exact: true });
  await edit.click();
  await expect(dialog.getByRole('img')).toHaveCount(2);
  await expect(dialog.getByRole('img').first()).toHaveJSProperty('naturalWidth', 1);
  await page.getByRole('button', { name: 'حذف تصویر ذخیره‌شده 1', exact: true }).click();
  const editedPromise = page.waitForResponse(r => r.url().includes(`/api/admin/products/${created.id}/`) && r.request().method() === 'PUT');
  await page.getByRole('button', { name: 'ذخیره تغییرات', exact: true }).click();
  const edited = await editedPromise;
  expect(edited.ok()).toBeTruthy();
  expect((await edited.json()).image).toBeNull();
  await expect(dialog).not.toBeVisible();
  await edit.click();
  await expect(dialog.getByRole('img')).toHaveCount(1);
  await page.getByLabel('نام محصول', { exact: true }).fill('Unsaved name');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(edit).toBeFocused();
  await edit.click();
  await expect(page.getByLabel('نام محصول', { exact: true })).toHaveValue('E2E Gallery Suit');
  await page.getByRole('button', { name: 'انصراف', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'ذخیره تغییرات', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'بستن', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'باز کردن منوی مدیریت' }).click();
  await expect(page.getByRole('dialog', { name: 'منوی مدیریت' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'محصولات', exact: true }).click();
  await add.click();
  await page.screenshot({ path: testInfo.outputPath('product-editor-mobile.png') });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
});

test('customer return dialog supports labels, validation, Escape and focus restoration', async ({ page }) => {
  await login(page, 'buyer');
  // Only this UI audit overrides the existing synthetic order's read state.
  // No delivery transition or return write is simulated as successful.
  await page.route('**/api/orders/my/**', async route => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, results: body.results.map((order: object) => ({ ...order, status: 'delivered' })) } });
  });
  await page.goto('/#/profile');
  await page.getByRole('button').filter({ hasText: 'سفارش #' }).first().click();
  const open = page.getByRole('button', { name: 'درخواست مرجوعی', exact: true }).first();
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'درخواست مرجوعی' });
  await expect(dialog.getByLabel('دلیل مرجوعی', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  let returnWrites = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/returns/')) returnWrites++; });
  await dialog.getByRole('button', { name: 'ثبت درخواست', exact: true }).click();
  await expect(dialog.getByLabel('دلیل مرجوعی', { exact: true })).toBeFocused();
  expect(returnWrites).toBe(0);
  await dialog.getByLabel('توضیحات تکمیلی', { exact: true }).focus();
  await page.keyboard.press('Escape'); await expect(open).toBeFocused();
});

test('admin invoice table scrolls within its dialog on mobile', async ({ page }, info) => {
  await login(page, 'admin');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/admin');
  await page.getByRole('button', { name: 'باز کردن منوی مدیریت' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'سفارشات', exact: true }).click();
  await page.getByRole('button', { name: 'جزئیات کامل', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'جزئیات سفارش' });
  const table = dialog.getByRole('region', { name: 'کالاهای سفارش' });
  await expect(table).toBeVisible();
  await table.focus(); await expect(table).toBeFocused();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) }))).toEqual([]);
  await page.screenshot({ path: info.outputPath('invoice-mobile.png') });
});
