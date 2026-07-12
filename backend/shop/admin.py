from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    Address,
    BespokeRequest,
    ContactMessage,
    Coupon,
    CouponRedemption,
    InventoryMovement,
    NewsletterSubscription,
    NotificationOutbox,
    Order,
    OrderEvent,
    OrderItem,
    Payment,
    Product,
    ProductReview,
    ProductVariant,
    ReturnRequest,
    SavedCartItem,
    ShippingMethod,
    SiteSettings,
    User,
    WishlistItem,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ('username', 'email', 'phone', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'phone', 'first_name', 'last_name')
    ordering = ('email',)
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Commerce profile', {'fields': ('role', 'phone', 'address')}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ('Commerce profile', {'fields': ('email', 'phone', 'role')}),
    )


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    fields = ('sku', 'size', 'color', 'price', 'stock', 'is_active')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'compare_at_price', 'stock', 'category', 'is_active', 'featured')
    list_filter = ('is_active', 'featured', 'category')
    search_fields = ('id', 'name', 'category', 'fabric', 'variants__sku')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('sku', 'product', 'size', 'color', 'price', 'stock', 'is_active', 'updated_at')
    list_filter = ('is_active', 'size', 'color')
    search_fields = ('sku', 'product__id', 'product__name', 'size', 'color')
    list_select_related = ('product',)
    readonly_fields = ('created_at', 'updated_at')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    fields = ('product_name', 'sku', 'size', 'color', 'qty', 'price', 'currency')
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    max_num = 1
    can_delete = False
    fields = ('method', 'status', 'amount', 'currency', 'provider', 'reference', 'paid_at', 'refunded_at')
    readonly_fields = ('amount', 'currency', 'provider', 'reference', 'paid_at', 'refunded_at')

    def has_add_permission(self, request, obj=None):
        return False


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    can_delete = False
    fields = ('created_at', 'event_type', 'from_status', 'to_status', 'actor')
    readonly_fields = fields
    ordering = ('created_at',)

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total', 'currency', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'payment_method', 'currency', 'created_at')
    search_fields = ('id', 'user__email', 'recipient_name', 'phone', 'tracking_code')
    list_select_related = ('user', 'coupon', 'shipping_method')
    readonly_fields = (
        'id',
        'idempotency_key',
        'user',
        'status',
        'payment_method',
        'payment_status',
        'subtotal',
        'discount_total',
        'shipping_total',
        'tax_total',
        'total',
        'currency',
        'coupon',
        'shipping_method',
        'address',
        'shipping_address',
        'address_snapshot',
        'shipping_method_snapshot',
        'coupon_snapshot',
        'created_at',
        'updated_at',
        'cancelled_at',
        'shipped_at',
        'delivered_at',
    )
    inlines = [OrderItemInline, PaymentInline, OrderEventInline]
    date_hierarchy = 'created_at'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'method', 'status', 'amount', 'currency', 'provider', 'reference', 'updated_at')
    list_filter = ('method', 'status', 'provider', 'currency')
    search_fields = ('order__id', 'order__user__email', 'reference')
    list_select_related = ('order',)
    readonly_fields = ('order', 'amount', 'currency', 'provider', 'reference', 'metadata', 'created_at', 'updated_at')

    def has_add_permission(self, request):
        return False


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('recipient_name', 'user', 'phone', 'province', 'city', 'is_default', 'is_active')
    list_filter = ('province', 'city', 'is_default', 'is_active')
    search_fields = ('user__email', 'recipient_name', 'phone', 'postal_code', 'line1')
    list_select_related = ('user',)


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'price', 'free_over', 'estimated_days_min', 'estimated_days_max', 'is_active')
    list_editable = ('price', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'name')


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'value', 'min_subtotal', 'starts_at', 'ends_at', 'is_active')
    list_filter = ('discount_type', 'is_active')
    search_fields = ('code',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CouponRedemption)
class CouponRedemptionAdmin(admin.ModelAdmin):
    list_display = ('coupon', 'user', 'order', 'amount', 'created_at')
    search_fields = ('coupon__code', 'user__email', 'order__id')
    list_select_related = ('coupon', 'user', 'order')
    readonly_fields = ('coupon', 'user', 'order', 'amount', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'sku', 'delta', 'resulting_stock', 'reason', 'reference', 'actor')
    list_filter = ('reason', 'created_at')
    search_fields = ('sku', 'reference', 'order_item__order__id')
    list_select_related = ('variant', 'order_item', 'actor')
    readonly_fields = (
        'variant', 'order_item', 'actor', 'sku', 'delta', 'resulting_stock',
        'reason', 'reference', 'note', 'created_at',
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OrderEvent)
class OrderEventAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'order', 'event_type', 'from_status', 'to_status', 'actor')
    list_filter = ('event_type', 'created_at')
    search_fields = ('order__id', 'actor__email')
    list_select_related = ('order', 'actor')
    readonly_fields = ('order', 'event_type', 'from_status', 'to_status', 'actor', 'data', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SavedCartItem)
class SavedCartItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'variant', 'quantity', 'updated_at')
    search_fields = ('user__email', 'variant__sku', 'variant__product__name')
    list_select_related = ('user', 'variant', 'variant__product')


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'created_at')
    search_fields = ('user__email', 'product__id', 'product__name')
    list_select_related = ('user', 'product')


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'status', 'verified_purchase', 'created_at')
    list_filter = ('status', 'rating', 'verified_purchase')
    list_editable = ('status',)
    search_fields = ('product__name', 'user__email', 'title', 'body')
    list_select_related = ('product', 'user', 'order_item')
    readonly_fields = ('verified_purchase', 'created_at', 'updated_at')


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'user', 'quantity', 'reason', 'status', 'requested_at')
    list_filter = ('status', 'requested_at')
    search_fields = ('order__id', 'user__email', 'reason', 'details')
    list_select_related = ('order', 'user', 'order_item')
    readonly_fields = ('user', 'order', 'order_item', 'quantity', 'reason', 'details', 'requested_at', 'updated_at')


@admin.register(BespokeRequest)
class BespokeRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'service', 'status', 'created_at')
    list_filter = ('status', 'service', 'created_at')
    list_editable = ('status',)
    search_fields = ('name', 'email', 'phone', 'details')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(NewsletterSubscription)
class NewsletterSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('email', 'is_active', 'source', 'subscribed_at', 'unsubscribed_at')
    list_filter = ('is_active', 'source')
    search_fields = ('email',)


@admin.register(NotificationOutbox)
class NotificationOutboxAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'channel', 'recipient', 'template', 'status', 'attempts', 'available_at')
    list_filter = ('channel', 'status')
    search_fields = ('recipient', 'template')
    readonly_fields = (
        'idempotency_key', 'user', 'channel', 'recipient', 'template', 'payload',
        'attempts', 'sent_at', 'last_error', 'created_at', 'updated_at',
    )

    def has_add_permission(self, request):
        return False


@admin.register(ContactMessage)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'read', 'created_at')
    list_filter = ('read', 'created_at')
    search_fields = ('name', 'email', 'message')


@admin.register(SiteSettings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ('id',)
