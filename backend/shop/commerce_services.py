import uuid
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from .models import (
    Address,
    Coupon,
    CouponRedemption,
    InventoryMovement,
    NotificationOutbox,
    Order,
    OrderEvent,
    OrderItem,
    Payment,
    Product,
    ProductVariant,
    ReturnRequest,
    SavedCartItem,
    ShippingMethod,
)


MONEY_STEP = Decimal('0.01')
ORDER_TRANSITIONS = {
    'pending': {'processing', 'cancelled'},
    'processing': {'shipped', 'cancelled'},
    'shipped': {'delivered'},
    'delivered': set(),
    'cancelled': set(),
}
PAYMENT_TRANSITIONS = {
    'initialized': {'pending', 'paid', 'failed', 'cancelled'},
    'pending': {'paid', 'failed', 'cancelled'},
    'paid': {'partially_refunded', 'refunded'},
    'partially_refunded': {'refunded'},
    'failed': set(),
    'cancelled': set(),
    'refunded': set(),
}
RETURN_TRANSITIONS = {
    'requested': {'approved', 'rejected', 'cancelled'},
    'approved': {'received', 'cancelled'},
    'received': {'refunded'},
    'rejected': set(),
    'refunded': set(),
    'cancelled': set(),
}


class CommerceError(Exception):
    def __init__(self, code, detail, status_code=400):
        self.code = code
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


@dataclass
class ResolvedLine:
    product: Product
    variant: ProductVariant
    quantity: int
    unit_price: Decimal

    @property
    def line_total(self):
        return money(self.unit_price * self.quantity)


def money(value):
    return Decimal(value).quantize(MONEY_STEP, rounding=ROUND_HALF_UP)


def product_image_snapshot(product):
    if product.image:
        try:
            return product.image.url
        except (ValueError, AttributeError):
            return str(product.image)
    if isinstance(product.images, list) and product.images:
        return str(product.images[0])
    return ''


def commerce_capabilities():
    return {
        'online_payments': False,
        'cash_on_delivery': True,
        'coupons': True,
        'reviews': True,
        'returns': True,
        'wishlist': True,
        'saved_cart': True,
        'bespoke_requests': True,
        'newsletter': True,
    }


def _default_variant(product, *, lock=False, create=True):
    queryset = ProductVariant.objects
    if lock:
        queryset = queryset.select_for_update()

    variant = queryset.filter(product=product, size='', color='', is_active=True).first()
    if variant:
        return variant

    active = list(queryset.filter(product=product, is_active=True).order_by('created_at')[:2])
    if len(active) == 1:
        return active[0]
    if len(active) > 1:
        raise CommerceError('variant_required', f'A size or color must be selected for {product.name}.')
    if not create:
        raise CommerceError('variant_unavailable', f'No purchasable variant exists for {product.name}.')

    try:
        with transaction.atomic():
            return ProductVariant.objects.create(
                product=product,
                sku=f'LEGACY-{product.pk}',
                size='',
                color='',
                stock=max(product.stock, 0),
                is_active=product.is_active,
            )
    except IntegrityError:
        return ProductVariant.objects.get(product=product, size='', color='')


