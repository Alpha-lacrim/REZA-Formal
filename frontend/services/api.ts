import { authApi, normalizeUser } from './auth';
import { catalogApi, normalizeProduct, normalizeVariant } from './catalog';
import { request, jsonBody } from './http/client';
import { ApiError, invalidResponse, isRecord } from './http/errors';
import { toNumber, toBoolean, toTimestamp, optionalTimestamp, parseStringRecord } from './normalization';
export { ApiError, errorMessage } from './http/errors';
import {
  Address,
  AdminCapabilities,
  AdminStats,
  BespokeRequest,
  CartState,
  CheckoutOptions,
  CheckoutQuote,
  CheckoutRequest,
  CheckoutResult,
  CommerceCapabilities,
  ContactMessage,
  CouponSummary,
  NewsletterSubscription,
  Order,
  OrderEvent,
  OrderLineSnapshot,
  OrderStatus,
  Page,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductReview,
  ProductVariant,
  ReturnRequest,
  ShippingMethod,
  SiteSettings,
  User,
} from '../types';

function valuesFrom(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw) && Array.isArray(raw.results)) return raw.results;
  if (isRecord(raw) && Array.isArray(raw.items)) return raw.items;
  return [];
}

function normalizePage<T>(value: unknown, normalize: (item: unknown) => T): Page<T> {
  if (!Array.isArray(value) && !(isRecord(value) && (Array.isArray(value.results) || Array.isArray(value.items)))) return invalidResponse();
  const results = valuesFrom(value).map(normalize);
  const raw = isRecord(value) ? value : {};
  return {
    results,
    count: toNumber(raw?.count, results.length),
    next: typeof raw?.next === 'string' ? raw.next : null,
    previous: typeof raw?.previous === 'string' ? raw.previous : null,
    page: raw?.page === undefined ? undefined : toNumber(raw.page, 1),
    pageSize: raw?.pageSize === undefined && raw?.page_size === undefined
      ? undefined
      : toNumber(raw?.pageSize ?? raw?.page_size, results.length),
    totalPages: raw?.totalPages === undefined && raw?.total_pages === undefined
      ? undefined
      : toNumber(raw?.totalPages ?? raw?.total_pages, 1),
  };
}

// Bounded compatibility snapshot for shared catalog/older callers. Admin screens use Page APIs.
async function readAdminCollection<T>(path: string, normalize: (item: unknown) => T, signal?: AbortSignal): Promise<T[]> {
  return normalizePage(await request(withQuery(path, { page: 1, page_size: 100 }), { signal }), normalize).results;
}

function withQuery(path: string, params?: Record<string, unknown>): string {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function encodeId(id: string): string {
  return encodeURIComponent(id);
}

function normalizeAddress(raw: any): Address {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    label: raw?.label || undefined,
    recipientName: raw?.recipientName ?? raw?.recipient_name ?? raw?.name ?? '',
    phone: raw?.phone ?? '',
    province: raw?.province ?? '',
    city: raw?.city ?? '',
    postalCode: raw?.postalCode ?? raw?.postal_code ?? '',
    addressLine: raw?.addressLine ?? raw?.address_line ?? raw?.address ?? '',
    isDefault: toBoolean(raw?.isDefault ?? raw?.is_default),
    createdAt: optionalTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
  };
}

function addressPayload(address: Address): Record<string, unknown> {
  return {
    label: address.label,
    recipient_name: address.recipientName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    postal_code: address.postalCode,
    address_line: address.addressLine,
    is_default: address.isDefault,
  };
}

function normalizeShippingMethod(raw: any): ShippingMethod {
  return {
    id: String(raw?.id ?? ''),
    name: raw?.name ?? '',
    description: raw?.description || undefined,
    price: toNumber(raw?.price),
    currency: raw?.currency || 'Toman',
    estimatedDaysMin: raw?.estimatedDaysMin === undefined && raw?.estimated_days_min === undefined
      ? undefined
      : toNumber(raw?.estimatedDaysMin ?? raw?.estimated_days_min),
    estimatedDaysMax: raw?.estimatedDaysMax === undefined && raw?.estimated_days_max === undefined
      ? undefined
      : toNumber(raw?.estimatedDaysMax ?? raw?.estimated_days_max),
    active: toBoolean(raw?.active ?? raw?.is_active, true),
    freeAbove: raw?.freeAbove === undefined && raw?.free_above === undefined
      ? undefined
      : toNumber(raw?.freeAbove ?? raw?.free_above),
  };
}

