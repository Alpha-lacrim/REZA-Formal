from rest_framework import serializers
from .models import Product, Order, OrderItem, ContactMessage, SiteSettings, User
from django.contrib.auth import get_user_model

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id','username','email','first_name','last_name','role','address']


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


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
    qty = serializers.IntegerField(min_value=1)


class CreateOrderSerializer(serializers.Serializer):
    items = CreateOrderItemSerializer(many=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    shipping_address = serializers.CharField(trim_whitespace=True)


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = '__all__'
