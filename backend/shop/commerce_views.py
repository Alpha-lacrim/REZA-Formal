import math
import uuid
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from .commerce_serializers import (
    AddressSerializer,
    BespokeAdminUpdateSerializer,
    BespokeRequestSerializer,
    CheckoutRequestSerializer,
    CouponSerializer,
    NewsletterSerializer,
    OrderSerializer,
    PaymentSerializer,
    PaymentUpdateSerializer,
    ProductReviewSerializer,
    ProductSummarySerializer,
    ProductVariantSerializer,
    ReturnAdminUpdateSerializer,
    ReturnCreateSerializer,
    ReturnRequestSerializer,
    ReviewAdminUpdateSerializer,
    ReviewCreateSerializer,
    SavedCartInputSerializer,
    ShippingMethodSerializer,
)
from .commerce_services import (
    CommerceError,
    calculate_quote,
    cancel_customer_order,
    commerce_capabilities,
    create_checkout_order,
    get_order_for_user,
    money,
    quote_payload,
    resolve_lines,
    transition_payment,
    transition_return,
)
from .auth import enforce_csrf
from .models import (
    Address,
    BespokeRequest,
    Coupon,
    NewsletterSubscription,
    NotificationOutbox,
    Order,
    OrderEvent,
    OrderItem,
    Payment,
    Product,
    ProductReview,
    ReturnRequest,
    SavedCartItem,
    ShippingMethod,
    WishlistItem,
)
from .throttles import CheckoutQuoteRateThrottle, CheckoutRateThrottle, NewsletterRateThrottle


def _commerce_error(exc):
    return Response({'detail': exc.detail, 'code': exc.code}, status=exc.status_code)


def _validation_error(serializer):
    return Response({'detail': 'Validation failed.', 'code': 'validation_error', 'errors': serializer.errors}, status=400)


def _admin_error(request):
    if not request.user.is_admin():
        return Response({'detail': 'Administrator access is required.', 'code': 'admin_required'}, status=403)
    return None


