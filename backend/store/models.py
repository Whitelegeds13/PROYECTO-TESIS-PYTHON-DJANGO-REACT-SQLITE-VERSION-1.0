from django.db import models


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


class Notification(models.Model):
    title = models.CharField(max_length=120)
    message = models.CharField(max_length=260)
    type = models.CharField(max_length=32, blank=True)
    time_label = models.CharField(max_length=64, blank=True)
    is_new = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.title


class CartItem(models.Model):
    product_name = models.CharField(max_length=200)
    product_image_base64 = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return f'{self.product_name} x{self.quantity}'

