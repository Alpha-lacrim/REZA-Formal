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

const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const CSRF_PATH = '/api/auth/csrf/';
const CSRF_ROTATING_PATHS = new Set([
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/refresh/',
  '/api/auth/logout/',
]);

let csrfTokenRequest: Promise<string | undefined> | null = null;

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE) return normalizedPath;

  if (API_BASE.endsWith('/api') && (normalizedPath === '/api' || normalizedPath.startsWith('/api/'))) {
    return `${API_BASE}${normalizedPath.slice(4)}`;
  }

  return `${API_BASE}${normalizedPath}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

function toTimestamp(value: unknown, fallback = Date.now()): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalTimestamp(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = toTimestamp(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseJsonList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
        : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

function parseStringRecord(value: unknown): Record<string, string> {
  let candidate = value;
  if (typeof candidate === 'string' && candidate.trim()) {
    try { candidate = JSON.parse(candidate); } catch { return {}; }
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {};
  return Object.fromEntries(
    Object.entries(candidate as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, String(item)]),
  );
}

function valuesFrom<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function normalizePage<T>(raw: any, normalize: (item: any) => T): Page<T> {
  const results = valuesFrom<any>(raw).map(normalize);
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

function normalizeVariant(raw: any, fallbackCurrency = 'Toman'): ProductVariant {
  return {
    id: String(raw?.id ?? ''),
    productId: raw?.productId === undefined && raw?.product_id === undefined && raw?.product === undefined
      ? undefined
      : String(raw?.productId ?? raw?.product_id ?? raw?.product),
    sku: raw?.sku ?? '',
    name: raw?.name || undefined,
    size: raw?.size || undefined,
    color: raw?.color || undefined,
    attributes: parseStringRecord(raw?.attributes),
    price: toNumber(raw?.price),
    priceOverride: raw?.priceOverride === undefined && raw?.price_override === undefined
      ? undefined
      : (raw?.priceOverride ?? raw?.price_override) === null
        ? null
        : toNumber(raw?.priceOverride ?? raw?.price_override),
    compareAtPrice: (raw?.compareAtPrice ?? raw?.compare_at_price) === null
      || (raw?.compareAtPrice === undefined && raw?.compare_at_price === undefined)
      ? undefined
      : toNumber(raw?.compareAtPrice ?? raw?.compare_at_price),
    currency: raw?.currency || fallbackCurrency,
    stock: toNumber(raw?.stock),
    active: toBoolean(raw?.active ?? raw?.is_active, true),
    image: raw?.image || undefined,
    createdAt: optionalTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
  };
}

function normalizeProduct(raw: any): Product {
  const images = parseJsonList(raw?.images);
  const image = raw?.image || images[0] || '';
  const currency = raw?.currency || 'Toman';
  const variants = Array.isArray(raw?.variants)
    ? raw.variants.map((variant: any) => normalizeVariant(variant, currency))
    : undefined;
  const explicitStock = raw?.stock === null || raw?.stock === undefined ? undefined : toNumber(raw.stock);

  return {
    id: String(raw?.id ?? ''),
    name: raw?.name ?? '',
    name_fa: raw?.name_fa,
    price: toNumber(raw?.price),
    compareAtPrice: (raw?.compareAtPrice ?? raw?.compare_at_price) === null
      || (raw?.compareAtPrice === undefined && raw?.compare_at_price === undefined)
      ? undefined
      : toNumber(raw?.compareAtPrice ?? raw?.compare_at_price),
    currency,
    image,
    images: images.length > 0 ? images : (image ? [image] : []),
    short: raw?.short ?? '',
    short_fa: raw?.short_fa,
    description: raw?.description ?? '',
    description_fa: raw?.description_fa,
    category: raw?.category ?? '',
    fabric: raw?.fabric || undefined,
    stock: explicitStock ?? (variants ? variants.reduce((sum: number, variant: ProductVariant) => sum + variant.stock, 0) : undefined),
    variants,
    rating: raw?.rating === null || raw?.rating === undefined ? undefined : toNumber(raw.rating),
    reviewCount: raw?.reviewCount === undefined && raw?.review_count === undefined
      ? undefined
      : toNumber(raw?.reviewCount ?? raw?.review_count),
    active: raw?.active === undefined && raw?.is_active === undefined
      ? undefined
      : toBoolean(raw?.active ?? raw?.is_active),
    featured: raw?.featured === undefined && raw?.is_featured === undefined
      ? undefined
      : toBoolean(raw?.featured ?? raw?.is_featured),
  };
}

function normalizeUser(raw: any): User {
  const firstName = raw?.first_name ?? '';
  const lastName = raw?.last_name ?? '';
  const fullName = raw?.name || [firstName, lastName].filter(Boolean).join(' ') || raw?.email || '';

  return {
    id: String(raw?.id ?? ''),
    name: fullName,
    email: raw?.email ?? '',
    role: raw?.role || 'user',
    phone: raw?.phone || undefined,
    address: raw?.address || '',
    createdAt: toTimestamp(raw?.createdAt ?? raw?.created_at ?? raw?.date_joined),
    lastLogin: optionalTimestamp(raw?.lastLogin ?? raw?.last_login),
    avatar: raw?.avatar || undefined,
    provider: raw?.provider,
  };
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
    allowedTransitions: valuesFrom<string>(raw?.allowedTransitions ?? raw?.allowed_transitions) as OrderStatus[],
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
  return {
    id: String(raw?.id ?? ''),
    orderId: String(raw?.orderId ?? raw?.order_id ?? raw?.order ?? ''),
    itemIds: Array.isArray(raw?.itemIds ?? raw?.item_ids)
      ? (raw?.itemIds ?? raw?.item_ids).map((id: unknown) => String(id))
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
  let lines = valuesFrom<any>(raw?.lines ? { results: raw.lines } : raw).map(normalizeCartLine);
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
  return {
    ...normalizeCapabilities(raw),
    paymentProviders: Array.isArray(raw?.paymentProviders ?? raw?.payment_providers)
      ? (raw?.paymentProviders ?? raw?.payment_providers).map(String)
      : [],
    canManageUsers: toBoolean(raw?.canManageUsers ?? raw?.can_manage_users),
    canManageInventory: toBoolean(raw?.canManageInventory ?? raw?.can_manage_inventory),
    canManagePromotions: toBoolean(raw?.canManagePromotions ?? raw?.can_manage_promotions),
  };
}

function normalizeCheckoutOptions(raw: any): CheckoutOptions {
  return {
    shippingMethods: valuesFrom<any>(raw?.shippingMethods ?? raw?.shipping_methods).map(normalizeShippingMethod),
    paymentMethods: valuesFrom<any>(raw?.paymentMethods ?? raw?.payment_methods).map(String) as PaymentMethod[],
    defaultShippingMethodId: raw?.defaultShippingMethodId ?? raw?.default_shipping_method_id ?? undefined,
    defaultPaymentMethod: raw?.defaultPaymentMethod ?? raw?.default_payment_method ?? undefined,
    capabilities: normalizeCapabilities(raw?.capabilities ?? raw),
  };
}

function normalizeCheckoutQuote(raw: any): CheckoutQuote {
  return {
    id: raw?.id === null || raw?.id === undefined ? undefined : String(raw.id),
    lines: valuesFrom<any>(raw?.lines ? { results: raw.lines } : raw?.items ? { results: raw.items } : []).map(normalizeOrderLine),
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
      ? valuesFrom<any>(raw?.availableShippingMethods ?? raw?.available_shipping_methods).map(normalizeShippingMethod)
      : undefined,
    availablePaymentMethods: raw?.availablePaymentMethods || raw?.available_payment_methods
      ? valuesFrom<any>(raw?.availablePaymentMethods ?? raw?.available_payment_methods).map(String) as PaymentMethod[]
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

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

async function ensureCsrfToken(): Promise<string | undefined> {
  const cookieToken = readCookie('csrftoken');
  if (cookieToken) return cookieToken;
  if (csrfTokenRequest) return csrfTokenRequest;

  csrfTokenRequest = (async () => {
    try {
      const response = await fetch(apiUrl(CSRF_PATH), { method: 'GET', credentials: 'include' });
      if (!response.ok) return readCookie('csrftoken');
      const data = await response.json().catch(() => null);
      return data?.csrfToken ?? data?.csrf_token ?? data?.token ?? readCookie('csrftoken');
    } catch {
      // Older backends may not expose the bootstrap endpoint yet. Existing
      // SameSite behavior remains usable while the additive contract rolls out.
      return readCookie('csrftoken');
    }
  })();

  return csrfTokenRequest;
}

const NO_AUTO_REFRESH_PATHS = new Set([
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/refresh/',
  '/api/auth/logout/',
  '/api/auth/google/',
  CSRF_PATH,
]);

async function fetchApi(path: string, opts: RequestInit = {}): Promise<Response> {
  const method = (opts.method || 'GET').toUpperCase();
  const headers = new Headers(opts.headers);
  if (!SAFE_METHODS.has(method) && path !== CSRF_PATH && !headers.has('X-CSRFToken')) {
    const token = await ensureCsrfToken();
    if (token) headers.set('X-CSRFToken', token);
  }

  const requestOptions = { ...opts, method, headers, credentials: 'include' as RequestCredentials };
  let response = await fetch(apiUrl(path), requestOptions);

  if (response.status === 401 && !NO_AUTO_REFRESH_PATHS.has(path)) {
    const refreshHeaders = new Headers();
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) refreshHeaders.set('X-CSRFToken', csrfToken);
    const refreshResponse = await fetch(apiUrl('/api/auth/refresh/'), {
      method: 'POST',
      headers: refreshHeaders,
      credentials: 'include',
    });
    if (refreshResponse.ok) {
      csrfTokenRequest = null;
      if (!SAFE_METHODS.has(method)) {
        headers.delete('X-CSRFToken');
        const renewedCsrfToken = await ensureCsrfToken();
        if (renewedCsrfToken) headers.set('X-CSRFToken', renewedCsrfToken);
      }
      response = await fetch(apiUrl(path), requestOptions);
    }
  }

  if (response.ok && CSRF_ROTATING_PATHS.has(path)) csrfTokenRequest = null;
  return response;
}

function errorMessage(data: any): string {
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    for (const [field, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) return `${field}: ${String(value[0])}`;
      if (typeof value === 'string') return `${field}: ${value}`;
    }
  }
  return 'Request failed';
}

async function request<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.body && !(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetchApi(path, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const error = new Error(errorMessage(data)) as Error & { status?: number; data?: unknown };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data as T;
}

function jsonBody(payload: unknown): Pick<RequestInit, 'body' | 'headers'> {
  return { body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } };
}

function isFile(value: any): boolean {
  return Boolean(value) && (value instanceof File || value instanceof Blob);
}

export const api = {
  async getProducts(): Promise<Product[]> {
    return normalizePage(await request('/api/products/'), normalizeProduct).results;
  },
  async getProduct(id: string): Promise<Product> {
    return normalizeProduct(await request(`/api/products/${encodeId(id)}/`));
  },
  async register(name: string, email: string, pass: string) {
    const data: any = await request('/api/auth/register/', { method: 'POST', ...jsonBody({ first_name: name, email, password: pass }) });
    return data?.user ? { ...data, user: normalizeUser(data.user) } : normalizeUser(data);
  },
  async login(email: string, pass: string, otp?: string) {
    const data: any = await request('/api/auth/login/', { method: 'POST', ...jsonBody({ email, password: pass, otp }) });
    return data?.user ? { ...data, user: normalizeUser(data.user) } : normalizeUser(data);
  },
  async logout() { return request('/api/auth/logout/', { method: 'POST' }); },
  async me(): Promise<User> { return normalizeUser(await request('/api/auth/me/')); },
  async updateProfile(payload: any): Promise<User> {
    return normalizeUser(await request('/api/auth/me/update/', { method: 'PUT', ...jsonBody(payload) }));
  },

  async getCheckoutOptions(): Promise<CheckoutOptions> {
    return normalizeCheckoutOptions(await request('/api/checkout/options/'));
  },
  async quoteCheckout(payload: CheckoutRequest): Promise<CheckoutQuote> {
    return normalizeCheckoutQuote(await request('/api/checkout/quote/', { method: 'POST', ...jsonBody(checkoutPayload(payload)) }));
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

  async getSavedCart(): Promise<CartState> {
    return normalizeCart(await request('/api/cart/'));
  },
  async syncSavedCart(cart: CartState): Promise<CartState> {
    const payload = {
      lines: cart.lines.map(line => ({ product_id: line.productId, variant_id: line.variantId, quantity: line.quantity })),
    };
    return normalizeCart(await request('/api/cart/', { method: 'PUT', ...jsonBody(payload) }));
  },
  async clearSavedCart() { return request('/api/cart/', { method: 'DELETE' }); },

  async getWishlist(): Promise<Product[]> {
    const raw: any = await request('/api/wishlist/');
    return normalizePage(raw?.products ?? raw, item => normalizeProduct(item?.product ?? item)).results;
  },
  async addToWishlist(productId: string): Promise<Product[]> {
    const raw: any = await request(`/api/wishlist/${encodeId(productId)}/`, { method: 'POST' });
    return normalizePage(raw?.products ?? raw, item => normalizeProduct(item?.product ?? item)).results;
  },
  async removeFromWishlist(productId: string): Promise<Product[]> {
    const raw: any = await request(`/api/wishlist/${encodeId(productId)}/`, { method: 'DELETE' });
    return normalizePage(raw?.products ?? raw, item => normalizeProduct(item?.product ?? item)).results;
  },

  async getProductReviews(productId: string, params?: Record<string, unknown>): Promise<Page<ProductReview>> {
    return normalizePage(await request(withQuery(`/api/products/${encodeId(productId)}/reviews/`, params)), normalizeReview);
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

  async getSettings(): Promise<SiteSettings> { return normalizeSettings(await request('/api/settings/')); },
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
    return normalizePage(await request('/api/admin/orders/'), normalizeOrder).results;
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
    return normalizePage(await request('/api/admin/users/'), normalizeUser).results;
  },
  async adminGetMessages(): Promise<ContactMessage[]> {
    return normalizePage(await request('/api/admin/messages/'), normalizeContactMessage).results;
  },
  async adminMarkMessageRead(id: string) {
    return request(`/api/admin/messages/${encodeId(id)}/mark-read/`, { method: 'POST' });
  },
  async adminGetProducts(): Promise<Product[]> {
    return normalizePage(await request('/api/admin/products/'), normalizeProduct).results;
  },

  async adminSaveProduct(product: any): Promise<Product> {
    let payload = product;
    if (!(product instanceof FormData)) {
      const formData = new FormData();
      Object.keys(product).forEach(key => {
        const value = product[key];
        if (value === null || value === undefined) return;
        if (isFile(value)) formData.append(key, value);
        else if (Array.isArray(value) && value.length > 0 && isFile(value[0])) value.forEach(file => formData.append(key, file));
        else if (typeof value === 'object') formData.append(key, JSON.stringify(value));
        else formData.append(key, String(value));
      });
      payload = formData;
    }

    const id = payload instanceof FormData ? payload.get('id') as string | null : product.id;
    const path = id ? `/api/admin/products/${encodeId(id)}/` : '/api/admin/products/';
    return normalizeProduct(await request(path, { method: id ? 'PUT' : 'POST', body: payload }));
  },
  async adminDeleteProduct(id: string) {
    return request(`/api/admin/products/${encodeId(id)}/`, { method: 'DELETE' });
  },

  async adminGetCoupons(params?: Record<string, unknown>): Promise<Page<CouponSummary>> {
    return normalizePage(await request(withQuery('/api/admin/coupons/', params)), normalizeCoupon);
  },
  async adminSaveCoupon(coupon: Partial<CouponSummary>): Promise<CouponSummary> {
    const path = coupon.id ? `/api/admin/coupons/${encodeId(coupon.id)}/` : '/api/admin/coupons/';
    return normalizeCoupon(await request(path, { method: coupon.id ? 'PUT' : 'POST', ...jsonBody(coupon) }));
  },
  async adminDeleteCoupon(id: string) { return request(`/api/admin/coupons/${encodeId(id)}/`, { method: 'DELETE' }); },

  async adminGetShippingMethods(params?: Record<string, unknown>): Promise<Page<ShippingMethod>> {
    return normalizePage(await request(withQuery('/api/admin/shipping-methods/', params)), normalizeShippingMethod);
  },
  async adminSaveShippingMethod(method: Partial<ShippingMethod>): Promise<ShippingMethod> {
    const path = method.id ? `/api/admin/shipping-methods/${encodeId(method.id)}/` : '/api/admin/shipping-methods/';
    return normalizeShippingMethod(await request(path, { method: method.id ? 'PUT' : 'POST', ...jsonBody(method) }));
  },
  async adminDeleteShippingMethod(id: string) {
    return request(`/api/admin/shipping-methods/${encodeId(id)}/`, { method: 'DELETE' });
  },

  async adminGetPayments(params?: Record<string, unknown>): Promise<Page<Payment>> {
    return normalizePage(await request(withQuery('/api/admin/payments/', params)), normalizePayment);
  },
  async adminUpdatePayment(id: string, changes: Partial<Payment>): Promise<Payment> {
    return normalizePayment(await request(`/api/admin/payments/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },

  async adminGetReviews(params?: Record<string, unknown>): Promise<Page<ProductReview>> {
    return normalizePage(await request(withQuery('/api/admin/reviews/', params)), normalizeReview);
  },
  async adminUpdateReview(id: string, changes: Partial<ProductReview>): Promise<ProductReview> {
    return normalizeReview(await request(`/api/admin/reviews/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },
  async adminDeleteReview(id: string) { return request(`/api/admin/reviews/${encodeId(id)}/`, { method: 'DELETE' }); },

  async adminGetReturns(params?: Record<string, unknown>): Promise<Page<ReturnRequest>> {
    return normalizePage(await request(withQuery('/api/admin/returns/', params)), normalizeReturnRequest);
  },
  async adminUpdateReturn(id: string, changes: Partial<ReturnRequest>): Promise<ReturnRequest> {
    return normalizeReturnRequest(await request(`/api/admin/returns/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },

  async adminGetBespokeRequests(params?: Record<string, unknown>): Promise<Page<BespokeRequest>> {
    return normalizePage(await request(withQuery('/api/admin/bespoke/', params)), normalizeBespokeRequest);
  },
  async adminUpdateBespokeRequest(id: string, changes: Partial<BespokeRequest>): Promise<BespokeRequest> {
    return normalizeBespokeRequest(await request(`/api/admin/bespoke/${encodeId(id)}/`, { method: 'PUT', ...jsonBody(changes) }));
  },
};

export default api;
