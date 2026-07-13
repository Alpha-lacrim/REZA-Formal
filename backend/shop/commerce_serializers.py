from decimal import Decimal

from rest_framework import serializers

from .models import (
    Address,
    BespokeRequest,
    Coupon,
    NewsletterSubscription,
    Order,
    OrderEvent,
    OrderItem,
    Payment,
    Product,
    ProductReview,
    ProductVariant,
    ReturnRequest,
    ShippingMethod,
)


class AliasedModelSerializer(serializers.ModelSerializer):
    aliases = {}

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        for alias, canonical in self.aliases.items():
            if alias in data and canonical not in data:
                data[canonical] = data[alias]
        return super().to_internal_value(data)


class AddressSerializer(AliasedModelSerializer):
    address_line = serializers.CharField(source='line1', max_length=512)

    aliases = {
        'recipientName': 'recipient_name',
        'postalCode': 'postal_code',
        'addressLine': 'address_line',
        'isDefault': 'is_default',
    }

    class Meta:
        model = Address
        fields = [
            'id', 'label', 'recipient_name', 'phone', 'province', 'city',
            'postal_code', 'address_line', 'line2', 'is_default', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductVariantSerializer(serializers.ModelSerializer):
    product_id = serializers.CharField(read_only=True)
    price = serializers.SerializerMethodField()
    price_override = serializers.DecimalField(
        source='price', max_digits=12, decimal_places=2, read_only=True,
    )
    currency = serializers.CharField(source='product.currency', read_only=True)
    active = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product_id', 'sku', 'size', 'color', 'price', 'price_override', 'currency',
            'stock', 'active', 'created_at', 'updated_at',
        ]

    def get_price(self, obj):
        return obj.effective_price


class ProductSummarySerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)
    active = serializers.BooleanField(source='is_active', read_only=True)
    compare_at_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'short', 'description', 'price', 'compare_at_price',
            'currency', 'category', 'image', 'images', 'fabric', 'stock',
            'active', 'featured', 'variants',
        ]


class ShippingMethodSerializer(AliasedModelSerializer):
    currency = serializers.SerializerMethodField()
    active = serializers.BooleanField(source='is_active', required=False)
    free_above = serializers.DecimalField(
        source='free_over', max_digits=12, decimal_places=2, required=False, allow_null=True,
    )

    aliases = {
        'freeAbove': 'free_above',
        'free_over': 'free_above',
        'estimatedDaysMin': 'estimated_days_min',
        'estimatedDaysMax': 'estimated_days_max',
        'active': 'is_active',
    }

    class Meta:
        model = ShippingMethod
        fields = [
            'id', 'code', 'name', 'description', 'price', 'currency', 'free_above',
            'estimated_days_min', 'estimated_days_max', 'active', 'sort_order',
        ]

    def get_currency(self, obj):
        return 'Toman'


class CouponSerializer(AliasedModelSerializer):
    type = serializers.ChoiceField(source='discount_type', choices=Coupon.DISCOUNT_TYPES)
    minimum_order_amount = serializers.DecimalField(
        source='min_subtotal', max_digits=12, decimal_places=2, required=False,
    )
    maximum_discount_amount = serializers.DecimalField(
        source='max_discount', max_digits=12, decimal_places=2, required=False, allow_null=True,
    )
    expires_at = serializers.DateTimeField(source='ends_at', required=False, allow_null=True)
    usage_limit = serializers.IntegerField(source='max_uses', required=False, allow_null=True, min_value=1)
    usage_count = serializers.SerializerMethodField()
    active = serializers.BooleanField(source='is_active', required=False)
    discount_amount = serializers.SerializerMethodField()

    aliases = {
        'discount_type': 'type',
        'minimumOrderAmount': 'minimum_order_amount',
        'min_subtotal': 'minimum_order_amount',
        'maximumDiscountAmount': 'maximum_discount_amount',
        'max_discount': 'maximum_discount_amount',
        'expiresAt': 'expires_at',
        'ends_at': 'expires_at',
        'usageLimit': 'usage_limit',
        'max_uses': 'usage_limit',
        'active': 'is_active',
        'startsAt': 'starts_at',
    }

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'type', 'value', 'discount_amount', 'minimum_order_amount',
            'maximum_discount_amount', 'starts_at', 'expires_at', 'usage_limit',
            'max_uses_per_user', 'usage_count', 'active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']

    def get_usage_count(self, obj):
        annotated = getattr(obj, 'usage_count', None)
        return annotated if annotated is not None else obj.redemptions.count()

    def get_discount_amount(self, obj):
        return self.context.get('discount_amount', Decimal('0.00'))


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(read_only=True)
    transaction_id = serializers.CharField(source='reference', read_only=True)
    failure_reason = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'order_id', 'method', 'status', 'amount', 'currency', 'provider',
            'reference', 'transaction_id', 'failure_reason', 'paid_at', 'refunded_at',
            'created_at', 'updated_at',
        ]

    def get_failure_reason(self, obj):
        return obj.metadata.get('failure_reason') if isinstance(obj.metadata, dict) else None

    def get_status(self, obj):
        return 'unpaid' if obj.status == 'initialized' else obj.status


