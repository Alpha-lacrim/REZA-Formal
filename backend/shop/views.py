from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from collections.abc import Mapping
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from .models import (
    ContactMessage,
    Order,
    Product,
    ProductVariant,
    SiteSettings,
)
from .serializers import (
    ContactMessageSerializer,
    PublicProductReadSerializer,
    ProductCardSerializer,
    AdminProductReadSerializer,
    AdminProductWriteSerializer,
    ProductVariantInputSerializer,
    RegisterSerializer,
    LoginSerializer,
    ProfileWriteSerializer,
    AccountReadSerializer,
    SiteSettingsSerializer,
)
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
import uuid
import base64
from django.conf import settings
from django.middleware.csrf import get_token
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Case, Count, DecimalField, F, Q, Sum, Value, When
from django.db.models.fields.json import KeyTextTransform
from django.db.models.functions import Cast, Coalesce
from django.utils.dateparse import parse_date
from .throttles import ContactRateThrottle, LoginRateThrottle, LoginAccountRateThrottle, RegisterRateThrottle, RefreshRateThrottle
from .auth import enforce_csrf
from .sessions import new_session, revoke_cookies, revoke_token, rotate_session
from .commerce_services import CommerceError
from .product_services import save_product
from .selectors import product_reads, order_reads
from .pagination import page_response
from .product_media import MAX_GALLERY_IMAGES, MAX_UPLOAD_BYTES
import json
import logging
import time
from decimal import Decimal

User = get_user_model()
logger = logging.getLogger(__name__)




def get_tokens_for_user(user):
    return new_session(user)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def csrf_token(request):
    """Issue the CSRF cookie/token used by authenticated browser mutations."""
    return Response({'csrfToken': get_token(request)})


def _set_auth_cookies(response, tokens):
    cookie_options = {
        'httponly': True,
        'secure': settings.AUTH_COOKIE_SECURE,
        'path': '/',
    }
    response.set_cookie(
        'access',
        str(tokens['access']),
        max_age=max(0, tokens['access']['exp'] - int(time.time())),
        samesite=settings.AUTH_COOKIE_SAMESITE,
        **cookie_options,
    )
    response.set_cookie(
        'refresh',
        str(tokens['refresh']),
        max_age=max(0, tokens['refresh']['exp'] - int(time.time())),
        samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
        **cookie_options,
    )


def _clear_auth_cookies(response):
    response.set_cookie(
        'access',
        '', max_age=0, expires='Thu, 01 Jan 1970 00:00:00 GMT',
        httponly=True, secure=settings.AUTH_COOKIE_SECURE,
        path='/',
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.set_cookie(
        'refresh',
        '', max_age=0, expires='Thu, 01 Jan 1970 00:00:00 GMT',
        httponly=True, secure=settings.AUTH_COOKIE_SECURE,
        path='/',
        samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
    )


def _new_username(email):
    base = email.split('@', 1)[0][:120] or 'user'
    return f'{base}_{uuid.uuid4().hex[:8]}'


def serialize_user(user):
    return AccountReadSerializer(user).data




def _dataurl_to_content_file(dataurl: str, prefix: str = 'uploads/') -> ContentFile:
    """
    Decode an image data URL into a serializer-compatible ContentFile.
    """
    try:
        header, encoded = dataurl.split(',', 1)
        import base64
        import uuid
        data = base64.b64decode(encoded, validate=True)
        # guess extension from header
        if 'image/png' in header:
            ext = '.png'
        elif 'image/jpeg' in header or 'image/jpg' in header:
            ext = '.jpg'
        elif 'image/gif' in header:
            ext = '.gif'
        elif 'image/webp' in header:
            ext = '.webp'
        else:
            # fallback to png
            ext = '.png'
        name = f"{prefix.rstrip('/')}_{uuid.uuid4().hex}{ext}"
        return ContentFile(data, name=name)
    except Exception as exc:
        raise ValueError('Invalid image data URL') from exc

def prepare_product_data(request):
    """Normalize multipart values without writing any file before validation."""
    if not isinstance(request.data, Mapping):
        raise ValidationError({'non_field_errors': ['Expected an object.']})
    data = request.data.dict() if hasattr(request.data, 'dict') else request.data.copy()
    for client_name, model_name in (('active', 'is_active'), ('compareAtPrice', 'compare_at_price')):
        if client_name in data and model_name not in data:
            data[model_name] = data.pop(client_name)
    if request.FILES:
        uploaded = [file for key in request.FILES for file in request.FILES.getlist(key)]
        if len(uploaded) > MAX_GALLERY_IMAGES or len(request.FILES.getlist('image')) > 1:
            raise ValidationError({'images': 'At most 12 images and one primary image are allowed.'})
        if sum(file.size for file in uploaded) > MAX_UPLOAD_BYTES:
            raise ValidationError({'images': 'Combined image uploads must be at most 40 MiB.'})
        files = [file for key in ('images', 'images[]') for file in request.FILES.getlist(key)]
        if files:
            data['gallery_files'] = files
            # request.data.dict() can return the last file for this key.
            text_values = [value for value in request.data.getlist('images') if isinstance(value, str)]
            if text_values:
                data['images'] = text_values[-1]
            else:
                data.pop('images', None)
        data.pop('images[]', None)
    if data.get('image') == '':
        data['image'] = None
    if data.get('compare_at_price') == '':
        data['compare_at_price'] = None
    return data


def _extract_variants(data):
    """Remove and validate an optional embedded variant array from product data."""
    raw = data.pop('variants', None)
    if raw in (None, ''):
        return None, None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, ValueError):
            return None, {'variants': ['Expected a JSON array.']}
    if not isinstance(raw, list):
        return None, {'variants': ['Expected an array.']}
    for item in raw:
        if isinstance(item, dict) and 'active' in item and 'is_active' not in item:
            item['is_active'] = item.pop('active')
    serializer = ProductVariantInputSerializer(data=raw, many=True)
    if not serializer.is_valid():
        return None, {'variants': serializer.errors}
    if not serializer.validated_data:
        return None, None
    return serializer.validated_data, None


