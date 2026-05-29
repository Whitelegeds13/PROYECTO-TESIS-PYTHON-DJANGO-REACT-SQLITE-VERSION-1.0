from django.conf import settings
from django.db import migrations


AUTO_PREFIX = '__AUTO__ Dirección pendiente #'


def _get_user_model(apps):
    label = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')
    app_label, model_name = label.split('.')
    return apps.get_model(app_label, model_name)


def forwards(apps, schema_editor):
    User = _get_user_model(apps)
    CustomerProfile = apps.get_model('store', 'CustomerProfile')

    user_ids = list(User.objects.filter(is_staff=False).values_list('id', flat=True))
    existing = set(CustomerProfile.objects.filter(user_id__in=user_ids).values_list('user_id', flat=True))

    to_create = []
    for user_id in user_ids:
        if user_id in existing:
            continue
        to_create.append(CustomerProfile(user_id=user_id, address=f'{AUTO_PREFIX}{user_id}'))

    if to_create:
        CustomerProfile.objects.bulk_create(to_create, ignore_conflicts=True)


def backwards(apps, schema_editor):
    CustomerProfile = apps.get_model('store', 'CustomerProfile')
    CustomerProfile.objects.filter(address__startswith=AUTO_PREFIX).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0009_customerprofile'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]

