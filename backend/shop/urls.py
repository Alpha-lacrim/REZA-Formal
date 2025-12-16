from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/send-otp/', views.send_otp),

    path('products/', views.products_list),
    path('products/<str:pk>/', views.product_detail),

    path('orders/create/', views.create_order),
    path('orders/my/', views.my_orders),

    path('settings/', views.site_settings),
    path('contact/', views.contact),
]