def resolve_lines(items, *, lock=False, check_stock=True):
    resolved = {}
    query_items = sorted(
        items,
        key=lambda item: str(item.get('variant_id') or item.get('product_id') or ''),
    )
    for item in query_items:
        variant_id = item.get('variant_id')
        product_id = item.get('product_id')
        quantity = int(item['quantity'])

        if variant_id:
            variant_qs = ProductVariant.objects.select_related('product')
            if lock:
                variant_qs = variant_qs.select_for_update()
            try:
                variant = variant_qs.get(pk=variant_id)
            except ProductVariant.DoesNotExist as exc:
                raise CommerceError('variant_not_found', 'The selected product variant does not exist.', 404) from exc
            product_qs = Product.objects
            if lock:
                product_qs = product_qs.select_for_update()
            product = product_qs.get(pk=variant.product_id)
            if product_id and str(product.pk) != str(product_id):
                raise CommerceError('variant_product_mismatch', 'The variant does not belong to the supplied product.')
        else:
            product_qs = Product.objects
            if lock:
                product_qs = product_qs.select_for_update()
            try:
                product = product_qs.get(pk=product_id)
            except Product.DoesNotExist as exc:
                raise CommerceError('product_not_found', f'Product {product_id} was not found.', 404) from exc
            variant = _default_variant(product, lock=lock)

        if not product.is_active or not variant.is_active:
            raise CommerceError('product_unavailable', f'{product.name} is not available for purchase.', 409)

        key = variant.pk
        if key in resolved:
            resolved[key].quantity += quantity
        else:
            resolved[key] = ResolvedLine(
                product=product,
                variant=variant,
                quantity=quantity,
                unit_price=money(variant.effective_price),
            )

    lines = list(resolved.values())
    for line in lines:
        if line.quantity > 100:
            raise CommerceError('quantity_too_large', 'A maximum of 100 units per item is allowed.')
        if check_stock and line.variant.stock < line.quantity:
            raise CommerceError(
                'insufficient_stock',
                f'Only {line.variant.stock} unit(s) of {line.product.name} are available.',
                409,
            )

    currencies = {line.product.currency for line in lines}
    if len(currencies) != 1:
        raise CommerceError('mixed_currency', 'All checkout items must use the same currency.')
    return lines


def _shipping_for_quote(shipping_method_id, subtotal, *, lock=False):
    queryset = ShippingMethod.objects
    if lock:
        queryset = queryset.select_for_update()
    if not shipping_method_id:
        method = queryset.filter(is_active=True).order_by('sort_order', 'name').first()
        if method is None:
            return None, Decimal('0.00')
        shipping_method_id = method.pk
    try:
        method = queryset.get(pk=shipping_method_id, is_active=True)
    except ShippingMethod.DoesNotExist as exc:
        raise CommerceError('shipping_method_unavailable', 'The selected shipping method is unavailable.', 409) from exc
    shipping_total = method.price
    if method.free_over is not None and subtotal >= method.free_over:
        shipping_total = Decimal('0.00')
    return method, money(shipping_total)


def _coupon_for_quote(code, user, subtotal, *, lock=False):
    if not code:
        return None, Decimal('0.00')
    queryset = Coupon.objects
    if lock:
        queryset = queryset.select_for_update()
    try:
        coupon = queryset.get(code=str(code).strip().upper())
    except Coupon.DoesNotExist as exc:
        raise CommerceError('coupon_invalid', 'The coupon code is invalid.', 400) from exc

    now = timezone.now()
    if not coupon.is_active:
        raise CommerceError('coupon_inactive', 'The coupon is not active.')
    if coupon.starts_at and coupon.starts_at > now:
        raise CommerceError('coupon_not_started', 'The coupon is not active yet.')
    if coupon.ends_at and coupon.ends_at <= now:
        raise CommerceError('coupon_expired', 'The coupon has expired.')
    if subtotal < coupon.min_subtotal:
        raise CommerceError('coupon_minimum_not_met', 'The order subtotal does not meet the coupon minimum.')

    total_uses = CouponRedemption.objects.filter(coupon=coupon).count()
    if coupon.max_uses is not None and total_uses >= coupon.max_uses:
        raise CommerceError('coupon_limit_reached', 'The coupon usage limit has been reached.', 409)
    user_uses = CouponRedemption.objects.filter(coupon=coupon, user=user).count()
    if user_uses >= coupon.max_uses_per_user:
        raise CommerceError('coupon_user_limit_reached', 'You have already used this coupon.', 409)

    if coupon.discount_type == 'percent':
        discount = subtotal * coupon.value / Decimal('100')
    else:
        discount = coupon.value
    if coupon.max_discount is not None:
        discount = min(discount, coupon.max_discount)
    return coupon, money(min(discount, subtotal))


