"""Persistent revocation and atomic, single-use refresh rotation."""
import hashlib
import uuid
from datetime import datetime, timezone as datetime_timezone

from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .models import AuthSession, User


def password_digest(user):
    return salted_hmac('shop.auth.password', user.password, algorithm='sha256').hexdigest()


def token_digest(token):
    return hashlib.sha256(str(token['jti']).encode()).hexdigest()


def session_id(token):
    try:
        return uuid.UUID(str(token.get('sid', '')))
    except (ValueError, TypeError, AttributeError):
        raise TokenError('Invalid session') from None


def new_session(user):
    refresh = RefreshToken.for_user(user)
    session = AuthSession.objects.create(
        user=user, refresh_digest=token_digest(refresh), password_digest=password_digest(user),
        expires_at=datetime.fromtimestamp(refresh['exp'], tz=datetime_timezone.utc),
    )
    refresh['sid'] = str(session.pk)
    return {'refresh': refresh, 'access': refresh.access_token}


def active_session(token, user):
    session = AuthSession.objects.filter(
        pk=session_id(token), user=user, revoked_at__isnull=True, expires_at__gt=timezone.now(),
    ).first()
    if not session or not constant_time_compare(session.password_digest, password_digest(user)):
        raise TokenError('Session expired')
    return session


def rotate_session(raw):
    refresh = RefreshToken(raw)
    try:
        user = User.objects.get(pk=refresh['user_id'], is_active=True)
    except (User.DoesNotExist, KeyError, ValueError, TypeError):
        raise TokenError('Session expired') from None
    session = active_session(refresh, user)
    old_digest = token_digest(refresh)
    # Preserve the original seven-day session expiry; rotation is not renewal.
    refresh.set_jti()
    refresh.set_iat()
    changed = AuthSession.objects.filter(
        pk=session.pk, refresh_digest=old_digest, password_digest=password_digest(user),
        revoked_at__isnull=True, expires_at__gt=timezone.now(),
    ).update(refresh_digest=token_digest(refresh))
    if changed != 1:
        raise TokenError('Session expired')
    return {'refresh': refresh, 'access': refresh.access_token}


def revoke_token(token):
    AuthSession.objects.filter(pk=session_id(token), user_id=token['user_id']).update(revoked_at=timezone.now())


def revoke_cookies(cookies):
    # A signed older token still identifies its family after rotation. Logout
    # revokes that entire family, including a refresh racing with this request.
    for name, token_class in (('refresh', RefreshToken), ('access', AccessToken)):
        raw = cookies.get(name)
        if not raw:
            continue
        try:
            token = token_class(raw)
            revoke_token(token)
        except (TokenError, KeyError, ValueError, TypeError):
            continue
