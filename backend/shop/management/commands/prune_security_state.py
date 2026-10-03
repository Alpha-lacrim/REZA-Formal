from django.core.management.base import BaseCommand
from django.utils import timezone
from shop.models import AuthSession, ThrottleBucket


class Command(BaseCommand):
    help = 'Remove expired sessions and throttle windows; never removes active records.'

    def handle(self, *args, **options):
        now = timezone.now()
        sessions, _ = AuthSession.objects.filter(expires_at__lt=now).delete()
        buckets, _ = ThrottleBucket.objects.filter(expires_at__lt=now).delete()
        self.stdout.write(f'Expired security state removed: sessions={sessions}, windows={buckets}')