# ==============================================================================
# VIEWS
# ==============================================================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    enforce_csrf(request)
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    email = data['email'].strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        return Response({'detail':'Email already exists'}, status=400)
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=_new_username(email),
                email=email,
                password=data['password'],
                first_name=data.get('first_name', ''),
            )
    except IntegrityError:
        if User.objects.filter(email__iexact=email).exists():
            return Response({'detail': 'Email already exists'}, status=400)
        return Response({'detail': 'Unable to create account; please retry'}, status=409)
    revoke_cookies(request.COOKIES)
    tokens = get_tokens_for_user(user)
    response = Response(
        {'detail': 'registered', 'user': serialize_user(user)},
        status=status.HTTP_201_CREATED,
    )
    _set_auth_cookies(response, tokens)
    return response

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle, LoginAccountRateThrottle])
def login(request):
    enforce_csrf(request)
    if isinstance(request.data, Mapping) and (not request.data.get('email') or not request.data.get('password')):
        return Response({'detail': 'Email and password are required'}, status=400)
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    email, password = serializer.validated_data['email'], serializer.validated_data['password']
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Match Django's unknown-user password hashing cost without logging input.
        User().set_password(password)
        return Response({'detail':'Invalid credentials'}, status=400)
    except User.MultipleObjectsReturned:
        logger.error('Multiple users share the same normalized email')
        return Response({'detail': 'Account data conflict; contact support'}, status=409)
    user_auth = authenticate(request, username=user.username, password=password)
    if not user_auth:
        return Response({'detail':'Invalid credentials'}, status=400)
    if user.two_factor_secret:
        # Enrollment, replay protection and recovery were never implemented.
        # Fail closed for legacy MFA-marked accounts instead of bypassing MFA.
        return Response({'detail': 'This sign-in method is unavailable.', 'code': 'feature_unavailable'}, status=503)
@throttle_classes([RefreshRateThrottle])
    revoke_cookies(request.COOKIES)
    tokens = get_tokens_for_user(user)
    resp = Response({'user': serialize_user(user)})
    _set_auth_cookies(resp, tokens)
    return resp

