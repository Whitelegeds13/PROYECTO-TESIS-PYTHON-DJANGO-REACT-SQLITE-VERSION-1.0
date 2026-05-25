from decimal import Decimal
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Sum
from django.utils.text import slugify
from django.utils.timezone import timedelta
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CartItem, Category, LoginEvent, Notification, Order, Payment, Product
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

        if not Category.objects.exists():
            Category.objects.bulk_create(
                [
                    Category(
                        slug=c['slug'],
                        name=c['name'],
                        subtitle=c['subtitle'],
                        layout_type=c['layout_type'],
                        is_featured=True,
                    )
                    for c in defaults
                ],
                ignore_conflicts=True,
            )

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
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-id')


class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.all().order_by('-is_new', '-id')


class CartView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        items = list(CartItem.objects.filter(user=request.user).order_by('id'))
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
    permission_classes = [IsAuthenticated]
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

            if product.stock <= 0:
                return Response({'detail': 'Producto sin stock.'}, status=status.HTTP_400_BAD_REQUEST)

            item, created = CartItem.objects.get_or_create(
                product_name=product.name,
                user=request.user,
                defaults={
                    'product': product,
                    'product_image_base64': product.image_base64 or '',
                    'product_image_url': getattr(getattr(product, 'image_file', None), 'url', '') or '',
                    'quantity': quantity,
                    'price': product.price,
                },
            )
            if not created:
                next_qty = item.quantity + quantity
                if next_qty > product.stock:
                    return Response({'detail': 'Cantidad supera el stock disponible.'}, status=status.HTTP_400_BAD_REQUEST)
                item.quantity = next_qty
                item.price = product.price
                item.product = product
                if product.image_base64:
                    item.product_image_base64 = product.image_base64
                img_url = getattr(getattr(product, 'image_file', None), 'url', '') or ''
                if img_url:
                    item.product_image_url = img_url
                item.save(update_fields=['quantity', 'price', 'product', 'product_image_base64', 'product_image_url'])
            else:
                if quantity > product.stock:
                    item.delete()
                    return Response({'detail': 'Cantidad supera el stock disponible.'}, status=status.HTTP_400_BAD_REQUEST)
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
                user=request.user,
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

        items = list(CartItem.objects.filter(user=request.user).order_by('id'))
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
    permission_classes = [IsAuthenticated]
    def delete(self, request):
        CartItem.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request, pk: int):
        CartItem.objects.filter(id=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk: int):
        payload = request.data or {}
        quantity = payload.get('quantity')
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({'detail': 'quantity inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            return Response({'detail': 'quantity debe ser >= 1.'}, status=status.HTTP_400_BAD_REQUEST)

        item = CartItem.objects.filter(id=pk, user=request.user).select_related('product').first()
        if not item:
            return Response({'detail': 'Item no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if item.product and quantity > int(item.product.stock or 0):
            return Response({'detail': 'Cantidad supera el stock disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        CartItem.objects.filter(id=pk, user=request.user).update(quantity=quantity)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        with transaction.atomic():
            items = list(CartItem.objects.filter(user=request.user).select_related('product').order_by('id'))
            if not items:
                return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

            product_ids = [it.product_id for it in items if it.product_id]
            products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids)}
            for it in items:
                p = products.get(it.product_id) if it.product_id else None
                if not p:
                    return Response({'detail': f'Producto no encontrado para actualizar stock: {it.product_name}'}, status=status.HTTP_400_BAD_REQUEST)
                if int(it.quantity or 0) > int(p.stock or 0):
                    return Response({'detail': f'Stock insuficiente para: {p.name}'}, status=status.HTTP_400_BAD_REQUEST)

            created_ids = []
            for it in items:
                p = products.get(it.product_id)
                p.stock = int(p.stock or 0) - int(it.quantity or 0)
                if p.stock <= 0:
                    p.stock = 0
                    p.status = Product.Status.AGOTADO
                elif p.stock <= 5:
                    p.status = Product.Status.STOCK_BAJO
                else:
                    p.status = Product.Status.DISPONIBLE
                p.save(update_fields=['stock', 'status'])

                order_code = uuid.uuid4().hex[:10].upper()
                while Order.objects.filter(order_code=order_code).exists():
                    order_code = uuid.uuid4().hex[:10].upper()

                total = (it.price or Decimal('0.00')) * int(it.quantity or 0)
                order = Order.objects.create(
                    user=request.user,
                    order_code=order_code,
                    product=p,
                    product_name=it.product_name,
                    product_description='',
                    product_image_base64=it.product_image_base64 or '',
                    quantity=int(it.quantity or 1),
                    total=total,
                    status=Order.Status.PROCESANDO,
                    date_label='',
                    extra_info='',
                    can_download_invoice=False,
                    can_track=False,
                    can_cancel=True,
                )
                created_ids.append(order.id)

            CartItem.objects.filter(user=request.user).delete()
            return Response({'created': created_ids}, status=status.HTTP_201_CREATED)


class PaymentCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            payload = request.data or {}
            method = str(payload.get('method') or '').strip().lower()
            if method not in {Payment.Method.CARD, Payment.Method.BANK_TRANSFER, Payment.Method.YAPE_PLIN}:
                return Response({'detail': 'Método de pago inválido.'}, status=status.HTTP_400_BAD_REQUEST)

            items = list(CartItem.objects.filter(user=request.user).select_related('product').order_by('id'))
            if not items:
                return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

            product_ids = [it.product_id for it in items if it.product_id]
            products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids)}
            for it in items:
                p = products.get(it.product_id) if it.product_id else None
                if not p:
                    return Response({'detail': f'Producto no encontrado para actualizar stock: {it.product_name}'}, status=status.HTTP_400_BAD_REQUEST)
                if int(it.quantity or 0) > int(p.stock or 0):
                    return Response({'detail': f'Stock insuficiente para: {p.name}'}, status=status.HTTP_400_BAD_REQUEST)

            subtotal = sum(((it.price or Decimal('0.00')) * int(it.quantity or 0) for it in items), Decimal('0.00'))
            shipping = Decimal('0.00')
            igv = subtotal * Decimal('0.18')
            total = subtotal + shipping + igv

            if method == Payment.Method.CARD:
                card_holder_name = str(payload.get('card_holder_name') or '').strip()
                card_number = str(payload.get('card_number') or '').strip().replace(' ', '')
                card_expiry = str(payload.get('card_expiry') or '').strip()
                card_cvv = str(payload.get('card_cvv') or '').strip()

                if not card_holder_name or not card_number or not card_expiry or not card_cvv:
                    return Response({'detail': 'Completa los datos de la tarjeta.'}, status=status.HTTP_400_BAD_REQUEST)

                digits = ''.join([c for c in card_number if c.isdigit()])
                if len(digits) < 12:
                    return Response({'detail': 'Número de tarjeta inválido.'}, status=status.HTTP_400_BAD_REQUEST)
                card_last4 = digits[-4:]
                card_expiry_short = card_expiry[:7]

                payment_code = self._generate_payment_code()
                payment = Payment.objects.create(
                    user=request.user,
                    payment_code=payment_code,
                    method=method,
                    status=Payment.Status.CONFIRMED,
                    subtotal=subtotal,
                    shipping=shipping,
                    igv=igv,
                    total=total,
                    card_holder_name=card_holder_name,
                    card_last4=card_last4,
                    card_expiry=card_expiry_short,
                )
            else:
                receipt = request.FILES.get('receipt_file')
                if not receipt:
                    return Response({'detail': 'Sube el comprobante.'}, status=status.HTTP_400_BAD_REQUEST)

                if method == Payment.Method.BANK_TRANSFER:
                    bank_name = 'BCP Soles'
                    bank_account = '193-94827163-0-12'
                    bank_cci = '002-193009482716301211'
                else:
                    bank_name = 'Yape / Plin'
                    bank_account = '987 654 321'
                    bank_cci = ''

                payment_code = self._generate_payment_code()
                payment = Payment.objects.create(
                    user=request.user,
                    payment_code=payment_code,
                    method=method,
                    status=Payment.Status.PENDING,
                    subtotal=subtotal,
                    shipping=shipping,
                    igv=igv,
                    total=total,
                    bank_name=bank_name,
                    bank_account=bank_account,
                    bank_cci=bank_cci,
                    receipt_file=receipt,
                )

            created_ids = []
            for it in items:
                p = products.get(it.product_id)
                p.stock = int(p.stock or 0) - int(it.quantity or 0)
                if p.stock <= 0:
                    p.stock = 0
                    p.status = Product.Status.AGOTADO
                elif p.stock <= 5:
                    p.status = Product.Status.STOCK_BAJO
                else:
                    p.status = Product.Status.DISPONIBLE
                p.save(update_fields=['stock', 'status'])

                order_code = uuid.uuid4().hex[:10].upper()
                while Order.objects.filter(order_code=order_code).exists():
                    order_code = uuid.uuid4().hex[:10].upper()

                line_total = (it.price or Decimal('0.00')) * int(it.quantity or 0)
                order = Order.objects.create(
                    user=request.user,
                    payment=payment,
                    order_code=order_code,
                    product=p,
                    product_name=it.product_name,
                    product_description='',
                    product_image_base64=it.product_image_base64 or '',
                    quantity=int(it.quantity or 1),
                    total=line_total,
                    status=Order.Status.PROCESANDO,
                    date_label='',
                    extra_info='',
                    can_download_invoice=False,
                    can_track=False,
                    can_cancel=True,
                )
                created_ids.append(order.id)

            CartItem.objects.filter(user=request.user).delete()
            return Response(
                {
                    'payment_id': payment.id,
                    'payment_code': payment.payment_code,
                    'sync_status': payment.sync_status,
                    'created': created_ids,
                },
                status=status.HTTP_201_CREATED,
            )

    def _generate_payment_code(self):
        year = timezone.now().year
        while True:
            raw = uuid.uuid4().hex.upper()
            code = f'PG-{raw[:4]}-{raw[4:6]}-{year}'
            if not Payment.objects.filter(payment_code=code).exists():
                return code


class PaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_code: str):
        if getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        payment = Payment.objects.filter(payment_code=payment_code, user=request.user).first()
        if not payment:
            return Response({'detail': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                'payment_id': payment.id,
                'payment_code': payment.payment_code,
                'method': payment.method,
                'status': payment.status,
                'sync_status': payment.sync_status,
                'subtotal': str(payment.subtotal),
                'shipping': str(payment.shipping),
                'igv': str(payment.igv),
                'total': str(payment.total),
                'created_at': payment.created_at,
            }
        )


class EmployeeDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        User = get_user_model()
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_24h = now - timedelta(hours=24)

        clients_total = User.objects.filter(is_staff=False).count()
        clients_month = User.objects.filter(is_staff=False, date_joined__gte=month_start).count()

        logins_24h = LoginEvent.objects.filter(created_at__gte=last_24h).count()

        stock_units = Product.objects.aggregate(total=Sum('stock')).get('total') or 0

        payments_today = Payment.objects.filter(created_at__date=now.date()).count()

        deliveries_pending = Order.objects.exclude(status=Order.Status.ENTREGADO).count()

        activity = []
        for u in User.objects.filter(date_joined__gte=month_start).order_by('-date_joined')[:5]:
            activity.append(
                {
                    'type': 'account_created',
                    'label': f'Nueva cuenta creada: {u.username}',
                    'created_at': u.date_joined,
                    'ref': '',
                }
            )
        for p in Payment.objects.order_by('-created_at')[:5]:
            activity.append(
                {
                    'type': 'payment',
                    'label': f'Pago registrado: {p.payment_code}',
                    'created_at': p.created_at,
                    'ref': p.payment_code,
                }
            )
        for o in Order.objects.order_by('-id')[:5]:
            activity.append(
                {
                    'type': 'order',
                    'label': f'Pedido: {o.order_code}',
                    'created_at': now,
                    'ref': o.order_code,
                }
            )

        activity = sorted(activity, key=lambda x: x.get('created_at') or now, reverse=True)[:8]

        return Response(
            {
                'clients_total': clients_total,
                'clients_month': clients_month,
                'logins_24h': logins_24h,
                'stock_units': int(stock_units),
                'payments_today': payments_today,
                'deliveries_pending': deliveries_pending,
                'activity': activity,
            }
        )


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data or {}
        full_name = str(payload.get('full_name') or '').strip()
        email = str(payload.get('email') or '').strip()
        password = str(payload.get('password') or '')

        if not full_name:
            return Response({'detail': 'El nombre completo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({'detail': 'El correo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'detail': 'password es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except Exception:
            return Response({'detail': 'Correo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except Exception as e:
            msg = e.messages[0] if getattr(e, 'messages', None) else 'Contraseña inválida.'
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        if User.objects.filter(email__iexact=email).exists():
            return Response({'detail': 'El correo ya existe.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username__iexact=email).exists():
            return Response({'detail': 'El correo ya existe.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=email, email=email, password=password)
        user.first_name = full_name
        user.save(update_fields=['first_name'])
        return Response({'id': user.id, 'username': user.username, 'email': user.email}, status=status.HTTP_201_CREATED)


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        raw = str(attrs.get('username') or '').strip()
        if raw and '@' in raw:
            User = get_user_model()
            u = User.objects.filter(email__iexact=raw).first()
            if u:
                attrs['username'] = u.get_username()
        return super().validate(attrs)


class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        resp = super().post(request, *args, **kwargs)
        if resp.status_code == 200:
            raw = str(request.data.get('username') or '').strip()
            User = get_user_model()
            u = None
            if raw and '@' in raw:
                u = User.objects.filter(email__iexact=raw).first()
            if not u and raw:
                u = User.objects.filter(username__iexact=raw).first()
            if u:
                try:
                    LoginEvent.objects.create(user=u, is_employee=bool(getattr(u, 'is_staff', False)))
                except Exception:
                    pass
        return resp


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
