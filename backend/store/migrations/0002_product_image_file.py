from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='image_file',
            field=models.FileField(blank=True, null=True, upload_to='productos/'),
        ),
    ]