@api_view(['GET'])
def me(request):
    if not request.user or not request.user.is_authenticated:
        return Response({'detail': 'Not authenticated'}, status=401)
    user = request.user
    return Response(serialize_user(user))

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def logout_view(request):
    enforce_csrf(request)
    revoke_cookies(request.COOKIES)
    if request.user.is_authenticated and request.auth:
        revoke_token(request.auth)
    resp = Response({'detail': 'logged out'})
    _clear_auth_cookies(resp)
    return resp


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def refresh_auth(request):
    enforce_csrf(request)
    raw_refresh = request.COOKIES.get('refresh')
    if not raw_refresh:
        response = Response({'detail': 'Refresh token required'}, status=401)
        _clear_auth_cookies(response)
        return response

    try:
        tokens = rotate_session(raw_refresh)
    except TokenError:
        response = Response({'detail': 'Invalid or expired refresh token'}, status=401)
        _clear_auth_cookies(response)
        return response

    response = Response({'detail': 'refreshed'})
    _set_auth_cookies(response, tokens)
    return response

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_profile(request):
    serializer = ProfileWriteSerializer(request.user, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response({'detail': 'Validation failed.', 'code': 'validation_error', 'errors': serializer.errors}, status=400)
    return Response(serialize_user(serializer.save()))

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_auth(request):
    enforce_csrf(request)
    return Response({'detail': 'Google sign-in is unavailable.', 'code': 'feature_unavailable'}, status=501)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def send_otp(request):
    enforce_csrf(request)
    # Never return a second-factor code to the same unauthenticated client.
    # A real implementation must deliver a short-lived code through a separately
    # verified channel (or use an authenticator-app enrollment flow).
    return Response({'detail': 'OTP delivery is not configured'}, status=501)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def products_list(request):
    qs = product_reads().filter(is_active=True)
    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(short__icontains=search) | Q(category__icontains=search))
    for field in ('category', 'fabric'):
        value = request.query_params.get(field)
        if value:
            qs = qs.filter(**{field: value})
    ids = request.query_params.get('ids')
    if ids:
        values = ids.split(',')
        if len(values) > 100:
            raise ValidationError({'ids': 'At most 100 product IDs are allowed.'})
        qs = qs.filter(pk__in=values)
    for parameter, lookup in [('price_min', 'price__gte'), ('price_max', 'price__lte')]:
        value = request.query_params.get(parameter)
        if value:
            try:
                price = Decimal(value)
                if not price.is_finite() or price < 0 or price > Decimal('9999999999.99'):
                    raise ValueError
            except (ValueError, ArithmeticError):
                raise ValidationError({parameter: 'Supply a nonnegative finite price.'})
            qs = qs.filter(**{lookup: price})
    orderings = {'default': 'id', 'price-asc': 'price', 'price-desc': '-price', 'name-asc': 'name'}
    ordering = request.query_params.get('ordering', 'default')
    if ordering not in orderings:
        raise ValidationError({'ordering': 'Invalid product ordering.'})
    return page_response(request, qs.order_by(orderings[ordering]), ProductCardSerializer)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def product_facets(request):
    qs = Product.objects.filter(is_active=True)
    category = request.query_params.get('category')
    if category:
        qs = qs.filter(category=category)
    # Facets are bounded independently of catalog size.
    return Response({'fabrics': list(qs.exclude(fabric='').order_by('fabric').values_list('fabric', flat=True).distinct()[:100])})