function normalizeCoupon(raw: any): CouponSummary {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    code: raw?.code ?? '',
    type: raw?.type === 'percent' ? 'percent' : 'fixed',
    value: toNumber(raw?.value),
    discountAmount: toNumber(raw?.discountAmount ?? raw?.discount_amount),
    description: raw?.description || undefined,
    active: raw?.active === undefined && raw?.is_active === undefined
      ? undefined
      : toBoolean(raw?.active ?? raw?.is_active),
    minimumOrderAmount: raw?.minimumOrderAmount === undefined && raw?.minimum_order_amount === undefined
      ? undefined
      : toNumber(raw?.minimumOrderAmount ?? raw?.minimum_order_amount),
    maximumDiscountAmount: raw?.maximumDiscountAmount === undefined && raw?.maximum_discount_amount === undefined
      ? undefined
      : toNumber(raw?.maximumDiscountAmount ?? raw?.maximum_discount_amount),
    startsAt: optionalTimestamp(raw?.startsAt ?? raw?.starts_at),
    expiresAt: optionalTimestamp(raw?.expiresAt ?? raw?.expires_at),
    usageLimit: raw?.usageLimit === undefined && raw?.usage_limit === undefined
      ? undefined
      : toNumber(raw?.usageLimit ?? raw?.usage_limit),
    usageCount: raw?.usageCount === undefined && raw?.usage_count === undefined
      ? undefined
      : toNumber(raw?.usageCount ?? raw?.usage_count),
  };
}

function normalizePayment(raw: any): Payment {
  return {
    id: String(raw?.id ?? ''),
    orderId: String(raw?.orderId ?? raw?.order_id ?? raw?.order ?? ''),
    method: (raw?.method ?? raw?.payment_method ?? 'cod') as PaymentMethod,
    status: (raw?.status ?? raw?.payment_status ?? 'unpaid') as PaymentStatus,
    amount: toNumber(raw?.amount),
    currency: raw?.currency || 'Toman',
    provider: raw?.provider || undefined,
    authority: raw?.authority || undefined,
    transactionId: raw?.transactionId ?? raw?.transaction_id ?? undefined,
    redirectUrl: raw?.redirectUrl ?? raw?.redirect_url ?? undefined,
    failureReason: raw?.failureReason ?? raw?.failure_reason ?? undefined,
    paidAt: optionalTimestamp(raw?.paidAt ?? raw?.paid_at),
    createdAt: optionalTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
  };
}

function normalizeOrderLine(raw: any): OrderLineSnapshot {
  const product = raw?.product && typeof raw.product === 'object' ? normalizeProduct(raw.product) : undefined;
  const variant = raw?.variant && typeof raw.variant === 'object'
    ? normalizeVariant(raw.variant, product?.currency)
    : undefined;
  const qty = Math.max(1, toNumber(raw?.qty ?? raw?.quantity, 1));
  const price = toNumber(raw?.price ?? raw?.unit_price, variant?.price ?? product?.price ?? 0);

  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    productId: raw?.productId === undefined && raw?.product_id === undefined && !product
      ? undefined
      : String(raw?.productId ?? raw?.product_id ?? product?.id ?? ''),
    variantId: raw?.variantId === undefined && raw?.variant_id === undefined && !variant
      ? undefined
      : String(raw?.variantId ?? raw?.variant_id ?? variant?.id ?? ''),
    sku: raw?.sku ?? variant?.sku ?? undefined,
    name: raw?.name ?? raw?.product_name ?? product?.name ?? '',
    short: raw?.short ?? raw?.product_short ?? product?.short ?? undefined,
    image: raw?.image ?? raw?.product_image ?? variant?.image ?? product?.image ?? undefined,
    size: raw?.size ?? variant?.size ?? undefined,
    color: raw?.color ?? variant?.color ?? undefined,
    attributes: Object.keys(parseStringRecord(raw?.attributes)).length > 0
      ? parseStringRecord(raw?.attributes)
      : variant?.attributes,
    qty,
    price,
    total: toNumber(raw?.total ?? raw?.line_total, price * qty),
    currency: raw?.currency ?? variant?.currency ?? product?.currency ?? 'Toman',
  };
}

function normalizeOrderEvent(raw: any): OrderEvent {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    type: raw?.type ?? '',
    status: raw?.status as OrderStatus | undefined,
    message: raw?.message || undefined,
    createdAt: toTimestamp(raw?.createdAt ?? raw?.created_at),
    actorName: raw?.actorName ?? raw?.actor_name ?? undefined,
  };
}

