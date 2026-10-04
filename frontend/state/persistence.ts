import { CartLine } from '../types';
import { isRecord } from '../services/http/errors';

export const cartLineKey = (line: Pick<CartLine, 'productId' | 'variantId'>) => `${line.productId}::${line.variantId || ''}`;
export function readStorage(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
export function writeStorage(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function removeStorage(key: string) {
  try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
}
export function cleanLines(value: unknown): CartLine[] {
  const lines = new Map<string, CartLine>();
  if (!Array.isArray(value)) return [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.productId !== 'string' || !raw.productId || !Number.isSafeInteger(raw.quantity) || Number(raw.quantity) <= 0) continue;
    const line = { productId: raw.productId, variantId: typeof raw.variantId === 'string' && raw.variantId ? raw.variantId : undefined, quantity: Number(raw.quantity) };
    lines.set(cartLineKey(line), line);
  }
  return [...lines.values()];
}
export function cleanIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && !!id))] : [];
}
export interface CommerceRecord {
  cartLines: CartLine[];
  wishlist: string[];
  cartEdits: Record<string, CartLine>;
  wishEdits: Record<string, boolean>;
  clearCart: boolean;
  guestLines: CartLine[];
}
export const emptyRecord = (): CommerceRecord => ({ cartLines: [], wishlist: [], cartEdits: {}, wishEdits: {}, clearCart: false, guestLines: [] });
export const commerceKey = (owner: string) => `reza_commerce_v3:${owner}`;
export function readCommerce(owner: string): CommerceRecord {
  const raw = readStorage(commerceKey(owner));
  if (isRecord(raw)) {
    const record = { ...emptyRecord(), cartLines: cleanLines(raw.cartLines), wishlist: cleanIds(raw.wishlist), guestLines: cleanLines(raw.guestLines), clearCart: raw.clearCart === true };
    if (isRecord(raw.cartEdits)) for (const value of Object.values(raw.cartEdits)) {
      if (!isRecord(value) || !Number.isSafeInteger(value.quantity) || Number(value.quantity) < 0) continue;
      const line = cleanLines([{ ...value, quantity: Math.max(1, Number(value.quantity)) }])[0];
      if (line) record.cartEdits[cartLineKey(line)] = { ...line, quantity: Number(value.quantity) };
    }
    if (isRecord(raw.wishEdits)) for (const [key, value] of Object.entries(raw.wishEdits)) if (typeof value === 'boolean') record.wishEdits[key] = value;
    return record;
  }
  if (owner !== 'guest') return emptyRecord();
  // Old data has no reliable owner. A legacy session marker quarantines it from guests.
  if (readStorage('reza_session_v1') !== null) return emptyRecord();
  const v2 = readStorage('reza_cart_v2');
  const legacy = readStorage('reza_cart_v1');
  const cartLines = Array.isArray(v2) ? cleanLines(v2) : isRecord(legacy)
    ? cleanLines(Object.entries(legacy).map(([productId, quantity]) => ({ productId, quantity: Math.floor(Number(quantity)) }))) : [];
  return { ...emptyRecord(), cartLines, wishlist: cleanIds(readStorage('reza_wishlist_v1')) };
}