@api_view(['GET','POST','PUT','DELETE'])
@permission_classes([permissions.AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def product_detail(request, pk=None):
    if request.method == 'GET':
        prod = get_object_or_404(
            product_reads(),
            pk=pk,
            is_active=True,
        )
        return Response(PublicProductReadSerializer(prod, context={'request': request}).data)
    
    if not request.user.is_authenticated or not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)

    if request.method == 'POST' or request.method == 'PUT':
        data = prepare_product_data(request)
        variants, variant_errors = _extract_variants(data)
        if variant_errors:
            return Response(variant_errors, status=400)

        if request.method == 'POST':
             data['id'] = data.get('id') or f'prod-{uuid.uuid4().hex}'
             serializer = AdminProductWriteSerializer(data=data)
        else: # PUT
             prod = get_object_or_404(Product, pk=pk)
             serializer = AdminProductWriteSerializer(prod, data=data, partial=True)

        if serializer.is_valid():
            try:
                serializer.instance = save_product(
                    serializer.instance, serializer.validated_data, variants, request.user,
                    expected_version=serializer.initial_data.get('inventory_version'),
                )
            except CommerceError as exc:
                return Response({'detail': exc.detail, 'code': exc.code}, status=exc.status_code)
            except DjangoValidationError as exc:
                return Response({'variants': exc.messages}, status=400)
            except IntegrityError:
                return Response({'detail': 'Product conflicts with existing data.', 'code': 'product_conflict'}, status=409)
            response_status = status.HTTP_201_CREATED if request.method == 'POST' else status.HTTP_200_OK
            return Response(
                AdminProductReadSerializer(product_reads().get(pk=serializer.instance.pk), context={'request': request}).data,
                status=response_status,
            )
        
        logger.warning('Product detail error: %s', serializer.errors)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        prod = get_object_or_404(Product, pk=pk)
        prod.delete()
        return Response(status=204)

@api_view(['GET','PUT'])
@permission_classes([permissions.AllowAny])
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

    # Convert data URLs to uploaded files and process explicit clear flags.
    image_fields = ['about_image', 'hero_image', 'suits_section_image', 'shirts_section_image', 'blazers_section_image', 'accessories_section_image', 'bespoke_section_image']
    for f in image_fields:
        clear_value = str(data.pop(f'clear_{f}', '')).strip().lower()
        if clear_value in {'1', 'true', 'yes', 'on'}:
            data[f] = None

    for f in image_fields:
        val = data.get(f)
        if isinstance(val, str) and val.startswith('data:image/'):
            try:
                data[f] = _dataurl_to_content_file(val, prefix=f)
            except ValueError:
                return Response({f: ['Invalid image data URL']}, status=400)

    old_files = {
        f: getattr(settings, f, None)
        for f in image_fields
    } if settings else {}

    serializer = SiteSettingsSerializer(settings, data=data, partial=True)
    if serializer.is_valid():
        instance = serializer.save()
        remaining_names = {
            getattr(instance, f).name
            for f in image_fields
            if getattr(instance, f, None)
        }
        for old_file in old_files.values():
            if old_file and old_file.name not in remaining_names:
                try:
                    old_file.delete(save=False)
                except Exception:
                    logger.warning('Could not delete replaced site image %s', old_file.name)
        return Response(SiteSettingsSerializer(instance, context={'request': request}).data)
    return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([ContactRateThrottle])
def contact(request):
    enforce_csrf(request)
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
    from .models import BespokeRequest, Payment, ProductReview, ReturnRequest

    money_field = DecimalField(max_digits=18, decimal_places=2)
    payments = Payment.objects.filter(status__in=['paid', 'partially_refunded']).annotate(
        refunded=Coalesce(Cast(KeyTextTransform('refunded_amount', 'metadata'), money_field),
                          Value(Decimal('0.00')), output_field=money_field),
    )
    revenue = payments.aggregate(total=Sum(Case(
        When(amount__gt=F('refunded'), then=F('amount') - F('refunded')),
        default=Value(Decimal('0.00')), output_field=money_field,
    )))['total'] or Decimal('0.00')
    order_counts = orders.aggregate(total=Count('pk'), pending=Count('pk', filter=Q(status='pending')))
    messages_count = ContactMessage.objects.filter(read=False).count()
    return Response({
        'productsCount': products_count,
        'ordersCount': order_counts['total'],
        'usersCount': users_count,
        'revenue': revenue,
        'messagesCount': messages_count,
        'pendingOrdersCount': order_counts['pending'],
        'lowStockCount': ProductVariant.objects.filter(is_active=True, stock__lte=5).count(),
        'pendingReviewsCount': ProductReview.objects.filter(status='pending').count(),
        'pendingReturnsCount': ReturnRequest.objects.filter(status='requested').count(),
        'pendingBespokeCount': BespokeRequest.objects.filter(status='new').count(),
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_orders(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    from .commerce_serializers import OrderSerializer as CommerceOrderSerializer

    qs = order_reads().order_by('-created_at')
    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(Q(id__icontains=search) | Q(shipping_address__icontains=search)
                       | Q(recipient_name__icontains=search) | Q(user__first_name__icontains=search)
                       | Q(user__last_name__icontains=search) | Q(user__username__icontains=search))
    order_status = request.query_params.get('status')
    if order_status and order_status != 'all':
        if order_status not in dict(Order.STATUS):
            raise ValidationError({'status': 'Invalid order status.'})
        qs = qs.filter(status=order_status)
    for param, lookup in [('date_start', 'created_at__date__gte'), ('date_end', 'created_at__date__lte')]:
        value = request.query_params.get(param)
        if value:
            try:
                date = parse_date(value)
            except ValueError:
                date = None
            if date is None:
                raise ValidationError({param: 'Use YYYY-MM-DD.'})
            qs = qs.filter(**{lookup: date})
    return page_response(request, qs, CommerceOrderSerializer)

@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def admin_update_order_status(request, pk):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    from .commerce_serializers import OrderSerializer as CommerceOrderSerializer
    from .commerce_services import CommerceError, update_staff_order

    status_val = request.data.get('status')
    tracking_supplied = 'tracking_code' in request.data or 'trackingCode' in request.data
    note_supplied = 'admin_note' in request.data or 'adminNote' in request.data
    if status_val is None and not tracking_supplied and not note_supplied:
        return Response({'detail': 'No order changes were supplied.', 'code': 'empty_update'}, status=400)
    if status_val is not None and status_val not in dict(Order.STATUS):
        return Response({'detail': 'Invalid order status.', 'code': 'invalid_status'}, status=400)
    details = {}
    if tracking_supplied:
        tracking_code = request.data.get('tracking_code', request.data.get('trackingCode', ''))
        if not isinstance(tracking_code, str):
            return Response({'tracking_code': ['Expected a string.']}, status=400)
        tracking_code = tracking_code.strip()
        if len(tracking_code) > 128:
            return Response({'tracking_code': ['Must contain at most 128 characters.']}, status=400)
        details['tracking_code'] = tracking_code
    if note_supplied:
        admin_note = request.data.get('admin_note', request.data.get('adminNote', ''))
        if not isinstance(admin_note, str):
            return Response({'admin_note': ['Expected a string.']}, status=400)
        admin_note = admin_note.strip()
        if len(admin_note) > 5000:
            return Response({'admin_note': ['Must contain at most 5000 characters.']}, status=400)
        details['admin_note'] = admin_note
    try:
        order = update_staff_order(pk, status_val, request.user, details)
    except CommerceError as exc:
        return Response({'detail': exc.detail, 'code': exc.code}, status=exc.status_code)
    return Response(CommerceOrderSerializer(order, context={'request': request}).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_users(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    return page_response(request, User.objects.order_by('id'), AccountReadSerializer)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_messages(request):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)
    msgs = ContactMessage.objects.all().order_by('-created_at')
    search = request.query_params.get('search', '').strip()
    if search:
        msgs = msgs.filter(Q(name__icontains=search) | Q(email__icontains=search) | Q(message__icontains=search))
    return page_response(request, msgs, ContactMessageSerializer)

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
        qs = product_reads()
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(category__icontains=search))
        orderings = {'default': 'id', 'price-asc': 'price', 'price-desc': '-price',
                     'stock-asc': 'stock', 'stock-desc': '-stock', 'name-asc': 'name'}
        ordering = request.query_params.get('ordering', 'default')
        if ordering not in orderings:
            raise ValidationError({'ordering': 'Invalid product ordering.'})
        return page_response(request, qs.order_by(orderings[ordering]), AdminProductReadSerializer)

    # POST (Create)
    # Normalize the request; validation and the transaction own all storage writes.
    data = prepare_product_data(request)
    variants, variant_errors = _extract_variants(data)
    if variant_errors:
        return Response(variant_errors, status=400)

    data['id'] = data.get('id') or f'prod-{uuid.uuid4().hex}'
    
    serializer = AdminProductWriteSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        try:
            serializer.instance = save_product(
                serializer.instance, serializer.validated_data, variants, request.user,
                expected_version=serializer.initial_data.get('inventory_version'),
            )
        except CommerceError as exc:
            return Response({'detail': exc.detail, 'code': exc.code}, status=exc.status_code)
        except DjangoValidationError as exc:
            return Response({'variants': exc.messages}, status=400)
        except IntegrityError:
            return Response({'detail': 'Product conflicts with existing data.', 'code': 'product_conflict'}, status=409)
        return Response(
            AdminProductReadSerializer(product_reads().get(pk=serializer.instance.pk), context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )
    
    logger.warning('Product admin create error: %s', serializer.errors)
    return Response(serializer.errors, status=400)

@api_view(['GET','PUT','DELETE'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_detail(request, pk=None):
    if not request.user.is_admin():
        return Response({'detail':'admin required'}, status=403)

    if request.method == 'GET':
        prod = get_object_or_404(product_reads(), pk=pk)
        return Response(AdminProductReadSerializer(prod, context={'request': request}).data)

    if request.method == 'PUT':
        try:
            prod = Product.objects.get(pk=pk)
            # Prepare data (leaves 'image' as File)
            data = prepare_product_data(request)
            variants, variant_errors = _extract_variants(data)
            if variant_errors:
                return Response(variant_errors, status=400)
            
            serializer = AdminProductWriteSerializer(prod, data=data, partial=True, context={'request': request})
            if serializer.is_valid():
                try:
                    serializer.instance = save_product(
                        serializer.instance, serializer.validated_data, variants, request.user,
                        expected_version=serializer.initial_data.get('inventory_version'),
                    )
                except CommerceError as exc:
                    return Response({'detail': exc.detail, 'code': exc.code}, status=exc.status_code)
                except DjangoValidationError as exc:
                    return Response({'variants': exc.messages}, status=400)
                except IntegrityError:
                    return Response({'detail': 'Product conflicts with existing data.', 'code': 'product_conflict'}, status=409)
                return Response(AdminProductReadSerializer(product_reads().get(pk=serializer.instance.pk), context={'request': request}).data)
            
            logger.warning('Product admin update error: %s', serializer.errors)
            return Response(serializer.errors, status=400)
            
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=404)

    if request.method == 'DELETE':
        prod = get_object_or_404(Product, pk=pk)
        prod.delete()
        return Response({'detail':'deleted'})
