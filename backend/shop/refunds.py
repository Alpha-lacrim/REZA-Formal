"""Refund accounting using immutable order amounts; no external transfer is performed."""
from decimal import Decimal, InvalidOperation

from django.utils import timezone

from .commerce_services import CommerceError, money
from .models import OrderEvent, ReturnRequest


def item_allocations(order):
    """Largest-remainder allocation in cents. Shipping/tax are outside item refunds."""
    items = list(order.items.order_by('pk'))
    gross = [int(money(item.price * item.qty) * 100) for item in items]
    subtotal = sum(gross)
    net = int(money(order.subtotal - order.discount_total) * 100)
    if (not items or subtotal != int(order.subtotal * 100) or not 0 <= net <= subtotal
            or order.total != order.subtotal - order.discount_total + order.shipping_total + order.tax_total):
        raise CommerceError('refund_snapshot_invalid', 'Order amounts require reconciliation before refunding.', 409)
    cents = [value * net // subtotal if subtotal else 0 for value in gross]
    remainder_order = sorted(range(len(items)), key=lambda i: (-(gross[i] * net % (subtotal or 1)), items[i].pk))
    for index in remainder_order[:net - sum(cents)]:
        cents[index] += 1
    return {str(item.pk): str(money(Decimal(value) / 100)) for item, value in zip(items, cents)}


def return_refund_amount(request, payment):
    metadata = dict(payment.metadata or {})
    for refund in metadata.get('refunds', []):
        if refund.get('return_id') == request.pk:
            return money(refund['amount'])
    item = request.order_item
    if item is None:
        raise CommerceError('refund_item_missing', 'The return has no order item.', 409)
    allocations = metadata.get('item_refund_allocations') or item_allocations(request.order)
    net_cents = int(Decimal(allocations[str(item.pk)]) * 100)
    previous_qty = sum(ReturnRequest.objects.filter(
        order_item=item, status='refunded',
    ).exclude(pk=request.pk).values_list('quantity', flat=True))
    if previous_qty + request.quantity > item.qty or request.quantity < 1:
        raise CommerceError('refund_quantity_exceeded', 'Returned quantity exceeds the purchased quantity.', 409)
    # Cumulative integer division allocates every penny exactly once across split returns.
    amount_cents = (net_cents * (previous_qty + request.quantity) // item.qty
                    - net_cents * previous_qty // item.qty)
    return money(Decimal(amount_cents) / 100)


def record_refund(payment, actor, *, amount, currency, reason, reference, confirmed,
                  requested_status=None, return_request=None):
    """Caller holds order/payment locks and an atomic transaction, including the return."""
    try:
        raw_amount = Decimal(str(amount))
        if not raw_amount.is_finite() or raw_amount != money(raw_amount):
            raise ValueError
        amount = money(raw_amount)
    except (InvalidOperation, TypeError, ValueError):
        raise CommerceError('refund_amount_invalid', 'Supply an amount with at most two decimal places.')
    if amount < 0 or (amount == 0 and return_request is None):
        raise CommerceError('refund_amount_invalid', 'The refund amount must be positive.')
    if currency != payment.currency or confirmed is not True or not reason or not reference:
        raise CommerceError('refund_confirmation_required', 'Currency, reason, reference and confirmation are required.')

    metadata = dict(payment.metadata or {})
    refunds = list(metadata.get('refunds') or [])
    for existing in refunds:
        if existing.get('reference') == reference:
            if (existing.get('amount') == str(amount) and existing.get('currency') == currency
                    and existing.get('reason') == reason
                    and existing.get('return_id') == (return_request.pk if return_request else None)
                    and existing.get('requested_status') == requested_status):
                return False
            raise CommerceError('refund_reference_conflict', 'This refund reference already records a different refund.', 409)
    try:
        prior = money(metadata.get('refunded_amount', '0'))
        recorded = sum((money(refund['amount']) for refund in refunds), Decimal('0.00'))
        valid_history = (prior.is_finite() and recorded == prior and 0 <= prior <= payment.amount
                         and (payment.status != 'paid' or prior == 0)
                         and (payment.status != 'refunded' or prior == payment.amount)
                         and (payment.status != 'partially_refunded' or 0 < prior < payment.amount))
    except (InvalidOperation, TypeError, ValueError, KeyError):
        valid_history = False
    if not valid_history:
        raise CommerceError('refund_history_incomplete', 'Reconcile the existing refund history before recording more money.', 409)
    zero_value_return = return_request is not None and amount == 0 and payment.status == 'refunded'
    if payment.status not in {'paid', 'partially_refunded'} and not zero_value_return:
        raise CommerceError('payment_not_refundable', 'The payment must be paid before refunding.', 409)
    total = money(prior + amount)
    if total > payment.amount:
        raise CommerceError('refund_exceeds_remaining', 'The refund exceeds the remaining paid amount.', 409)
    status = 'refunded' if total == payment.amount else ('partially_refunded' if total else 'paid')
    if requested_status and requested_status != status:
        raise CommerceError('refund_status_mismatch', 'The requested status does not match the recorded refund amount.')
    entry = {
        'amount': str(amount), 'currency': currency, 'reference': reference, 'reason': reason,
        'actor_id': actor.pk, 'recorded_at': timezone.now().isoformat(), 'requested_status': requested_status,
    }
    if return_request:
        entry.update(return_id=return_request.pk, order_item_id=return_request.order_item_id,
                     quantity=return_request.quantity)
        metadata.setdefault('item_refund_allocations', item_allocations(payment.order))
    refunds.append(entry)
    metadata.update(refunded_amount=str(total), refunds=refunds)
    payment.metadata = metadata
    payment.status = status
    if status == 'refunded':
        payment.refunded_at = timezone.now()
    payment.save(update_fields=['metadata', 'status', 'refunded_at', 'updated_at'])
    payment.order.payment_status = status
    payment.order.save(update_fields=['payment_status', 'updated_at'])
    OrderEvent.objects.create(order=payment.order, actor=actor, event_type='refund_recorded', data=entry)
    return True
