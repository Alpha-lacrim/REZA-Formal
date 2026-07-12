import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q
from django.utils import timezone


MONEY_MAX_DIGITS = 12
MONEY_DECIMAL_PLACES = 2


class User(AbstractUser):
    ROLE_CHOICES = (('user', 'User'), ('admin', 'Admin'))

    email = models.EmailField('email address', unique=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default='user')
    two_factor_secret = models.CharField(max_length=64, blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True)
    # Kept for compatibility. New checkout flows should use Address records.
    address = models.TextField(blank=True)

    def is_admin(self):
        return self.role == 'admin' or self.is_staff

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


# Ensure any Django superuser is treated as admin (keeps role/is_staff in sync).
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=User)
def _ensure_superuser_admin(sender, instance, **kwargs):
    try:
        if instance.is_superuser and instance.role != 'admin':
            instance.role = 'admin'
            instance.is_staff = True
            instance.save(update_fields=['role', 'is_staff'])
    except Exception:
        # Don't let signal errors break normal flow; admin sync can be fixed manually.
        pass


class Product(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    short = models.CharField(max_length=512, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=MONEY_MAX_DIGITS, decimal_places=MONEY_DECIMAL_PLACES)
    compare_at_price = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        blank=True,
        null=True,
    )
    currency = models.CharField(max_length=16, default='Toman')
    category = models.CharField(max_length=64, default='suit')
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    images = models.JSONField(default=list, blank=True)
    fabric = models.CharField(max_length=255, blank=True)
    # Kept as the legacy/default-variant stock projection for existing clients.
    stock = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'category'], name='prod_active_cat_idx'),
            models.Index(fields=['featured', 'is_active'], name='prod_featured_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(price__gte=0), name='product_price_nonneg'),
            models.CheckConstraint(
                condition=Q(compare_at_price__isnull=True) | Q(compare_at_price__gte=0),
                name='product_compare_nonneg',
            ),
            models.CheckConstraint(condition=Q(stock__gte=0), name='product_stock_nonneg'),
        ]

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    sku = models.CharField(max_length=96, unique=True)
    size = models.CharField(max_length=64, blank=True)
    color = models.CharField(max_length=64, blank=True)
    price = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        blank=True,
        null=True,
        help_text='Optional override; blank uses the product price.',
    )
    stock = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['product_id', 'size', 'color', 'sku']
        indexes = [
            models.Index(fields=['product', 'is_active'], name='variant_prod_active_idx'),
            models.Index(fields=['sku'], name='variant_sku_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['product', 'size', 'color'], name='uniq_product_size_color'),
            models.CheckConstraint(
                condition=Q(price__isnull=True) | Q(price__gte=0),
                name='variant_price_nonneg',
            ),
            models.CheckConstraint(condition=Q(stock__gte=0), name='variant_stock_nonneg'),
        ]

    @property
    def effective_price(self):
        return self.price if self.price is not None else self.product.price

    def save(self, *args, **kwargs):
        self.sku = self.sku.strip().upper()
        self.size = self.size.strip()
        self.color = self.color.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        options = ' / '.join(value for value in (self.size, self.color) if value)
        return f'{self.product.name} - {options or self.sku}'


class Address(models.Model):
    user = models.ForeignKey(User, related_name='addresses', on_delete=models.CASCADE)
    label = models.CharField(max_length=64, blank=True)
    recipient_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32)
    province = models.CharField(max_length=128)
    city = models.CharField(max_length=128)
    postal_code = models.CharField(max_length=32, blank=True)
    line1 = models.CharField(max_length=512)
    line2 = models.CharField(max_length=512, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-updated_at']
        indexes = [models.Index(fields=['user', 'is_active'], name='addr_user_active_idx')]

    def __str__(self):
        return self.label or f'{self.recipient_name} - {self.city}'


class ShippingMethod(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        default=0,
    )
    free_over = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        blank=True,
        null=True,
    )
    estimated_days_min = models.PositiveSmallIntegerField(default=1)
    estimated_days_max = models.PositiveSmallIntegerField(default=3)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']
        indexes = [models.Index(fields=['is_active', 'sort_order'], name='ship_active_sort_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(price__gte=0), name='shipping_price_nonneg'),
            models.CheckConstraint(
                condition=Q(free_over__isnull=True) | Q(free_over__gte=0),
                name='shipping_free_nonneg',
            ),
            models.CheckConstraint(
                condition=Q(estimated_days_max__gte=models.F('estimated_days_min')),
                name='shipping_days_ordered',
            ),
        ]

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Coupon(models.Model):
    DISCOUNT_TYPES = (('fixed', 'Fixed amount'), ('percent', 'Percentage'))

    code = models.CharField(max_length=64, unique=True)
    discount_type = models.CharField(max_length=16, choices=DISCOUNT_TYPES)
    value = models.DecimalField(max_digits=MONEY_MAX_DIGITS, decimal_places=MONEY_DECIMAL_PLACES)
    max_discount = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        blank=True,
        null=True,
    )
    min_subtotal = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        default=0,
    )
    starts_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)
    max_uses = models.PositiveIntegerField(blank=True, null=True)
    max_uses_per_user = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'starts_at', 'ends_at'], name='coupon_active_dates_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(value__gte=0), name='coupon_value_nonneg'),
            models.CheckConstraint(
                condition=Q(discount_type='fixed') | Q(value__lte=100),
                name='coupon_percent_lte_100',
            ),
            models.CheckConstraint(
                condition=Q(max_discount__isnull=True) | Q(max_discount__gte=0),
                name='coupon_max_nonneg',
            ),
            models.CheckConstraint(condition=Q(min_subtotal__gte=0), name='coupon_min_nonneg'),
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True) | Q(starts_at__isnull=True) | Q(ends_at__gt=models.F('starts_at')),
                name='coupon_dates_ordered',
            ),
        ]

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code