function normalizeOrder(raw: any): Order {
  const total = toNumber(raw?.total);
  const paymentRaw = raw?.payment ?? (Array.isArray(raw?.payments) ? raw.payments[0] : undefined);
  const payment = paymentRaw ? normalizePayment(paymentRaw) : undefined;
  const addressRaw = raw?.shippingAddressSnapshot ?? raw?.shipping_address_snapshot;
  const customerRaw = raw?.customer ?? raw?.customer_snapshot;
  const shippingMethodRaw = raw?.shippingMethod ?? raw?.shipping_method;

  return {
    id: String(raw?.id ?? ''),
    userId: String(raw?.userId ?? raw?.user_id ?? raw?.user ?? customerRaw?.user_id ?? ''),
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeOrderLine) : [],
    subtotal: toNumber(raw?.subtotal, total),
    discountTotal: toNumber(raw?.discountTotal ?? raw?.discount_total),
    shippingTotal: toNumber(raw?.shippingTotal ?? raw?.shipping_total),
    taxTotal: toNumber(raw?.taxTotal ?? raw?.tax_total),
    total,
    currency: raw?.currency || payment?.currency || 'Toman',
    status: (raw?.status || 'pending') as OrderStatus,
    paymentStatus: (raw?.paymentStatus ?? raw?.payment_status ?? payment?.status ?? 'unpaid') as PaymentStatus,
    paymentMethod: (raw?.paymentMethod ?? raw?.payment_method ?? payment?.method) as PaymentMethod | undefined,
    payment,
    createdAt: toTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
    shippingAddress: raw?.shippingAddress ?? raw?.shipping_address ?? addressRaw?.address_line ?? '',
    shippingAddressSnapshot: addressRaw ? normalizeAddress(addressRaw) : undefined,
    shippingMethod: shippingMethodRaw ? normalizeShippingMethod(shippingMethodRaw) : undefined,
    customer: customerRaw ? {
      userId: customerRaw?.userId === undefined && customerRaw?.user_id === undefined
        ? undefined
        : String(customerRaw?.userId ?? customerRaw?.user_id),
      name: customerRaw?.name ?? customerRaw?.full_name ?? '',
      email: customerRaw?.email || undefined,
      phone: customerRaw?.phone || undefined,
    } : undefined,
    customerNote: raw?.customerNote ?? raw?.customer_note ?? undefined,
    coupon: raw?.coupon ? normalizeCoupon(raw.coupon) : undefined,
    trackingCode: raw?.trackingCode ?? raw?.tracking_code ?? undefined,
    trackingUrl: raw?.trackingUrl ?? raw?.tracking_url ?? undefined,
    allowedTransitions: valuesFrom(raw?.allowedTransitions ?? raw?.allowed_transitions) as OrderStatus[],
    events: Array.isArray(raw?.events) ? raw.events.map(normalizeOrderEvent) : undefined,
  };
}

function normalizeReview(raw: any): ProductReview {
  return {
    id: String(raw?.id ?? ''),
    productId: String(raw?.productId ?? raw?.product_id ?? raw?.product ?? ''),
    userId: raw?.userId === undefined && raw?.user_id === undefined && raw?.user === undefined
      ? undefined
      : String(raw?.userId ?? raw?.user_id ?? raw?.user),
    userName: raw?.userName ?? raw?.user_name ?? raw?.author_name ?? '',
    rating: toNumber(raw?.rating),
    title: raw?.title || undefined,
    body: raw?.body ?? raw?.comment ?? '',
    verifiedPurchase: raw?.verifiedPurchase === undefined && raw?.verified_purchase === undefined
      ? undefined
      : toBoolean(raw?.verifiedPurchase ?? raw?.verified_purchase),
    status: raw?.status,
    createdAt: toTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
  };
}

function normalizeReturnRequest(raw: any): ReturnRequest {
  const itemIds = raw?.itemIds ?? raw?.item_ids;
  return {
    id: String(raw?.id ?? ''),
    orderId: String(raw?.orderId ?? raw?.order_id ?? raw?.order ?? ''),
    itemIds: Array.isArray(itemIds)
      ? itemIds.map((id: unknown) => String(id))
      : undefined,
    reason: raw?.reason ?? '',
    details: raw?.details || undefined,
    status: raw?.status || 'requested',
    refundAmount: raw?.refundAmount === undefined && raw?.refund_amount === undefined
      ? undefined
      : toNumber(raw?.refundAmount ?? raw?.refund_amount),
    createdAt: toTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
    adminNote: raw?.adminNote ?? raw?.admin_note ?? undefined,
  };
}

