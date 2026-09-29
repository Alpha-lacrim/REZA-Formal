from django.test import TestCase
from django.urls import resolve
from rest_framework.test import APIClient

from . import commerce_views
from .models import Product, User


class RouteContractTests(TestCase):
    def test_customer_order_routes_use_commerce(self):
        for path, view in (
            ('orders/create/', commerce_views.create_order),
            ('orders/my/', commerce_views.my_orders),
            ('orders/ORD-test/', commerce_views.order_detail),
            ('orders/ORD-test/cancel/', commerce_views.cancel_order),
        ):
            with self.subTest(path=path):
                self.assertIs(resolve('/api/' + path).func, view)
