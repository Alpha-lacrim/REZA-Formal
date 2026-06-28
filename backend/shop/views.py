from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
from django.conf import settings
import jwt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import transaction
import os
import json
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


def serialize_user(user):
    return {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': getattr(user, 'role', 'user'),
        'address': getattr(user, 'address', ''),
    }

# Helper for Gallery Images (JSON List) ONLY
def _save_uploaded_file_get_url(fobj, request=None):
    ext = os.path.splitext(getattr(fobj, 'name', ''))[1] or ''
    name = f"uploads/{uuid.uuid4().hex}{ext}"
    saved_name = default_storage.save(name, ContentFile(fobj.read()))
    try:
        urlpath = default_storage.url(saved_name)
    except Exception:
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        urlpath = media_url.rstrip('/') + '/' + saved_name.lstrip('/')
    try:
        if request is not None:
            return request.build_absolute_uri(urlpath)
    except Exception:
        pass
    return urlpath


def _save_dataurl_to_storage(dataurl: str, prefix: str = 'uploads/') -> str:
    """
    Decode a data URL (base64) and save to default_storage. Returns the URL path.
    """
    try:
        header, encoded = dataurl.split(',', 1)
        import base64
        import uuid
        data = base64.b64decode(encoded)
        # guess extension from header
        if 'image/png' in header:
            ext = '.png'
        elif 'image/jpeg' in header or 'image/jpg' in header:
            ext = '.jpg'
        elif 'image/gif' in header:
            ext = '.gif'
        else:
            # fallback to png
            ext = '.png'
        name = f"{prefix.rstrip('/')}/{uuid.uuid4().hex}{ext}"
        saved = default_storage.save(name, ContentFile(data))
        try:
            return default_storage.url(saved)
        except Exception:
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            return media_url.rstrip('/') + '/' + saved.lstrip('/')
    except Exception:
        return dataurl

def prepare_product_data(request):
    """
    Prepares data for the serializer.
    1. Copies request.data to a mutable dict.
    2. SKIPS manual processing of 'image' (let Serializer handle it).
    3. Manually processes 'images' list (gallery) to URLs for JSONField.
    """
    # Create mutable copy of request data (but preserve file objects separately)
    if hasattr(request.data, 'dict'):
        data = request.data.dict()
    else:
        data = request.data.copy()

    # If an image file was uploaded, preserve the UploadedFile so the
    # serializer's ImageField can validate and save it (preferred flow).
    if request.FILES and 'image' in request.FILES:
        try:
            data['image'] = request.FILES.get('image')
        except Exception:
            pass

    # NOTE: We do NOT process data['image'] here. 
    # We let the File object pass through to the serializer's ImageField.

    # Process 'images' (Gallery) - Assume JSONField of strings
    if request.FILES:
        imgs = []
        for key in ['images', 'images[]']:
            if key in request.FILES:
                for f in request.FILES.getlist(key):
                    try:
                        # Save file and get URL string
                        imgs.append(_save_uploaded_file_get_url(f, request))
                    except Exception:
                        continue
        
        # Merge with existing gallery images
        if imgs:
            try:
                existing = data.get('images') or []
                if isinstance(existing, str):
                    try:
                        existing = json.loads(existing)
                    except Exception:
                        existing = []
                
                if not isinstance(existing, list):
                    existing = []
                    
                data['images'] = existing + imgs
            except Exception:
                data['images'] = imgs
            
        # Fallback: if `image` field was provided as a data-URL (or list with a data-URL),
        # decode it into a ContentFile so the serializer ImageField can accept it.
        try:
            img_field = data.get('image')
            if isinstance(img_field, list) and len(img_field) > 0:
                img_field = img_field[0]

            if isinstance(img_field, str) and img_field.startswith('data:image/'):
                # Decode and wrap as ContentFile with a generated name
                header, encoded = img_field.split(',', 1)
                import base64
                binary = base64.b64decode(encoded)
                # choose extension
                if 'image/png' in header:
                    ext = '.png'
                elif 'image/jpeg' in header or 'image/jpg' in header:
                    ext = '.jpg'
                elif 'image/gif' in header:
                    ext = '.gif'
                else:
                    ext = '.png'
                filename = f"img_{uuid.uuid4().hex}{ext}"
                data['image'] = ContentFile(binary, name=filename)
        except Exception:
            pass
    return data

# ==============================================================================
# VIEWS
# ==============================================================================