class OrderLineSerializer(serializers.ModelSerializer):
    product_id = serializers.CharField(source='product_id_snapshot', read_only=True)
    variant_id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(source='product_name', read_only=True)
    image = serializers.CharField(source='product_image', read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product_id', 'variant_id', 'sku', 'name', 'image', 'size',
            'color', 'qty', 'price', 'total', 'currency',
        ]

    def get_total(self, obj):
        return obj.price * obj.qty


class OrderEventSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='event_type', read_only=True)
    status = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderEvent
        fields = ['id', 'type', 'status', 'message', 'created_at', 'actor_name']

    def get_status(self, obj):
        return obj.to_status or None

    def get_message(self, obj):
        return obj.data.get('message') if isinstance(obj.data, dict) else None

    def get_actor_name(self, obj):
        if not obj.actor:
            return None
        return obj.actor.get_full_name() or obj.actor.email


class OrderSerializer(serializers.ModelSerializer):
    items = OrderLineSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    shipping_address_snapshot = serializers.SerializerMethodField()
    shipping_method = serializers.SerializerMethodField()
    coupon = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    allowed_transitions = serializers.SerializerMethodField()
    events = OrderEventSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'items', 'subtotal', 'discount_total', 'shipping_total',
            'tax_total', 'total', 'currency', 'status', 'payment_status',
            'payment_method', 'payment', 'created_at', 'updated_at', 'shipping_address',
            'shipping_address_snapshot', 'shipping_method', 'customer', 'customer_note',
            'coupon', 'tracking_code', 'allowed_transitions', 'events',
        ]

    def get_shipping_address_snapshot(self, obj):
        snapshot = dict(obj.address_snapshot or {})
        if snapshot:
            if snapshot.get('line1') and not snapshot.get('address_line'):
                snapshot['address_line'] = snapshot['line1']
            return snapshot
        return {
            'recipient_name': obj.recipient_name,
            'phone': obj.phone,
            'province': obj.province,
            'city': obj.city,
            'postal_code': obj.postal_code,
            'address_line': obj.shipping_address,
        }

    def get_customer(self, obj):
        return {
            'user_id': obj.user_id,
            'name': obj.recipient_name or (obj.user.get_full_name() if obj.user else ''),
            'email': obj.user.email if obj.user else None,
            'phone': obj.phone,
        }

    def get_coupon(self, obj):
        if obj.coupon_snapshot:
            return dict(obj.coupon_snapshot)
        if not obj.coupon:
            return None
        return CouponSerializer(
            obj.coupon,
            context={'discount_amount': obj.discount_total},
        ).data

    def get_shipping_method(self, obj):
        if obj.shipping_method_snapshot:
            snapshot = dict(obj.shipping_method_snapshot)
            return {
                'id': str(snapshot.get('id') or ''),
                'code': snapshot.get('code', ''),
                'name': snapshot.get('name', ''),
                'price': snapshot.get('price', '0.00'),
                'currency': obj.currency,
                'active': True,
            }
        if not obj.shipping_method:
            return None
        return ShippingMethodSerializer(obj.shipping_method).data

    def get_allowed_transitions(self, obj):
        from .commerce_services import ORDER_TRANSITIONS
        return sorted(ORDER_TRANSITIONS.get(obj.status, set()))


class CheckoutItemSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=False)
    product_id = serializers.CharField(required=False, allow_blank=False)
    variant_id = serializers.UUIDField(required=False, allow_null=True)
    qty = serializers.IntegerField(required=False, min_value=1, max_value=100)
    quantity = serializers.IntegerField(required=False, min_value=1, max_value=100)

    def validate(self, attrs):
        product_id = attrs.get('product_id') or attrs.get('id')
        quantity = attrs.get('quantity', attrs.get('qty'))
        if not product_id and not attrs.get('variant_id'):
            raise serializers.ValidationError('product_id or variant_id is required')
        if quantity is None:
            raise serializers.ValidationError('quantity is required')
        return {
            'product_id': product_id,
            'variant_id': attrs.get('variant_id'),
            'quantity': quantity,
        }


class CheckoutRequestSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    idempotency_key = serializers.UUIDField(required=False)
    shipping_address = serializers.JSONField(required=False)
    address_id = serializers.IntegerField(required=False, min_value=1)
    shipping_method_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    payment_method = serializers.ChoiceField(choices=['cod', 'manual', 'online'], default='cod')
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=64)
    customer_note = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    quote_id = serializers.CharField(required=False, allow_blank=True, max_length=128)
    total = serializers.DecimalField(required=False, max_digits=12, decimal_places=2)


class SavedCartLineInputSerializer(CheckoutItemSerializer):
    pass


class SavedCartInputSerializer(serializers.Serializer):
    lines = SavedCartLineInputSerializer(many=True, allow_empty=True)


class ReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(required=False, allow_blank=True, max_length=255)
    body = serializers.CharField(required=False, allow_blank=True, max_length=5000)


class ProductReviewSerializer(serializers.ModelSerializer):
    product_id = serializers.CharField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = [
            'id', 'product_id', 'user_id', 'user_name', 'rating', 'title', 'body',
            'verified_purchase', 'status', 'created_at', 'updated_at',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.first_name or 'Customer'


class ReturnCreateSerializer(serializers.Serializer):
    order_id = serializers.CharField(max_length=32)
    item_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), min_length=1, max_length=50,
    )
    quantity = serializers.IntegerField(required=False, min_value=1)
    reason = serializers.CharField(max_length=128)
    details = serializers.CharField(required=False, allow_blank=True, max_length=5000)


class ReturnRequestSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(read_only=True)
    item_ids = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='requested_at', read_only=True)
    admin_note = serializers.CharField(source='resolution_note', read_only=True)
    refund_amount = serializers.SerializerMethodField()

    class Meta:
        model = ReturnRequest
        fields = [
            'id', 'order_id', 'item_ids', 'quantity', 'reason', 'details', 'status',
            'refund_amount', 'created_at', 'updated_at', 'admin_note',
        ]

    def get_item_ids(self, obj):
        return [str(obj.order_item_id)] if obj.order_item_id else []

    def get_refund_amount(self, obj):
        return obj.order_item.price * obj.quantity if obj.order_item else Decimal('0.00')


class BespokeRequestSerializer(AliasedModelSerializer):
    garment_type = serializers.CharField(source='service', required=False, allow_blank=True, max_length=128)
    description = serializers.CharField(source='details', required=False, allow_blank=True, max_length=5000)
    preferred_date = serializers.SerializerMethodField()

    aliases = {
        'garmentType': 'garment_type',
        'preferredDate': 'preferred_date_input',
        'preferred_date': 'preferred_date_input',
    }

    preferred_date_input = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=64)

    class Meta:
        model = BespokeRequest
        fields = [
            'id', 'name', 'phone', 'email', 'preferred_date', 'preferred_date_input',
            'garment_type', 'description', 'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']
        extra_kwargs = {'email': {'required': False, 'allow_blank': True}}

    def get_preferred_date(self, obj):
        return obj.measurements.get('preferred_date') if isinstance(obj.measurements, dict) else None

    def create(self, validated_data):
        preferred_date = validated_data.pop('preferred_date_input', '')
        validated_data['measurements'] = {'preferred_date': preferred_date} if preferred_date else {}
        return super().create(validated_data)


class NewsletterSerializer(serializers.ModelSerializer):
    active = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = NewsletterSubscription
        fields = ['id', 'email', 'active', 'subscribed_at']
        read_only_fields = ['id', 'active', 'subscribed_at']


class PaymentUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[choice[0] for choice in Payment.STATUSES])


class ReviewAdminUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[choice[0] for choice in ProductReview.STATUSES])


class ReturnAdminUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[choice[0] for choice in ReturnRequest.STATUSES], required=False,
    )
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=5000)
    adminNote = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=5000)

    def validate(self, attrs):
        alias_note = attrs.pop('adminNote', None)
        if alias_note is not None and 'admin_note' not in attrs:
            attrs['admin_note'] = alias_note
        if 'status' not in attrs and 'admin_note' not in attrs:
            raise serializers.ValidationError('status or admin_note is required')
        return attrs


class BespokeAdminUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[choice[0] for choice in BespokeRequest.STATUSES], required=False,
    )
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=5000)
    adminNote = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=5000)

    def validate(self, attrs):
        alias_note = attrs.pop('adminNote', None)
        if alias_note is not None and 'admin_note' not in attrs:
            attrs['admin_note'] = alias_note
        if 'status' not in attrs and 'admin_note' not in attrs:
            raise serializers.ValidationError('status or admin_note is required')
        return attrs
