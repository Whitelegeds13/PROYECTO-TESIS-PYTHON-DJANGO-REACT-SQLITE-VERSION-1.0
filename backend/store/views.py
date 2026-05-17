from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CartItem, Category, Notification, Order, Product
from .serializers import (
    CartItemSerializer,
    CategorySerializer,
    NotificationSerializer,
    OrderSerializer,
    ProductSerializer,
)


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.all().order_by('-is_featured', 'name')


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.select_related('category').all()

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(brand__icontains=search)
                | Q(product_type__icontains=search)
                | Q(description__icontains=search)
            )

        category = (self.request.query_params.get('category') or '').strip()
        if category:
            if category.isdigit():
                qs = qs.filter(category_id=int(category))
            else:
                qs = qs.filter(category__slug=category)

        sort = (self.request.query_params.get('sort') or '').strip().lower()
        if sort in {'offers', 'ofertas'}:
            qs = qs.filter(is_offer=True).order_by('-discount_percent', '-is_featured', 'name')
        elif sort in {'featured', 'destacados'}:
            qs = qs.filter(is_featured=True).order_by('-rating', '-reviews_count', 'name')
        elif sort in {'price_asc', 'precio_asc', 'precio_menor'}:
            qs = qs.order_by('price', 'name')
        elif sort in {'price_desc', 'precio_desc', 'precio_mayor'}:
            qs = qs.order_by('-price', 'name')
        elif sort in {'rating', 'calificacion'}:
            qs = qs.order_by('-rating', '-reviews_count', 'name')
        else:
            qs = qs.order_by('-reviews_count', '-rating', 'name')

        return qs


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    queryset = Order.objects.all().order_by('-id')


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    queryset = Notification.objects.all().order_by('-is_new', '-id')


class CartView(APIView):
    def get(self, request):
        items = list(CartItem.objects.all().order_by('id'))
        subtotal = sum((item.price * item.quantity for item in items), Decimal('0.00'))
        count = sum((item.quantity for item in items), 0)
        return Response(
            {
                'count': count,
                'subtotal': str(subtotal),
                'items': CartItemSerializer(items, many=True).data,
            }
        )


class CartAddView(APIView):
    def post(self, request):
        payload = request.data or {}

        quantity = payload.get('quantity', 1)
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            quantity = 1
        quantity = max(1, quantity)

        product_id = payload.get('product_id')
        product_slug = payload.get('product_slug')

        if product_id or product_slug:
            product = None
            if product_id:
                try:
                    product = Product.objects.get(id=int(product_id))
                except (Product.DoesNotExist, ValueError, TypeError):
                    product = None
            if product is None and product_slug:
                product = Product.objects.filter(slug=str(product_slug)).first()
            if product is None:
                return Response({'detail': 'Producto no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)

            item, created = CartItem.objects.get_or_create(
                product_name=product.name,
                defaults={
                    'product_image_base64': product.image_base64 or '',
                    'quantity': quantity,
                    'price': product.price,
                },
            )
            if not created:
                item.quantity = item.quantity + quantity
                item.price = product.price
                if product.image_base64:
                    item.product_image_base64 = product.image_base64
                item.save(update_fields=['quantity', 'price', 'product_image_base64'])
        else:
            name = str(payload.get('product_name') or '').strip()
            if not name:
                return Response({'detail': 'Falta product_id o product_name.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                price = Decimal(str(payload.get('price') or '0'))
            except Exception:
                price = Decimal('0')

            image_base64 = str(payload.get('product_image_base64') or '').strip()
            item, created = CartItem.objects.get_or_create(
                product_name=name,
                defaults={
                    'product_image_base64': image_base64,
                    'quantity': quantity,
                    'price': price,
                },
            )
            if not created:
                item.quantity = item.quantity + quantity
                item.price = price
                if image_base64:
                    item.product_image_base64 = image_base64
                item.save(update_fields=['quantity', 'price', 'product_image_base64'])

        items = list(CartItem.objects.all().order_by('id'))
        subtotal = sum((ci.price * ci.quantity for ci in items), Decimal('0.00'))
        count = sum((ci.quantity for ci in items), 0)
        return Response(
            {
                'count': count,
                'subtotal': str(subtotal),
                'items': CartItemSerializer(items, many=True).data,
            }
        )


class CartClearView(APIView):
    def delete(self, request):
        CartItem.objects.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data or {}
        username = str(payload.get('username') or '').strip()
        email = str(payload.get('email') or '').strip()
        password = str(payload.get('password') or '')

        if not username:
            return Response({'detail': 'username es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'detail': 'password es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except Exception as e:
            msg = e.messages[0] if getattr(e, 'messages', None) else 'Contraseña inválida.'
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'El username ya existe.'}, status=status.HTTP_400_BAD_REQUEST)
        if email and User.objects.filter(email=email).exists():
            return Response({'detail': 'El email ya existe.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email or '', password=password)
        return Response({'id': user.id, 'username': user.username, 'email': user.email}, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({'id': u.id, 'username': u.username, 'email': u.email})
