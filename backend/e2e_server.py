"""Create synthetic fixtures in a temporary database, serve, then remove it."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory


def main():
    with TemporaryDirectory(prefix='reza-e2e-') as directory:
        Path(directory, '.disposable').touch()
        os.environ['REZA_E2E_DIRECTORY'] = directory
        os.environ['DJANGO_SETTINGS_MODULE'] = 'reza_backend.e2e_settings'
        import django
        django.setup()
        from django.core.management import call_command
        from shop.models import Product, ProductVariant, ShippingMethod, User
        call_command('migrate', interactive=False, verbosity=0)
        User.objects.create_user('e2e-buyer', 'buyer@example.invalid', 'E2e-only-password-493!', first_name='Smoke Buyer')
        User.objects.create_superuser('e2e-admin', 'admin@example.invalid', 'E2e-only-password-493!', first_name='Smoke Admin')
        product = Product.objects.create(id='e2e-suit', name='E2E Suit', price=100, stock=10, category='suit')
        ProductVariant.objects.create(product=product, sku='E2E-50', size='50', stock=10)
        ShippingMethod.objects.create(code='E2E', name='Test shipping', price=10)
        call_command('runserver', '127.0.0.1:18080', use_reloader=False)


if __name__ == '__main__':
    main()