def calculate_quote(user, validated_data, *, lock=False):
    lines = resolve_lines(validated_data['items'], lock=lock)
    subtotal = money(sum((line.line_total for line in lines), Decimal('0.00')))
    coupon, discount_total = _coupon_for_quote(
        validated_data.get('coupon_code'), user, subtotal, lock=lock,
    )
    shipping_method, shipping_total = _shipping_for_quote(
        validated_data.get('shipping_method_id'), subtotal, lock=lock,
    )
    tax_total = Decimal('0.00')
    total = money(max(subtotal - discount_total + shipping_total + tax_total, Decimal('0.00')))
    return {
        'lines': lines,
        'currency': lines[0].product.currency,
        'subtotal': subtotal,
        'discount_total': discount_total,
        'shipping_total': shipping_total,
        'tax_total': tax_total,
        'total': total,
        'coupon': coupon,
        'shipping_method': shipping_method,
    }


def quote_payload(quote):
    from .commerce_serializers import CouponSerializer, ShippingMethodSerializer

    line_payloads = []
    for line in quote['lines']:
        line_payloads.append({
            'product_id': line.product.pk,
            'variant_id': line.variant.pk,
            'sku': line.variant.sku,
            'name': line.product.name,
            'image': product_image_snapshot(line.product),
            'size': line.variant.size,
            'color': line.variant.color,
            'qty': line.quantity,
            'price': line.unit_price,
            'line_total': line.line_total,
            'currency': line.product.currency,
        })
    payload = {
        'lines': line_payloads,
        'currency': quote['currency'],
        'subtotal': quote['subtotal'],
        'discount_total': quote['discount_total'],
        'shipping_total': quote['shipping_total'],
        'tax_total': quote['tax_total'],
        'total': quote['total'],
        'available_payment_methods': ['cod', 'manual'],
    }
    if quote['coupon']:
        payload['coupon'] = CouponSerializer(
            quote['coupon'], context={'discount_amount': quote['discount_total']},
        ).data
    if quote['shipping_method']:
        payload['shipping_method'] = ShippingMethodSerializer(quote['shipping_method']).data
    return payload


def address_snapshot(user, validated_data):
    address_id = validated_data.get('address_id')
    if address_id:
        try:
            address = Address.objects.select_for_update().get(pk=address_id, user=user, is_active=True)
        except Address.DoesNotExist as exc:
            raise CommerceError('address_not_found', 'The selected address does not belong to this account.', 404) from exc
        snapshot = {
            'id': address.pk,
            'label': address.label,
            'recipient_name': address.recipient_name,
            'phone': address.phone,
            'province': address.province,
            'city': address.city,
            'postal_code': address.postal_code,
            'address_line': address.line1,
            'line2': address.line2,
            'is_default': address.is_default,
        }
        return address, snapshot

    raw = validated_data.get('shipping_address')
    if isinstance(raw, str):
        line = raw.strip()
        if not line:
            raise CommerceError('shipping_address_required', 'A shipping address is required.')
        return None, {
            'recipient_name': user.get_full_name() or user.email,
            'phone': user.phone,
            'province': '',
            'city': '',
            'postal_code': '',
            'address_line': line,
            'legacy': True,
        }
    if not isinstance(raw, dict):
        raise CommerceError('shipping_address_required', 'A shipping address or saved address is required.')

    snapshot = {
        'recipient_name': str(raw.get('recipient_name') or raw.get('recipientName') or '').strip(),
        'phone': str(raw.get('phone') or '').strip(),
        'province': str(raw.get('province') or '').strip(),
        'city': str(raw.get('city') or '').strip(),
        'postal_code': str(raw.get('postal_code') or raw.get('postalCode') or '').strip(),
        'address_line': str(
            raw.get('address_line') or raw.get('addressLine') or raw.get('line1') or raw.get('address') or ''
        ).strip(),
        'line2': str(raw.get('line2') or '').strip(),
    }
    required = ['recipient_name', 'phone', 'province', 'city', 'address_line']
    missing = [field for field in required if not snapshot[field]]
    if missing:
        raise CommerceError('shipping_address_incomplete', f'Missing address fields: {", ".join(missing)}.')
    return None, snapshot


