from django.db import transaction
from django.utils import timezone

from .models import NewsletterSubscription


def subscribe(email):
    """A repeated explicit subscription is idempotent and renews inactive consent."""
    with transaction.atomic():
        subscription, created = NewsletterSubscription.objects.get_or_create(
            email=email.strip().lower(), defaults={'is_active': True, 'source': 'website'},
        )
        subscription = NewsletterSubscription.objects.select_for_update().get(pk=subscription.pk)
        if not subscription.is_active:
            subscription.is_active = True
            subscription.unsubscribed_at = None
            subscription.subscribed_at = timezone.now()
            subscription.save(update_fields=['is_active', 'unsubscribed_at', 'subscribed_at'])
    return subscription, created