function normalizeBespokeRequest(raw: any): BespokeRequest {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    name: raw?.name ?? '',
    phone: raw?.phone ?? '',
    email: raw?.email || undefined,
    preferredDate: raw?.preferredDate ?? raw?.preferred_date ?? raw?.date ?? undefined,
    garmentType: raw?.garmentType ?? raw?.garment_type ?? raw?.type ?? '',
    description: raw?.description ?? raw?.desc ?? undefined,
    status: raw?.status,
    createdAt: optionalTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
  };
}

function normalizeNewsletter(raw: any): NewsletterSubscription {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    email: raw?.email ?? '',
    active: raw?.active === undefined && raw?.is_active === undefined
      ? undefined
      : toBoolean(raw?.active ?? raw?.is_active),
    subscribedAt: optionalTimestamp(raw?.subscribedAt ?? raw?.subscribed_at ?? raw?.created_at),
  };
}

function normalizeContactMessage(raw: any): ContactMessage {
  return {
    id: String(raw?.id ?? ''),
    name: raw?.name ?? '',
    email: raw?.email ?? '',
    message: raw?.message ?? '',
    createdAt: toTimestamp(raw?.createdAt ?? raw?.created_at),
    read: toBoolean(raw?.read),
  };
}

function normalizeCartLine(raw: any) {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    productId: String(raw?.productId ?? raw?.product_id ?? raw?.product?.id ?? raw?.product ?? ''),
    variantId: raw?.variantId === undefined && raw?.variant_id === undefined && raw?.variant === undefined
      ? undefined
      : String(raw?.variantId ?? raw?.variant_id ?? raw?.variant?.id ?? raw?.variant),
    quantity: Math.max(1, toNumber(raw?.quantity ?? raw?.qty, 1)),
    product: raw?.product && typeof raw.product === 'object' ? normalizeProduct(raw.product) : undefined,
    variant: raw?.variant && typeof raw.variant === 'object' ? normalizeVariant(raw.variant) : undefined,
    unitPrice: raw?.unitPrice === undefined && raw?.unit_price === undefined
      ? undefined
      : toNumber(raw?.unitPrice ?? raw?.unit_price),
    lineTotal: raw?.lineTotal === undefined && raw?.line_total === undefined
      ? undefined
      : toNumber(raw?.lineTotal ?? raw?.line_total),
  };
}

function normalizeCart(raw: any): CartState {
  let lines = valuesFrom(raw?.lines ? { results: raw.lines } : raw).map(normalizeCartLine);
  if (lines.length === 0 && raw && typeof raw === 'object' && !Array.isArray(raw) && !raw.lines && !raw.items) {
    lines = Object.entries(raw)
      .filter(([, quantity]) => Number.isFinite(Number(quantity)) && Number(quantity) > 0)
      .map(([productId, quantity]) => normalizeCartLine({ product_id: productId, quantity }));
  }
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    lines,
    currency: raw?.currency || 'Toman',
    subtotal: raw?.subtotal === undefined ? undefined : toNumber(raw.subtotal),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
  };
}

function normalizeCapabilities(raw: any): CommerceCapabilities {
  return {
    onlinePayments: toBoolean(raw?.onlinePayments ?? raw?.online_payments),
    cashOnDelivery: toBoolean(raw?.cashOnDelivery ?? raw?.cash_on_delivery, true),
    coupons: toBoolean(raw?.coupons),
    reviews: toBoolean(raw?.reviews),
    returns: toBoolean(raw?.returns),
    wishlist: toBoolean(raw?.wishlist),
    savedCart: toBoolean(raw?.savedCart ?? raw?.saved_cart),
    bespokeRequests: toBoolean(raw?.bespokeRequests ?? raw?.bespoke_requests),
    newsletter: toBoolean(raw?.newsletter),
  };
}

function normalizeAdminCapabilities(raw: any): AdminCapabilities {
  const paymentProviders = raw?.paymentProviders ?? raw?.payment_providers;
  return {
    ...normalizeCapabilities(raw),
    paymentProviders: Array.isArray(paymentProviders)
      ? paymentProviders.map(String)
      : [],
    canManageUsers: toBoolean(raw?.canManageUsers ?? raw?.can_manage_users),
    canManageInventory: toBoolean(raw?.canManageInventory ?? raw?.can_manage_inventory),
    canManagePromotions: toBoolean(raw?.canManagePromotions ?? raw?.can_manage_promotions),
  };
}

