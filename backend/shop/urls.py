from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/send-otp/', views.send_otp),
    path('auth/me/', views.me),
    path('auth/logout/', views.logout_view),
    path('auth/me/update/', views.update_profile),
    path('auth/google/', views.google_auth),

    path('products/', views.products_list),
    path('products/<str:pk>/', views.product_detail),

    # Admin endpoints
    path('admin/stats/', views.admin_stats),
    path('admin/orders/', views.admin_orders),
    path('admin/orders/<str:pk>/status/', views.admin_update_order_status),
    path('admin/users/', views.admin_users),
    path('admin/messages/', views.admin_messages),
    path('admin/messages/<str:pk>/mark-read/', views.admin_mark_message_read),
    path('admin/products/', views.admin_products),
    path('admin/products/<str:pk>/', views.admin_product_detail),

    path('orders/create/', views.create_order),
    path('orders/my/', views.my_orders),

    path('settings/', views.site_settings),
    path('contact/', views.contact),
]
