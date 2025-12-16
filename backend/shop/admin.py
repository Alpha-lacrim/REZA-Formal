from django.contrib import admin
from .models import User, Product, Order, OrderItem, ContactMessage, SiteSettings

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username','email','role','is_staff')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id','name','price','stock','category')
    search_fields = ('name','category')

class OrderItemInline(admin.TabularInline):
    model = OrderItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id','user','total','status','created_at')
    inlines = [OrderItemInline]

@admin.register(ContactMessage)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('name','email','read','created_at')

@admin.register(SiteSettings)
class SettingsAdmin(admin.ModelAdmin):
    list_display = ('about_title','updated_at')
