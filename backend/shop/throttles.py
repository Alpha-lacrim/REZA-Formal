import ipaddress
from collections.abc import Mapping
from datetime import datetime, timezone

from django.conf import settings
from django.db.models import F
from django.utils.crypto import salted_hmac
from rest_framework.throttling import SimpleRateThrottle

from .models import ThrottleBucket


def client_ip(request):
    peer = request.META.get('REMOTE_ADDR', '')
    try:
        address = ipaddress.ip_address(peer)
        if any(address in ipaddress.ip_network(cidr) for cidr in settings.TRUSTED_PROXY_CIDRS):
            # The trusted edge must overwrite XFF with exactly one verified IP.
            return str(ipaddress.ip_address(request.META.get('HTTP_X_FORWARDED_FOR', '')))
        return str(address)
    except ValueError:
        return peer or 'unknown'


class ScopedIPRateThrottle(SimpleRateThrottle):
    """Atomic DB counter shared across processes; bounded fixed-window policy."""

    scope = None

    def get_ident(self, request):
        return client_ip(request)

    def allow_request(self, request, view):
        if not self.rate or request.method in {'GET', 'HEAD', 'OPTIONS'}:
            return True
        now = self.timer()
        end = (int(now // self.duration) + 1) * self.duration
        key = salted_hmac('shop.throttle', f'{self.get_cache_key(request, view)}:{end}',
                          algorithm='sha256').hexdigest()
        ThrottleBucket.objects.get_or_create(key=key, defaults={
            'expires_at': datetime.fromtimestamp(end, tz=timezone.utc),
        })
        accepted = ThrottleBucket.objects.filter(key=key, count__lt=self.num_requests).update(count=F('count') + 1)
        self.retry_after = end - now
        return accepted == 1

    def wait(self):
        return self.retry_after

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class LoginRateThrottle(ScopedIPRateThrottle):
    scope = 'login'


class LoginAccountRateThrottle(ScopedIPRateThrottle):
    scope = 'login_account'

    def get_ident(self, request):
        data = request.data
        email = data.get('email', '') if isinstance(data, Mapping) else ''
        return str(email).strip().casefold()[:254]


class RefreshRateThrottle(ScopedIPRateThrottle):
    scope = 'refresh'


class RegisterRateThrottle(ScopedIPRateThrottle):
    scope = 'register'


class ContactRateThrottle(ScopedIPRateThrottle):
    scope = 'contact'


class ScopedActorRateThrottle(ScopedIPRateThrottle):
    """Prefer an authenticated account key and fall back to the request IP."""

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f'user:{request.user.pk}'
            return self.cache_format % {'scope': self.scope, 'ident': ident}
        return super().get_cache_key(request, view)


class CheckoutRateThrottle(ScopedActorRateThrottle):
    scope = 'checkout'


class CheckoutQuoteRateThrottle(ScopedActorRateThrottle):
    scope = 'checkout_quote'


class NewsletterRateThrottle(ScopedIPRateThrottle):
    scope = 'newsletter'


class ReviewRateThrottle(ScopedActorRateThrottle):
    scope = 'review'


class BespokeRateThrottle(ScopedIPRateThrottle):
    scope = 'bespoke'


class ReturnRateThrottle(ScopedActorRateThrottle):
    scope = 'return'
