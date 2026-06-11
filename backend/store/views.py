from decimal import Decimal
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from django.http import HttpResponse
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Sum, Count, Max
from django.utils.html import escape
from django.utils.text import slugify
from django.utils.timezone import timedelta
from django.db.models.functions import TruncHour
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CartItem, Category, CustomerProfile, LoginEvent, Notification, Order, Payment, Product
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


class AdminProtocolDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False) or not getattr(request.user, 'is_superuser', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        User = get_user_model()
        now = timezone.now()
        today = now.date()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # General Stats
        payments_today = Payment.objects.filter(created_at__date=today)
        sales_today = payments_today.filter(sync_status=Payment.SyncStatus.CONFIRMADO).aggregate(v=Sum('total')).get('v') or Decimal('0.00')
        new_clients = User.objects.filter(is_staff=False, date_joined__gte=month_start).count()
        pending_payments = Payment.objects.filter(sync_status=Payment.SyncStatus.EN_ESPERA).count()

        # Nodes count
        staff_count = User.objects.filter(is_staff=True).count()
        active_nodes = 20 + staff_count

        # Chart Data
        # 7D
        payments_7d = Payment.objects.filter(created_at__gte=now - timedelta(days=7), sync_status=Payment.SyncStatus.CONFIRMADO)
        days_data = []
        day_names = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        for i in range(7):
            day_date = (now - timedelta(days=6 - i)).date()
            day_total = sum(p.total for p in payments_7d if p.created_at.date() == day_date)
            label = f"{day_names[day_date.weekday()]} {day_date.day}"
            days_data.append({'label': label, 'total': float(day_total)})

        # 24H
        payments_24h = Payment.objects.filter(created_at__gte=now - timedelta(hours=24), sync_status=Payment.SyncStatus.CONFIRMADO)
        hours_data = []
        for i in range(12):
            bucket_start = now - timedelta(hours=24 - i*2)
            bucket_end = now - timedelta(hours=22 - i*2)
            bucket_total = sum(p.total for p in payments_24h if bucket_start <= p.created_at < bucket_end)
            label = bucket_start.strftime('%H:%M')
            hours_data.append({'label': label, 'total': float(bucket_total)})

        # 1H
        payments_1h = Payment.objects.filter(created_at__gte=now - timedelta(hours=1), sync_status=Payment.SyncStatus.CONFIRMADO)
        mins_data = []
        for i in range(6):
            bucket_start = now - timedelta(minutes=60 - i*10)
            bucket_end = now - timedelta(minutes=50 - i*10)
            bucket_total = sum(p.total for p in payments_1h if bucket_start <= p.created_at < bucket_end)
            label = bucket_start.strftime('%H:%M')
            mins_data.append({'label': label, 'total': float(bucket_total)})

        # Logs
        logs = []
        # Recent users
        for u in User.objects.filter(is_staff=False).order_by('-date_joined')[:10]:
            logs.append({
                'time': timezone.localtime(u.date_joined),
                'tag': '@System',
                'message': f"Nuevo registro de cliente: '{u.first_name or u.username}'."
            })
        # Recent logins
        for e in LoginEvent.objects.select_related('user').order_by('-created_at')[:10]:
            logs.append({
                'time': timezone.localtime(e.created_at),
                'tag': '@Security',
                'message': f"Sesión iniciada por '{e.user.username}' (Rol: {'Empleado' if e.is_employee else 'Cliente'})."
            })
        # Recent payments
        for p in Payment.objects.select_related('user').order_by('-created_at')[:10]:
            if p.sync_status == Payment.SyncStatus.CONFIRMADO:
                msg = f"Transacción completada #{p.payment_code}. Cliente ID: {p.user.username}."
                tag = '@System'
            elif p.sync_status == Payment.SyncStatus.RECHAZADO:
                msg = f"Transacción rechazada #{p.payment_code}."
                tag = '@Security'
            else:
                msg = f"Transacción en espera de verificación #{p.payment_code}."
                tag = '@System'
            logs.append({
                'time': timezone.localtime(p.created_at),
                'tag': tag,
                'message': msg
            })
        # Recent orders
        for o in Order.objects.select_related('assigned_to', 'delivered_by').exclude(status=Order.Status.PROCESANDO).order_by('-id')[:10]:
            if o.status == Order.Status.EN_CAMINO:
                msg = f"Entrega #{o.order_code} marcada como 'En Camino'."
                tag = '@Logistics'
            elif o.status == Order.Status.ENTREGADO:
                msg = f"Entrega #{o.order_code} completada por '{o.delivered_by.username if o.delivered_by else 'Personal'}'."
                tag = '@Logistics'
            else:
                msg = f"Pedido #{o.order_code} cancelado/rechazado."
                tag = '@Security'
            order_time = timezone.localtime(o.payment.created_at) if o.payment else now
            logs.append({
                'time': order_time,
                'tag': tag,
                'message': msg
            })

        # Sort logs
        logs = sorted(logs, key=lambda x: x['time'], reverse=True)[:15]
        formatted_logs = []
        for idx, item in enumerate(logs):
            formatted_logs.append({
                'id': str(idx),
                'time': item['time'].strftime('%H:%M:%S'),
                'tag': item['tag'],
                'message': item['message']
            })

        # Recent Movements
        recent_orders = []
        orders_qs = Order.objects.select_related('user').order_by('-id')[:10]
        for o in orders_qs:
            u = o.user
            client_name = (u.first_name or u.username) if u else "Anónimo"
            client_email = (u.email or "") if u else ""
            # Initials
            parts = client_name.split()
            initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "AN"
            recent_orders.append({
                'protocol_id': o.order_code,
                'client_initials': initials,
                'client_name': client_name,
                'client_email': client_email,
                'product_name': o.product_name,
                'status': o.status,
                'amount': str(o.total),
                'id': str(o.id)
            })

        # Employee Activity
        staff_qs = User.objects.filter(is_staff=True).order_by('id')
        employee_activity = []
        for user in staff_qs:
            role = 'Ventas'
            if user.username.startswith('ENT-'):
                role = 'Logística'
            elif user.is_superuser:
                role = 'Administrador'
            
            if role == 'Logística':
                assigned_count = Order.objects.filter(assigned_to=user).count()
                metric_label = 'pedidos hoy'
                metric_val = assigned_count
            elif role == 'Administrador':
                metric_label = 'validaciones hoy'
                metric_val = Payment.objects.exclude(sync_status=Payment.SyncStatus.EN_ESPERA).count()
            else:
                metric_label = 'tareas'
                metric_val = 5
            
            employee_activity.append({
                'username': user.username,
                'name': user.first_name or user.username,
                'role': role,
                'metric_label': metric_label,
                'metric_val': metric_val
            })

        # Inventory Nexus
        low_stock_p = Product.objects.filter(stock__gt=0).order_by('stock').first()
        low_stock = {
            'name': low_stock_p.name if low_stock_p else 'Sin alertas',
            'stock': low_stock_p.stock if low_stock_p else 0
        }

        # Top sold product
        top_sold = Order.objects.values('product_id', 'product_name').annotate(total_qty=Sum('quantity')).order_by('-total_qty').first()
        if top_sold:
            top_performer = {
                'name': top_sold['product_name'],
                'sold_count': top_sold['total_qty']
            }
        else:
            highest_rated = Product.objects.order_by('-rating', '-price').first()
            top_performer = {
                'name': highest_rated.name if highest_rated else 'Ninguno',
                'sold_count': 124
            }

        return Response({
            'ventas_hoy': float(sales_today),
            'new_clients': new_clients,
            'pending_payments': pending_payments,
            'active_nodes': active_nodes,
            'charts': {
                '1H': mins_data,
                '24H': hours_data,
                '7D': days_data
            },
            'logs': formatted_logs,
            'movements': recent_orders,
            'employees': employee_activity,
            'inventory': {
                'low_stock': low_stock,
                'top_performer': top_performer
            }
        })


class AdminOptimizeStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(request.user, 'is_staff', False) or not getattr(request.user, 'is_superuser', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
        
        count = Product.objects.filter(stock__lte=3).update(stock=15)
        return Response({'updated': count})


class EmployeeSalesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        since = now - timedelta(hours=24)
        today = now.date()

        recent = (
            Payment.objects.select_related('user')
            .order_by('-created_at')[:8]
        )
        recent_payments = [
            {
                'payment_code': p.payment_code,
                'customer': getattr(p.user, 'email', '') or getattr(p.user, 'username', ''),
                'created_at': timezone.localtime(p.created_at).isoformat(),
                'total': str(p.total),
                'status': p.status,
                'sync_status': p.sync_status,
                'method': p.method,
            }
            for p in recent
        ]

        buckets_qs = (
            Payment.objects.filter(created_at__gte=since, created_at__lte=now)
            .annotate(hour=TruncHour('created_at'))
            .values('hour')
            .annotate(total=Sum('total'), count=Count('id'))
            .order_by('hour')
        )
        buckets_map = {timezone.localtime(row['hour']): row for row in buckets_qs if row.get('hour')}
        hours = []
        cursor = timezone.localtime(since).replace(minute=0, second=0, microsecond=0)
        end = timezone.localtime(now).replace(minute=0, second=0, microsecond=0)
        while cursor <= end:
            row = buckets_map.get(cursor)
            hours.append(
                {
                    'hour': cursor.strftime('%H:%M'),
                    'total': str(row.get('total') or '0.00') if row else '0.00',
                    'count': int(row.get('count') or 0) if row else 0,
                }
            )
            cursor = cursor + timedelta(hours=1)

        top = (
            Order.objects.select_related('product', 'payment')
            .filter(payment__created_at__date=today, product__isnull=False)
            .filter(product__stock__gt=0)
            .values('product_id', 'product__name', 'product__slug', 'product__image_base64', 'product__image_file')
            .annotate(quantity=Sum('quantity'), revenue=Sum('total'))
            .order_by('-quantity', '-revenue')[:5]
        )
        top_products = []
        for row in top:
            product_id = row.get('product_id')
            img_url = ''
            if product_id:
                p = Product.objects.filter(id=product_id).only('image_file').first()
                if p and getattr(p, 'image_file', None):
                    try:
                        img_url = p.image_file.url
                    except Exception:
                        img_url = ''
            top_products.append(
                {
                    'product_id': product_id,
                    'name': row.get('product__name') or '',
                    'slug': row.get('product__slug') or '',
                    'quantity': int(row.get('quantity') or 0),
                    'revenue': str(row.get('revenue') or '0.00'),
                    'image_base64': row.get('product__image_base64') or '',
                    'image_url': img_url,
                }
            )

        return Response(
            {
                'recent_payments': recent_payments,
                'sales_24h': hours,
                'top_products_today': top_products,
            }
        )


class EmployeePaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        today = now.date()

        pending_qs = Payment.objects.select_related('user').filter(sync_status=Payment.SyncStatus.EN_ESPERA).order_by('-created_at')
        rejected_qs = Payment.objects.select_related('user').filter(sync_status=Payment.SyncStatus.RECHAZADO).order_by('-created_at')
        approved_qs = Payment.objects.select_related('user').filter(sync_status=Payment.SyncStatus.CONFIRMADO).order_by('-created_at')
        pending_count = pending_qs.count()
        pending_total = pending_qs.aggregate(v=Sum('total')).get('v') or Decimal('0.00')
        rejected_count = rejected_qs.count()
        approved_count = approved_qs.count()

        approved_today = Payment.objects.filter(created_at__date=today, sync_status=Payment.SyncStatus.CONFIRMADO).count()
        rejected_today = Payment.objects.filter(created_at__date=today, sync_status=Payment.SyncStatus.RECHAZADO).count()
        denom = approved_today + rejected_today
        approval_rate = (approved_today / denom) * 100.0 if denom else 0.0

        results = []
        for p in pending_qs[:50]:
            receipt_url = ''
            if getattr(p, 'receipt_file', None):
                try:
                    receipt_url = p.receipt_file.url
                except Exception:
                    receipt_url = ''

            u = getattr(p, 'user', None)
            customer_name = ''
            customer_email = ''
            if u:
                customer_name = (getattr(u, 'first_name', '') or '').strip() or getattr(u, 'username', '') or ''
                customer_email = getattr(u, 'email', '') or ''

            results.append(
                {
                    'payment_code': p.payment_code,
                    'ticket': p.payment_code,
                    'customer_name': customer_name,
                    'customer_email': customer_email,
                    'method': p.method,
                    'created_at': timezone.localtime(p.created_at).isoformat(),
                    'total': str(p.total),
                    'receipt_url': receipt_url,
                }
            )

        rejected = []
        for p in rejected_qs[:50]:
            receipt_url = ''
            if getattr(p, 'receipt_file', None):
                try:
                    receipt_url = p.receipt_file.url
                except Exception:
                    receipt_url = ''

            u = getattr(p, 'user', None)
            customer_name = ''
            customer_email = ''
            if u:
                customer_name = (getattr(u, 'first_name', '') or '').strip() or getattr(u, 'username', '') or ''
                customer_email = getattr(u, 'email', '') or ''

            rejected.append(
                {
                    'payment_code': p.payment_code,
                    'ticket': p.payment_code,
                    'customer_name': customer_name,
                    'customer_email': customer_email,
                    'method': p.method,
                    'created_at': timezone.localtime(p.created_at).isoformat(),
                    'total': str(p.total),
                    'receipt_url': receipt_url,
                }
            )

        approved = []
        for p in approved_qs[:50]:
            receipt_url = ''
            if getattr(p, 'receipt_file', None):
                try:
                    receipt_url = p.receipt_file.url
                except Exception:
                    receipt_url = ''

            u = getattr(p, 'user', None)
            customer_name = ''
            customer_email = ''
            if u:
                customer_name = (getattr(u, 'first_name', '') or '').strip() or getattr(u, 'username', '') or ''
                customer_email = getattr(u, 'email', '') or ''

            approved.append(
                {
                    'payment_code': p.payment_code,
                    'ticket': p.payment_code,
                    'customer_name': customer_name,
                    'customer_email': customer_email,
                    'method': p.method,
                    'created_at': timezone.localtime(p.created_at).isoformat(),
                    'total': str(p.total),
                    'receipt_url': receipt_url,
                }
            )

        return Response(
            {
                'summary': {
                    'pending_count': int(pending_count),
                    'pending_total': str(pending_total),
                    'approval_rate_today': round(float(approval_rate), 2),
                    'rejected_count': int(rejected_count),
                    'approved_count': int(approved_count),
                },
                'pending': results,
                'rejected': rejected,
                'approved': approved,
            }
        )


class EmployeePaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_code: str):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        p = (
            Payment.objects.select_related('user')
            .prefetch_related('orders')
            .filter(payment_code=payment_code)
            .first()
        )
        if not p:
            return Response({'detail': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        u = getattr(p, 'user', None)
        profile = getattr(u, 'customer_profile', None) if u else None
        receipt_url = ''
        if getattr(p, 'receipt_file', None):
            try:
                receipt_url = p.receipt_file.url
            except Exception:
                receipt_url = ''

        items = []
        for o in getattr(p, 'orders', []).all():
            items.append(
                {
                    'order_id': o.id,
                    'ticket': o.order_code,
                    'product_name': o.product_name,
                    'quantity': int(o.quantity or 0),
                    'total': str(o.total or '0.00'),
                    'status': o.status,
                }
            )

        return Response(
            {
                'payment_code': p.payment_code,
                'ticket': p.payment_code,
                'sync_status': p.sync_status,
                'method': p.method,
                'created_at': timezone.localtime(p.created_at).isoformat(),
                'subtotal': str(p.subtotal),
                'igv': str(p.igv),
                'shipping': str(p.shipping),
                'total': str(p.total),
                'receipt_url': receipt_url,
                'customer': {
                    'name': ((getattr(u, 'first_name', '') or '').strip() or getattr(u, 'username', '')) if u else '',
                    'email': getattr(u, 'email', '') if u else '',
                    'phone': getattr(profile, 'phone', '') if profile else '',
                    'address': getattr(profile, 'address', '') if profile else '',
                },
                'items': items,
            }
        )


class EmployeePaymentApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_code: str):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        p = Payment.objects.filter(payment_code=payment_code).first()
        if not p:
            return Response({'detail': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            p.sync_status = Payment.SyncStatus.CONFIRMADO
            p.status = Payment.Status.CONFIRMED
            p.save(update_fields=['sync_status', 'status'])
            Order.objects.filter(payment=p).exclude(status=Order.Status.ENTREGADO).update(status=Order.Status.EN_CAMINO)

        return Response({'sync_status': p.sync_status})


class EmployeePaymentRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_code: str):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        p = Payment.objects.filter(payment_code=payment_code).first()
        if not p:
            return Response({'detail': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            p.sync_status = Payment.SyncStatus.RECHAZADO
            p.save(update_fields=['sync_status'])
            Order.objects.filter(payment=p).exclude(status=Order.Status.ENTREGADO).update(
                status=Order.Status.RECHAZADO,
                assigned_to=None,
                assigned_at=None,
                delivery_evidence_file=None,
                delivered_at=None,
                delivered_by=None,
            )
        return Response({'sync_status': p.sync_status})


class EmployeePendingPaymentsExcelView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            Payment.objects.select_related('user')
            .prefetch_related('orders')
            .filter(sync_status=Payment.SyncStatus.EN_ESPERA)
            .order_by('-created_at')
        )

        rows = []
        for p in qs:
            u = getattr(p, 'user', None)
            customer = ''
            if u:
                customer = (getattr(u, 'first_name', '') or '').strip() or getattr(u, 'email', '') or getattr(u, 'username', '')
            items = []
            for o in getattr(p, 'orders', []).all():
                items.append(f'{o.product_name} x{o.quantity}')
            rows.append(
                {
                    'ticket': p.payment_code,
                    'cliente': customer,
                    'correo': getattr(u, 'email', '') if u else '',
                    'metodo': p.method,
                    'fecha': timezone.localtime(p.created_at).strftime('%Y-%m-%d %H:%M'),
                    'total': str(p.total),
                    'items': ', '.join(items),
                }
            )

        html = [
            '<html><head><meta charset="utf-8"></head><body>',
            '<table border="1">',
            '<tr>',
            '<th>Ticket</th><th>Cliente</th><th>Correo</th><th>Método</th><th>Fecha</th><th>Total</th><th>Items</th>',
            '</tr>',
        ]
        for r in rows:
            html.append(
                '<tr>'
                f'<td>{escape(r["ticket"])}</td>'
                f'<td>{escape(r["cliente"])}</td>'
                f'<td>{escape(r["correo"])}</td>'
                f'<td>{escape(r["metodo"])}</td>'
                f'<td>{escape(r["fecha"])}</td>'
                f'<td>{escape(r["total"])}</td>'
                f'<td>{escape(r["items"])}</td>'
                '</tr>'
            )
        html.append('</table></body></html>')
        content = ''.join(html).encode('utf-8')

        resp = HttpResponse(content, content_type='application/vnd.ms-excel; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="transacciones_pendientes.xls"'
        return resp


class EmployeeDeliveryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        status_filter = (request.query_params.get('status') or '').strip().lower()
        allowed_statuses = {Order.Status.EN_CAMINO, Order.Status.ENTREGADO, Order.Status.PROCESANDO, Order.Status.RECHAZADO}
        if status_filter and status_filter not in allowed_statuses:
            return Response({'detail': 'Filtro de estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = Order.objects.select_related('user', 'payment', 'delivered_by', 'assigned_to').all().order_by('-id')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.filter(
                status__in=[Order.Status.EN_CAMINO, Order.Status.ENTREGADO, Order.Status.RECHAZADO]
            ).order_by('-id')

        results = []
        for o in qs[:50]:
            created_at = None
            if getattr(o, 'payment', None) and getattr(o.payment, 'created_at', None):
                created_at = timezone.localtime(o.payment.created_at).isoformat()
            delivered_at = None
            if getattr(o, 'delivered_at', None):
                delivered_at = timezone.localtime(o.delivered_at).isoformat()
            evidence_url = ''
            if getattr(o, 'delivery_evidence_file', None):
                try:
                    evidence_url = o.delivery_evidence_file.url
                except Exception:
                    evidence_url = ''

            u = getattr(o, 'user', None)
            customer = ''
            if u:
                customer = (getattr(u, 'first_name', '') or '').strip() or getattr(u, 'email', '') or getattr(u, 'username', '')

            assigned_at = None
            if getattr(o, 'assigned_at', None):
                assigned_at = timezone.localtime(o.assigned_at).isoformat()
            assigned_to = getattr(o, 'assigned_to', None)
            driver = ''
            if assigned_to:
                driver = (getattr(assigned_to, 'first_name', '') or '').strip() or getattr(assigned_to, 'username', '') or ''

            results.append(
                {
                    'id': str(o.id),
                    'order_code': o.order_code,
                    'reference': o.order_code,
                    'payment_code': getattr(getattr(o, 'payment', None), 'payment_code', '') or '',
                    'customer': customer,
                    'driver': driver,
                    'assigned_at': assigned_at,
                    'status': o.status,
                    'created_at': created_at,
                    'delivered_at': delivered_at,
                    'evidence_url': evidence_url,
                }
            )

        return Response({'results': results})


class EmployeeDeliveryDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk: int):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        o = Order.objects.select_related('user', 'payment', 'assigned_to', 'delivered_by').filter(id=pk).first()
        if not o:
            return Response({'detail': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        u = getattr(o, 'user', None)
        profile = getattr(u, 'customer_profile', None) if u else None

        created_at = None
        if getattr(o, 'payment', None) and getattr(o.payment, 'created_at', None):
            created_at = timezone.localtime(o.payment.created_at).isoformat()

        delivered_at = None
        if getattr(o, 'delivered_at', None):
            delivered_at = timezone.localtime(o.delivered_at).isoformat()

        evidence_url = ''
        if getattr(o, 'delivery_evidence_file', None):
            try:
                evidence_url = o.delivery_evidence_file.url
            except Exception:
                evidence_url = ''

        assigned_at = None
        if getattr(o, 'assigned_at', None):
            assigned_at = timezone.localtime(o.assigned_at).isoformat()
        assigned_to = getattr(o, 'assigned_to', None)
        driver = ''
        if assigned_to:
            driver = (getattr(assigned_to, 'first_name', '') or '').strip() or getattr(assigned_to, 'username', '') or ''

        return Response(
            {
                'id': str(o.id),
                'order_code': o.order_code,
                'reference': o.order_code,
                'payment_code': getattr(getattr(o, 'payment', None), 'payment_code', '') or '',
                'status': o.status,
                'created_at': created_at,
                'product_name': o.product_name,
                'quantity': int(o.quantity or 0),
                'total': str(o.total or '0.00'),
                'customer_name': ((getattr(u, 'first_name', '') or '').strip() or getattr(u, 'username', '')) if u else '',
                'customer_email': getattr(u, 'email', '') if u else '',
                'customer_phone': getattr(profile, 'phone', '') if profile else '',
                'customer_address': getattr(profile, 'address', '') if profile else '',
                'driver': driver,
                'assigned_at': assigned_at,
                'delivered_at': delivered_at,
                'evidence_url': evidence_url,
            }
        )

    def post(self, request, pk: int):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        action = (request.query_params.get('action') or '').strip().lower()
        if action not in {'evidence', 'confirm', 'assign'}:
            return Response({'detail': 'Acción inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        o = Order.objects.select_related('user', 'payment').filter(id=pk).first()
        if not o:
            return Response({'detail': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'assign':
            if o.status in {Order.Status.ENTREGADO, Order.Status.RECHAZADO}:
                return Response({'detail': 'Pedido bloqueado.'}, status=status.HTTP_400_BAD_REQUEST)
            if getattr(o, 'payment', None) and getattr(o.payment, 'sync_status', '') != Payment.SyncStatus.CONFIRMADO:
                return Response({'detail': 'Pago no aprobado.'}, status=status.HTTP_400_BAD_REQUEST)
            to_id = request.data.get('assigned_to') or request.data.get('assigned_to_id')
            try:
                to_id = int(to_id)
            except Exception:
                return Response({'detail': 'assigned_to inválido.'}, status=status.HTTP_400_BAD_REQUEST)

            User = get_user_model()
            assignee = User.objects.filter(id=to_id, is_staff=True).first()
            if not assignee or getattr(assignee, 'is_superuser', False):
                return Response({'detail': 'Repartidor no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
            if not str(getattr(assignee, 'username', '')).startswith('ENT-'):
                return Response({'detail': 'Repartidor inválido.'}, status=status.HTTP_400_BAD_REQUEST)

            o.assigned_to = assignee
            o.assigned_at = timezone.now()
            if o.status == Order.Status.PROCESANDO:
                o.status = Order.Status.EN_CAMINO
                o.save(update_fields=['assigned_to', 'assigned_at', 'status'])
            else:
                o.save(update_fields=['assigned_to', 'assigned_at'])

            return Response(
                {
                    'status': o.status,
                    'driver': (getattr(assignee, 'first_name', '') or '').strip() or getattr(assignee, 'username', ''),
                    'assigned_at': timezone.localtime(o.assigned_at).isoformat() if o.assigned_at else None,
                }
            )

        if action == 'evidence':
            if o.status == Order.Status.RECHAZADO:
                return Response({'detail': 'Pedido bloqueado.'}, status=status.HTTP_400_BAD_REQUEST)
            if getattr(o, 'payment', None) and getattr(o.payment, 'sync_status', '') != Payment.SyncStatus.CONFIRMADO:
                return Response({'detail': 'Pago no aprobado.'}, status=status.HTTP_400_BAD_REQUEST)
            if not request.FILES:
                return Response({'detail': 'Falta archivo.'}, status=status.HTTP_400_BAD_REQUEST)
            file_obj = next(iter(request.FILES.values()))
            o.delivery_evidence_file = file_obj
            o.save(update_fields=['delivery_evidence_file'])
            url = ''
            try:
                url = o.delivery_evidence_file.url if o.delivery_evidence_file else ''
            except Exception:
                url = ''
            return Response({'evidence_url': url})

        if o.status != Order.Status.EN_CAMINO:
            return Response({'detail': 'Solo se puede confirmar entregas en estado En camino.'}, status=status.HTTP_400_BAD_REQUEST)
        if o.status == Order.Status.RECHAZADO:
            return Response({'detail': 'Pedido bloqueado.'}, status=status.HTTP_400_BAD_REQUEST)
        if getattr(o, 'payment', None) and getattr(o.payment, 'sync_status', '') != Payment.SyncStatus.CONFIRMADO:
            return Response({'detail': 'Pago no aprobado.'}, status=status.HTTP_400_BAD_REQUEST)
        if not getattr(o, 'delivery_evidence_file', None):
            return Response({'detail': 'Primero sube la evidencia.'}, status=status.HTTP_400_BAD_REQUEST)

        o.status = Order.Status.ENTREGADO
        o.delivered_at = timezone.now()
        o.delivered_by = request.user
        o.save(update_fields=['status', 'delivered_at', 'delivered_by'])
        return Response({'status': o.status})


class EmployeeDeliveryStaffListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        User = get_user_model()
        qs = User.objects.filter(is_staff=True, username__startswith='ENT-').order_by('username')
        results = []
        for u in qs:
            results.append(
                {
                    'id': str(u.id),
                    'username': u.username,
                    'name': (getattr(u, 'first_name', '') or '').strip() or u.username,
                }
            )
        return Response({'results': results})



class EmployeeClientListView(APIView):

    def get(self, request):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        User = get_user_model()
        now = timezone.now()

        search = (request.query_params.get('search') or '').strip()
        status_filter = (request.query_params.get('status') or '').strip().lower()

        try:
            page = int(request.query_params.get('page') or 1)
        except Exception:
            page = 1
        page = max(1, page)

        try:
            page_size = int(request.query_params.get('page_size') or 10)
        except Exception:
            page_size = 10
        page_size = min(max(5, page_size), 50)

        qs = (
            User.objects.filter(is_staff=False)
            .annotate(total_purchases=Sum('payments__total'))
            .annotate(last_client_login=Max('login_events__created_at', filter=Q(login_events__is_employee=False)))
            .order_by('-date_joined')
        )
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(username__icontains=search) | Q(first_name__icontains=search))

        rows = list(
            qs.values(
                'id',
                'username',
                'first_name',
                'email',
                'date_joined',
                'last_login',
                'total_purchases',
                'last_client_login',
            )
        )

        def compute_status(last_seen):
            if not last_seen:
                return 'suspendido'
            hours = (now - last_seen).total_seconds() / 3600.0
            if hours <= 48:
                return 'activo'
            if hours >= 744:
                return 'suspendido'
            return 'inactivo'

        filtered = []
        for row in rows:
            last_seen = row.get('last_client_login') or row.get('last_login') or row.get('date_joined')
            st = compute_status(last_seen)
            if status_filter and st != status_filter:
                continue
            filtered.append((row, last_seen, st))

        total_count = len(filtered)
        offset = (page - 1) * page_size
        page_items = filtered[offset : offset + page_size]

        results = []
        for row, last_seen, st in page_items:
            total_p = row.get('total_purchases') or 0
            last_iso = None
            if last_seen:
                try:
                    last_iso = timezone.localtime(last_seen).isoformat()
                except Exception:
                    last_iso = None
            results.append(
                {
                    'id': row.get('id'),
                    'full_name': (row.get('first_name') or '').strip() or (row.get('username') or ''),
                    'email': row.get('email') or '',
                    'total_purchases': str(total_p),
                    'last_connection': last_iso,
                    'status': st,
                }
            )

        return Response(
            {
                'count': total_count,
                'page': page,
                'page_size': page_size,
                'results': results,
            }
        )


class EmployeeClientDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int):
        if not getattr(request.user, 'is_staff', False):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        User = get_user_model()
        u = User.objects.filter(id=pk).first()
        if not u or getattr(u, 'is_staff', False):
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if u.id == request.user.id:
            return Response({'detail': 'No puedes borrarte a ti mismo.'}, status=status.HTTP_400_BAD_REQUEST)

        u.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data or {}
        full_name = str(payload.get('full_name') or '').strip()
        email = str(payload.get('email') or '').strip()
        password = str(payload.get('password') or '')
        address = str(payload.get('address') or '').strip()
        phone = str(payload.get('phone') or '').strip()

        if not full_name:
            return Response({'detail': 'El nombre completo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({'detail': 'El correo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({'detail': 'password es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not address:
            return Response({'detail': 'La dirección es requerida.'}, status=status.HTTP_400_BAD_REQUEST)
        if not phone:
            return Response({'detail': 'El teléfono es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

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
        CustomerProfile.objects.update_or_create(user=user, defaults={'address': address, 'phone': phone})
        return Response(
            {'id': str(user.id), 'username': user.username, 'email': user.email, 'address': address, 'phone': phone},
            status=status.HTTP_201_CREATED,
        )


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
        profile = getattr(u, 'customer_profile', None)
        return Response(
            {
                'id': str(u.id),
                'username': u.username,
                'email': u.email,
                'is_staff': bool(getattr(u, 'is_staff', False)),
                'is_superuser': bool(getattr(u, 'is_superuser', False)),
                'address': getattr(profile, 'address', '') if profile else '',
                'phone': getattr(profile, 'phone', '') if profile else '',
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