class Order(models.Model):
    STATUS = (
        ('pending', 'pending'),
        ('processing', 'processing'),
        ('shipped', 'shipped'),
        ('delivered', 'delivered'),
        ('cancelled', 'cancelled'),
    )
    PAYMENT_METHODS = (('cod', 'Cash on delivery'), ('online', 'Online'), ('manual', 'Manual'))
    PAYMENT_STATUSES = (
        ('unpaid', 'Unpaid'),
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    id = models.CharField(max_length=32, primary_key=True)
    # Migration 0006 adds this nullable, backfills one UUID per legacy order,
    # then makes it unique/non-null. New rows always receive a UUID.
    idempotency_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey('shop.User', related_name='orders', on_delete=models.SET_NULL, null=True)
    subtotal = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        default=0,
    )
    discount_total = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        default=0,
    )
    shipping_total = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        default=0,
    )
    tax_total = models.DecimalField(
        max_digits=MONEY_MAX_DIGITS,
        decimal_places=MONEY_DECIMAL_PLACES,
        default=0,
    )
    total = models.DecimalField(max_digits=MONEY_MAX_DIGITS, decimal_places=MONEY_DECIMAL_PLACES)
    currency = models.CharField(max_length=16, default='Toman')
    status = models.CharField(max_length=16, choices=STATUS, default='pending')
    payment_method = models.CharField(max_length=16, choices=PAYMENT_METHODS, default='cod')
    payment_status = models.CharField(max_length=16, choices=PAYMENT_STATUSES, default='unpaid')
    coupon = models.ForeignKey(Coupon, related_name='orders', on_delete=models.SET_NULL, blank=True, null=True)
    shipping_method = models.ForeignKey(
        ShippingMethod,
        related_name='orders',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    address = models.ForeignKey(
        Address,
        related_name='orders',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    # Existing clients still read/write the flat shipping_address field.
    shipping_address = models.TextField(blank=True)
    address_snapshot = models.JSONField(default=dict, blank=True)
    shipping_method_snapshot = models.JSONField(default=dict, blank=True)
    coupon_snapshot = models.JSONField(default=dict, blank=True)
    recipient_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    province = models.CharField(max_length=128, blank=True)
    city = models.CharField(max_length=128, blank=True)
    postal_code = models.CharField(max_length=32, blank=True)
    customer_note = models.TextField(blank=True)
    admin_note = models.TextField(blank=True)
    tracking_code = models.CharField(max_length=128, blank=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at'], name='order_user_created_idx'),
            models.Index(fields=['status', 'created_at'], name='order_status_created_idx'),
            models.Index(fields=['payment_status', 'created_at'], name='order_payment_created_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(subtotal__gte=0), name='order_subtotal_nonneg'),
            models.CheckConstraint(condition=Q(discount_total__gte=0), name='order_discount_nonneg'),
            models.CheckConstraint(condition=Q(shipping_total__gte=0), name='order_shipping_nonneg'),
            models.CheckConstraint(condition=Q(tax_total__gte=0), name='order_tax_nonneg'),
            models.CheckConstraint(condition=Q(total__gte=0), name='order_total_nonneg'),
        ]

    def __str__(self):
        return self.id


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    variant = models.ForeignKey(
        ProductVariant,
        related_name='order_items',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    qty = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=MONEY_MAX_DIGITS, decimal_places=MONEY_DECIMAL_PLACES)
    product_id_snapshot = models.CharField(max_length=64, blank=True)
    product_name = models.CharField(max_length=255, blank=True)
    product_image = models.CharField(max_length=1024, blank=True)
    sku = models.CharField(max_length=96, blank=True)
    size = models.CharField(max_length=64, blank=True)
    color = models.CharField(max_length=64, blank=True)
    currency = models.CharField(max_length=16, default='Toman')

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(qty__gte=1), name='order_item_qty_positive'),
            models.CheckConstraint(condition=Q(price__gte=0), name='order_item_price_nonneg'),
        ]

    def __str__(self):
        return f'{self.order_id}: {self.product_name or self.product_id_snapshot} x {self.qty}'


class CouponRedemption(models.Model):
    coupon = models.ForeignKey(Coupon, related_name='redemptions', on_delete=models.PROTECT)
    user = models.ForeignKey(User, related_name='coupon_redemptions', on_delete=models.PROTECT)
    order = models.OneToOneField(Order, related_name='coupon_redemption', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=MONEY_MAX_DIGITS, decimal_places=MONEY_DECIMAL_PLACES)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [models.Index(fields=['coupon', 'user'], name='coupon_redeem_user_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gte=0), name='coupon_redeem_nonneg'),
        ]


class Payment(models.Model):
    METHODS = Order.PAYMENT_METHODS
    STATUSES = (
        ('initialized', 'Initialized'),
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    )

    order = models.OneToOneField(Order, related_name='payment', on_delete=models.CASCADE)
    method = models.CharField(max_length=16, choices=METHODS, default='cod')
    status = models.CharField(max_length=16, choices=STATUSES, default='initialized')
    amount = models.DecimalField(max_digits=MONEY_MAX_DIGITS, decimal_places=MONEY_DECIMAL_PLACES)
    currency = models.CharField(max_length=16, default='Toman')
    provider = models.CharField(max_length=64, blank=True)
    reference = models.CharField(max_length=255, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    refunded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        indexes = [models.Index(fields=['status', 'created_at'], name='payment_status_date_idx')]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gte=0), name='payment_amount_nonneg'),
        ]

    def __str__(self):
        return f'{self.order_id} - {self.status}'


