from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from .models import Product, Order, OrderItem, ContactMessage, SiteSettings
from .serializers import ProductSerializer, OrderSerializer, ContactMessageSerializer, SiteSettingsSerializer, CreateOrderSerializer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import pyotp
from django.utils import timezone
import uuid

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


@api_view(['POST'])
def register(request):
    data = request.data
    if User.objects.filter(email=data.get('email')).exists():
        return Response({'detail':'Email already exists'}, status=400)
    user = User.objects.create_user(username=data.get('email').split('@')[0], email=data.get('email'), password=data.get('password'))
    user.first_name = data.get('first_name', '')
    user.save()
    return Response({'detail':'registered'})


@api_view(['POST'])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    otp = request.data.get('otp')
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'detail':'Invalid credentials'}, status=400)
    user_auth = authenticate(request, username=user.username, password=password)
    if not user_auth:
        return Response({'detail':'Invalid credentials'}, status=400)
    # If user has 2FA secret, require otp
    if user.two_factor_secret:
        if not otp:
            return Response({'detail':'2FA_REQUIRED'}, status=403)
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(otp):
            return Response({'detail':'Invalid 2FA code'}, status=403)
    tokens = get_tokens_for_user(user)
    return Response({'tokens': tokens, 'user': {'id': user.id, 'email': user.email, 'first_name': user.first_name}})


@api_view(['POST'])
def send_otp(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'detail':'User not found'}, status=404)
    if not user.two_factor_secret:
        user.two_factor_secret = pyotp.random_base32()
        user.save()
    totp = pyotp.TOTP(user.two_factor_secret)
    # For development return token; in production send by SMS/email
    return Response({'otp': totp.now()})


@api_view(['GET'])
def products_list(request):
    qs = Product.objects.all()
    serializer = ProductSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET','POST','PUT','DELETE'])
def product_detail(request, pk=None):
    if request.method == 'GET':
        prod = get_object_or_404(Product, pk=pk)
        return Response(ProductSerializer(prod).data)
    if not request.user.is_authenticated or not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    if request.method == 'POST' or request.method == 'PUT':
        data = request.data.copy()
        if request.method == 'POST':
            data['id'] = data.get('id') or f'prod-{int(timezone.now().timestamp())}'
        serializer = ProductSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    if request.method == 'DELETE':
        prod = get_object_or_404(Product, pk=pk)
        prod.delete()
        return Response(status=204)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_order(request):
    serializer = CreateOrderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    items = serializer.validated_data['items']
    total = serializer.validated_data['total']
    shipping_address = serializer.validated_data['shipping_address']
    # validate stock and create order
    order_id = 'ORD-' + str(uuid.uuid4())[:8]
    order = Order.objects.create(id=order_id, user=request.user, total=total, shipping_address=shipping_address)
    for it in items:
        prod = get_object_or_404(Product, pk=it['id'])
        if prod.stock < it['qty']:
            return Response({'detail': f'Insufficient stock for {prod.name}'}, status=400)
        prod.stock -= it['qty']
        prod.save()
        OrderItem.objects.create(order=order, product=prod, qty=it['qty'], price=prod.price)
    return Response(OrderSerializer(order).data, status=201)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_orders(request):
    qs = Order.objects.filter(user=request.user)
    return Response(OrderSerializer(qs, many=True).data)


@api_view(['GET','PUT'])
def site_settings(request):
    settings = SiteSettings.objects.first()
    if request.method == 'GET':
        if not settings:
            return Response({}, status=200)
        return Response(SiteSettingsSerializer(settings).data)
    if not request.user.is_authenticated or not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    serializer = SiteSettingsSerializer(settings, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
def contact(request):
    serializer = ContactMessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'detail':'sent'})
    return Response(serializer.errors, status=400)
