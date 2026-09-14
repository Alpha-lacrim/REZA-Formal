from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .commerce_services import create_checkout_order, transition_order_status, transition_return
from .models import Coupon, OrderEvent, Product, ProductVariant, ReturnRequest, ShippingMethod, User


class RefundAccountingTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_superuser('refund-admin', 'refund-admin@example.invalid', 'Test-only-493!')
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def purchase(self, prices=('100.00',), quantities=(2,), discount='50', shipping='0'):
        items = []
        for index, (price, quantity) in enumerate(zip(prices, quantities)):
            product = Product.objects.create(id=f'refund-{index}', name='Suit', price=price, stock=20)
            variant = ProductVariant.objects.create(product=product, sku=f'REFUND-{index}', stock=20)
            items.append({'variant_id': variant.pk, 'quantity': quantity})
        Coupon.objects.create(code='REFUND', discount_type='percent', value=discount)
        method = ShippingMethod.objects.create(code='REFUND', name='Shipping', price=shipping)
        order, _ = create_checkout_order(self.staff, {
            'items': items, 'shipping_address': 'Test address', 'coupon_code': 'REFUND',
            'shipping_method_id': method.pk,
        })
        for status in ('processing', 'shipped', 'delivered'):
            order = transition_order_status(order.pk, status, self.staff)
        return order

    def received_return(self, order, item, quantity=1):
        request = ReturnRequest.objects.create(
            order=order, user=self.staff, order_item=item, quantity=quantity, reason='Size',
        )
        for status in ('approved', 'received'):
            request = transition_return(request.pk, status, self.staff)
        return request

    def refund(self, payment, amount='10.00', status='partially_refunded', reference='BANK-1', **overrides):
        return self.client.put(f'/api/admin/payments/{payment.pk}/', {
            'status': status, 'refund_amount': amount, 'currency': payment.currency,
            'reason': 'Verified offline refund', 'reference': reference, 'confirmed': True, **overrides,
        }, format='json')

    def test_discounted_partial_then_full_item_returns_do_not_over_refund(self):
        order = self.purchase()
        item = order.items.get()
        first = self.received_return(order, item)
        preview = self.client.get('/api/admin/returns/').data['results'][0]
        self.assertEqual(Decimal(preview['refund_amount']), Decimal('50.00'))
        for expected, request in (('50.00', first), ('100.00', self.received_return(order, item))):
            response = self.client.put(f'/api/admin/returns/{request.pk}/', {'status': 'refunded'}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            order.payment.refresh_from_db()
            self.assertEqual(order.payment.metadata['refunded_amount'], expected)
        self.assertEqual(order.payment.status, 'refunded')
        self.assertEqual(sum(Decimal(r['amount']) for r in order.payment.metadata['refunds']), Decimal('100'))

    def test_rounding_conserves_net_merchandise_and_excludes_shipping(self):
        order = self.purchase(prices=('0.05', '0.10'), quantities=(3, 1), discount='50', shipping='2')
        # Later catalog/coupon edits cannot change the purchase entitlement.
        Product.objects.all().update(price='999')
        Coupon.objects.all().update(value='0')
        for item in order.items.order_by('pk'):
            for _ in range(item.qty):
                request = self.received_return(order, item)
                transition_return(request.pk, 'refunded', self.staff)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.metadata['refunded_amount'], '0.12')
        self.assertEqual(order.payment.status, 'partially_refunded')
        self.assertEqual(sum(Decimal(r['amount']) for r in order.payment.metadata['refunds']), Decimal('0.12'))

    def test_status_only_refunds_are_rejected_without_side_effects(self):
        order = self.purchase()
        for status in ('partially_refunded', 'refunded'):
            response = self.client.put(f'/api/admin/payments/{order.payment.pk}/', {'status': status}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, 'paid')

    def test_manual_refunds_record_amount_and_reference_and_replay_once(self):
        order = self.purchase()
        response = self.refund(order.payment)
        self.assertEqual(response.status_code, 200, response.data)
        events = OrderEvent.objects.count()
        replay = self.refund(order.payment)
        self.assertEqual(replay.status_code, 200, replay.data)
        self.assertEqual(OrderEvent.objects.count(), events)
        conflict = self.refund(order.payment, amount='11.00')
        self.assertEqual(conflict.status_code, 409, conflict.data)
        second = self.refund(order.payment, amount='20.00', reference='BANK-2')
        self.assertEqual(second.status_code, 200, second.data)
        full = self.refund(order.payment, amount='70.00', status='refunded', reference='BANK-3')
        self.assertEqual(full.status_code, 200, full.data)
        order.payment.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(order.payment.metadata['refunded_amount'], '100.00')
        self.assertEqual(order.payment_status, 'refunded')
        self.assertEqual(len(order.payment.metadata['refunds']), 3)
        stats = self.client.get('/api/admin/stats/')
        self.assertEqual(stats.status_code, 200)
        self.assertEqual(Decimal(str(stats.data['revenue'])), Decimal('0'))

    def test_invalid_manual_refunds_do_not_change_money_or_status(self):
        order = self.purchase()
        for values in ({'amount': '0'}, {'amount': '-1'}, {'amount': 'NaN'}, {'amount': '101'},
                       {'currency': 'USD'}, {'confirmed': False}, {'reference': ''}, {'reason': ''},
                       {'amount': '100', 'status': 'partially_refunded'}):
            with self.subTest(values=values):
                response = self.refund(order.payment, **values)
                self.assertIn(response.status_code, (400, 409), response.data)
                order.payment.refresh_from_db()
                self.assertEqual(order.payment.status, 'paid')

    def test_return_cannot_silently_cap_amount_after_manual_refund(self):
        order = self.purchase()
        self.assertEqual(self.refund(order.payment, amount='80').status_code, 200)
        request = self.received_return(order, order.items.get())
        response = self.client.put(f'/api/admin/returns/{request.pk}/', {'status': 'refunded'}, format='json')
        self.assertEqual(response.status_code, 409, response.data)
        request.refresh_from_db()
        order.payment.refresh_from_db()
        self.assertEqual(request.status, 'received')
        self.assertEqual(order.payment.metadata['refunded_amount'], '80.00')

    def test_legacy_unrecorded_partial_refund_requires_reconciliation(self):
        order = self.purchase()
        order.payment.status = 'partially_refunded'
        order.payment.metadata = {}
        order.payment.save()
        response = self.refund(order.payment, amount='100', status='refunded')
        self.assertEqual(response.status_code, 409, response.data)

    def test_zero_value_split_returns_still_complete_without_inventing_money(self):
        order = self.purchase(discount='100')
        for _ in range(2):
            request = self.received_return(order, order.items.get())
            transition_return(request.pk, 'refunded', self.staff)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.metadata['refunded_amount'], '0.00')
        self.assertEqual(len(order.payment.metadata['refunds']), 2)

    def test_legacy_allocations_use_only_order_snapshots_and_event_failure_rolls_back(self):
        order = self.purchase()
        order.payment.metadata = {}
        order.payment.save(update_fields=['metadata'])
        Product.objects.all().update(price='999')
        request = self.received_return(order, order.items.get())
        with patch('shop.refunds.OrderEvent.objects.create', side_effect=RuntimeError('Refund event failed')):
            with self.assertRaisesMessage(RuntimeError, 'Refund event failed'):
                transition_return(request.pk, 'refunded', self.staff)
        request.refresh_from_db()
        order.payment.refresh_from_db()
        self.assertEqual((request.status, order.payment.status, order.payment.metadata), ('received', 'paid', {}))
        transition_return(request.pk, 'refunded', self.staff)
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.metadata['refunded_amount'], '50.00')
        self.assertEqual(order.payment.metadata['item_refund_allocations'][str(request.order_item_id)], '100.00')