def _page(request, queryset, serializer_class):
    try:
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = min(max(int(request.query_params.get('page_size', 25)), 1), 100)
    except (TypeError, ValueError):
        page, page_size = 1, 25
    count = queryset.count()
    total_pages = max(math.ceil(count / page_size), 1)
    start = (page - 1) * page_size
    results = serializer_class(queryset[start:start + page_size], many=True, context={'request': request}).data
    return Response({
        'results': results,
        'count': count,
        'next': None,
        'previous': None,
        'page': page,
        'page_size': page_size,
        'total_pages': total_pages,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def checkout_options(request):
    methods = ShippingMethod.objects.filter(is_active=True).order_by('sort_order', 'name')
    default = methods.first()
    return Response({
        'shipping_methods': ShippingMethodSerializer(methods, many=True).data,
        'payment_methods': ['cod', 'manual'],
        'default_shipping_method_id': str(default.pk) if default else None,
        'default_payment_method': 'cod',
        'capabilities': commerce_capabilities(),
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([CheckoutQuoteRateThrottle])
def checkout_quote(request):
    serializer = CheckoutRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        quote = calculate_quote(request.user, serializer.validated_data)
    except CommerceError as exc:
        return _commerce_error(exc)
    payload = quote_payload(quote)
    payload['available_shipping_methods'] = ShippingMethodSerializer(
        ShippingMethod.objects.filter(is_active=True).order_by('sort_order', 'name'), many=True,
    ).data
    return Response(payload)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([CheckoutRateThrottle])
def create_order(request):
    serializer = CheckoutRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        order, created = create_checkout_order(request.user, serializer.validated_data)
    except CommerceError as exc:
        return _commerce_error(exc)
    payload = {
        'order': OrderSerializer(order, context={'request': request}).data,
        'payment': PaymentSerializer(order.payment).data if hasattr(order, 'payment') else None,
        'requires_redirect': False,
    }
    return Response(payload, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_detail(request, pk):
    try:
        order = get_order_for_user(pk, request.user)
    except CommerceError as exc:
        return _commerce_error(exc)
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_orders(request):
    queryset = Order.objects.filter(user=request.user).select_related(
        'user', 'shipping_method', 'coupon', 'payment',
    ).prefetch_related('items__variant', 'events__actor').order_by('-created_at')
    return _page(request, queryset, OrderSerializer)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, pk):
    try:
        order = cancel_customer_order(pk, request.user)
    except CommerceError as exc:
        return _commerce_error(exc)
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def addresses(request):
    if request.method == 'GET':
        queryset = Address.objects.filter(user=request.user, is_active=True).order_by('-is_default', '-updated_at')
        return Response(AddressSerializer(queryset, many=True).data)

    serializer = AddressSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    with transaction.atomic():
        request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
        if serializer.validated_data.get('is_default'):
            Address.objects.select_for_update().filter(user=request.user).update(is_default=False)
        address = serializer.save(user=request.user)
        if not Address.objects.filter(user=request.user, is_default=True, is_active=True).exists():
            address.is_default = True
            address.save(update_fields=['is_default', 'updated_at'])
    return Response(AddressSerializer(address).data, status=201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def address_detail(request, pk):
    address = get_object_or_404(Address, pk=pk, user=request.user, is_active=True)
    if request.method == 'GET':
        return Response(AddressSerializer(address).data)
    if request.method == 'DELETE':
        with transaction.atomic():
            request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            address = Address.objects.select_for_update().get(pk=address.pk)
            was_default = address.is_default
            address.is_active = False
            address.is_default = False
            address.save(update_fields=['is_active', 'is_default', 'updated_at'])
            if was_default:
                replacement = Address.objects.filter(user=request.user, is_active=True).order_by('-updated_at').first()
                if replacement:
                    replacement.is_default = True
                    replacement.save(update_fields=['is_default', 'updated_at'])
        return Response(status=204)

    serializer = AddressSerializer(address, data=request.data, partial=True)
    if not serializer.is_valid():
        return _validation_error(serializer)
    with transaction.atomic():
        request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
        if serializer.validated_data.get('is_default'):
            Address.objects.select_for_update().filter(user=request.user).exclude(pk=address.pk).update(is_default=False)
        address = serializer.save()
    return Response(AddressSerializer(address).data)


def _cart_payload(user, request):
    items = SavedCartItem.objects.filter(user=user).select_related('variant__product').order_by('created_at')
    lines = []
    subtotal = Decimal('0.00')
    for item in items:
        variant = item.variant
        product = variant.product
        unit_price = money(variant.effective_price)
        line_total = money(unit_price * item.quantity)
        subtotal += line_total
        lines.append({
            'id': item.pk,
            'product_id': product.pk,
            'variant_id': variant.pk,
            'quantity': item.quantity,
            'product': ProductSummarySerializer(product, context={'request': request}).data,
            'variant': ProductVariantSerializer(variant).data,
            'unit_price': unit_price,
            'line_total': line_total,
        })
    return {'lines': lines, 'currency': 'Toman', 'subtotal': money(subtotal)}


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def saved_cart(request):
    if request.method == 'GET':
        return Response(_cart_payload(request.user, request))
    if request.method == 'DELETE':
        SavedCartItem.objects.filter(user=request.user).delete()
        return Response({'lines': [], 'currency': 'Toman', 'subtotal': '0.00'})

    serializer = SavedCartInputSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        lines = resolve_lines(serializer.validated_data['lines']) if serializer.validated_data['lines'] else []
    except CommerceError as exc:
        return _commerce_error(exc)
    with transaction.atomic():
        request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
        SavedCartItem.objects.select_for_update().filter(user=request.user).delete()
        SavedCartItem.objects.bulk_create([
            SavedCartItem(user=request.user, variant=line.variant, quantity=line.quantity)
            for line in lines
        ])
    return Response(_cart_payload(request.user, request))


def _wishlist_payload(user, request):
    products = Product.objects.filter(
        wishlist_items__user=user, is_active=True,
    ).prefetch_related('variants').order_by('wishlist_items__created_at')
    return {'products': ProductSummarySerializer(products, many=True, context={'request': request}).data}


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def wishlist(request):
    return Response(_wishlist_payload(request.user, request))


@api_view(['POST', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def wishlist_item(request, product_id):
    product = get_object_or_404(Product, pk=product_id, is_active=True)
    if request.method == 'POST':
        WishlistItem.objects.get_or_create(user=request.user, product=product)
    else:
        WishlistItem.objects.filter(user=request.user, product=product).delete()
    return Response(_wishlist_payload(request.user, request))


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def product_reviews(request, product_id):
    product = get_object_or_404(Product, pk=product_id, is_active=True)
    if request.method == 'GET':
        queryset = ProductReview.objects.filter(product=product, status='approved').select_related('user')
        return _page(request, queryset, ProductReviewSerializer)
    if not request.user.is_authenticated:
        return Response({'detail': 'Authentication is required.', 'code': 'authentication_required'}, status=401)

    serializer = ReviewCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    order_item = OrderItem.objects.filter(
        order__user=request.user,
        order__status='delivered',
        product=product,
        review__isnull=True,
    ).select_related('order').order_by('-order__delivered_at').first()
    if not order_item:
        return Response({
            'detail': 'Only customers with a delivered purchase can review this product.',
            'code': 'verified_purchase_required',
        }, status=403)
    try:
        review = ProductReview.objects.create(
            user=request.user,
            product=product,
            order_item=order_item,
            verified_purchase=True,
            **serializer.validated_data,
        )
    except IntegrityError:
        return Response({'detail': 'You have already reviewed this product.', 'code': 'review_exists'}, status=409)
    return Response(ProductReviewSerializer(review).data, status=201)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def returns(request):
    if request.method == 'GET':
        queryset = ReturnRequest.objects.filter(user=request.user).select_related('order', 'order_item')
        return _page(request, queryset, ReturnRequestSerializer)

    serializer = ReturnCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    data = serializer.validated_data
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(pk=data['order_id'], user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.', 'code': 'order_not_found'}, status=404)
        if order.status != 'delivered':
            return Response({'detail': 'Only delivered orders can be returned.', 'code': 'order_not_delivered'}, status=409)
        item_ids = list(dict.fromkeys(data['item_ids']))
        items = list(OrderItem.objects.select_for_update().filter(pk__in=item_ids, order=order))
        if len(items) != len(item_ids):
            return Response({'detail': 'Order item not found.', 'code': 'order_item_not_found'}, status=404)

        pending_creates = []
        for item in items:
            already_requested = ReturnRequest.objects.filter(order_item=item).exclude(
                status__in=['rejected', 'cancelled'],
            ).aggregate(total=Sum('quantity'))['total'] or 0
            remaining = item.qty - already_requested
            quantity = data.get('quantity', remaining) if len(items) == 1 else remaining
            if remaining < 1 or quantity > remaining:
                return Response({
                    'detail': 'Return quantity exceeds the remaining returnable quantity.',
                    'code': 'return_quantity_invalid',
                }, status=409)
            pending_creates.append((item, quantity))

        created_returns = [
            ReturnRequest.objects.create(
                user=request.user,
                order=order,
                order_item=item,
                quantity=quantity,
                reason=data['reason'],
                details=data.get('details', ''),
            )
            for item, quantity in pending_creates
        ]
        return_ids = [item.pk for item in created_returns]
        OrderEvent.objects.create(
            order=order,
            event_type='return_requested',
            actor=request.user,
            data={'return_ids': return_ids, 'message': 'Return requested'},
        )
        NotificationOutbox.objects.create(
            user=request.user,
            channel='email',
            recipient=request.user.email,
            template='return_requested',
            payload={'order_id': order.pk, 'return_ids': return_ids},
        )
    payload = ReturnRequestSerializer(created_returns[0]).data
    payload['item_ids'] = [str(item.order_item_id) for item in created_returns]
    return Response(payload, status=201)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def bespoke_requests(request):
    enforce_csrf(request)
    serializer = BespokeRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    user = request.user if request.user.is_authenticated else None
    email = serializer.validated_data.get('email') or (user.email if user else '')
    bespoke = serializer.save(user=user, email=email)
    if email:
        NotificationOutbox.objects.create(
            user=user,
            channel='email',
            recipient=email,
            template='bespoke_request_received',
            payload={'request_id': bespoke.pk},
        )
    return Response(BespokeRequestSerializer(bespoke).data, status=201)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([NewsletterRateThrottle])
def newsletter_subscribe(request):
    enforce_csrf(request)
    serializer = NewsletterSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    email = serializer.validated_data['email'].strip().lower()
    subscription, created = NewsletterSubscription.objects.get_or_create(
        email=email,
        defaults={'is_active': True, 'source': 'website'},
    )
    if not created and not subscription.is_active:
        subscription.is_active = True
        subscription.unsubscribed_at = None
        subscription.subscribed_at = timezone.now()
        subscription.save(update_fields=['is_active', 'unsubscribed_at', 'subscribed_at'])
    return Response(NewsletterSerializer(subscription).data, status=201 if created else 200)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_capabilities(request):
    denied = _admin_error(request)
    if denied:
        return denied
    return Response({
        **commerce_capabilities(),
        'payment_providers': [],
        'can_manage_users': True,
        'can_manage_inventory': True,
        'can_manage_promotions': True,
    })


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_coupons(request):
    denied = _admin_error(request)
    if denied:
        return denied
    if request.method == 'GET':
        queryset = Coupon.objects.annotate(usage_count=Count('redemptions')).order_by('-created_at')
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(code__icontains=search)
        return _page(request, queryset, CouponSerializer)
    serializer = CouponSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        coupon = serializer.save()
    except IntegrityError:
        return Response({'detail': 'Coupon code already exists.', 'code': 'coupon_exists'}, status=409)
    return Response(CouponSerializer(coupon).data, status=201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def admin_coupon_detail(request, pk):
    denied = _admin_error(request)
    if denied:
        return denied
    coupon = get_object_or_404(Coupon, pk=pk)
    if request.method == 'GET':
        return Response(CouponSerializer(coupon).data)
    if request.method == 'DELETE':
        try:
            coupon.delete()
        except ProtectedError:
            return Response({'detail': 'Used coupons cannot be deleted; deactivate it instead.', 'code': 'coupon_in_use'}, status=409)
        return Response(status=204)
    serializer = CouponSerializer(coupon, data=request.data, partial=True)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        coupon = serializer.save()
    except IntegrityError:
        return Response({'detail': 'Coupon code already exists.', 'code': 'coupon_exists'}, status=409)
    return Response(CouponSerializer(coupon).data)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_shipping_methods(request):
    denied = _admin_error(request)
    if denied:
        return denied
    if request.method == 'GET':
        return _page(request, ShippingMethod.objects.order_by('sort_order', 'name'), ShippingMethodSerializer)
    payload = request.data.copy()
    if not payload.get('code'):
        generated = slugify(str(payload.get('name') or ''), allow_unicode=True).upper()
        payload['code'] = (generated or f'SHIP-{uuid.uuid4().hex[:12]}')[:64]
    serializer = ShippingMethodSerializer(data=payload)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        method = serializer.save()
    except IntegrityError:
        return Response({'detail': 'Shipping method code already exists.', 'code': 'shipping_code_exists'}, status=409)
    return Response(ShippingMethodSerializer(method).data, status=201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def admin_shipping_method_detail(request, pk):
    denied = _admin_error(request)
    if denied:
        return denied
    method = get_object_or_404(ShippingMethod, pk=pk)
    if request.method == 'GET':
        return Response(ShippingMethodSerializer(method).data)
    if request.method == 'DELETE':
        method.delete()
        return Response(status=204)
    serializer = ShippingMethodSerializer(method, data=request.data, partial=True)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        method = serializer.save()
    except IntegrityError:
        return Response({'detail': 'Shipping method code already exists.', 'code': 'shipping_code_exists'}, status=409)
    return Response(ShippingMethodSerializer(method).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_payments(request):
    denied = _admin_error(request)
    if denied:
        return denied
    queryset = Payment.objects.select_related('order').order_by('-created_at')
    payment_status = request.query_params.get('status')
    if payment_status:
        queryset = queryset.filter(status=payment_status)
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(Q(order__id__icontains=search) | Q(reference__icontains=search))
    return _page(request, queryset, PaymentSerializer)


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def admin_payment_detail(request, pk):
    denied = _admin_error(request)
    if denied:
        return denied
    payment = get_object_or_404(Payment.objects.select_related('order'), pk=pk)
    if request.method == 'GET':
        return Response(PaymentSerializer(payment).data)
    serializer = PaymentUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    try:
        payment = transition_payment(pk, serializer.validated_data['status'], request.user)
    except CommerceError as exc:
        return _commerce_error(exc)
    return Response(PaymentSerializer(payment).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_reviews(request):
    denied = _admin_error(request)
    if denied:
        return denied
    queryset = ProductReview.objects.select_related('product', 'user').order_by('-created_at')
    review_status = request.query_params.get('status')
    if review_status:
        queryset = queryset.filter(status=review_status)
    return _page(request, queryset, ProductReviewSerializer)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def admin_review_detail(request, pk):
    denied = _admin_error(request)
    if denied:
        return denied
    review = get_object_or_404(ProductReview.objects.select_related('product', 'user'), pk=pk)
    if request.method == 'GET':
        return Response(ProductReviewSerializer(review).data)
    if request.method == 'DELETE':
        review.delete()
        return Response(status=204)
    serializer = ReviewAdminUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    review.status = serializer.validated_data['status']
    review.save(update_fields=['status', 'updated_at'])
    return Response(ProductReviewSerializer(review).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_returns(request):
    denied = _admin_error(request)
    if denied:
        return denied
    queryset = ReturnRequest.objects.select_related('order', 'order_item', 'user').order_by('-requested_at')
    return_status = request.query_params.get('status')
    if return_status:
        queryset = queryset.filter(status=return_status)
    return _page(request, queryset, ReturnRequestSerializer)


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def admin_return_detail(request, pk):
    denied = _admin_error(request)
    if denied:
        return denied
    return_request = get_object_or_404(
        ReturnRequest.objects.select_related('order', 'order_item', 'user'), pk=pk,
    )
    if request.method == 'GET':
        return Response(ReturnRequestSerializer(return_request).data)
    serializer = ReturnAdminUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    new_status = serializer.validated_data.get('status')
    admin_note = serializer.validated_data.get('admin_note')
    if new_status:
        if new_status == return_request.status:
            return Response({
                'detail': f'Return is already {new_status}.',
                'code': 'invalid_return_transition',
            }, status=409)
        try:
            return_request = transition_return(pk, new_status, request.user, admin_note or '')
        except CommerceError as exc:
            return _commerce_error(exc)
    elif admin_note is not None:
        return_request.resolution_note = admin_note
        return_request.save(update_fields=['resolution_note', 'updated_at'])
    return Response(ReturnRequestSerializer(return_request).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_bespoke_requests(request):
    denied = _admin_error(request)
    if denied:
        return denied
    queryset = BespokeRequest.objects.select_related('user').order_by('-created_at')
    bespoke_status = request.query_params.get('status')
    if bespoke_status:
        queryset = queryset.filter(status=bespoke_status)
    return _page(request, queryset, BespokeRequestSerializer)


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def admin_bespoke_detail(request, pk):
    denied = _admin_error(request)
    if denied:
        return denied
    bespoke = get_object_or_404(BespokeRequest, pk=pk)
    if request.method == 'GET':
        return Response(BespokeRequestSerializer(bespoke).data)
    serializer = BespokeAdminUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return _validation_error(serializer)
    update_fields = ['updated_at']
    if 'status' in serializer.validated_data:
        bespoke.status = serializer.validated_data['status']
        update_fields.append('status')
    if 'admin_note' in serializer.validated_data:
        bespoke.admin_note = serializer.validated_data['admin_note']
        update_fields.append('admin_note')
    bespoke.save(update_fields=update_fields)
    return Response(BespokeRequestSerializer(bespoke).data)