def _sync_product_stock(product):
    total = ProductVariant.objects.filter(product=product, is_active=True).aggregate(total=Sum('stock'))['total']
    product.stock = max(total or 0, 0)
    product.save(update_fields=['stock', 'updated_at'])


def _order_queryset():
    return Order.objects.select_related(
        'user', 'address', 'shipping_method', 'coupon', 'payment',
    ).prefetch_related('items__variant', 'events__actor')


def get_order_for_user(order_id, user, *, include_admin=False):
    queryset = _order_queryset()
    if not include_admin or not user.is_admin():
        queryset = queryset.filter(user=user)
    try:
        return queryset.get(pk=order_id)
    except Order.DoesNotExist as exc:
        raise CommerceError('order_not_found', 'Order not found.', 404) from exc


def create_checkout_order(user, validated_data):
    payment_method = validated_data.get('payment_method', 'cod')
    if payment_method == 'online':
        raise CommerceError(
            'online_payment_unavailable',
            'Online payment is not configured. Choose cash on delivery or manual payment.',
            503,
        )
    if payment_method not in {'cod', 'manual'}:
        raise CommerceError('payment_method_invalid', 'The selected payment method is unavailable.')

    requested_key = validated_data.get('idempotency_key') or uuid.uuid4()
    existing = _order_queryset().filter(idempotency_key=requested_key).first()
    if existing:
        if existing.user_id != user.id:
            raise CommerceError('idempotency_key_conflict', 'This idempotency key is already in use.', 409)
        return existing, False

    try:
        with transaction.atomic():
            existing = Order.objects.select_for_update().filter(idempotency_key=requested_key).first()
            if existing:
                if existing.user_id != user.id:
                    raise CommerceError('idempotency_key_conflict', 'This idempotency key is already in use.', 409)
                return get_order_for_user(existing.pk, user), False

            address, snapshot = address_snapshot(user, validated_data)
            quote = calculate_quote(user, validated_data, lock=True)
            order = Order.objects.create(
                id=f'ORD-{uuid.uuid4().hex[:28]}',
                idempotency_key=requested_key,
                user=user,
                subtotal=quote['subtotal'],
                discount_total=quote['discount_total'],
                shipping_total=quote['shipping_total'],
                tax_total=quote['tax_total'],
                total=quote['total'],
                currency=quote['currency'],
                payment_method=payment_method,
                payment_status='pending' if payment_method == 'manual' else 'unpaid',
                coupon=quote['coupon'],
                shipping_method=quote['shipping_method'],
                address=address,
                shipping_address=snapshot['address_line'],
                address_snapshot=snapshot,
                shipping_method_snapshot=(
                    {
                        'id': quote['shipping_method'].pk,
                        'code': quote['shipping_method'].code,
                        'name': quote['shipping_method'].name,
                        'price': str(quote['shipping_total']),
                    }
                    if quote['shipping_method'] else {}
                ),
                coupon_snapshot=(
                    {
                        'id': quote['coupon'].pk,
                        'code': quote['coupon'].code,
                        'type': quote['coupon'].discount_type,
                        'value': str(quote['coupon'].value),
                        'discount_amount': str(quote['discount_total']),
                    }
                    if quote['coupon'] else {}
                ),
                recipient_name=snapshot.get('recipient_name', ''),
                phone=snapshot.get('phone', ''),
                province=snapshot.get('province', ''),
                city=snapshot.get('city', ''),
                postal_code=snapshot.get('postal_code', ''),
                customer_note=validated_data.get('customer_note', ''),
            )

            affected_products = {}
            for line in quote['lines']:
                variant = line.variant
                variant.stock -= line.quantity
                variant.save(update_fields=['stock', 'updated_at'])
                affected_products[line.product.pk] = line.product
                item = OrderItem.objects.create(
                    order=order,
                    product=line.product,
                    variant=variant,
                    qty=line.quantity,
                    price=line.unit_price,
                    product_id_snapshot=str(line.product.pk),
                    product_name=line.product.name,
                    product_image=product_image_snapshot(line.product),
                    sku=variant.sku,
                    size=variant.size,
                    color=variant.color,
                    currency=line.product.currency,
                )
                InventoryMovement.objects.create(
                    variant=variant,
                    order_item=item,
                    actor=user,
                    sku=variant.sku,
                    delta=-line.quantity,
                    resulting_stock=variant.stock,
                    reason='sale',
                    reference=order.pk,
                )
            for product in affected_products.values():
                _sync_product_stock(product)

            if quote['coupon']:
                CouponRedemption.objects.create(
                    coupon=quote['coupon'], user=user, order=order, amount=quote['discount_total'],
                )

            Payment.objects.create(
                order=order,
                method=payment_method,
                status='initialized' if payment_method == 'cod' else 'pending',
                amount=quote['total'],
                currency=quote['currency'],
                provider='offline',
            )
            OrderEvent.objects.create(
                order=order,
                event_type='created',
                to_status='pending',
                actor=user,
                data={'message': 'Order created'},
            )
            NotificationOutbox.objects.create(
                user=user,
                channel='email',
                recipient=user.email,
                template='order_created',
                payload={'order_id': order.pk},
            )
            SavedCartItem.objects.filter(
                user=user,
                variant_id__in=[line.variant.pk for line in quote['lines']],
            ).delete()
    except IntegrityError:
        existing = _order_queryset().filter(idempotency_key=requested_key).first()
        if existing and existing.user_id == user.id:
            return existing, False
        raise

    return get_order_for_user(order.pk, user), True