class InventoryMovement(models.Model):
    REASONS = (
        ('initial', 'Initial'),
        ('sale', 'Sale'),
        ('cancel', 'Cancellation'),
        ('return', 'Return'),
        ('adjustment', 'Adjustment'),
        ('restock', 'Restock'),
    )

    variant = models.ForeignKey(
        ProductVariant,
        related_name='inventory_movements',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    order_item = models.ForeignKey(
        OrderItem,
        related_name='inventory_movements',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    actor = models.ForeignKey(
        User,
        related_name='inventory_movements',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    sku = models.CharField(max_length=96, blank=True)
    delta = models.IntegerField()
    resulting_stock = models.IntegerField()
    reason = models.CharField(max_length=24, choices=REASONS)
    reference = models.CharField(max_length=128, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['variant', 'created_at'], name='inventory_variant_idx'),
            models.Index(fields=['reason', 'created_at'], name='inventory_reason_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(resulting_stock__gte=0), name='inventory_stock_nonneg'),
        ]


class OrderEvent(models.Model):
    order = models.ForeignKey(Order, related_name='events', on_delete=models.CASCADE)
    event_type = models.CharField(max_length=64)
    from_status = models.CharField(max_length=24, blank=True)
    to_status = models.CharField(max_length=24, blank=True)
    actor = models.ForeignKey(
        User,
        related_name='order_events',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['order', 'created_at'], name='order_event_order_idx'),
            models.Index(fields=['event_type', 'created_at'], name='order_event_type_idx'),
        ]


class SavedCartItem(models.Model):
    user = models.ForeignKey(User, related_name='saved_cart_items', on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, related_name='saved_cart_items', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'variant'], name='uniq_cart_user_variant'),
            models.CheckConstraint(condition=Q(quantity__gte=1), name='cart_quantity_positive'),
        ]