function normalizeCheckoutOptions(raw: any): CheckoutOptions {
  return {
    shippingMethods: valuesFrom(raw?.shippingMethods ?? raw?.shipping_methods).map(normalizeShippingMethod),
    paymentMethods: valuesFrom(raw?.paymentMethods ?? raw?.payment_methods).map(String) as PaymentMethod[],
    defaultShippingMethodId: raw?.defaultShippingMethodId ?? raw?.default_shipping_method_id ?? undefined,
    defaultPaymentMethod: raw?.defaultPaymentMethod ?? raw?.default_payment_method ?? undefined,
    capabilities: normalizeCapabilities(raw?.capabilities ?? raw),
  };
}

function normalizeCheckoutQuote(raw: any): CheckoutQuote {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    lines: valuesFrom(raw?.lines ? { results: raw.lines } : raw?.items ? { results: raw.items } : []).map(normalizeOrderLine),
    currency: raw?.currency || 'Toman',
    subtotal: toNumber(raw?.subtotal),
    discountTotal: toNumber(raw?.discountTotal ?? raw?.discount_total),
    shippingTotal: toNumber(raw?.shippingTotal ?? raw?.shipping_total),
    taxTotal: toNumber(raw?.taxTotal ?? raw?.tax_total),
    total: toNumber(raw?.total),
    coupon: raw?.coupon ? normalizeCoupon(raw.coupon) : undefined,
    shippingMethod: raw?.shippingMethod || raw?.shipping_method
      ? normalizeShippingMethod(raw?.shippingMethod ?? raw?.shipping_method)
      : undefined,
    availableShippingMethods: raw?.availableShippingMethods || raw?.available_shipping_methods
      ? valuesFrom(raw?.availableShippingMethods ?? raw?.available_shipping_methods).map(normalizeShippingMethod)
      : undefined,
    availablePaymentMethods: raw?.availablePaymentMethods || raw?.available_payment_methods
      ? valuesFrom(raw?.availablePaymentMethods ?? raw?.available_payment_methods).map(String) as PaymentMethod[]
      : undefined,
    expiresAt: optionalTimestamp(raw?.expiresAt ?? raw?.expires_at),
  };
}

function normalizeCheckoutResult(raw: any): CheckoutResult {
  const payment = raw?.payment ? normalizePayment(raw.payment) : undefined;
  return {
    order: normalizeOrder(raw?.order ?? raw),
    payment,
    redirectUrl: raw?.redirectUrl ?? raw?.redirect_url ?? payment?.redirectUrl,
    requiresRedirect: toBoolean(raw?.requiresRedirect ?? raw?.requires_redirect ?? Boolean(raw?.redirectUrl ?? raw?.redirect_url)),
  };
}

function checkoutPayload(payload: CheckoutRequest): Record<string, unknown> {
  return {
    idempotency_key: payload.idempotencyKey,
    items: payload.items.map(item => ({
      id: item.productId,
      product_id: item.productId,
      variant_id: item.variantId,
      qty: item.quantity,
    })),
    shipping_address: payload.shippingAddress ? addressPayload(payload.shippingAddress) : undefined,
    address_id: payload.addressId,
    shipping_method_id: payload.shippingMethodId,
    payment_method: payload.paymentMethod,
    coupon_code: payload.couponCode,
    customer_note: payload.customerNote,
    quote_id: payload.quoteId,
  };
}

function normalizeSettings(raw: any): SiteSettings {
  return {
    aboutTitle: raw?.aboutTitle ?? raw?.about_title ?? '',
    aboutDescription: raw?.aboutDescription ?? raw?.about_description ?? '',
    aboutImage: raw?.aboutImage ?? raw?.about_image ?? '',
    heroImage: raw?.heroImage ?? raw?.hero_image ?? '',
    suitsSectionImage: raw?.suitsSectionImage ?? raw?.suits_section_image ?? '',
    shirtsSectionImage: raw?.shirtsSectionImage ?? raw?.shirts_section_image ?? '',
    blazersSectionImage: raw?.blazersSectionImage ?? raw?.blazers_section_image ?? '',
    accessoriesSectionImage: raw?.accessoriesSectionImage ?? raw?.accessories_section_image ?? '',
    bespokeSectionImage: raw?.bespokeSectionImage ?? raw?.bespoke_section_image ?? '',
  };
}

