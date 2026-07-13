from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


def enforce_csrf(request):
    """Apply Django's CSRF validation to authenticated cookie mutations."""
    check = CsrfViewMiddleware(lambda _request: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise PermissionDenied(f'CSRF validation failed: {reason}')


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate requests using the access token stored in an HttpOnly cookie named 'access'."""
    def authenticate(self, request):
        raw_token = request.COOKIES.get('access')
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
        except (InvalidToken, AuthenticationFailed):
            # Treat an expired/corrupt cookie as anonymous. Protected views still
            # reject the request, while public auth views can replace or clear it.
            # AuthenticationFailed also covers valid tokens whose user was
            # deleted or disabled.
            return None
        if request.method not in {'GET', 'HEAD', 'OPTIONS', 'TRACE'}:
            enforce_csrf(request)
        return user, validated_token
