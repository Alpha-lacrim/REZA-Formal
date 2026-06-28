from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    # Extend user with role and 2FA secret
    ROLE_CHOICES = (('user', 'User'), ('admin', 'Admin'))
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default='user')
    two_factor_secret = models.CharField(max_length=64, blank=True, null=True)
    address = models.TextField(blank=True)

    def is_admin(self):
        return self.role == 'admin' or self.is_staff


# Ensure any Django superuser is treated as admin (keeps role/is_staff in sync).
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=User)
def _ensure_superuser_admin(sender, instance, **kwargs):
    try:
        if instance.is_superuser and instance.role != 'admin':
            instance.role = 'admin'
            instance.is_staff = True
            instance.save(update_fields=['role', 'is_staff'])
    except Exception:
        # Don't let signal errors break normal flow; admin sync can be fixed manually
        pass


class Product(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    short = models.CharField(max_length=512, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=16, default='Toman')
    category = models.CharField(max_length=64, default='suit')
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    images = models.JSONField(default=list, blank=True)
    fabric = models.CharField(max_length=255, blank=True)
    stock = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS = (('pending','pending'),('processing','processing'),('shipped','shipped'),('delivered','delivered'),('cancelled','cancelled'))
    id = models.CharField(max_length=32, primary_key=True)
    user = models.ForeignKey('shop.User', on_delete=models.SET_NULL, null=True)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=STATUS, default='pending')
    shipping_address = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    qty = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=12, decimal_places=2)


class ContactMessage(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)


class SiteSettings(models.Model):
    about_title = models.CharField(max_length=255, blank=True)
    about_description = models.TextField(blank=True)
    about_image = models.ImageField(upload_to='site/', blank=True, null=True)
    hero_image = models.ImageField(upload_to='site/', blank=True, null=True)
    suits_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    shirts_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    blazers_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    accessories_section_image = models.ImageField(upload_to='site/', blank=True, null=True)
    bespoke_section_image = models.ImageField(upload_to='site/', blank=True, null=True)

    def __str__(self):
        return 'Site Settings'
