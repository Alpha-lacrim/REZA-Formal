import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from shop.models import Product, SiteSettings


PRODUCTS = [
    {
        'id': 'suit-charcoal-check',
        'name': 'کت و شلوار چهارخانه ذغالی',
        'price': 16800000,
        'currency': 'Toman',
        'images': ['/images/suit/charcoal-check.jpg'],
        'short': 'سه تکه رسمی با پارچه پشم',
        'description': 'کت و شلوار سه تکه با بافت ظریف، مناسب جلسات کاری و مراسم رسمی.',
        'category': 'suits',
        'fabric': 'پشم',
        'stock': 5,
    },
    {
        'id': 'suit-midnight-navy',
        'name': 'کت و شلوار سرمه‌ای کلاسیک',
        'price': 15500000,
        'currency': 'Toman',
        'images': ['/images/suit/midnight.jpg'],
        'short': 'برش مدرن برای موقعیت‌های رسمی',
        'description': 'مدلی کلاسیک با رنگ سرمه‌ای عمیق و دوخت تمیز برای استفاده روزمره رسمی.',
        'category': 'suits',
        'fabric': 'پشم و ابریشم',
        'stock': 8,
    },
    {
        'id': 'suit-burgundy-signature',
        'name': 'کت و شلوار زرشکی سیگنیچر',
        'price': 18000000,
        'currency': 'Toman',
        'images': ['/images/suit/sp_red_suit.jpg'],
        'short': 'انتخاب شاخص برای مراسم',
        'description': 'رنگ زرشکی عمیق با ظاهر مجلسی برای مشتریانی که به دنبال تمایز هستند.',
        'category': 'suits',
        'fabric': 'ابریشم و پشم',
        'stock': 2,
    },
    {
        'id': 'shirt-white-classic',
        'name': 'پیراهن کلاسیک سفید',
        'price': 2850000,
        'currency': 'Toman',
        'images': ['/images/shirts/s0.jpg'],
        'short': 'پیراهن رسمی روزمره',
        'description': 'پیراهن سفید با بافت ریز و پارچه درجه‌یک برای تکمیل استایل رسمی.',
        'category': 'shirts',
        'fabric': 'پنبه',
        'stock': 20,
    },
    {
        'id': 'shirt-navy-premium',
        'name': 'پیراهن سرمه‌ای پریمیوم',
        'price': 3100000,
        'currency': 'Toman',
        'images': ['/images/shirts/s1.jpg'],
        'short': 'رنگ عمیق و پارچه لطیف',
        'description': 'پیراهنی مناسب کت‌های رسمی، جلسات کاری و مراسم شبانه.',
        'category': 'shirts',
        'fabric': 'پنبه و ابریشم',
        'stock': 18,
    },
    {
        'id': 'blazer-ms63',
        'name': 'کت رسمی MS-63',
        'price': 17500000,
        'currency': 'Toman',
        'images': ['/images/suit/MS-63.webp'],
        'short': 'دوخت سفارشی ممتاز',
        'description': 'کت رسمی با دوخت دقیق و پارچه ممتاز برای موقعیت‌های سطح بالا.',
        'category': 'blazers',
        'fabric': 'پشم',
        'stock': 4,
    },
    {
        'id': 'accessory-brooch',
        'name': 'بج سینه رسمی',
        'price': 650000,
        'currency': 'Toman',
        'images': ['/images/accessories/brooch.avif'],
        'short': 'اکسسوری دست‌ساز لوکس',
        'description': 'بج سینه رسمی برای تکمیل ظاهر کت و شلوار مردانه.',
        'category': 'accessories',
        'fabric': 'فلز',
        'stock': 30,
    },
    {
        'id': 'accessory-pocket-square',
        'name': 'دستمال جیب ابریشمی',
        'price': 450000,
        'currency': 'Toman',
        'images': [
            '/images/accessories/Understanding_pocket_squares_03396d68-5ee7-45cd-aaae-7f72913caa43_600x600.webp'
        ],
        'short': 'جزئیات ظریف برای استایل رسمی',
        'description': 'دستمال جیب با پارچه ابریشمی و نقش رسمی برای تکمیل پوشش.',
        'category': 'accessories',
        'fabric': 'ابریشم',
        'stock': 40,
    },
]


class Command(BaseCommand):
    help = 'Seed optional configured superuser, catalog products, and site settings'

    def _seed_superuser(self):
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '').strip().lower()
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin').strip()

        if not email and not password:
            self.stdout.write('Skipped superuser creation (credentials are not configured)')
            return
        if not email or not password:
            raise CommandError(
                'DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD must be set together'
            )
        if not username or len(username) > 150:
            raise CommandError('DJANGO_SUPERUSER_USERNAME must contain 1 to 150 characters')

        try:
            validate_email(email)
        except ValidationError as exc:
            raise CommandError('DJANGO_SUPERUSER_EMAIL is not a valid email address') from exc

        User = get_user_model()
        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            if existing.is_superuser and existing.is_active:
                self.stdout.write('Configured active superuser already exists; account was not modified')
                return
            raise CommandError(
                'DJANGO_SUPERUSER_EMAIL belongs to an account that is not an active superuser'
            )
        if User.objects.filter(username=username).exists():
            raise CommandError('DJANGO_SUPERUSER_USERNAME is already in use by another account')

        candidate = User(username=username, email=email)
        try:
            validate_password(password, user=candidate)
        except ValidationError as exc:
            raise CommandError(
                'DJANGO_SUPERUSER_PASSWORD does not pass the configured password validators: '
                + '; '.join(exc.messages)
            ) from exc

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS('Created configured superuser'))

    def handle(self, *args, **options):
        self._seed_superuser()

        created_products = 0
        for product_data in PRODUCTS:
            product_id = product_data['id']
            defaults = {key: value for key, value in product_data.items() if key != 'id'}
            _, created = Product.objects.get_or_create(id=product_id, defaults=defaults)
            created_products += int(created)
        self.stdout.write(f'Catalog seed complete ({created_products} products created)')

        if not SiteSettings.objects.exists():
            SiteSettings.objects.create(
                about_title='داستان رضا فرمال',
                about_description='متن پیش‌فرض درباره‌ی رضا فرمال',
            )
            self.stdout.write('Created default site settings')