function normalizeAdminStats(raw: any): AdminStats {
  return {
    productsCount: toNumber(raw?.productsCount ?? raw?.products_count),
    ordersCount: toNumber(raw?.ordersCount ?? raw?.orders_count),
    usersCount: toNumber(raw?.usersCount ?? raw?.users_count),
    revenue: toNumber(raw?.revenue),
    messagesCount: toNumber(raw?.messagesCount ?? raw?.messages_count),
    pendingOrdersCount: raw?.pendingOrdersCount === undefined && raw?.pending_orders_count === undefined
      ? undefined
      : toNumber(raw?.pendingOrdersCount ?? raw?.pending_orders_count),
    lowStockCount: raw?.lowStockCount === undefined && raw?.low_stock_count === undefined
      ? undefined
      : toNumber(raw?.lowStockCount ?? raw?.low_stock_count),
    pendingReviewsCount: raw?.pendingReviewsCount === undefined && raw?.pending_reviews_count === undefined
      ? undefined
      : toNumber(raw?.pendingReviewsCount ?? raw?.pending_reviews_count),
    pendingReturnsCount: raw?.pendingReturnsCount === undefined && raw?.pending_returns_count === undefined
      ? undefined
      : toNumber(raw?.pendingReturnsCount ?? raw?.pending_returns_count),
    pendingBespokeCount: raw?.pendingBespokeCount === undefined && raw?.pending_bespoke_count === undefined
      ? undefined
      : toNumber(raw?.pendingBespokeCount ?? raw?.pending_bespoke_count),
  };
}

function isFile(value: unknown): value is Blob {
  return Boolean(value) && (value instanceof File || value instanceof Blob);
}

