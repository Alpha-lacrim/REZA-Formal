from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import ContactMessage, Product, ProductVariant, SiteSettings
from .product_services import inventory_version
from .product_media import MAX_GALLERY_IMAGES, ProductGalleryField, ProductImageField


User = get_user_model()


class AccountReadSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    def get_role(self, obj):
        return 'admin' if obj.is_admin() else 'user'

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'phone', 'address',
            'date_joined', 'last_login',
        ]
        read_only_fields = fields


class StrictCharField(serializers.CharField):
    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail('invalid')
        return super().to_internal_value(data)


class ProfileWriteSerializer(serializers.ModelSerializer):
    first_name = StrictCharField(max_length=150, required=False, allow_blank=True)
    last_name = StrictCharField(max_length=150, required=False, allow_blank=True)
    phone = StrictCharField(max_length=32, required=False, allow_blank=True)
    address = StrictCharField(max_length=2000, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'address']

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if 'name' in data and 'first_name' not in data:
                data['first_name'] = data['name']
        return super().to_internal_value(data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = StrictCharField(max_length=1024, trim_whitespace=False)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = StrictCharField(write_only=True, trim_whitespace=False, max_length=1024)
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


class PublicProductReadSerializer(serializers.ModelSerializer):
    images = ProductGalleryField(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    rating = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'short', 'description', 'price', 'compare_at_price',
            'currency', 'category', 'image', 'images', 'fabric', 'stock',
            'is_active', 'featured', 'created_at', 'updated_at',
        ] + ['variants', 'rating', 'review_count']
        read_only_fields = fields

    def get_rating(self, obj):
        return round(float(obj.approved_rating), 1) if obj.approved_rating is not None else None


class ProductCardSerializer(PublicProductReadSerializer):
    """List cards need pricing/options, but never long-form copy or a gallery."""
    images = serializers.SerializerMethodField()

    class Meta(PublicProductReadSerializer.Meta):
        fields = [field for field in PublicProductReadSerializer.Meta.fields if field != 'description']

    def get_images(self, obj):
        return ProductGalleryField().to_representation(obj.images)[:1]


class AdminProductReadSerializer(PublicProductReadSerializer):
    inventory_version = serializers.SerializerMethodField()

    class Meta(PublicProductReadSerializer.Meta):
        fields = PublicProductReadSerializer.Meta.fields + ['inventory_version']
        read_only_fields = fields

    def get_inventory_version(self, obj):
        return inventory_version(obj)


class AdminProductWriteSerializer(serializers.ModelSerializer):
    image = ProductImageField(required=False, allow_null=True)
    images = ProductGalleryField(required=False)
    gallery_files = serializers.ListField(child=ProductImageField(), required=False, write_only=True, max_length=MAX_GALLERY_IMAGES)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0'))
    compare_at_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0'), required=False, allow_null=True)
    stock = serializers.IntegerField(min_value=0)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'short', 'description', 'price', 'compare_at_price',
            'currency', 'category', 'image', 'images', 'fabric', 'stock',
            'is_active', 'featured', 'created_at', 'updated_at',
        ] + ['gallery_files']
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        if self.instance and 'id' in attrs:
            if attrs['id'] != self.instance.pk:
                raise serializers.ValidationError({'id': 'A product ID cannot be changed.'})
            attrs.pop('id')
        gallery = attrs.get('images', self.fields['images'].to_representation(self.instance.images) if self.instance else [])
        if len(gallery) + len(attrs.get('gallery_files', [])) > MAX_GALLERY_IMAGES:
            raise serializers.ValidationError({'images': 'At most 12 gallery images are allowed.'})
        if ('image' in attrs or attrs.get('gallery_files')) and 'images' not in attrs:
            attrs['images'] = self.fields['images'].to_internal_value(gallery)
            gallery = attrs['images']
        if any(key in attrs for key in ('image', 'images', 'gallery_files')):
            primary = attrs.get('image', self.instance.image if self.instance else None)
            # URLs may be absolute API URLs or storage-relative references.
            from urllib.parse import urlsplit
            primary_url = primary.url if primary and hasattr(primary, 'url') else None
            primary_path = urlsplit(primary_url).path if primary_url else None
            gallery_count = len(gallery) + len(attrs.get('gallery_files', []))
            primary_in_gallery = primary_path and any(isinstance(item, str) and urlsplit(item).path == primary_path for item in gallery)
            if gallery_count + int(bool(primary) and not primary_in_gallery) > MAX_GALLERY_IMAGES:
                raise serializers.ValidationError({'images': 'At most 12 images including the primary image are allowed.'})
        return attrs


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'message', 'read', 'created_at']
        read_only_fields = ['id', 'read', 'created_at']


class SiteSettingsSerializer(serializers.ModelSerializer):
    about_image = ProductImageField(required=False, allow_null=True)
    hero_image = ProductImageField(required=False, allow_null=True)
    suits_section_image = ProductImageField(required=False, allow_null=True)
    shirts_section_image = ProductImageField(required=False, allow_null=True)
    blazers_section_image = ProductImageField(required=False, allow_null=True)
    accessories_section_image = ProductImageField(required=False, allow_null=True)
    bespoke_section_image = ProductImageField(required=False, allow_null=True)

    def validate(self, attrs):
        from .product_media import MAX_UPLOAD_BYTES
        if sum(value.size for value in attrs.values() if hasattr(value, 'size')) > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError({'images': 'Combined image uploads must be at most 40 MiB.'})
        return attrs

    class Meta:
        model = SiteSettings
        fields = [
            'id', 'about_title', 'about_description', 'about_image', 'hero_image',
            'suits_section_image', 'shirts_section_image', 'blazers_section_image',
            'accessories_section_image', 'bespoke_section_image',
        ]
        read_only_fields = ['id']
