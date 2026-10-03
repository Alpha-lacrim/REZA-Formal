import math

from django.http import JsonResponse
from django.utils.cache import patch_cache_control

from .throttles import NativeAdminLoginRateThrottle, NativeAdminLoginAccountRateThrottle


class SecurityResponseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = None
        if request.path == '/admin/login/' and request.method == 'POST':
            waits = []
            for throttle in (NativeAdminLoginRateThrottle(), NativeAdminLoginAccountRateThrottle()):
                if not throttle.allow_request(request, None):
                    waits.append(throttle.wait())
            if waits:
                response = JsonResponse({'detail': 'Too many sign-in attempts; please retry later.'}, status=429)
                response['Retry-After'] = str(max(1, math.ceil(max(waits))))
        if response is None:
            response = self.get_response(request)
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=()'
        if request.path.startswith('/admin/'):
            response['Content-Security-Policy'] = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
            response['X-Frame-Options'] = 'DENY'
            patch_cache_control(response, private=True, no_store=True)
        if request.path.startswith('/api/'):
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
            # Customer/staff representations, CSRF and cookie writes never cache.
            if (request.path.startswith(('/api/auth/', '/api/admin/')) or request.COOKIES.get('access')
                    or request.headers.get('Authorization')):
                patch_cache_control(response, private=True, no_store=True)
        return response
