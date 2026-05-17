import base64
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from store.models import CartItem, Category, Notification, Order, Product


def _svg_data_uri(title: str, subtitle: str = '', accent_a: str = '#A855F7', accent_b: str = '#22D3EE'):
    safe_title = (title or '').replace('&', 'and')
    safe_sub = (subtitle or '').replace('&', 'and')
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08142E"/>
      <stop offset="0.55" stop-color="#071024"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{accent_a}"/>
      <stop offset="1" stop-color="{accent_b}"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 18 -8" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0B2246" stroke-width="1" opacity="0.6"/>
    </pattern>
  </defs>
  <rect width="900" height="600" fill="url(#bg)"/>
  <rect width="900" height="600" fill="url(#grid)" opacity="0.5"/>
  <g filter="url(#glow)" opacity="0.95">
    <path d="M120 420 C 220 220, 360 520, 480 340 S 720 260, 800 420"
      fill="none" stroke="url(#neon)" stroke-width="12" stroke-linecap="round"/>
    <circle cx="200" cy="190" r="38" fill="none" stroke="{accent_b}" stroke-width="8"/>
    <circle cx="680" cy="170" r="54" fill="none" stroke="{accent_a}" stroke-width="10"/>
    <rect x="120" y="120" width="660" height="360" rx="28" fill="#0B1630" opacity="0.42" stroke="url(#neon)" stroke-width="2"/>
  </g>
  <g>
    <text x="140" y="270" font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="52" font-weight="800" fill="#EAF2FF">{safe_title}</text>
    <text x="140" y="318" font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="22" font-weight="500" fill="#B8C6E6" opacity="0.92">{safe_sub}</text>
    <text x="140" y="468" font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="14" font-weight="600" fill="#93C5FD" opacity="0.8">PALACIO GAMER · PROTOCOLO NEÓN</text>
  </g>
