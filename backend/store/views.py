from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from django.utils.text import slugify
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CartItem, Category, Notification, Order, Product
from .serializers import (
    CartItemSerializer,
    CategorySerializer,
    EmployeeProductCreateSerializer,
    NotificationSerializer,
    OrderSerializer,
    ProductSerializer,
)


class CategoryListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer

    def get_queryset(self):
        defaults = [
            {
                'slug': 'tarjetas-graficas',
                'name': 'Tarjetas Gráficas',
                'subtitle': 'Potencia bruta para resoluciones 4K',
                'layout_type': 'xl',
            },
            {
                'slug': 'procesadores',
                'name': 'Procesadores',
                'subtitle': 'Núcleos listos para dominar',
                'layout_type': 'md',
            },
            {
                'slug': 'memoria-ram',
                'name': 'Memoria RAM',
                'subtitle': 'DDR5 con RGB y baja latencia',
                'layout_type': 'md',
            },
            {
                'slug': 'almacenamiento',
                'name': 'Almacenamiento',
                'subtitle': 'NVMe Gen4/Gen5 a velocidad neón',
                'layout_type': 'md',
            },
            {
                'slug': 'teclados',
                'name': 'Teclados',
                'subtitle': 'Mecánicos, inalámbricos y RGB',
                'layout_type': 'md',
            },
            {
                'slug': 'fuente-de-poder',
                'name': 'Fuente de poder',
                'subtitle': 'Modulares y certificación alta',
                'layout_type': 'md',
            },
            {
                'slug': 'audifonos',
                'name': 'Audífonos',
                'subtitle': 'Audio surround, baja latencia y micrófono pro',
                'layout_type': 'md',
            },
            {
                'slug': 'placa',
                'name': 'Placa',
                'subtitle': 'Chipsets gaming y VRM reforzado',
                'layout_type': 'md',
            },
        ]

        for c in defaults:
            try:
                Category.objects.get_or_create(
                    slug=c['slug'],
                    defaults={
                        'name': c['name'],
                        'subtitle': c['subtitle'],
                        'layout_type': c['layout_type'],
                        'is_featured': True,
                    },
                )
            except Exception:
                pass

        return Category.objects.all().order_by('-is_featured', 'name')


class ProductListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
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


class ProductDetailView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related('category').all()
    lookup_field = 'slug'


class OrderListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = OrderSerializer
    queryset = Order.objects.all().order_by('-id')


class NotificationListView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = NotificationSerializer
    queryset = Notification.objects.all().order_by('-is_new', '-id')


class CartView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
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
    authentication_classes = []
    permission_classes = [AllowAny]
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
                    'product_image_url': getattr(getattr(product, 'image_file', None), 'url', '') or '',
                    'quantity': quantity,
                    'price': product.price,
                },
            )
            if not created:
                item.quantity = item.quantity + quantity
                item.price = product.price
                if product.image_base64:
                    item.product_image_base64 = product.image_base64
                img_url = getattr(getattr(product, 'image_file', None), 'url', '') or ''
                if img_url:
                    item.product_image_url = img_url
                item.save(update_fields=['quantity', 'price', 'product_image_base64', 'product_image_url'])
        else:
            name = str(payload.get('product_name') or '').strip()
            if not name:
                return Response({'detail': 'Falta product_id o product_name.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                price = Decimal(str(payload.get('price') or '0'))
            except Exception:
                price = Decimal('0')

            image_base64 = str(payload.get('product_image_base64') or '').strip()
            image_url = str(payload.get('product_image_url') or '').strip()
            item, created = CartItem.objects.get_or_create(
                product_name=name,
                defaults={
                    'product_image_base64': image_base64,
                    'product_image_url': image_url,
                    'quantity': quantity,
                    'price': price,
                },
            )
            if not created:
                item.quantity = item.quantity + quantity
                item.price = price
                if image_base64:
                    item.product_image_base64 = image_base64
                if image_url:
                    item.product_image_url = image_url
                item.save(update_fields=['quantity', 'price', 'product_image_base64', 'product_image_url'])

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
    authentication_classes = []
    permission_classes = [AllowAny]
    def delete(self, request):
        CartItem.objects.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemDeleteView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    def delete(self, request, pk: int):
        CartItem.objects.filter(id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegisterView(APIView):
    authentication_classes = []
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
        return Response(
            {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'is_staff': bool(getattr(u, 'is_staff', False)),
                'is_superuser': bool(getattr(u, 'is_superuser', False)),
            }
        )


class EmployeeProductListCreateView(generics.ListCreateAPIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.select_related('category').all().order_by('-id')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EmployeeProductCreateSerializer
        return ProductSerializer

    def create(self, request, *args, **kwargs):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data.get('name') or ''
        base = slugify(name)[:180] or 'producto'
        slug = base
        i = 2
        while Product.objects.filter(slug=slug).exists():
            slug = f'{base}-{i}'
            i += 1

        stock = serializer.validated_data.get('stock') or 0
        status_value = serializer.validated_data.get('status')
        if not status_value:
            status_value = Product.Status.DISPONIBLE
            if stock <= 0:
                status_value = Product.Status.AGOTADO
            elif stock <= 5:
                status_value = Product.Status.STOCK_BAJO

        product = serializer.save(
            slug=slug,
            status=status_value,
            image_base64='',
        )

        out = ProductSerializer(product).data
        headers = self.get_success_headers(out)
        return Response(out, status=status.HTTP_201_CREATED, headers=headers)

    def list(self, request, *args, **kwargs):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)
