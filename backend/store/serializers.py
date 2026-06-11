from rest_framework import serializers

from .models import CartItem, Category, Notification, Order, Product


class CategorySerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

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
    id = serializers.CharField(read_only=True)
    category = CategorySerializer()
    image_url = serializers.SerializerMethodField()

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
            'image_url',
            'is_offer',
            'is_featured',
        ]

    def get_image_url(self, obj):
        if getattr(obj, 'image_file', None):
            try:
                return obj.image_file.url
            except Exception:
                return None
        return None


class EmployeeProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'name',
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
            'image_file',
            'is_offer',
            'is_featured',
        ]


class OrderSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)

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
    id = serializers.CharField(read_only=True)

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
    id = serializers.CharField(read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id',
            'product_name',
            'product_image_base64',
            'product_image_url',
            'quantity',
            'price',
        ]
