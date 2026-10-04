"""Reusable read graphs; simple endpoint queries stay next to their views."""
from django.db.models import Avg, Count, OuterRef, Prefetch, Q, Subquery, Sum

from .models import Order, OrderItem, Product, ReturnRequest


def product_reads():
    return Product.objects.annotate(
        approved_rating=Avg('reviews__rating', filter=Q(reviews__status='approved')),
        review_count=Count('reviews', filter=Q(reviews__status='approved')),
    ).prefetch_related('variants')


def order_reads():
    return Order.objects.select_related(
        'user', 'address', 'shipping_method', 'coupon', 'payment',
    ).prefetch_related('items__variant', 'events__actor')


def return_reads():
    refunded_quantity = ReturnRequest.objects.filter(
        order_item_id=OuterRef('order_item_id'), status='refunded',
    ).exclude(pk=OuterRef('pk')).order_by().values('order_item_id').annotate(
        total=Sum('quantity'),
    ).values('total')
    return ReturnRequest.objects.select_related('order__payment', 'order_item', 'user').annotate(
        previous_refunded_quantity=Subquery(refunded_quantity),
    ).prefetch_related(Prefetch('order__items', queryset=OrderItem.objects.order_by('pk')))