def _cancel_locked_order(order, actor):
    if order.status == 'cancelled':
        raise CommerceError('order_already_cancelled', 'The order is already cancelled.', 409)

    payment = Payment.objects.select_for_update().filter(order=order).first()
    if payment and payment.status in {'paid', 'partially_refunded'}:
        raise CommerceError(
            'paid_order_requires_refund',
            'A paid order must be refunded through the payment workflow before cancellation.',
            409,
        )

    affected_products = {}
    items = list(
        OrderItem.objects.select_for_update().select_related('variant', 'product').filter(order=order)
    )
    for item in items:
        if item.variant_id:
            variant = ProductVariant.objects.select_for_update().get(pk=item.variant_id)
            product = Product.objects.select_for_update().get(pk=variant.product_id)
            variant.stock += item.qty
            variant.save(update_fields=['stock', 'updated_at'])
            affected_products[product.pk] = product
            resulting_stock = variant.stock
        elif item.product_id:
            product = Product.objects.select_for_update().get(pk=item.product_id)
            product.stock += item.qty
            product.save(update_fields=['stock', 'updated_at'])
            resulting_stock = product.stock
        else:
            continue
        InventoryMovement.objects.create(
            variant_id=item.variant_id,
            order_item=item,
            actor=actor,
            sku=item.sku,
            delta=item.qty,
            resulting_stock=resulting_stock,
            reason='cancel',
            reference=order.pk,
        )
    for product in affected_products.values():
        _sync_product_stock(product)

    old_status = order.status
    order.status = 'cancelled'
    order.cancelled_at = timezone.now()
    order.save(update_fields=['status', 'cancelled_at', 'updated_at'])
    if payment and payment.status in {'initialized', 'pending'}:
        payment.status = 'cancelled'
        payment.save(update_fields=['status', 'updated_at'])
    CouponRedemption.objects.filter(order=order).delete()
    OrderEvent.objects.create(
        order=order,
        event_type='status_changed',
        from_status=old_status,
        to_status='cancelled',
        actor=actor,
        data={'message': 'Order cancelled'},
    )
    if order.user and order.user.email:
        NotificationOutbox.objects.create(
            user=order.user,
            channel='email',
            recipient=order.user.email,
            template='order_cancelled',
            payload={'order_id': order.pk},
        )


