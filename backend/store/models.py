from django.db import models
from django.conf import settings


class Category(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    subtitle = models.CharField(max_length=180, blank=True)
    image_base64 = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)
    layout_type = models.CharField(max_length=32, blank=True)

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    class Status(models.TextChoices):
        DISPONIBLE = 'disponible', 'Disponible'
        STOCK_BAJO = 'stock_bajo', 'Stock bajo'
        AGOTADO = 'agotado', 'Agotado'

    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    brand = models.CharField(max_length=120, blank=True)
    product_type = models.CharField(max_length=120, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    description = models.TextField(blank=True)
    specs = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    old_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    discount_percent = models.PositiveIntegerField(default=0)
    stock = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DISPONIBLE)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    reviews_count = models.PositiveIntegerField(default=0)
    image_base64 = models.TextField(blank=True)
    image_file = models.FileField(upload_to='productos/', null=True, blank=True)
    is_offer = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name


class Order(models.Model):
    class Status(models.TextChoices):
        EN_CAMINO = 'en_camino', 'En Camino'
        ENTREGADO = 'entregado', 'Entregado'
        PROCESANDO = 'procesando', 'Procesando'

    order_code = models.CharField(max_length=32, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='orders')
    payment = models.ForeignKey('Payment', null=True, blank=True, on_delete=models.SET_NULL, related_name='orders')
    product = models.ForeignKey('Product', null=True, blank=True, on_delete=models.SET_NULL, related_name='orders')
    product_name = models.CharField(max_length=200)
    product_description = models.TextField(blank=True)
    product_image_base64 = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PROCESANDO)
    date_label = models.CharField(max_length=64, blank=True)
    extra_info = models.TextField(blank=True)
    can_download_invoice = models.BooleanField(default=False)
    can_track = models.BooleanField(default=False)
    can_cancel = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.order_code


class Payment(models.Model):
    class Method(models.TextChoices):
        CARD = 'card', 'Tarjeta'
        BANK_TRANSFER = 'bank_transfer', 'Transferencia Bancaria'
        YAPE_PLIN = 'yape_plin', 'Yape / Plin'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        CONFIRMED = 'confirmed', 'Confirmado'

    class SyncStatus(models.TextChoices):
        EN_ESPERA = 'en_espera', 'En espera'
        CONFIRMADO = 'confirmado', 'Confirmado'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    payment_code = models.CharField(max_length=32, unique=True)
    method = models.CharField(max_length=32, choices=Method.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    sync_status = models.CharField(max_length=16, choices=SyncStatus.choices, default=SyncStatus.EN_ESPERA)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igv = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    card_holder_name = models.CharField(max_length=120, blank=True)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_expiry = models.CharField(max_length=7, blank=True)

    bank_name = models.CharField(max_length=64, blank=True)
    bank_account = models.CharField(max_length=64, blank=True)
    bank_cci = models.CharField(max_length=64, blank=True)
    receipt_file = models.FileField(upload_to='comprobantes/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.method} {self.status} #{self.id}'


class Notification(models.Model):
    title = models.CharField(max_length=120)
    message = models.CharField(max_length=260)
    type = models.CharField(max_length=32, blank=True)
    time_label = models.CharField(max_length=64, blank=True)
    is_new = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.title


class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey('Product', null=True, blank=True, on_delete=models.SET_NULL, related_name='cart_items')
    product_name = models.CharField(max_length=200)
    product_image_base64 = models.TextField(blank=True)
    product_image_url = models.CharField(max_length=500, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return f'{self.product_name} x{self.quantity}'


class LoginEvent(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='login_events')
    is_employee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.user_id} {"employee" if self.is_employee else "client"} {self.created_at}'
