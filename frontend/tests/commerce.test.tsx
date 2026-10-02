import React from 'react';
import { beforeEach, expect, test } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { GlobalProvider, useGlobal } from '../contexts/GlobalContext';
import { server } from './setup';

const origin = 'http://localhost:3000/api';
const product = { id: 'suit', name: 'Test suit', price: '100', stock: 3, variants: [
  { id: 'small', sku: 'S', stock: 2, active: true },
  { id: 'large', sku: 'L', stock: 1, active: true },
  { id: 'hidden', sku: 'H', stock: 10, active: false },
] };
let writes: unknown[];
let wishlistWrites: string[];
function Shop() {
  const state = useGlobal();
  return <>
    <p>{state.isAuthLoading ? 'Loading session' : state.user?.email || 'Anonymous'}</p>
    <p>Source: {state.catalogSource}</p>
    {state.products.map(p => <h2 key={p.id}>{p.name}</h2>)}
    <output aria-label="cart">{JSON.stringify(state.cartLines)}</output>
    <output aria-label="wishlist">{state.wishlist.join(',')}</output>
    <button onClick={() => state.addToCart('suit', 1, 'small')}>Add small</button>
    <button onClick={() => state.addToCart('suit', 1, 'large')}>Add large</button>
    <button onClick={() => state.addToCart('suit', 1, 'hidden')}>Add inactive</button>
    <button onClick={() => state.updateQty('suit::small', 1)}>Increase</button>
    <button onClick={() => state.updateQty('suit::small', -1)}>Decrease</button>
    <button onClick={() => state.removeFromCart('suit::large')}>Remove large</button>
    <button onClick={() => state.toggleWishlist('suit')}>Wishlist</button>
  </>;
}
const cart = () => JSON.parse(screen.getByLabelText('cart').textContent!);
async function mount() {
  const view = render(<GlobalProvider><Shop /></GlobalProvider>);
  await screen.findByRole('heading', { name: 'Test suit' });
  return view;
}
beforeEach(() => {
  writes = []; wishlistWrites = [];
  server.use(
    http.get(`${origin}/auth/me/`, () => HttpResponse.json({ detail: 'Anonymous' }, { status: 401 })),
    http.post(`${origin}/auth/refresh/`, () => HttpResponse.json({}, { status: 401 })),
    http.get(`${origin}/auth/csrf/`, () => HttpResponse.json({ csrfToken: 'test-csrf' })),
    http.get(`${origin}/settings/`, () => HttpResponse.json({})),
    http.get(`${origin}/products/`, () => HttpResponse.json([product])),
    http.get(`${origin}/cart/`, () => HttpResponse.json({ lines: [] })),
    http.put(`${origin}/cart/`, async ({ request }) => {
      const body = await request.json(); writes.push(body); return HttpResponse.json(body);
    }),
    http.get(`${origin}/wishlist/`, () => HttpResponse.json([])),
    http.post(`${origin}/wishlist/:id/`, ({ params }) => { wishlistWrites.push(`add:${params.id}`); return HttpResponse.json([]); }),
    http.delete(`${origin}/wishlist/:id/`, ({ params }) => { wishlistWrites.push(`remove:${params.id}`); return HttpResponse.json([]); }),
  );
});

test('anonymous catalog loads; variant quantities respect stock and remove independently', async () => {
  const user = userEvent.setup(); await mount();
  expect(screen.getByText('Anonymous')).toBeInTheDocument();
  await user.click(screen.getByText('Add small'));
  await user.click(screen.getByText('Increase'));
  await user.click(screen.getByText('Increase'));
  await user.click(screen.getByText('Add large'));
  await user.click(screen.getByText('Add inactive'));
  expect(cart()).toEqual([{ productId: 'suit', variantId: 'small', quantity: 2 }, { productId: 'suit', variantId: 'large', quantity: 1 }]);
  await user.click(screen.getByText('Remove large'));
  await user.click(screen.getByText('Decrease'));
  expect(cart()).toEqual([{ productId: 'suit', variantId: 'small', quantity: 1 }]);
  await user.click(screen.getByText('Decrease'));
  expect(cart()).toEqual([]);
});

test('cart and wishlist survive remount and malformed persistence is recoverable', async () => {
  localStorage.setItem('reza_cart_v2', '{broken');
  localStorage.setItem('reza_wishlist_v1', '{broken');
  const user = userEvent.setup(); const view = await mount();
  expect(cart()).toEqual([]);
  await user.click(screen.getByText('Add large'));
  await user.click(screen.getByText('Wishlist'));
  view.unmount(); await mount();
  expect(cart()).toEqual([{ productId: 'suit', variantId: 'large', quantity: 1 }]);
  expect(screen.getByLabelText('wishlist')).toHaveTextContent('suit');
});

test('account hydration merges saved cart and wishlist then synchronizes user changes', async () => {
  localStorage.setItem('reza_cart_v2', JSON.stringify([{ productId: 'suit', variantId: 'small', quantity: 1 }]));
  localStorage.setItem('reza_wishlist_v1', JSON.stringify(['suit']));
  server.use(
    http.get(`${origin}/auth/me/`, () => HttpResponse.json({ id: 'buyer', email: 'buyer@example.invalid', role: 'user' })),
    http.get(`${origin}/cart/`, () => HttpResponse.json({ lines: [{ product_id: 'suit', variant_id: 'small', quantity: 2 }] })),
    http.get(`${origin}/wishlist/`, () => HttpResponse.json([{ ...product, id: 'saved' }])),
  );
  const user = userEvent.setup(); await mount();
  await waitFor(() => expect(cart()[0]?.quantity).toBe(2));
  await waitFor(() => expect(wishlistWrites).toContain('add:suit'));
  expect(screen.getByLabelText('wishlist')).toHaveTextContent('saved,suit');
  await user.click(screen.getByText('Decrease'));
  await waitFor(() => expect(writes).toContainEqual({ lines: [{ product_id: 'suit', variant_id: 'small', quantity: 1 }] }), { timeout: 2000 });
  await user.click(screen.getByText('Wishlist'));
  await waitFor(() => expect(wishlistWrites).toContain('remove:suit'));
});

test('catalog failure exposes fallback source', async () => {
  server.use(http.get(`${origin}/products/`, () => HttpResponse.json({}, { status: 503 })));
  render(<GlobalProvider><Shop /></GlobalProvider>);
  await screen.findByText('Source: fallback');
  expect(screen.queryByRole('heading', { name: 'Test suit' })).not.toBeInTheDocument();
});

test('failed account synchronization preserves usable local cart and wishlist', async () => {
  server.use(
    http.get(`${origin}/auth/me/`, () => HttpResponse.json({ id: 'buyer', email: 'buyer@example.invalid', role: 'user' })),
    http.get(`${origin}/cart/`, () => HttpResponse.json({}, { status: 503 })),
    http.put(`${origin}/cart/`, () => HttpResponse.json({}, { status: 503 })),
    http.get(`${origin}/wishlist/`, () => HttpResponse.json({}, { status: 503 })),
    http.post(`${origin}/wishlist/:id/`, () => HttpResponse.json({}, { status: 503 })),
  );
  const user = userEvent.setup(); await mount();
  await user.click(screen.getByText('Add small'));
  await user.click(screen.getByText('Wishlist'));
  expect(cart()).toEqual([{ productId: 'suit', variantId: 'small', quantity: 1 }]);
  expect(JSON.parse(localStorage.getItem('reza_wishlist_v1')!)).toEqual(['suit']);
});