</svg>"""
    encoded = base64.b64encode(svg.encode('utf-8')).decode('ascii')
    return f'data:image/svg+xml;base64,{encoded}'


def _status_from_stock(stock: int):
    if stock <= 0:
        return Product.Status.AGOTADO
    if stock <= 6:
        return Product.Status.STOCK_BAJO
    return Product.Status.DISPONIBLE


class Command(BaseCommand):
    def handle(self, *args, **options):
        with transaction.atomic():
            CartItem.objects.all().delete()
            Notification.objects.all().delete()
            Order.objects.all().delete()
            Product.objects.all().delete()
            Category.objects.all().delete()

            categories = [
                {
                    'name': 'Tarjetas Gráficas',
                    'subtitle': 'Potencia bruta para resoluciones 4K',
                    'slug': 'tarjetas-graficas',
                    'layout_type': 'xl',
                    'accent_a': '#22D3EE',
                    'accent_b': '#A855F7',
                },
                {
                    'name': 'Periféricos',
                    'subtitle': 'Precisión, respuesta y estilo',
                    'slug': 'perifericos',
                    'layout_type': 'sm',
                    'accent_a': '#FB7185',
                    'accent_b': '#22D3EE',
                },
                {
                    'name': 'Chasis',
                    'subtitle': 'Cristal, airflow y RGB',
                    'slug': 'chasis',
                    'layout_type': 'sm',
                    'accent_a': '#A855F7',
                    'accent_b': '#FB7185',
                },
                {
                    'name': 'Monitores Gaming',
                    'subtitle': 'UltraWide y altas tasas de refresco',
                    'slug': 'monitores-gaming',
                    'layout_type': 'md',
                    'accent_a': '#22D3EE',
                    'accent_b': '#FB7185',
                },
                {
                    'name': 'Procesadores',
                    'subtitle': 'Núcleos listos para dominar',
                    'slug': 'procesadores',
                    'layout_type': 'md',
                    'accent_a': '#A855F7',
                    'accent_b': '#22D3EE',
                },
                {
                    'name': 'Memoria RAM',
                    'subtitle': 'DDR5 con RGB y baja latencia',
                    'slug': 'memoria-ram',
                    'layout_type': 'md',
                    'accent_a': '#FB7185',
                    'accent_b': '#A855F7',
                },
                {
                    'name': 'Almacenamiento',
                    'subtitle': 'NVMe Gen4/Gen5 a velocidad neón',
                    'slug': 'almacenamiento',
                    'layout_type': 'md',
                    'accent_a': '#22D3EE',
                    'accent_b': '#0EA5E9',
                },
                {
                    'name': 'Ensambles',
                    'subtitle': 'Builds listos para el Protocolo',
                    'slug': 'ensambles',
                    'layout_type': 'md',
                    'accent_a': '#A855F7',
                    'accent_b': '#22D3EE',
                },
            ]

            created_categories = {}
            for c in categories:
                image = _svg_data_uri(c['name'], c['subtitle'], c['accent_a'], c['accent_b'])
                cat = Category.objects.create(
                    name=c['name'],
                    slug=c['slug'],
                    subtitle=c['subtitle'],
                    image_base64=image,
                    is_featured=True,
                    layout_type=c['layout_type'],
                )
                created_categories[cat.slug] = cat

            def add_product(
                *,
                name: str,
                category_slug: str,
                brand: str,
                product_type: str,
                description: str,
                specs: str,
                price: str,
                old_price: str | None = None,
                discount_percent: int = 0,
                stock: int = 10,
                rating: str = '4.70',
                reviews_count: int = 120,
                is_offer: bool = False,
                is_featured: bool = False,
                accent_a: str = '#A855F7',
                accent_b: str = '#22D3EE',
            ):
                slug = slugify(name)[:190]
                image = _svg_data_uri(name.split(' de ')[0][:26], product_type, accent_a, accent_b)
                return Product.objects.create(
                    name=name,
                    slug=slug,
                    brand=brand,
                    product_type=product_type,
                    category=created_categories[category_slug],
                    description=description,
                    specs=specs,
                    price=Decimal(price),
                    old_price=Decimal(old_price) if old_price else None,
                    discount_percent=int(discount_percent or 0),
                    stock=int(stock),
                    status=_status_from_stock(int(stock)),
                    rating=Decimal(rating),
                    reviews_count=int(reviews_count),
                    image_base64=image,
                    is_offer=bool(is_offer),
                    is_featured=bool(is_featured),
                )

            products = []

            products.append(
                add_product(
                    name='Apex Wireless H1',
                    category_slug='perifericos',
                    brand='PALACIO',
                    product_type='Audífonos',
                    description='Audífonos inalámbricos con baja latencia y sonido espacial para sesiones intensas.',
                    specs='Conectividad: 2.4GHz + Bluetooth\nBatería: 30h\nAudio: Surround\nMicrófono: Cancelación de ruido',
                    price='149.25',
                    old_price='209.00',
                    discount_percent=29,
                    stock=14,
                    rating='4.80',
                    reviews_count=312,
                    is_offer=True,
                    is_featured=True,
                    accent_a='#FB7185',
                    accent_b='#A855F7',
                )
            )
            products.append(
                add_product(
                    name='Neon Shift Pro',
                    category_slug='perifericos',
                    brand='NEONSHIFT',
                    product_type='Mouse Gamer',
                    description='Sensor de alta precisión con iluminación neón y switches rápidos.',
                    specs='Sensor: 26K DPI\nPolling: 1000Hz\nPeso: 59g\nRGB: Direccionable',
                    price='75.85',
                    old_price='99.00',
                    discount_percent=24,
                    stock=7,
                    rating='4.70',
                    reviews_count=205,
                    is_offer=True,
                    is_featured=True,
                    accent_a='#22D3EE',
                    accent_b='#FB7185',
                )
            )
            products.append(
                add_product(
                    name='Core-X Ultra 9',
                    category_slug='procesadores',
                    brand='CORE-X',
                    product_type='Procesador',
                    description='Arquitectura de vanguardia para altas tasas de FPS y creación de contenido.',
                    specs='Núcleos: 24\nHilos: 32\nBoost: 6.0GHz\nTDP: 125W',
                    price='894.10',
                    old_price='1099.00',
                    discount_percent=19,
                    stock=3,
                    rating='4.90',
                    reviews_count=156,
                    is_offer=True,
                    is_featured=True,
                    accent_a='#A855F7',
                    accent_b='#22D3EE',
                )
            )
            products.append(
                add_product(
                    name='Velocity Gen5 2TB',
                    category_slug='almacenamiento',
                    brand='VELOCITY',
                    product_type='SSD NVMe Gen5',
                    description='Almacenamiento Gen5 diseñado para cargas instantáneas y transferencias extremas.',
                    specs='Capacidad: 2TB\nLectura: 12,000MB/s\nEscritura: 10,500MB/s\nDisipador: Incluido',
                    price='207.20',
                    old_price='289.00',
                    discount_percent=28,
                    stock=11,
                    rating='4.80',
                    reviews_count=98,
                    is_offer=True,
                    is_featured=True,
                    accent_a='#22D3EE',
                    accent_b='#0EA5E9',
                )
            )

            products.append(
                add_product(
                    name='RTX 4090 Founders Edition 24GB GDDR6X',
                    category_slug='tarjetas-graficas',
                    brand='NVIDIA',
                    product_type='GPU',
                    description='Unidad de procesamiento gráfico de 24GB GDDR6X, Arquitectura Ada Lovelace.',
                    specs='VRAM: 24GB GDDR6X\nRay Tracing: Sí\nDLSS: Sí\nConector: 12VHPWR',
                    price='1899.99',
                    old_price='2299.99',
                    discount_percent=17,
                    stock=5,
                    rating='4.90',
                    reviews_count=1240,
                    is_featured=True,
                    accent_a='#22D3EE',
                    accent_b='#A855F7',
                )
            )
            products.append(
                add_product(
                    name='Procesador Intel Core i9-14900K de 24 núcleos',
                    category_slug='procesadores',
                    brand='Intel',
                    product_type='CPU',
                    description='Procesador de escritorio de alto rendimiento con boost agresivo y gran eficiencia.',
                    specs='Núcleos: 24\nHilos: 32\nBoost: 6.0GHz\nSocket: LGA1700',
                    price='589.00',
                    old_price='649.00',
                    discount_percent=9,
                    stock=18,
                    rating='4.80',
                    reviews_count=885,
                    is_featured=True,
                    accent_a='#A855F7',
                    accent_b='#22D3EE',
                )
            )
            products.append(
                add_product(
                    name='Teclado Mecánico Inalámbrico Logitech G915 TKL',
                    category_slug='perifericos',
                    brand='Logitech',
                    product_type='Teclado Mecánico',
                    description='Teclado TKL con switches rápidos, inalámbrico y RGB premium.',
                    specs='Formato: TKL\nConexión: Lightspeed + Bluetooth\nRGB: Sí\nBatería: 40h',
                    price='229.00',
                    old_price='279.00',
                    discount_percent=18,
                    stock=0,
                    rating='4.70',
                    reviews_count=210,
                    accent_a='#FB7185',
                    accent_b='#22D3EE',
                )
            )
            products.append(
                add_product(
                    name='Vengeance RGB DDR5 32GB 6000MHz',
                    category_slug='memoria-ram',
                    brand='Corsair',
                    product_type='Memoria RAM',
                    description='Kit DDR5 con RGB y perfiles optimizados para gaming competitivo.',
                    specs='Capacidad: 32GB (2x16)\nFrecuencia: 6000MHz\nRGB: Sí\nPerfil: XMP/EXPO',
                    price='124.99',
                    old_price='159.99',
                    discount_percent=22,
                    stock=22,
                    rating='4.80',
                    reviews_count=340,
                    accent_a='#22D3EE',
                    accent_b='#FB7185',
                )
            )
            products.append(
                add_product(
                    name='SSD NVMe Gen5 2TB',
                    category_slug='almacenamiento',
                    brand='PALACIO',
                    product_type='SSD NVMe',
                    description='NVMe de nueva generación con disipador y temperaturas controladas.',
                    specs='Capacidad: 2TB\nInterfaz: PCIe 5.0\nDisipador: Sí\nGarantía: 5 años',
                    price='209.00',
                    old_price='269.00',
                    discount_percent=22,
                    stock=9,
                    rating='4.70',
                    reviews_count=212,
                    accent_a='#0EA5E9',
                    accent_b='#22D3EE',
                )
            )
            products.append(
                add_product(
                    name='Mouse Gamer Razer Neon Pro',
                    category_slug='perifericos',
                    brand='Razer',
                    product_type='Mouse Gamer',
                    description='Mouse liviano con sensor de precisión y efecto neón para setups oscuros.',
                    specs='Sensor: 30K DPI\nSwitches: Ópticos\nPeso: 58g\nRGB: Sí',
                    price='89.00',
                    old_price='119.00',
                    discount_percent=25,
                    stock=16,
                    rating='4.70',
                    reviews_count=518,
                    accent_a='#FB7185',
                    accent_b='#A855F7',
                )
            )
            products.append(
                add_product(
                    name='Chasis Gamer Crystal RGB',
                    category_slug='chasis',
                    brand='Crystal',
                    product_type='Chasis',
                    description='Paneles de vidrio templado y airflow optimizado con RGB frontal.',
                    specs='Formato: ATX\nVentiladores: 4 incluidos\nPanel: Cristal\nRGB: ARGB',
                    price='159.00',
                    old_price='199.00',
                    discount_percent=20,
                    stock=12,
                    rating='4.60',
                    reviews_count=96,
                    accent_a='#A855F7',
                    accent_b='#22D3EE',
                )
            )
            products.append(
                add_product(
                    name='Monitor Gaming UltraWide 165Hz',
                    category_slug='monitores-gaming',
                    brand='UltraWide',
                    product_type='Monitor',
                    description='Pantalla UltraWide con 165Hz y baja latencia para experiencias inmersivas.',
                    specs='Tamaño: 34"\nResolución: 3440x1440\nHz: 165\nRespuesta: 1ms',
                    price='499.00',
                    old_price='649.00',
                    discount_percent=23,
                    stock=8,
                    rating='4.60',
                    reviews_count=184,
                    accent_a='#22D3EE',
                    accent_b='#0EA5E9',
                )
            )
            products.append(
                add_product(
                    name='Fuente Modular 1000W Platinum',
                    category_slug='ensambles',
                    brand='VoltEdge',
                    product_type='Fuente de Poder',
                    description='Fuente modular con eficiencia Platinum y cables premium.',
                    specs='Potencia: 1000W\nCertificación: 80+ Platinum\nModular: Sí\nProtecciones: OVP/OPP/OTP',
                    price='219.00',
                    old_price='279.00',
                    discount_percent=21,
                    stock=10,
                    rating='4.80',
                    reviews_count=140,
                    accent_a='#A855F7',
                    accent_b='#FB7185',
                )
            )
            products.append(
                add_product(
                    name='Refrigeración Líquida 360mm RGB',
                    category_slug='ensambles',
                    brand='AquaPulse',
                    product_type='Refrigeración',
                    description='AIO de 360mm con bomba silenciosa y RGB sincronizable.',
                    specs='Radiador: 360mm\nVentiladores: 3x120\nRGB: Sí\nSocket: Intel/AMD',
                    price='169.00',
                    old_price='219.00',
                    discount_percent=23,
                    stock=6,
                    rating='4.70',
                    reviews_count=88,
                    accent_a='#22D3EE',
                    accent_b='#A855F7',
                )
            )
            products.append(
                add_product(
                    name='Placa Madre Z790 Pro Gaming',
                    category_slug='ensambles',
                    brand='ProGaming',
                    product_type='Placa Madre',
                    description='Placa Z790 con VRM robusto, WiFi y slots Gen5 listos para el futuro.',
                    specs='Chipset: Z790\nSocket: LGA1700\nM.2: 4\nWiFi: Sí',
                    price='279.00',
                    old_price='329.00',
                    discount_percent=15,
                    stock=13,
                    rating='4.60',
                    reviews_count=76,
                    accent_a='#A855F7',
                    accent_b='#22D3EE',
                )
            )
            products.append(
                add_product(
                    name='Audífonos Gamer Surround H1',
                    category_slug='perifericos',
                    brand='PALACIO',
                    product_type='Audífonos',
                    description='Audio surround con micrófono claro y confort para maratones.',
                    specs='Audio: Surround\nMic: Flexible\nAlmohadillas: Memory foam\nConexión: USB',
                    price='69.00',
                    old_price='99.00',
                    discount_percent=30,
                    stock=20,
                    rating='4.50',
                    reviews_count=310,
                    accent_a='#FB7185',
                    accent_b='#22D3EE',
                )
            )

            extra_products = [
                ('RTX 4080 Super 16GB Trinity Neon', 'tarjetas-graficas', 'NVIDIA', 'GPU', 'GPU de alto rendimiento con arquitectura moderna y trazado de rayos.', 'VRAM: 16GB\nDLSS: Sí\nRay Tracing: Sí', '1199.00', '1399.00', 14, 9, '4.80', 620, '#22D3EE', '#A855F7'),
                ('RTX 4070 Ti Super 16GB Protocol Edition', 'tarjetas-graficas', 'NVIDIA', 'GPU', 'Equilibrio perfecto para 1440p/4K con gran eficiencia.', 'VRAM: 16GB\nDLSS: Sí\nEncoder: AV1', '849.00', '999.00', 15, 14, '4.70', 480, '#0EA5E9', '#22D3EE'),
                ('AMD Radeon RX 7900 XTX 24GB Neon', 'tarjetas-graficas', 'AMD', 'GPU', 'Potencia para experiencias Ultra con gran ancho de banda.', 'VRAM: 24GB\nRay Tracing: Sí\nFSR: Sí', '899.00', '1049.00', 14, 7, '4.60', 390, '#FB7185', '#A855F7'),
                ('Intel Core i7-14700K 20 núcleos', 'procesadores', 'Intel', 'CPU', 'CPU para gaming competitivo y multitarea agresiva.', 'Núcleos: 20\nHilos: 28\nBoost: 5.6GHz', '399.00', '449.00', 11, 15, '4.70', 510, '#A855F7', '#22D3EE'),
                ('AMD Ryzen 9 7950X3D', 'procesadores', 'AMD', 'CPU', 'Caché 3D para FPS altos y rendimiento elite.', 'Núcleos: 16\nHilos: 32\nCache: 3D V-Cache', '549.00', '649.00', 15, 6, '4.80', 430, '#22D3EE', '#FB7185'),
                ('DDR5 Neon RGB 64GB 6400MHz', 'memoria-ram', 'NeonRAM', 'Memoria RAM', 'Kit DDR5 de alta capacidad para builds extremos.', 'Capacidad: 64GB (2x32)\nFrecuencia: 6400MHz\nRGB: Sí', '259.00', '319.00', 19, 4, '4.70', 190, '#FB7185', '#22D3EE'),
                ('SSD NVMe Gen4 1TB', 'almacenamiento', 'Velocity', 'SSD NVMe', 'NVMe Gen4 rápido para juegos y sistema.', 'Capacidad: 1TB\nPCIe: 4.0\nLectura: 7000MB/s', '89.00', '109.00', 18, 21, '4.60', 420, '#0EA5E9', '#22D3EE'),
                ('SSD NVMe Gen4 4TB', 'almacenamiento', 'Velocity', 'SSD NVMe', 'Espacio masivo con altas velocidades sostenidas.', 'Capacidad: 4TB\nPCIe: 4.0\nLectura: 7400MB/s', '289.00', '349.00', 17, 10, '4.70', 220, '#22D3EE', '#0EA5E9'),
                ('Chasis Mid Tower Nebula Airflow', 'chasis', 'Nebula', 'Chasis', 'Airflow frontal con malla y soporte para radiadores grandes.', 'Formato: ATX\nSoporte: 360mm\nVidrio: Sí', '129.00', '159.00', 19, 26, '4.50', 90, '#A855F7', '#22D3EE'),
                ('Monitor 27" 240Hz IPS', 'monitores-gaming', 'PulseView', 'Monitor', '240Hz para esports con panel IPS y colores vivos.', 'Tamaño: 27"\nHz: 240\nRespuesta: 1ms\nPanel: IPS', '349.00', '429.00', 18, 17, '4.60', 210, '#22D3EE', '#FB7185'),
                ('Monitor 32" 4K 144Hz', 'monitores-gaming', 'PulseView', 'Monitor', '4K con 144Hz para máxima nitidez y fluidez.', 'Tamaño: 32"\nResolución: 4K\nHz: 144\nHDR: Sí', '699.00', '849.00', 18, 6, '4.70', 140, '#0EA5E9', '#22D3EE'),
                ('Kit Ventiladores ARGB x3', 'ensambles', 'AeroNeon', 'Ventiladores', 'Trío de ventiladores con ARGB y alto flujo de aire.', 'Cantidad: 3\nARGB: Sí\nRPM: 1800', '49.00', '69.00', 28, 30, '4.50', 160, '#A855F7', '#FB7185'),
                ('Teclado 75% Hot-swap Wireless MK-7', 'perifericos', 'PALACIO', 'Teclado Mecánico', 'Teclado 75% hot-swap con wireless 2.4GHz y RGB direccionable.', 'Formato: 75%\nHot-swap: Sí\nWireless: 2.4GHz\nRGB: Sí', '159.00', '199.00', 20, 12, '4.70', 260, '#A855F7', '#FB7185'),
                ('Placa Madre B650M Neon WiFi', 'ensambles', 'ProGaming', 'Placa Madre', 'Placa AM5 compacta con WiFi y VRM optimizado.', 'Chipset: B650\nSocket: AM5\nWiFi: Sí\nM.2: 3', '179.00', '219.00', 18, 15, '4.50', 122, '#22D3EE', '#A855F7'),
                ('Fuente Modular 850W Gold', 'ensambles', 'VoltEdge', 'Fuente de Poder', 'Fuente modular confiable con eficiencia Gold.', 'Potencia: 850W\nCertificación: 80+ Gold\nModular: Sí', '129.00', '159.00', 19, 19, '4.60', 188, '#FB7185', '#A855F7'),
                ('Refrigeración AIO 240mm Neon', 'ensambles', 'AquaPulse', 'Refrigeración', 'AIO 240mm con iluminación neón y buen rendimiento térmico.', 'Radiador: 240mm\nRGB: Sí\nSocket: Intel/AMD', '119.00', '149.00', 20, 18, '4.50', 102, '#0EA5E9', '#22D3EE'),
            ]

            for (
                name,
                cat_slug,
                brand,
                ptype,
                desc,
                specs,
                price,
                old_price,
                disc,
                stock,
                rating,
                reviews,
                a,
                b,
            ) in extra_products:
                products.append(
                    add_product(
                        name=name,
                        category_slug=cat_slug,
                        brand=brand,
                        product_type=ptype,
                        description=desc,
                        specs=specs,
                        price=price,
                        old_price=old_price,
                        discount_percent=disc,
                        stock=stock,
                        rating=rating,
                        reviews_count=reviews,
                        accent_a=a,
                        accent_b=b,
                    )
                )

            by_name = {p.name: p for p in Product.objects.all()}

            Order.objects.create(
                order_code='PG-9921',
                product_name='NVIDIA GeForce RTX 4090 Founders Edition',
                product_description='Unidad de procesamiento gráfico de 24GB GDDR6X, Arquitectura Ada Lovelace.',
                product_image_base64=(by_name.get('RTX 4090 Founders Edition 24GB GDDR6X').image_base64 if by_name.get('RTX 4090 Founders Edition 24GB GDDR6X') else ''),
                quantity=1,
                total=Decimal('1249.00'),
                status=Order.Status.EN_CAMINO,
                date_label='14 Oct, 2024',
                extra_info='GARANTÍA ACTIVA: 3 AÑOS',
                can_track=True,
                can_cancel=False,
                can_download_invoice=False,
            )
            Order.objects.create(
                order_code='PG-8842',
                product_name='Palacio Custom Series MK-7',
                product_description='Teclado Mecánico 75% con Switches Hot-swap, Wireless 2.4GHz y RGB direccionable.',
                product_image_base64=(by_name.get('Teclado 75% Hot-swap Wireless MK-7').image_base64 if by_name.get('Teclado 75% Hot-swap Wireless MK-7') else ''),
                quantity=1,
                total=Decimal('450.00'),
                status=Order.Status.ENTREGADO,
                date_label='22 Sep, 2024',
                extra_info='ENTREGADO: 25 Sep, 2024',
                can_track=False,
                can_cancel=False,
                can_download_invoice=True,
            )
            Order.objects.create(
                order_code='PG-9950',
                product_name='Build Custom: "Overlord Edition"',
                product_description='PC Gaming Pre-ensamblado con Intel Core i9-14900K, 64GB DDR5, SSD 4TB NVMe.',
                product_image_base64=_svg_data_uri('Overlord', 'Build Custom', '#A855F7', '#22D3EE'),
                quantity=1,
                total=Decimal('3599.00'),
                status=Order.Status.PROCESANDO,
                date_label='Hace 2 horas',
                extra_info='ESTADO: VALIDANDO PAGO | ENVÍO PRIORITARIO',
                can_track=False,
                can_cancel=True,
                can_download_invoice=False,
            )

            Notification.objects.create(
                title='Pedido enviado',
                message='Tu ensamble de alto rendimiento está en camino',
                type='shipping',
                time_label='Hace 3 min',
                is_new=True,
            )
            Notification.objects.create(
                title='Oferta del 30%',
                message='¡Protocolo Neón! Descuento exclusivo en periféricos seleccionados',
                type='deal',
                time_label='Hace 18 min',
                is_new=True,
            )
            Notification.objects.create(
                title='Build verificado',
                message='Tu configuración pasó la revisión térmica y eléctrica',
                type='info',
                time_label='Ayer',
                is_new=False,
            )
            Notification.objects.create(
                title='Stock limitado',
                message='RTX 4090 Founders Edition con unidades reducidas',
                type='stock',
                time_label='Ayer',
                is_new=False,
            )

            p4090 = by_name.get('RTX 4090 Founders Edition 24GB GDDR6X')
            apex = by_name.get('Teclado Mecánico Inalámbrico Logitech G915 TKL') or by_name.get('Teclado 75% Hot-swap Wireless MK-7')

            if p4090:
                CartItem.objects.create(
                    product_name='NVIDIA RTX 4090',
                    product_image_base64=p4090.image_base64,
                    quantity=1,
                    price=p4090.price,
                )
            if apex:
                CartItem.objects.create(
                    product_name='Apex Pro TKL',
                    product_image_base64=apex.image_base64,
                    quantity=1,
                    price=apex.price,
                )

        self.stdout.write(self.style.SUCCESS('Seed completado: Palacio Gamer'))
