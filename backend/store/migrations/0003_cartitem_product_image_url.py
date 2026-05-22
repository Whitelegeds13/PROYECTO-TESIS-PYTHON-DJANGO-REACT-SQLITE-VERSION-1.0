from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0002_product_image_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='cartitem',
            name='product_image_url',
            field=models.CharField(blank=True, max_length=500),
        ),
    ]

