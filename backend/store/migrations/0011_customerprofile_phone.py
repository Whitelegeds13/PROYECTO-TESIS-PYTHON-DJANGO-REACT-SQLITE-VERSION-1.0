from django.db import migrations, models


AUTO_PREFIX = '__AUTO__ Tel pendiente #'


def forwards(apps, schema_editor):
    CustomerProfile = apps.get_model('store', 'CustomerProfile')
    for profile in CustomerProfile.objects.all().only('id', 'user_id', 'phone'):
        if getattr(profile, 'phone', None):
            continue
        profile.phone = f'{AUTO_PREFIX}{profile.user_id}'
        profile.save(update_fields=['phone'])


def backwards(apps, schema_editor):
    CustomerProfile = apps.get_model('store', 'CustomerProfile')
    CustomerProfile.objects.filter(phone__startswith=AUTO_PREFIX).update(phone='')


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0010_backfill_customerprofile_address'),
    ]

    operations = [
        migrations.AddField(
            model_name='customerprofile',
            name='phone',
            field=models.CharField(default='', max_length=20),
            preserve_default=False,
        ),
        migrations.RunPython(forwards, backwards),
    ]