def cancel_customer_order(order_id, user):
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(pk=order_id, user=user)
        except Order.DoesNotExist as exc:
            raise CommerceError('order_not_found', 'Order not found.', 404) from exc
        if order.status != 'pending':
            raise CommerceError('order_not_cancellable', 'Only pending orders can be cancelled.', 409)
        _cancel_locked_order(order, user)
    return get_order_for_user(order_id, user)


def transition_order_status(order_id, new_status, actor):
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(pk=order_id)
        except Order.DoesNotExist as exc:
            raise CommerceError('order_not_found', 'Order not found.', 404) from exc
        if new_status not in ORDER_TRANSITIONS.get(order.status, set()):
            raise CommerceError(
                'invalid_order_transition',
                f'Order cannot move from {order.status} to {new_status}.',
                409,
            )
        if new_status == 'cancelled':
            _cancel_locked_order(order, actor)
        else:
            old_status = order.status
            payment = Payment.objects.select_for_update().filter(order=order).first()
            if new_status == 'shipped' and payment and payment.method == 'manual' and payment.status != 'paid':
                raise CommerceError(
                    'payment_required',
                    'Manual-payment orders must be marked paid before shipping.',
                    409,
                )
            order.status = new_status
            update_fields = ['status', 'updated_at']
            if new_status == 'shipped':
                order.shipped_at = timezone.now()
                update_fields.append('shipped_at')
            elif new_status == 'delivered':
                order.delivered_at = timezone.now()
                update_fields.append('delivered_at')
                if payment and payment.method == 'cod' and payment.status in {'initialized', 'pending'}:
                    payment.status = 'paid'
                    payment.paid_at = order.delivered_at
                    payment.save(update_fields=['status', 'paid_at', 'updated_at'])
                    order.payment_status = 'paid'
                    update_fields.append('payment_status')
            order.save(update_fields=update_fields)
            OrderEvent.objects.create(
                order=order,
                event_type='status_changed',
                from_status=old_status,
                to_status=new_status,
                actor=actor,
                data={'message': f'Order status changed to {new_status}'},
            )
    return _order_queryset().get(pk=order_id)


def transition_payment(payment_id, new_status, actor):
    with transaction.atomic():
        try:
            payment = Payment.objects.select_for_update().select_related('order').get(pk=payment_id)
        except Payment.DoesNotExist as exc:
            raise CommerceError('payment_not_found', 'Payment not found.', 404) from exc
        if new_status not in PAYMENT_TRANSITIONS.get(payment.status, set()):
            raise CommerceError(
                'invalid_payment_transition',
                f'Payment cannot move from {payment.status} to {new_status}.',
                409,
            )
        old_status = payment.status
        payment.status = new_status
        fields = ['status', 'updated_at']
        if new_status == 'paid':
            payment.paid_at = timezone.now()
            fields.append('paid_at')
            payment.order.payment_status = 'paid'
            payment.order.save(update_fields=['payment_status', 'updated_at'])
        elif new_status == 'refunded':
            payment.refunded_at = timezone.now()
            fields.append('refunded_at')
            payment.order.payment_status = 'refunded'
            payment.order.save(update_fields=['payment_status', 'updated_at'])
        elif new_status == 'partially_refunded':
            payment.order.payment_status = 'partially_refunded'
            payment.order.save(update_fields=['payment_status', 'updated_at'])
        elif new_status == 'failed':
            payment.order.payment_status = 'failed'
            payment.order.save(update_fields=['payment_status', 'updated_at'])
        elif new_status == 'cancelled':
            payment.order.payment_status = 'cancelled'
            payment.order.save(update_fields=['payment_status', 'updated_at'])
        payment.save(update_fields=fields)
        OrderEvent.objects.create(
            order=payment.order,
            event_type='payment_status_changed',
            actor=actor,
            data={'from': old_status, 'to': new_status, 'message': f'Payment status changed to {new_status}'},
        )
    return Payment.objects.select_related('order').get(pk=payment_id)


