from django.contrib import admin

from .models import CartItem, Category, Notification, Order, Product


admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Order)
admin.site.register(Notification)
admin.site.register(CartItem)

