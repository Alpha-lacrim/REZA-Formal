from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Avg
from rest_framework import serializers

from .models import ContactMessage, Order, OrderItem, Product, ProductVariant, SiteSettings


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'role',
            'phone', 'address', 'date_joined', 'last_login',
        ]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)

    def validate(self, attrs):
        candidate = User(email=attrs['email'], first_name=attrs.get('first_name', ''))
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)}) from exc
        return attrs


class ProductVariantSerializer(serializers.ModelSerializer):
    product_id = serializers.CharField(read_only=True)
    price = serializers.SerializerMethodField()
    price_override = serializers.DecimalField(
        source='price', max_digits=12, decimal_places=2, read_only=True,
    )
    currency = serializers.CharField(source='product.currency', read_only=True)
    attributes = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product_id', 'sku', 'size', 'color', 'price', 'price_override', 'currency',
            'stock', 'is_active', 'attributes', 'created_at', 'updated_at',
        ]

    def get_price(self, obj):
        return obj.effective_price

    def get_attributes(self, obj):
        return {
            key: value
            for key, value in (('size', obj.size), ('color', obj.color))
            if value
        }


class ProductVariantInputSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    sku = serializers.CharField(max_length=96)
    size = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    color = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0'),
        required=False,
        allow_null=True,
    )
    stock = serializers.IntegerField(min_value=0)
    is_active = serializers.BooleanField(required=False, default=True)


class ProductSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0'))
    stock = serializers.IntegerField(min_value=0)
    variants = ProductVariantSerializer(many=True, read_only=True)
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_rating(self, obj):
        value = obj.reviews.filter(status='approved').aggregate(value=Avg('rating'))['value']
        return round(float(value), 1) if value is not None else None

    def get_review_count(self, obj):
        return obj.reviews.filter(status='approved').count()


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    class Meta:
        model = OrderItem
        fields = ['product','qty','price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    class Meta:
        model = Order
        fields = '__all__'


class CreateOrderItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    variant_id = serializers.UUIDField(required=False)
    qty = serializers.IntegerField(min_value=1)


class CreateOrderSerializer(serializers.Serializer):
    items = CreateOrderItemSerializer(many=True, allow_empty=False)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    shipping_address = serializers.CharField(trim_whitespace=True, required=False)


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
        read_only_fields = ['id', 'read', 'created_at']


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = '__all__'
