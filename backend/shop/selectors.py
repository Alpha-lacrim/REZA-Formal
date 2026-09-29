"""Reusable read graphs; simple endpoint queries stay next to their views."""
from django.db.models import Avg, Count, Q

from .models import Order, Product


def product_reads():
    return Product.objects.annotate(
        approved_rating=Avg('reviews__rating', filter=Q(reviews__status='approved')),
        review_count=Count('reviews', filter=Q(reviews__status='approved')),
    ).prefetch_related('variants')


def order_reads():
    return Order.objects.select_related(
        'user', 'address', 'shipping_method', 'coupon', 'payment',
    ).prefetch_related('items__variant', 'events__actor')
