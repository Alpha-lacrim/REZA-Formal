import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import ProductPage from '../pages/ProductPage';
import api from '../services/api';
import type { Product } from '../types';

vi.mock('../contexts/GlobalContext', () => ({ useGlobal: () => ({
  products: [], user: null, wishlist: [], isInWishlist: () => false,
  addToCart: vi.fn(), toggleWishlist: vi.fn(), setAuthModalOpen: vi.fn(), showToast: vi.fn(),
}) }));

test('changing products aborts obsolete detail and review reads and ignores late detail', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  let finishFirst!: (product: Product) => void;
  const first = new Promise<Product>(resolve => { finishFirst = resolve; });
  const fixture = (id: string, name: string): Product => ({
    id, name, price: 100, currency: 'Toman', image: '', images: [], short: '', description: '', category: '', stock: 2,
  });
  let firstSignal: AbortSignal | undefined;
  let reviewSignal: AbortSignal | undefined;
  vi.spyOn(api, 'getProduct').mockImplementation(async (id, signal) => {
    if (id === 'a') { firstSignal = signal; return first; }
    return fixture('b', 'Beta suit');
  });
  vi.spyOn(api, 'getProductReviews').mockImplementation(async (id, _params, signal) => {
    if (id === 'a') reviewSignal = signal;
    return { results: [], count: 0, next: null, previous: null };
  });
  render(<MemoryRouter initialEntries={['/products/a']}>
    <Link to="/products/b">Next product</Link>
    <Routes><Route path="/products/:id" element={<ProductPage />} /></Routes>
  </MemoryRouter>);
  await waitFor(() => expect(firstSignal).toBeDefined());
  await userEvent.setup().click(screen.getByRole('link', { name: 'Next product' }));
  await screen.findByRole('heading', { name: 'Beta suit' });
  expect(firstSignal?.aborted).toBe(true); expect(reviewSignal?.aborted).toBe(true);
  await act(async () => finishFirst(fixture('a', 'Alpha suit')));
  expect(screen.getByRole('heading', { name: 'Beta suit' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Alpha suit' })).not.toBeInTheDocument();
});
