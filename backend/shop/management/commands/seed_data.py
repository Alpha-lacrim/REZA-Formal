from django.core.management.base import BaseCommand
from shop.models import User, Product, SiteSettings
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Seed admin user and default site settings'

    def handle(self, *args, **options):
        User = get_user_model()
        if not User.objects.filter(email='admin@reza.com').exists():
            admin = User.objects.create_superuser(username='admin', email='admin@reza.com', password='admin')
            admin.role = 'admin'
            admin.save()
            self.stdout.write('Created admin@reza.com / admin')

        if not SiteSettings.objects.exists():
            SiteSettings.objects.create(
                about_title='داستان رضا فرمال',
                about_description='متن پیش‌فرض درباره‌ی رضا فرمال',
            )
            self.stdout.write('Created default site settings')
