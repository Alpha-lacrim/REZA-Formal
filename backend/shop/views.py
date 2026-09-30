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
    AdminProductReadSerializer,
    AdminProductWriteSerializer,
    ProductVariantInputSerializer,
    RegisterSerializer,
    ProfileWriteSerializer,
    AccountReadSerializer,
    SiteSettingsSerializer,
)
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
import pyotp
import uuid
from django.conf import settings
from django.middleware.csrf import get_token
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from .throttles import ContactRateThrottle, LoginRateThrottle, RegisterRateThrottle
from .auth import enforce_csrf
from .commerce_services import CommerceError
from .product_services import save_product
from .selectors import product_reads, order_reads
from .pagination import page_response
import json
import logging
from decimal import Decimal

User = get_user_model()
logger = logging.getLogger(__name__)


class InvalidGoogleToken(Exception):
    pass


class GoogleTokenVerificationUnavailable(Exception):
    pass


def _verify_google_token(raw_id_token, client_id):
    try:
        from google.auth.exceptions import GoogleAuthError, TransportError
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError as exc:
        raise GoogleTokenVerificationUnavailable from exc

    try:
        return google_id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            client_id,
        )
    except TransportError as exc:
        raise GoogleTokenVerificationUnavailable from exc
    except (GoogleAuthError, ValueError) as exc:
        raise InvalidGoogleToken from exc

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


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
        tokens['access'],
        samesite=settings.AUTH_COOKIE_SAMESITE,
        **cookie_options,
    )
    response.set_cookie(
        'refresh',
        tokens['refresh'],
        samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
        **cookie_options,
    )


def _clear_auth_cookies(response):
    response.delete_cookie(
        'access',
        path='/',
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        'refresh',
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
    tokens = get_tokens_for_user(user)
    response = Response(
        {'detail': 'registered', 'user': serialize_user(user)},
        status=status.HTTP_201_CREATED,
    )
    _set_auth_cookies(response, tokens)
    return response

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def login(request):
    enforce_csrf(request)
    email = str(request.data.get('email') or '').strip()
    password = request.data.get('password') or ''
    otp = request.data.get('otp')
    if not email or not password:
        return Response({'detail': 'Email and password are required'}, status=400)
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'detail':'Invalid credentials'}, status=400)
    except User.MultipleObjectsReturned:
        logger.error('Multiple users share the same normalized email')
        return Response({'detail': 'Account data conflict; contact support'}, status=409)
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
    resp = Response({'detail': 'logged out'})
    _clear_auth_cookies(resp)
    return resp


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def refresh_auth(request):
    enforce_csrf(request)
    raw_refresh = request.COOKIES.get('refresh')
    if not raw_refresh:
        return Response({'detail': 'Refresh token required'}, status=401)

    try:
        refresh = RefreshToken(raw_refresh)
        access = str(refresh.access_token)
    except TokenError:
        response = Response({'detail': 'Invalid or expired refresh token'}, status=401)
        _clear_auth_cookies(response)
        return response

    response = Response({'detail': 'refreshed'})
    response.set_cookie(
        'access',
        access,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path='/',
    )
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
    raw_id_token = request.data.get('id_token')
    if not raw_id_token:
        return Response({'detail': 'id_token required'}, status=400)

    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        logger.error('Google authentication requested without GOOGLE_OAUTH_CLIENT_ID')
        return Response({'detail': 'Google authentication is not configured'}, status=503)

    try:
        payload = _verify_google_token(raw_id_token, client_id)
    except GoogleTokenVerificationUnavailable:
        logger.warning('Google token verification service is unavailable')
        return Response({'detail': 'Google authentication is temporarily unavailable'}, status=503)
    except InvalidGoogleToken:
        return Response({'detail': 'Invalid id_token'}, status=400)

    email = str(payload.get('email') or '').strip().lower()
    if not email or payload.get('email_verified') is not True or not payload.get('sub'):
        return Response({'detail': 'Google account email is not verified'}, status=400)

    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        name = str(payload.get('name') or email.split('@', 1)[0])[:150]
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=_new_username(email),
                    email=email,
                    password=None,
                    first_name=name,
                )
        except IntegrityError:
            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                return Response({'detail': 'Unable to create account; please retry'}, status=409)
    if not user.is_active:
        return Response({'detail': 'Account is disabled'}, status=403)

    tokens = get_tokens_for_user(user)
    resp = Response({'user': serialize_user(user)})
    _set_auth_cookies(resp, tokens)
    return resp

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
    serializer = PublicProductReadSerializer(qs, many=True, context={'request': request})
    return Response(serializer.data)

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

    revenue = Decimal('0.00')
    for payment in Payment.objects.filter(status__in=['paid', 'partially_refunded']):
        refunded = Decimal(str((payment.metadata or {}).get('refunded_amount', '0')))
        revenue += max(payment.amount - refunded, Decimal('0.00'))
    messages_count = ContactMessage.objects.filter(read=False).count()
    return Response({
        'productsCount': products_count,
        'ordersCount': orders.count(),
        'usersCount': users_count,
        'revenue': revenue,
        'messagesCount': messages_count,
        'pendingOrdersCount': orders.filter(status='pending').count(),
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
        return page_response(request, qs.order_by('id'), AdminProductReadSerializer)

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