def transition_return(return_id, new_status, actor, admin_note=''):
    with transaction.atomic():
        try:
            return_request = ReturnRequest.objects.select_for_update().select_related(
                'order', 'order_item__variant', 'order_item__product', 'user',
            ).get(pk=return_id)
        except ReturnRequest.DoesNotExist as exc:
            raise CommerceError('return_not_found', 'Return request not found.', 404) from exc
        if new_status not in RETURN_TRANSITIONS.get(return_request.status, set()):
            raise CommerceError(
                'invalid_return_transition',
                f'Return cannot move from {return_request.status} to {new_status}.',
                409,
            )

        if new_status == 'received' and return_request.order_item_id:
            item = return_request.order_item
            if item.variant_id:
                variant = ProductVariant.objects.select_for_update().get(pk=item.variant_id)
                product = Product.objects.select_for_update().get(pk=variant.product_id)
                variant.stock += return_request.quantity
                variant.save(update_fields=['stock', 'updated_at'])
                _sync_product_stock(product)
                resulting_stock = variant.stock
            elif item.product_id:
                product = Product.objects.select_for_update().get(pk=item.product_id)
                product.stock += return_request.quantity
                product.save(update_fields=['stock', 'updated_at'])
                resulting_stock = product.stock
            else:
                resulting_stock = 0
            if item.variant_id or item.product_id:
                InventoryMovement.objects.create(
                    variant_id=item.variant_id,
                    order_item=item,
                    actor=actor,
                    sku=item.sku,
                    delta=return_request.quantity,
                    resulting_stock=resulting_stock,
                    reason='return',
                    reference=f'RETURN-{return_request.pk}',
                )

        if new_status == 'refunded':
            try:
                payment = Payment.objects.select_for_update().get(order=return_request.order)
            except Payment.DoesNotExist as exc:
                raise CommerceError('payment_not_found', 'The order has no payment record.', 409) from exc
            if payment.status not in {'paid', 'partially_refunded'}:
                raise CommerceError(
                    'payment_not_refundable',
                    'The payment must be paid before a return can be marked refunded.',
                    409,
                )
            refund_amount = money(return_request.order_item.price * return_request.quantity)
            metadata = dict(payment.metadata or {})
            prior_total = money(metadata.get('refunded_amount', '0'))
            refunded_total = money(min(prior_total + refund_amount, payment.amount))
            refunds = list(metadata.get('refunds') or [])
            refunds.append({
                'return_id': return_request.pk,
                'amount': str(refund_amount),
                'recorded_at': timezone.now().isoformat(),
            })
            metadata.update({'refunded_amount': str(refunded_total), 'refunds': refunds})
            payment.metadata = metadata
            payment.status = 'refunded' if refunded_total >= payment.amount else 'partially_refunded'
            payment_fields = ['metadata', 'status', 'updated_at']
            if payment.status == 'refunded':
                payment.refunded_at = timezone.now()
                payment_fields.append('refunded_at')
            payment.save(update_fields=payment_fields)
            return_request.order.payment_status = payment.status
            return_request.order.save(update_fields=['payment_status', 'updated_at'])

        old_status = return_request.status
        return_request.status = new_status
        if admin_note:
            return_request.resolution_note = admin_note
        fields = ['status', 'resolution_note', 'updated_at']
        if new_status in {'rejected', 'refunded', 'cancelled'}:
            return_request.resolved_at = timezone.now()
            fields.append('resolved_at')
        return_request.save(update_fields=fields)
        OrderEvent.objects.create(
            order=return_request.order,
            event_type='return_status_changed',
            actor=actor,
            data={
                'return_id': return_request.pk,
                'from': old_status,
                'to': new_status,
                'message': f'Return status changed to {new_status}',
            },
        )
        if return_request.user.email:
            NotificationOutbox.objects.create(
                user=return_request.user,
                channel='email',
                recipient=return_request.user.email,
                template='return_status_changed',
                payload={'return_id': return_request.pk, 'status': new_status},
            )
    return ReturnRequest.objects.select_related('order', 'order_item', 'user').get(pk=return_id)