class WishlistItem(models.Model):
    user = models.ForeignKey(User, related_name='wishlist_items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='wishlist_items', on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='uniq_wishlist_user_product'),
        ]


class ProductReview(models.Model):
    STATUSES = (('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected'))

    user = models.ForeignKey(User, related_name='product_reviews', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    order_item = models.OneToOneField(
        OrderItem,
        related_name='review',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUSES, default='pending')
    verified_purchase = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['product', 'status', 'created_at'], name='review_product_status_idx')]
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='uniq_review_user_product'),
            models.CheckConstraint(condition=Q(rating__gte=1) & Q(rating__lte=5), name='review_rating_1_5'),
        ]


class ReturnRequest(models.Model):
    STATUSES = (
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('received', 'Received'),
        ('refunded', 'Refunded'),
        ('cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(User, related_name='return_requests', on_delete=models.PROTECT)
    order = models.ForeignKey(Order, related_name='return_requests', on_delete=models.PROTECT)
    order_item = models.ForeignKey(
        OrderItem,
        related_name='return_requests',
        on_delete=models.PROTECT,
        blank=True,
        null=True,
    )
    quantity = models.PositiveIntegerField(default=1)
    reason = models.CharField(max_length=128)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUSES, default='requested')
    resolution_note = models.TextField(blank=True)
    requested_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['status', 'requested_at'], name='return_status_date_idx'),
            models.Index(fields=['user', 'requested_at'], name='return_user_date_idx'),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=1), name='return_quantity_positive'),
        ]


class BespokeRequest(models.Model):
    STATUSES = (
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('quoted', 'Quoted'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(
        User,
        related_name='bespoke_requests',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=32)
    service = models.CharField(max_length=128, blank=True)
    measurements = models.JSONField(default=dict, blank=True)
    details = models.TextField(blank=True)
    preferred_contact = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=16, choices=STATUSES, default='new')
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status', 'created_at'], name='bespoke_status_date_idx')]


class NewsletterSubscription(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    source = models.CharField(max_length=64, blank=True)
    subscribed_at = models.DateTimeField(default=timezone.now)
    unsubscribed_at = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email


class NotificationOutbox(models.Model):
    CHANNELS = (('email', 'Email'), ('sms', 'SMS'))
    STATUSES = (('pending', 'Pending'), ('sending', 'Sending'), ('sent', 'Sent'), ('failed', 'Failed'))

    idempotency_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        User,
        related_name='notifications',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    channel = models.CharField(max_length=16, choices=CHANNELS)
    recipient = models.CharField(max_length=255)
    template = models.CharField(max_length=128)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=16, choices=STATUSES, default='pending')
    attempts = models.PositiveSmallIntegerField(default=0)
    available_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(blank=True, null=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['available_at', 'created_at']
        indexes = [models.Index(fields=['status', 'available_at'], name='outbox_status_ready_idx')]


class ContactMessage(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)


class SiteSettings(models.Model):
    about_title = models.CharField(max_length=255, blank=True)
    about_description = models.TextField(blank=True)
    about_image = models.ImageField(upload_to='site/', blank=True, null=True)
    hero_image = models.ImageField(upload_to='site/', blank=True, null=True)
    suits_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    shirts_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    blazers_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    accessories_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    bespoke_section_image = models.ImageField(upload_to='site/', blank=True, null=True)

    def __str__(self):
        return 'Site Settings'
