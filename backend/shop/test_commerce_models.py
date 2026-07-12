from decimal import Decimal

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase

from .admin import OrderEventInline, OrderItemInline, PaymentInline
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


class CommerceModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='commerce-buyer',
            email='COMMERCE@example.com',
            password='A-strong-commerce-password-493!',
            phone='09120000000',
        )
        self.product = Product.objects.create(
            id='commerce-suit',
            name='Commerce Suit',
            price=Decimal('1000.00'),
            compare_at_price=Decimal('1200.00'),
            stock=4,
            featured=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku=' suit-50-black ',
            size=' 50 ',
            color=' Black ',
            stock=4,
        )

    def test_profile_and_catalog_compatibility_fields_and_variant_price(self):
        self.user.refresh_from_db()
        self.variant.refresh_from_db()

        self.assertEqual(self.user.email, 'commerce@example.com')
        self.assertEqual(self.user.phone, '09120000000')
        self.assertEqual(self.variant.sku, 'SUIT-50-BLACK')
        self.assertEqual(self.variant.size, '50')
        self.assertEqual(self.variant.color, 'Black')
        self.assertEqual(self.variant.effective_price, self.product.price)
        self.assertTrue(self.product.featured)
        self.assertTrue(self.product.is_active)

    def test_variant_identity_and_nonnegative_stock_are_database_enforced(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductVariant.objects.create(
                product=self.product,
                sku='ANOTHER-SKU',
                size='50',
                color='Black',
                stock=1,
            )

        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductVariant.objects.create(
                product=self.product,
                sku='NEGATIVE-STOCK',
                size='52',
                color='Black',
                stock=-1,
            )

    def test_addresses_cart_and_wishlist_are_owned_and_unique(self):
        address = Address.objects.create(
            user=self.user,
            label='Home',
            recipient_name='Commerce Buyer',
            phone='09120000000',
            province='Tehran',
            city='Tehran',
            postal_code='1234567890',
            line1='Example street',
            is_default=True,
        )
        SavedCartItem.objects.create(user=self.user, variant=self.variant, quantity=2)
        WishlistItem.objects.create(user=self.user, product=self.product)

        self.assertEqual(address.user, self.user)
        with self.assertRaises(IntegrityError), transaction.atomic():
            SavedCartItem.objects.create(user=self.user, variant=self.variant, quantity=1)
        with self.assertRaises(IntegrityError), transaction.atomic():
            WishlistItem.objects.create(user=self.user, product=self.product)

    def test_order_payment_and_item_snapshots_preserve_purchase_data(self):
        shipping = ShippingMethod.objects.create(code=' standard ', name='Standard', price=Decimal('50.00'))
        coupon = Coupon.objects.create(
            code=' welcome10 ',
            discount_type='percent',
            value=Decimal('10.00'),
        )
        order = Order.objects.create(
            id='ORD-COMMERCE-MODEL',
            user=self.user,
            subtotal=Decimal('1000.00'),
            discount_total=Decimal('100.00'),
            shipping_total=Decimal('50.00'),
            total=Decimal('950.00'),
            coupon=coupon,
            shipping_method=shipping,
            recipient_name='Commerce Buyer',
            phone='09120000000',
            shipping_address='Example street',
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            variant=self.variant,
            qty=1,
            price=Decimal('1000.00'),
            product_id_snapshot=self.product.pk,
            product_name=self.product.name,
            sku=self.variant.sku,
            size=self.variant.size,
            color=self.variant.color,
        )
        Payment.objects.create(
            order=order,
            method='cod',
            amount=order.total,
            currency=order.currency,
        )
        CouponRedemption.objects.create(
            coupon=coupon,
            user=self.user,
            order=order,
            amount=order.discount_total,
        )

        order.refresh_from_db()
        self.assertIsNotNone(order.idempotency_key)
        self.assertEqual(order.total, Decimal('950.00'))
        self.assertEqual(order.payment.amount, order.total)
        self.assertEqual(item.product_name, 'Commerce Suit')
        self.assertEqual(item.sku, 'SUIT-50-BLACK')
        self.assertEqual(coupon.code, 'WELCOME10')
        self.assertEqual(shipping.code, 'STANDARD')

        with self.assertRaises(IntegrityError), transaction.atomic():
            Payment.objects.create(order=order, method='cod', amount=order.total)

    def test_coupon_and_review_constraints_reject_invalid_values(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Coupon.objects.create(code='TOO-MUCH', discount_type='percent', value=Decimal('101.00'))

        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductReview.objects.create(user=self.user, product=self.product, rating=6)

        ProductReview.objects.create(user=self.user, product=self.product, rating=5, status='approved')
        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductReview.objects.create(user=self.user, product=self.product, rating=4)

    def test_operational_models_accept_valid_minimal_records(self):
        order = Order.objects.create(
            id='ORD-OPERATIONS',
            user=self.user,
            total=Decimal('1000.00'),
            shipping_address='Example street',
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            variant=self.variant,
            qty=1,
            price=self.product.price,
            product_name=self.product.name,
            sku=self.variant.sku,
        )
        InventoryMovement.objects.create(
            variant=self.variant,
            order_item=item,
            sku=self.variant.sku,
            delta=-1,
            resulting_stock=3,
            reason='sale',
            reference=order.pk,
        )
        OrderEvent.objects.create(order=order, event_type='created', to_status='pending')
        ReturnRequest.objects.create(
            user=self.user,
            order=order,
            order_item=item,
            reason='Sizing issue',
        )
        BespokeRequest.objects.create(
            user=self.user,
            name='Commerce Buyer',
            email=self.user.email,
            phone=self.user.phone,
        )
        NewsletterSubscription.objects.create(email='NEWS@example.com')
        NotificationOutbox.objects.create(
            user=self.user,
            channel='email',
            recipient=self.user.email,
            template='order_created',
        )

        self.assertEqual(order.events.count(), 1)
        self.assertEqual(item.inventory_movements.count(), 1)
        self.assertEqual(NewsletterSubscription.objects.get().email, 'news@example.com')
        self.assertEqual(NotificationOutbox.objects.get().status, 'pending')


class CommerceAdminTests(TestCase):
    def test_custom_user_uses_django_auth_admin(self):
        self.assertIsInstance(admin.site._registry[User], DjangoUserAdmin)
        self.assertIn('phone', admin.site._registry[User].get_search_fields(None))

    def test_commerce_models_and_order_audit_inlines_are_registered(self):
        expected_models = {
            Address,
            BespokeRequest,
            Coupon,
            CouponRedemption,
            InventoryMovement,
            NewsletterSubscription,
            NotificationOutbox,
            Order,
            OrderEvent,
            Payment,
            Product,
            ProductReview,
            ProductVariant,
            ReturnRequest,
            SavedCartItem,
            ShippingMethod,
            WishlistItem,
        }
        self.assertTrue(expected_models.issubset(admin.site._registry))

        inline_classes = set(admin.site._registry[Order].inlines)
        self.assertEqual(inline_classes, {OrderItemInline, PaymentInline, OrderEventInline})


class CommerceMigrationTests(TransactionTestCase):
    migrate_from = ('shop', '0005_user_email_unique_clear_legacy_2fa')
    migrate_to = ('shop', '0006_address_bespokerequest_coupon_couponredemption_and_more')

    def test_legacy_catalog_orders_and_addresses_are_safely_backfilled(self):
        executor = MigrationExecutor(connection)
        executor.migrate([self.migrate_from])
        old_apps = executor.loader.project_state([self.migrate_from]).apps

        OldUser = old_apps.get_model('shop', 'User')
        OldProduct = old_apps.get_model('shop', 'Product')
        OldOrder = old_apps.get_model('shop', 'Order')
        OldOrderItem = old_apps.get_model('shop', 'OrderItem')

        user = OldUser.objects.create(
            username='legacy-buyer',
            email='legacy@example.com',
            address='Legacy street',
        )
        product = OldProduct.objects.create(
            id='legacy-product',
            name='Legacy Product',
            price=Decimal('250.00'),
            currency='Toman',
            stock=3,
        )
        order = OldOrder.objects.create(
            id='ORD-LEGACY',
            user=user,
            total=Decimal('500.00'),
            shipping_address='Legacy street',
        )
        item = OldOrderItem.objects.create(
            order=order,
            product=product,
            qty=2,
            price=Decimal('250.00'),
        )

        executor = MigrationExecutor(connection)
        executor.migrate([self.migrate_to])
        new_apps = executor.loader.project_state([self.migrate_to]).apps

        NewAddress = new_apps.get_model('shop', 'Address')
        NewOrder = new_apps.get_model('shop', 'Order')
        NewOrderItem = new_apps.get_model('shop', 'OrderItem')
        NewProductVariant = new_apps.get_model('shop', 'ProductVariant')

        migrated_order = NewOrder.objects.get(pk=order.pk)
        migrated_item = NewOrderItem.objects.get(pk=item.pk)
        variant = NewProductVariant.objects.get(product_id=product.pk)

        self.assertIsNotNone(migrated_order.idempotency_key)
        self.assertEqual(migrated_order.subtotal, Decimal('500.00'))
        self.assertEqual(migrated_order.address_snapshot['line1'], 'Legacy street')
        self.assertEqual(variant.stock, 3)
        self.assertEqual(migrated_item.variant_id, variant.pk)
        self.assertEqual(migrated_item.product_name, 'Legacy Product')
        self.assertEqual(migrated_item.sku, 'LEGACY-LEGACY-PRODUCT')
        self.assertEqual(NewAddress.objects.get(user_id=user.pk).line1, 'Legacy street')