export const api = {
  ...authApi,
  ...catalogApi,

  async getCheckoutOptions(): Promise<CheckoutOptions> {
    return normalizeCheckoutOptions(await request('/api/checkout/options/'));
  },
  async quoteCheckout(payload: CheckoutRequest, signal?: AbortSignal): Promise<CheckoutQuote> {
    return normalizeCheckoutQuote(await request('/api/checkout/quote/', { method: 'POST', signal, ...jsonBody(checkoutPayload(payload)) }));
  },
  async createCheckout(payload: CheckoutRequest): Promise<CheckoutResult> {
    return normalizeCheckoutResult(await request('/api/orders/create/', { method: 'POST', ...jsonBody(checkoutPayload(payload)) }));
  },
  // Legacy UI compatibility: callers still receive the Order directly.
  async createOrder(payload: any): Promise<Order> {
    const raw: any = await request('/api/orders/create/', { method: 'POST', ...jsonBody(payload) });
    return normalizeOrder(raw?.order ?? raw);
  },
  async getOrder(id: string): Promise<Order> {
    return normalizeOrder(await request(`/api/orders/${encodeId(id)}/`));
  },
  async myOrders(): Promise<Order[]> {
    return normalizePage(await request('/api/orders/my/'), normalizeOrder).results;
  },
  async cancelOrder(id: string): Promise<Order> {
    return normalizeOrder(await request(`/api/orders/${encodeId(id)}/cancel/`, { method: 'POST' }));
  },

  async getAddresses(): Promise<Address[]> {
    return normalizePage(await request('/api/addresses/'), normalizeAddress).results;
  },
  async createAddress(address: Address): Promise<Address> {
    return normalizeAddress(await request('/api/addresses/', { method: 'POST', ...jsonBody(addressPayload(address)) }));
  },
  async updateAddress(id: string, address: Address): Promise<Address> {
    return normalizeAddress(await request(`/api/addresses/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(addressPayload(address)) }));
  },
  async deleteAddress(id: string) {
    return request(`/api/addresses/${encodeId(id)}/`, { method: 'DELETE' });
  },

  async getSavedCart(signal?: AbortSignal): Promise<CartState> {
    return normalizeCart(await request('/api/cart/', { signal }));
  },
  async syncSavedCart(cart: CartState): Promise<CartState> {
    const payload = {
      lines: cart.lines.map(line => ({ product_id: line.productId, variant_id: line.variantId, quantity: line.quantity })),
    };
    return normalizeCart(await request('/api/cart/', { method: 'PUT', ...jsonBody(payload) }));
  },
  async clearSavedCart() { return request('/api/cart/', { method: 'DELETE' }); },

  async getWishlist(signal?: AbortSignal): Promise<Product[]> {
    const raw: any = await request('/api/wishlist/', { signal });
    return normalizePage(raw?.products ?? raw, item => normalizeProduct(isRecord(item) ? item.product ?? item : item)).results;
  },
  async addToWishlist(productId: string): Promise<Product[]> {
    const raw: any = await request(`/api/wishlist/${encodeId(productId)}/`, { method: 'POST' });
    return normalizePage(raw?.products ?? raw, item => normalizeProduct(isRecord(item) ? item.product ?? item : item)).results;
  },
  async removeFromWishlist(productId: string): Promise<Product[]> {
    const raw: any = await request(`/api/wishlist/${encodeId(productId)}/`, { method: 'DELETE' });
    return normalizePage(raw?.products ?? raw, item => normalizeProduct(isRecord(item) ? item.product ?? item : item)).results;
  },

  async getProductReviews(productId: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<ProductReview>> {
    return normalizePage(await request(withQuery(`/api/products/${encodeId(productId)}/reviews/`, params), { signal }), normalizeReview);
  },
  async createProductReview(productId: string, review: Pick<ProductReview, 'rating' | 'title' | 'body'>): Promise<ProductReview> {
    return normalizeReview(await request(`/api/products/${encodeId(productId)}/reviews/`, { method: 'POST', ...jsonBody(review) }));
  },

  async getReturns(): Promise<ReturnRequest[]> {
    return normalizePage(await request('/api/returns/'), normalizeReturnRequest).results;
  },
  async createReturn(payload: Pick<ReturnRequest, 'orderId' | 'itemIds' | 'reason' | 'details'>): Promise<ReturnRequest> {
    return normalizeReturnRequest(await request('/api/returns/', {
      method: 'POST',
      ...jsonBody({ order_id: payload.orderId, item_ids: payload.itemIds, reason: payload.reason, details: payload.details }),
    }));
  },
  async submitBespokeRequest(payload: BespokeRequest): Promise<BespokeRequest> {
    return normalizeBespokeRequest(await request('/api/bespoke/requests/', { method: 'POST', ...jsonBody({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      preferred_date: payload.preferredDate,
      garment_type: payload.garmentType,
      description: payload.description,
    }) }));
  },
  async subscribeNewsletter(email: string): Promise<NewsletterSubscription> {
    return normalizeNewsletter(await request('/api/newsletter/subscribe/', { method: 'POST', ...jsonBody({ email }) }));
  },

  async getSettings(signal?: AbortSignal): Promise<SiteSettings> {
    return normalizeSettings(await request('/api/settings/', { signal }, { sessionBound: false }));
  },
  async saveSettings(data: any): Promise<SiteSettings> {
    return normalizeSettings(await request('/api/settings/', {
      method: 'PUT',
      ...(data instanceof FormData ? { body: data } : jsonBody(data)),
    }));
  },
  async contact(name: string, email: string, message: string): Promise<ContactMessage> {
    return normalizeContactMessage(await request('/api/contact/', { method: 'POST', ...jsonBody({ name, email, message }) }));
  },

  async adminGetStats(): Promise<AdminStats> { return normalizeAdminStats(await request('/api/admin/stats/')); },
  async adminGetCapabilities(): Promise<AdminCapabilities> {
    return normalizeAdminCapabilities(await request('/api/admin/capabilities/'));
  },
  async adminGetOrders(): Promise<Order[]> {
    return readAdminCollection('/api/admin/orders/', normalizeOrder);
  },
  async adminGetOrderPage(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<Order>> {
    return normalizePage(await request(withQuery('/api/admin/orders/', params), { signal }), normalizeOrder);
  },
  async adminGetMessagePage(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<ContactMessage>> {
    return normalizePage(await request(withQuery('/api/admin/messages/', params), { signal }), normalizeContactMessage);
  },
  async adminGetProductPage(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<Product>> {
    return normalizePage(await request(withQuery('/api/admin/products/', params), { signal }), normalizeProduct);
  },
  async adminUpdateOrderStatus(id: string, status: string): Promise<Order> {
    return normalizeOrder(await request(`/api/admin/orders/${encodeId(id)}/status/`, { method: 'PUT', ...jsonBody({ status }) }));
  },
  async adminUpdateOrder(id: string, changes: { status?: string; trackingCode?: string; adminNote?: string }): Promise<Order> {
    return normalizeOrder(await request(`/api/admin/orders/${encodeId(id)}/status/`, {
      method: 'PUT',
      ...jsonBody({
        status: changes.status,
        tracking_code: changes.trackingCode,
        admin_note: changes.adminNote,
      }),
    }));
  },
  async adminGetUsers(): Promise<User[]> {
    return readAdminCollection('/api/admin/users/', normalizeUser);
  },
  async adminGetMessages(): Promise<ContactMessage[]> {
    return readAdminCollection('/api/admin/messages/', normalizeContactMessage);
  },
  async adminMarkMessageRead(id: string) {
    return request(`/api/admin/messages/${encodeId(id)}/mark-read/`, { method: 'POST' });
  },
  async adminGetProducts(signal?: AbortSignal): Promise<Product[]> {
    return readAdminCollection('/api/admin/products/', normalizeProduct, signal);
  },

  async adminSaveProduct(product: FormData | Record<string, unknown>): Promise<Product> {
    const payload = product instanceof FormData ? product : new FormData();
    if (!(product instanceof FormData)) {
      Object.keys(product).forEach(key => {
        const value = product[key];
        if (value === null || value === undefined) return;
        if (isFile(value)) payload.append(key, value);
        else if (Array.isArray(value) && value.length > 0 && value.every(isFile)) value.forEach(file => payload.append(key, file));
        else if (typeof value === 'object') payload.append(key, JSON.stringify(value));
        else payload.append(key, String(value));
      });
    }

    const id = payload.get('id') as string | null;
    const path = id ? `/api/admin/products/${encodeId(id)}/` : '/api/admin/products/';
    return normalizeProduct(await request(path, { method: id ? 'PUT' : 'POST', body: payload }));
  },
  async adminDeleteProduct(id: string) {
    return request(`/api/admin/products/${encodeId(id)}/`, { method: 'DELETE' });
  },

  async adminGetCoupons(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<CouponSummary>> {
    return normalizePage(await request(withQuery('/api/admin/coupons/', params), { signal }), normalizeCoupon);
  },
  async adminSaveCoupon(coupon: Partial<CouponSummary>): Promise<CouponSummary> {
    const path = coupon.id ? `/api/admin/coupons/${encodeId(coupon.id)}/` : '/api/admin/coupons/';
    return normalizeCoupon(await request(path, { method: coupon.id ? 'PUT' : 'POST', ...jsonBody(coupon) }));
  },
  async adminDeleteCoupon(id: string) { return request(`/api/admin/coupons/${encodeId(id)}/`, { method: 'DELETE' }); },

  async adminGetShippingMethods(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<ShippingMethod>> {
    return normalizePage(await request(withQuery('/api/admin/shipping-methods/', params), { signal }), normalizeShippingMethod);
  },
  async adminSaveShippingMethod(method: Partial<ShippingMethod>): Promise<ShippingMethod> {
    const path = method.id ? `/api/admin/shipping-methods/${encodeId(method.id)}/` : '/api/admin/shipping-methods/';
    return normalizeShippingMethod(await request(path, { method: method.id ? 'PUT' : 'POST', ...jsonBody(method) }));
  },
  async adminDeleteShippingMethod(id: string) {
    return request(`/api/admin/shipping-methods/${encodeId(id)}/`, { method: 'DELETE' });
  },

  async adminGetPayments(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<Payment>> {
    return normalizePage(await request(withQuery('/api/admin/payments/', params), { signal }), normalizePayment);
  },
  async adminUpdatePayment(id: string, changes: Partial<Payment> & {
    refund_amount?: string; reason?: string; reference?: string; confirmed?: boolean;
  }): Promise<Payment> {
    return normalizePayment(await request(`/api/admin/payments/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },

  async adminGetReviews(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<ProductReview>> {
    return normalizePage(await request(withQuery('/api/admin/reviews/', params), { signal }), normalizeReview);
  },
  async adminUpdateReview(id: string, changes: Partial<ProductReview>): Promise<ProductReview> {
    return normalizeReview(await request(`/api/admin/reviews/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },
  async adminDeleteReview(id: string) { return request(`/api/admin/reviews/${encodeId(id)}/`, { method: 'DELETE' }); },

  async adminGetReturns(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<ReturnRequest>> {
    return normalizePage(await request(withQuery('/api/admin/returns/', params), { signal }), normalizeReturnRequest);
  },
  async adminUpdateReturn(id: string, changes: Partial<ReturnRequest>): Promise<ReturnRequest> {
    return normalizeReturnRequest(await request(`/api/admin/returns/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },

  async adminGetBespokeRequests(params?: Record<string, unknown>, signal?: AbortSignal): Promise<Page<BespokeRequest>> {
    return normalizePage(await request(withQuery('/api/admin/bespoke/', params), { signal }), normalizeBespokeRequest);
  },
  async adminUpdateBespokeRequest(id: string, changes: Partial<BespokeRequest>): Promise<BespokeRequest> {
    return normalizeBespokeRequest(await request(`/api/admin/bespoke/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },
};

export default api;
