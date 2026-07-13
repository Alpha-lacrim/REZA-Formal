import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from shop.models import Product, ProductVariant, ShippingMethod, SiteSettings


PRODUCTS = [
    {
        'id': 'suit-charcoal-check',
        'name': 'کت و شلوار چهارخانه ذغالی',
        'price': 16800000,
        'currency': 'Toman',
        'images': ['/images/suit/charcoal-check.jpg'],
        'short': 'سه‌تکه رسمی با پارچه پشمی',
        'description': 'کت و شلوار سه‌تکه با بافت ظریف، مناسب جلسات کاری و مراسم رسمی.',
        'category': 'suits',
        'fabric': 'پشم',
        'stock': 5,
        'featured': True,
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
        'featured': True,
    },
    {
        'id': 'suit-burgundy-signature',
        'name': 'کت و شلوار زرشکی سیگنیچر',
        'price': 18000000,
        'currency': 'Toman',
        'images': ['/images/suit/sp_red_suit.jpg'],
        'short': 'انتخابی شاخص برای مراسم',
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
        'featured': True,
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
        'images': ['/images/accessories/Understanding_pocket_squares_03396d68-5ee7-45cd-aaae-7f72913caa43_600x600.webp'],
        'short': 'جزئیات ظریف برای استایل رسمی',
        'description': 'دستمال جیب با پارچه ابریشمی و نقش رسمی برای تکمیل پوشش.',
        'category': 'accessories',
        'fabric': 'ابریشم',
        'stock': 40,
    },
]


SHIPPING_METHODS = [
    {
        'code': 'STANDARD',
        'name': 'ارسال استاندارد',
        'description': 'ارسال با هماهنگی فروشگاه؛ زمان نهایی پس از ثبت سفارش تأیید می‌شود.',
        'price': 150000,
        'free_over': 20000000,
        'estimated_days_min': 2,
        'estimated_days_max': 5,
        'sort_order': 10,
    },
    {
        'code': 'PICKUP',
        'name': 'تحویل حضوری',
        'description': 'تحویل رایگان از فروشگاه پس از اعلام آماده بودن سفارش.',
        'price': 0,
        'estimated_days_min': 1,
        'estimated_days_max': 2,
        'sort_order': 20,
    },
]


class Command(BaseCommand):
    help = 'Seed optional configured superuser, catalog, variants, shipping, and site settings'

    def _seed_superuser(self):
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '').strip().lower()
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin').strip()

        if not email and not password:
            self.stdout.write('Skipped superuser creation (credentials are not configured)')
            return
        if not email or not password:
            raise CommandError('DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD must be set together')
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
            raise CommandError('DJANGO_SUPERUSER_EMAIL belongs to an account that is not an active superuser')
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
        created_variants = 0
        if not Product.objects.exists():
            for product_data in PRODUCTS:
                product_id = product_data['id']
                defaults = {key: value for key, value in product_data.items() if key != 'id'}
                product, created = Product.objects.get_or_create(id=product_id, defaults=defaults)
                created_products += int(created)
                _, variant_created = ProductVariant.objects.get_or_create(
                    product=product,
                    size='',
                    color='',
                    defaults={
                        'sku': f'DEFAULT-{product.id}'.upper(),
                        'stock': product.stock,
                        'is_active': product.is_active,
                    },
                )
                created_variants += int(variant_created)
        self.stdout.write(
            f'Catalog seed complete ({created_products} products and {created_variants} variants created)'
        )

        created_shipping = 0
        if not ShippingMethod.objects.exists():
            for method in SHIPPING_METHODS:
                _, created = ShippingMethod.objects.get_or_create(code=method['code'], defaults=method)
                created_shipping += int(created)
        self.stdout.write(f'Shipping seed complete ({created_shipping} methods created)')

        if not SiteSettings.objects.exists():
            SiteSettings.objects.create(
                about_title='داستان رضا فرمال',
                about_description='پوشاک رسمی با تمرکز بر دوخت دقیق، پارچه باکیفیت و تجربه خرید مطمئن.',
            )
            self.stdout.write('Created default site settings')
