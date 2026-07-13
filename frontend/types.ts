export type CurrencyCode = 'Toman' | 'IRR' | (string & {});

export interface ProductVariant {
  id: string;
  productId?: string;
  sku: string;
  name?: string;
  size?: string;
  color?: string;
  attributes: Record<string, string>;
  price: number;
  priceOverride?: number | null;
  compareAtPrice?: number;
  currency: CurrencyCode;
  stock: number;
  active: boolean;
  image?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Product {
  id: string;
  name: string;
  name_fa?: string;
  price: number;
  compareAtPrice?: number;
  currency: CurrencyCode;
  image: string;
  images: string[];
  short: string;
  short_fa?: string;
  description: string;
  description_fa?: string;
  category: string;
  fabric?: string;
  stock?: number;
  variants?: ProductVariant[];
  rating?: number;
  reviewCount?: number;
  active?: boolean;
  featured?: boolean;
}

/** Legacy UI cart shape. New commerce code should use CartLine/CartState. */
export interface CartItem extends Product {
  qty: number;
}

export interface CartLine {
  id?: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
  unitPrice?: number;
  lineTotal?: number;
}

export interface CartState {
  id?: string;
  lines: CartLine[];
  currency: CurrencyCode;
  subtotal?: number;
  updatedAt?: number;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  createdAt: number;
  lastLogin?: number;
  avatar?: string;
  provider?: 'local' | 'google';
}

export interface Address {
  id?: string;
  label?: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
  isDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: CurrencyCode;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  active: boolean;
  freeAbove?: number;
}

export type CouponType = 'fixed' | 'percent';

export interface CouponSummary {
  id?: string;
  code: string;
  type: CouponType;
  value: number;
  discountAmount: number;
  description?: string;
  active?: boolean;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  startsAt?: number;
  expiresAt?: number;
  usageLimit?: number;
  usageCount?: number;
}

export type PaymentMethod = 'cod' | 'online' | 'bank_transfer' | (string & {});
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded';

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: CurrencyCode;
  provider?: string;
  authority?: string;
  transactionId?: string;
  redirectUrl?: string;
  failureReason?: string;
  paidAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface CheckoutLineInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CheckoutOptions {
  shippingMethods: ShippingMethod[];
  paymentMethods: PaymentMethod[];
  defaultShippingMethodId?: string;
  defaultPaymentMethod?: PaymentMethod;
  capabilities: CommerceCapabilities;
}

export interface CheckoutQuote {
  id?: string;
  lines: OrderLineSnapshot[];
  currency: CurrencyCode;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  coupon?: CouponSummary;
  shippingMethod?: ShippingMethod;
  availableShippingMethods?: ShippingMethod[];
  availablePaymentMethods?: PaymentMethod[];
  expiresAt?: number;
}

export interface CheckoutRequest {
  items: CheckoutLineInput[];
  idempotencyKey?: string;
  shippingAddress?: Address;
  addressId?: string;
  shippingMethodId?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  customerNote?: string;
  quoteId?: string;
}

export interface CheckoutResult {
  order: Order;
  payment?: Payment;
  redirectUrl?: string;
  requiresRedirect?: boolean;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderLineSnapshot {
  id?: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  name: string;
  short?: string;
  image?: string;
  size?: string;
  color?: string;
  attributes?: Record<string, string>;
  qty: number;
  price: number;
  total: number;
  currency: CurrencyCode;
}

export interface CustomerSnapshot {
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface OrderEvent {
  id?: string;
  type: string;
  status?: OrderStatus;
  message?: string;
  createdAt: number;
  actorName?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderLineSnapshot[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  currency: CurrencyCode;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  payment?: Payment;
  createdAt: number;
  updatedAt?: number;
  shippingAddress: string;
  shippingAddressSnapshot?: Address;
  shippingMethod?: ShippingMethod;
  customer?: CustomerSnapshot;
  customerNote?: string;
  coupon?: CouponSummary;
  trackingCode?: string;
  trackingUrl?: string;
  allowedTransitions?: OrderStatus[];
  events?: OrderEvent[];
}

export interface ProductReview {
  id: string;
  productId: string;
  userId?: string;
  userName: string;
  rating: number;
  title?: string;
  body: string;
  verifiedPurchase?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  updatedAt?: number;
}

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'cancelled';

export interface ReturnRequest {
  id: string;
  orderId: string;
  itemIds?: string[];
  reason: string;
  details?: string;
  status: ReturnStatus;
  refundAmount?: number;
  createdAt: number;
  updatedAt?: number;
  adminNote?: string;
}

export type BespokeRequestStatus = 'new' | 'contacted' | 'quoted' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface BespokeRequest {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  preferredDate?: string;
  garmentType: string;
  description?: string;
  status?: BespokeRequestStatus;
  createdAt?: number;
  updatedAt?: number;
}

export interface NewsletterSubscription {
  id?: string;
  email: string;
  active?: boolean;
  subscribedAt?: number;
}

export interface Page<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface AdminStats {
  productsCount: number;
  ordersCount: number;
  usersCount: number;
  revenue: number;
  messagesCount: number;
  pendingOrdersCount?: number;
  lowStockCount?: number;
  pendingReviewsCount?: number;
  pendingReturnsCount?: number;
  pendingBespokeCount?: number;
}

export interface CommerceCapabilities {
  onlinePayments: boolean;
  cashOnDelivery: boolean;
  coupons: boolean;
  reviews: boolean;
  returns: boolean;
  wishlist: boolean;
  savedCart: boolean;
  bespokeRequests: boolean;
  newsletter: boolean;
}

export interface AdminCapabilities extends CommerceCapabilities {
  paymentProviders: string[];
  canManageUsers: boolean;
  canManageInventory: boolean;
  canManagePromotions: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
  read?: boolean;
}

export interface SiteSettings {
  aboutTitle: string;
  aboutDescription: string;
  aboutImage: string;
  heroImage: string;
  suitsSectionImage: string;
  shirtsSectionImage: string;
  blazersSectionImage: string;
  accessoriesSectionImage: string;
  bespokeSectionImage: string;
}
