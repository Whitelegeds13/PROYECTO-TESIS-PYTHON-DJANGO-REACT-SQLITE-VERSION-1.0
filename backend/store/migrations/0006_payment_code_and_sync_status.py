from django.db import migrations, models
from django.utils import timezone
import uuid


def populate_payment_codes(apps, schema_editor):
    Payment = apps.get_model('store', 'Payment')
    year = timezone.now().year
    for p in Payment.objects.filter(payment_code__isnull=True):
        while True:
            raw = uuid.uuid4().hex.upper()
            code = f'PG-{raw[:4]}-{raw[4:6]}-{year}'
            if not Payment.objects.filter(payment_code=code).exists():
                p.payment_code = code
                p.save(update_fields=['payment_code'])
                break


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0005_payment_and_order_payment'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='payment_code',
            field=models.CharField(blank=True, max_length=32, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='sync_status',
            field=models.CharField(
                choices=[('en_espera', 'En espera'), ('confirmado', 'Confirmado')],
                default='en_espera',
                max_length=16,
            ),
        ),
        migrations.RunPython(populate_payment_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='payment',
            name='payment_code',
            field=models.CharField(max_length=32, unique=True),
        ),
    ]

