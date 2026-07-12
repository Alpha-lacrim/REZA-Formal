from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate requests using the access token stored in an HttpOnly cookie named 'access'."""
    def authenticate(self, request):
        raw_token = request.COOKIES.get('access')
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken:
            # Treat an expired/corrupt cookie as anonymous. Protected views still
            # reject the request, while public auth views can replace or clear it.
            return None
        return self.get_user(validated_token), validated_token
