import uuid
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from . import commerce_views
from .commerce_services import CommerceError, transition_order_status
from .models import (
    Address,
    BespokeRequest,
    Coupon,
    CouponRedemption,
    InventoryMovement,
    NewsletterSubscription,
    NotificationOutbox,
    Order,
    OrderEvent,
    OrderItem,
    Payment,
    Product,
    ProductReview,
    ProductVariant,
    ReturnRequest,
    SavedCartItem,
    ShippingMethod,
    User,
    WishlistItem,
)


class CommerceApiTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username='api-buyer',
            email='api-buyer@example.com',
            password='A-strong-api-password-493!',
            first_name='API Buyer',
            phone='09120000000',
        )
        self.other = User.objects.create_user(
            username='other-buyer',
            email='other@example.com',
            password='A-strong-api-password-493!',
        )
        self.admin = User.objects.create_superuser(
            username='commerce-admin',
            email='commerce-admin@example.com',
            password='A-strong-admin-password-493!',
        )
        self.product = Product.objects.create(
            id='api-product',
            name='API Product',
            price=Decimal('100.00'),
            currency='Toman',
            stock=5,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku='API-50-BLACK',
            size='50',
            color='Black',
            stock=5,
        )
        self.shipping = ShippingMethod.objects.create(
            code='STANDARD',
            name='Standard',
            price=Decimal('20.00'),
        )
        self.address = Address.objects.create(
            user=self.user,
            label='Home',
            recipient_name='API Buyer',
            phone='09120000000',
            province='Tehran',
            city='Tehran',
            postal_code='1234567890',
            line1='Example street',
            is_default=True,
        )

    def call(self, view, method, path, data=None, user=None, kwargs=None):
        request = getattr(self.factory, method)(path, data or {}, format='json')
        if user is not None:
            force_authenticate(request, user=user)
        return view(request, **(kwargs or {}))

    def checkout_payload(self, **changes):
        payload = {
            'items': [{'id': self.product.pk, 'qty': 2}],
            'address_id': self.address.pk,
            'shipping_method_id': self.shipping.pk,
            'payment_method': 'cod',
        }
        payload.update(changes)
        return payload

    def test_quote_is_server_authoritative_and_applies_shipping_and_coupon(self):
        Coupon.objects.create(
            code='TEN',
            discount_type='percent',
            value=Decimal('10.00'),
            min_subtotal=Decimal('100.00'),
        )
        response = self.call(
            commerce_views.checkout_quote,
            'post',
            '/api/checkout/quote/',
            self.checkout_payload(coupon_code='ten', total='0.01'),
            self.user,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data['subtotal']), Decimal('200.00'))
        self.assertEqual(Decimal(response.data['discount_total']), Decimal('20.00'))
        self.assertEqual(Decimal(response.data['shipping_total']), Decimal('20.00'))
        self.assertEqual(Decimal(response.data['total']), Decimal('200.00'))
        self.assertEqual(response.data['lines'][0]['variant_id'], self.variant.pk)

    def test_checkout_is_idempotent_and_records_inventory_payment_and_snapshots(self):
        key = uuid.uuid4()
        payload = self.checkout_payload(idempotency_key=str(key), total='0.01')
        first = self.call(commerce_views.create_order, 'post', '/api/orders/create/', payload, self.user)
        second = self.call(commerce_views.create_order, 'post', '/api/orders/create/', payload, self.user)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data['order']['id'], second.data['order']['id'])
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.get()
        item = order.items.get()
        self.assertEqual(order.subtotal, Decimal('200.00'))
        self.assertEqual(order.total, Decimal('220.00'))
        self.assertEqual(order.address_snapshot['address_line'], 'Example street')
        self.assertEqual(item.product_name, self.product.name)
        self.assertEqual(item.sku, self.variant.sku)
        self.assertEqual(order.payment.amount, order.total)
        self.assertEqual(InventoryMovement.objects.get().delta, -2)
        self.assertEqual(OrderEvent.objects.get().event_type, 'created')
        self.assertEqual(NotificationOutbox.objects.get().template, 'order_created')
        self.variant.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.variant.stock, 3)
        self.assertEqual(self.product.stock, 3)

    def test_idempotency_key_cannot_disclose_another_users_order(self):
        key = uuid.uuid4()
        first = self.call(
            commerce_views.create_order, 'post', '/api/orders/create/',
            self.checkout_payload(idempotency_key=str(key)), self.user,
        )
        self.assertEqual(first.status_code, 201)
        foreign_address = Address.objects.create(
            user=self.other,
            recipient_name='Other',
            phone='09121111111',
            province='Tehran',
            city='Tehran',
            line1='Other street',
        )
        response = self.call(
            commerce_views.create_order, 'post', '/api/orders/create/',
            self.checkout_payload(idempotency_key=str(key), address_id=foreign_address.pk), self.other,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'idempotency_key_conflict')

    def test_online_payment_is_rejected_without_mutating_stock(self):
        response = self.call(
            commerce_views.create_order, 'post', '/api/orders/create/',
            self.checkout_payload(payment_method='online'), self.user,
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data['code'], 'online_payment_unavailable')
        self.assertFalse(Order.objects.exists())
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)

    def test_coupon_redemption_is_recorded_and_per_user_limit_is_enforced(self):
        coupon = Coupon.objects.create(
            code='ONCE', discount_type='fixed', value=Decimal('25.00'), max_uses_per_user=1,
        )
        first = self.call(
            commerce_views.create_order, 'post', '/api/orders/create/',
            self.checkout_payload(coupon_code=coupon.code), self.user,
        )
        second = self.call(
            commerce_views.create_order, 'post', '/api/orders/create/',
            self.checkout_payload(coupon_code=coupon.code), self.user,
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(second.data['code'], 'coupon_user_limit_reached')
        self.assertEqual(CouponRedemption.objects.count(), 1)

    def test_cancel_releases_stock_once_and_enforces_transition_rules(self):
        created = self.call(
            commerce_views.create_order, 'post', '/api/orders/create/', self.checkout_payload(), self.user,
        )
        order_id = created.data['order']['id']
        cancelled = self.call(
            commerce_views.cancel_order, 'post', f'/api/orders/{order_id}/cancel/',
            user=self.user, kwargs={'pk': order_id},
        )
        repeated = self.call(
            commerce_views.cancel_order, 'post', f'/api/orders/{order_id}/cancel/',
            user=self.user, kwargs={'pk': order_id},
        )

        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(repeated.status_code, 409)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 5)
        self.assertEqual(InventoryMovement.objects.filter(reason='cancel').count(), 1)
        with self.assertRaises(CommerceError) as caught:
            transition_order_status(order_id, 'delivered', self.admin)
        self.assertEqual(caught.exception.code, 'invalid_order_transition')

    def test_address_cart_and_wishlist_are_scoped_to_the_authenticated_user(self):
        foreign = Address.objects.create(
            user=self.other,
            recipient_name='Other',
            phone='09121111111',
            province='Tehran',
            city='Tehran',
            line1='Other street',
        )
        forbidden = self.call(
            commerce_views.address_detail, 'get', f'/api/addresses/{foreign.pk}/',
            user=self.user, kwargs={'pk': foreign.pk},
        )
        self.assertEqual(forbidden.status_code, 404)

        cart = self.call(
            commerce_views.saved_cart, 'put', '/api/cart/',
            {'lines': [{'product_id': self.product.pk, 'quantity': 2}]}, self.user,
        )
        wishlist = self.call(
            commerce_views.wishlist_item, 'post', f'/api/wishlist/{self.product.pk}/',
            user=self.user, kwargs={'product_id': self.product.pk},
        )
        self.assertEqual(cart.status_code, 200)
        self.assertEqual(cart.data['lines'][0]['quantity'], 2)
        self.assertEqual(wishlist.status_code, 200)
        self.assertEqual(SavedCartItem.objects.get().user, self.user)
        self.assertEqual(WishlistItem.objects.get().user, self.user)

    def test_reviews_require_delivery_and_returns_require_owned_delivered_items(self):
        denied = self.call(
            commerce_views.product_reviews, 'post', f'/api/products/{self.product.pk}/reviews/',
            {'rating': 5, 'body': 'Excellent'}, self.user, {'product_id': self.product.pk},
        )
        self.assertEqual(denied.status_code, 403)

        order = Order.objects.create(
            id='ORD-DELIVERED', user=self.user, total=Decimal('100.00'),
            status='delivered', shipping_address='Example street', delivered_at=timezone.now(),
        )
        item = OrderItem.objects.create(
            order=order, product=self.product, variant=self.variant, qty=1,
            price=self.product.price, product_name=self.product.name, sku=self.variant.sku,
        )
        review = self.call(
            commerce_views.product_reviews, 'post', f'/api/products/{self.product.pk}/reviews/',
            {'rating': 5, 'body': 'Excellent'}, self.user, {'product_id': self.product.pk},
        )
        returned = self.call(
            commerce_views.returns, 'post', '/api/returns/',
            {'order_id': order.pk, 'item_ids': [item.pk], 'reason': 'Size'}, self.user,
        )
        self.assertEqual(review.status_code, 201)
        self.assertTrue(ProductReview.objects.get().verified_purchase)
        self.assertEqual(returned.status_code, 201)
        return_request = ReturnRequest.objects.get()
        self.assertEqual(return_request.order_item, item)

        approved = self.call(
            commerce_views.admin_return_detail, 'put', f'/api/admin/returns/{return_request.pk}/',
            {'status': 'approved'}, self.admin, {'pk': return_request.pk},
        )
        received = self.call(
            commerce_views.admin_return_detail, 'put', f'/api/admin/returns/{return_request.pk}/',
            {'status': 'received'}, self.admin, {'pk': return_request.pk},
        )
        repeated = self.call(
            commerce_views.admin_return_detail, 'put', f'/api/admin/returns/{return_request.pk}/',
            {'status': 'received'}, self.admin, {'pk': return_request.pk},
        )
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(received.status_code, 200)
        self.assertEqual(repeated.status_code, 409)
        self.assertEqual(InventoryMovement.objects.filter(reason='return').count(), 1)

    def test_public_bespoke_and_newsletter_create_operational_records(self):
        bespoke = self.call(
            commerce_views.bespoke_requests, 'post', '/api/bespoke/requests/',
            {
                'name': 'Guest', 'phone': '09122222222', 'email': 'guest@example.com',
                'garment_type': 'Suit', 'preferred_date': '2026-08-01', 'description': 'Custom fit',
            },
        )
        newsletter = self.call(
            commerce_views.newsletter_subscribe, 'post', '/api/newsletter/subscribe/',
            {'email': 'NEWS@example.com'},
        )
        self.assertEqual(bespoke.status_code, 201)
        self.assertEqual(newsletter.status_code, 201)
        self.assertEqual(BespokeRequest.objects.get().service, 'Suit')
        self.assertEqual(BespokeRequest.objects.get().measurements['preferred_date'], '2026-08-01')
        self.assertEqual(NewsletterSubscription.objects.get().email, 'news@example.com')

    def test_admin_capabilities_crud_and_lifecycle_endpoints(self):
        capabilities = self.call(
            commerce_views.admin_capabilities, 'get', '/api/admin/capabilities/', user=self.admin,
        )
        coupon = self.call(
            commerce_views.admin_coupons, 'post', '/api/admin/coupons/',
            {'code': 'ADMIN10', 'type': 'percent', 'value': '10.00'}, self.admin,
        )
        shipping = self.call(
            commerce_views.admin_shipping_methods, 'post', '/api/admin/shipping-methods/',
            {'name': 'Express', 'price': '50.00', 'active': True}, self.admin,
        )
        self.assertEqual(capabilities.status_code, 200)
        self.assertFalse(capabilities.data['online_payments'])
        self.assertEqual(coupon.status_code, 201)
        self.assertEqual(shipping.status_code, 201)

        denied = self.call(
            commerce_views.admin_coupons, 'get', '/api/admin/coupons/', user=self.user,
        )
        self.assertEqual(denied.status_code, 403)

        order = Order.objects.create(
            id='ORD-ADMIN-PAY', user=self.user, total=Decimal('100.00'), shipping_address='Address',
        )
        payment = Payment.objects.create(order=order, method='cod', amount=order.total)
        paid = self.call(
            commerce_views.admin_payment_detail, 'put', f'/api/admin/payments/{payment.pk}/',
            {'status': 'paid'}, self.admin, {'pk': payment.pk},
        )
        self.assertEqual(paid.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
