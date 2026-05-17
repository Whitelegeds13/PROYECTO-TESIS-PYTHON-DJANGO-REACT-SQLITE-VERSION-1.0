from rest_framework import serializers

from .models import CartItem, Category, Notification, Order, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'subtitle',
            'image_base64',
            'is_featured',
            'layout_type',
        ]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'brand',
            'product_type',
            'category',
            'description',
            'specs',
            'price',
            'old_price',
            'discount_percent',
            'stock',
            'status',
            'rating',
            'reviews_count',
            'image_base64',
            'is_offer',
            'is_featured',
        ]


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id',
            'order_code',
            'product_name',
            'product_description',
            'product_image_base64',
            'quantity',
            'total',
            'status',
            'date_label',
            'extra_info',
            'can_download_invoice',
            'can_track',
            'can_cancel',
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'type',
            'time_label',
            'is_new',
        ]


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = [
            'id',
            'product_name',
            'product_image_base64',
            'quantity',
            'price',
        ]

