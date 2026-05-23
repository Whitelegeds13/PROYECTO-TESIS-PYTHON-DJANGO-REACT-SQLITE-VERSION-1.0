from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0004_cartitem_order_user'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('method', models.CharField(choices=[('card', 'Tarjeta'), ('bank_transfer', 'Transferencia Bancaria')], max_length=32)),
                ('status', models.CharField(choices=[('pending', 'Pendiente'), ('confirmed', 'Confirmado')], default='pending', max_length=16)),
                ('subtotal', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('shipping', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('igv', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('card_holder_name', models.CharField(blank=True, max_length=120)),
                ('card_last4', models.CharField(blank=True, max_length=4)),
                ('card_expiry', models.CharField(blank=True, max_length=7)),
                ('bank_name', models.CharField(blank=True, max_length=64)),
                ('bank_account', models.CharField(blank=True, max_length=64)),
                ('bank_cci', models.CharField(blank=True, max_length=64)),
                ('receipt_file', models.FileField(blank=True, null=True, upload_to='comprobantes/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='order',
            name='payment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='store.payment'),
        ),
    ]

