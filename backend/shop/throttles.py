from rest_framework.throttling import SimpleRateThrottle


class ScopedIPRateThrottle(SimpleRateThrottle):
    """Rate-limit a sensitive endpoint by client IP, authenticated or not."""

    scope = None

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class LoginRateThrottle(ScopedIPRateThrottle):
    scope = 'login'


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
