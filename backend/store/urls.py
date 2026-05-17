from django.urls import path

from .views import (
    CartAddView,
    CartClearView,
    CartView,
    CategoryListView,
    MeView,
    NotificationListView,
    OrderListView,
    ProductListView,
    RegisterView,
)

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='categories'),
    path('products/', ProductListView.as_view(), name='products'),
    path('orders/', OrderListView.as_view(), name='orders'),
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('cart/', CartView.as_view(), name='cart'),
    path('cart/add/', CartAddView.as_view(), name='cart_add'),
    path('cart/clear/', CartClearView.as_view(), name='cart_clear'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/me/', MeView.as_view(), name='auth_me'),
]