@api_view(['POST'])
def register(request):
    data = request.data
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return Response({'detail': 'Email and password are required'}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return Response({'detail':'Email already exists'}, status=400)
    username_base = email.split('@')[0][:140] or f'user_{uuid.uuid4().hex[:8]}'
    username = username_base
    if User.objects.filter(username=username).exists():
        username = f'{username_base[:120]}_{uuid.uuid4().hex[:8]}'
    user = User.objects.create_user(username=username, email=email, password=password)
    user.first_name = data.get('first_name', '')
    user.save()
    return Response({'detail':'registered', 'user': serialize_user(user)})

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
    if user.two_factor_secret:
        if not otp:
            return Response({'detail':'2FA_REQUIRED'}, status=403)
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(otp):
            return Response({'detail':'Invalid 2FA code'}, status=403)
    tokens = get_tokens_for_user(user)
    resp = Response({'user': serialize_user(user)})
    secure_flag = not getattr(settings, 'DEBUG', False)
    resp.set_cookie('access', tokens['access'], httponly=True, samesite='Lax', secure=secure_flag, path='/')
    resp.set_cookie('refresh', tokens['refresh'], httponly=True, samesite='Strict', secure=secure_flag, path='/')
    return resp

@api_view(['GET'])
def me(request):
    if not request.user or not request.user.is_authenticated:
        return Response({'detail': 'Not authenticated'}, status=401)
    user = request.user
    return Response(serialize_user(user))

@api_view(['POST'])
def logout_view(request):
    resp = Response({'detail': 'logged out'})
    resp.delete_cookie('access', path='/', samesite='Lax')
    resp.delete_cookie('refresh', path='/', samesite='Strict')
    return resp

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data
    if 'first_name' in data:
        user.first_name = data.get('first_name')
    if 'last_name' in data:
        user.last_name = data.get('last_name')
    if 'name' in data and 'first_name' not in data:
        user.first_name = data.get('name')
    if 'address' in data:
        user.address = data.get('address') or ''
    user.save()
    return Response(serialize_user(user))

@api_view(['POST'])
def google_auth(request):
    id_token = request.data.get('id_token')
    if not id_token:
        return Response({'detail': 'id_token required'}, status=400)
    try:
        payload = jwt.decode(id_token, options={"verify_signature": False})
        email = payload.get('email')
        name = payload.get('name') or (email.split('@')[0] if email else 'google_user')
    except Exception:
        return Response({'detail': 'Invalid id_token'}, status=400)
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        username = email.split('@')[0] if email else f'google_{uuid.uuid4().hex[:8]}'
        user = User.objects.create_user(username=username, email=email, password=None)
        user.first_name = name
        user.save()
    tokens = get_tokens_for_user(user)
    resp = Response({'user': serialize_user(user)})
    secure_flag = not getattr(settings, 'DEBUG', False)
    resp.set_cookie('access', tokens['access'], httponly=True, samesite='Lax', secure=secure_flag)
    resp.set_cookie('refresh', tokens['refresh'], httponly=True, samesite='Lax', secure=secure_flag)
    return resp

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
    return Response({'otp': totp.now()})

@api_view(['GET'])
def products_list(request):
    qs = Product.objects.all()
    serializer = ProductSerializer(qs, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET','POST','PUT','DELETE'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def product_detail(request, pk=None):
    if request.method == 'GET':
        prod = get_object_or_404(Product, pk=pk)
        return Response(ProductSerializer(prod, context={'request': request}).data)
    
    if not request.user.is_authenticated or not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)

    if request.method == 'POST' or request.method == 'PUT':
        data = prepare_product_data(request)

        if request.method == 'POST':
             data['id'] = data.get('id') or f'prod-{int(timezone.now().timestamp())}'
             serializer = ProductSerializer(data=data)
        else: # PUT
             prod = get_object_or_404(Product, pk=pk)
             serializer = ProductSerializer(prod, data=data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(ProductSerializer(serializer.instance, context={'request': request}).data)
        
        logger.warning('Product detail error: %s', serializer.errors)
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
    shipping_address = serializer.validated_data['shipping_address']
    quantities = {}
    for item in items:
        quantities[item['id']] = quantities.get(item['id'], 0) + item['qty']

    with transaction.atomic():
        products = Product.objects.select_for_update().filter(pk__in=quantities.keys())
        products_by_id = {product.id: product for product in products}
        missing_ids = [product_id for product_id in quantities if product_id not in products_by_id]
        if missing_ids:
            return Response({'detail': f'Product not found: {missing_ids[0]}'}, status=404)

        for product_id, qty in quantities.items():
            product = products_by_id[product_id]
            if product.stock < qty:
                return Response({'detail': f'Insufficient stock for {product.name}'}, status=400)

        total = sum(products_by_id[product_id].price * qty for product_id, qty in quantities.items())
        order_id = 'ORD-' + str(uuid.uuid4())[:8]
        order = Order.objects.create(id=order_id, user=request.user, total=total, shipping_address=shipping_address)

        for product_id, qty in quantities.items():
            product = products_by_id[product_id]
            product.stock -= qty
            product.save(update_fields=['stock'])
            OrderItem.objects.create(order=order, product=product, qty=qty, price=product.price)

    return Response(OrderSerializer(order, context={'request': request}).data, status=201)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_orders(request):
    qs = Order.objects.filter(user=request.user)
    return Response(OrderSerializer(qs, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, pk):
    with transaction.atomic():
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        if order.user_id != request.user.id and not request.user.is_admin():
            return Response({'detail': 'Not allowed'}, status=403)
        if order.status != 'pending':
            return Response({'detail': 'Only pending orders can be cancelled'}, status=400)

        for item in order.items.select_related('product').all():
            if item.product:
                item.product.stock = (item.product.stock or 0) + item.qty
                item.product.save(update_fields=['stock'])

        order.status = 'cancelled'
        order.save(update_fields=['status'])

    return Response(OrderSerializer(order, context={'request': request}).data)

@api_view(['GET','PUT'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def site_settings(request):
    settings = SiteSettings.objects.first()
    if request.method == 'GET':
        if not settings:
            return Response({}, status=200)
        return Response(SiteSettingsSerializer(settings, context={'request': request}).data)
    if not request.user.is_authenticated or not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)

    # Prepare mutable data copy so we can convert data-URLs to stored files
    if hasattr(request.data, 'dict'):
        data = request.data.dict()
    else:
        try:
            data = request.data.copy()
        except Exception:
            data = request.data

    # Convert data-URL strings to stored file URLs for image fields
    image_fields = ['about_image', 'hero_image', 'suits_section_image', 'shirts_section_image', 'blazers_section_image', 'accessories_section_image', 'bespoke_section_image']
    for f in image_fields:
        val = data.get(f)
        if isinstance(val, str) and val.startswith('data:image/'):
            try:
                data[f] = _save_dataurl_to_storage(val, prefix='site')
            except Exception:
                pass

    serializer = SiteSettingsSerializer(settings, data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(SiteSettingsSerializer(serializer.instance, context={'request': request}).data)
    return Response(serializer.errors, status=400)

@api_view(['POST'])
def contact(request):
    serializer = ContactMessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'detail':'sent'})
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_stats(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    products_count = Product.objects.count()
    orders = Order.objects.all()
    users_count = User.objects.count()
    valid_orders = orders.exclude(status='cancelled')
    revenue = sum([float(o.total) for o in valid_orders])
    messages_count = ContactMessage.objects.filter(read=False).count()
    return Response({'productsCount': products_count, 'ordersCount': orders.count(), 'usersCount': users_count, 'revenue': revenue, 'messagesCount': messages_count})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_orders(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    qs = Order.objects.all().order_by('-created_at')
    return Response(OrderSerializer(qs, many=True).data)

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def admin_update_order_status(request, pk):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    order = get_object_or_404(Order, pk=pk)
    status_val = request.data.get('status')
    if status_val not in dict(Order.STATUS):
        return Response({'detail':'invalid status'}, status=400)
    if order.status == 'cancelled' and status_val != 'cancelled':
        return Response({'detail':'cancelled orders cannot be reopened'}, status=400)
    if status_val == 'cancelled' and order.status != 'cancelled':
        for item in order.items.all():
            prod = item.product
            if prod:
                prod.stock = (prod.stock or 0) + item.qty
                prod.save()
    order.status = status_val
    order.save()
    return Response(OrderSerializer(order).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_users(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    users = User.objects.all()
    data = [serialize_user(u) for u in users]
    return Response(data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_messages(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    msgs = ContactMessage.objects.all().order_by('-created_at')
    serializer = ContactMessageSerializer(msgs, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_mark_message_read(request, pk):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    msg = get_object_or_404(ContactMessage, pk=pk)
    msg.read = True
    msg.save()
    return Response({'detail':'marked'})

@api_view(['GET','POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_products(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    
    if request.method == 'GET':
        qs = Product.objects.all()
        return Response(ProductSerializer(qs, many=True, context={'request': request}).data)

    # POST (Create)
    # Debug: log content type and uploaded files briefly to assist debugging client uploads
    try:
        logger.info('admin_products content_type=%s, files=%s', request.META.get('CONTENT_TYPE'), list(request.FILES.keys()))
    except Exception:
        pass
    # 1. Prepare data (this leaves 'image' as a File, but handles 'images' list)
    data = prepare_product_data(request)

    data['id'] = data.get('id') or f'prod-{int(timezone.now().timestamp())}'
    
    # 2. Pass 'image' FILE to serializer. ImageField will handle it.
    serializer = ProductSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(ProductSerializer(serializer.instance, context={'request': request}).data)
    
    logger.warning('Product admin create error: %s', serializer.errors)
    return Response(serializer.errors, status=400)

@api_view(['GET','PUT','DELETE'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_detail(request, pk=None):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)

    if request.method == 'GET':
        prod = get_object_or_404(Product, pk=pk)
        return Response(ProductSerializer(prod, context={'request': request}).data)

    if request.method == 'PUT':
        try:
            prod = Product.objects.get(pk=pk)
            # Prepare data (leaves 'image' as File)
            data = prepare_product_data(request)
            
            serializer = ProductSerializer(prod, data=data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(ProductSerializer(serializer.instance, context={'request': request}).data)
            
            logger.warning('Product admin update error: %s', serializer.errors)
            return Response(serializer.errors, status=400)
            
        except Product.DoesNotExist:
            data = prepare_product_data(request)
            data['id'] = pk
            serializer = ProductSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(ProductSerializer(serializer.instance, context={'request': request}).data, status=201)
            return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        prod = get_object_or_404(Product, pk=pk)
        prod.delete()
        return Response({'detail':'deleted'})
