from django.db import migrations, models


def normalize_emails_and_clear_legacy_2fa(apps, schema_editor):
    User = apps.get_model('shop', 'User')
    seen = {}
    conflicts = []
    normalized = []

    for user in User.objects.order_by('pk').iterator():
        email = (user.email or '').strip().lower()
        if not email:
            conflicts.append(f'user id {user.pk} has no email')
            continue
        if email in seen:
            conflicts.append(f'user ids {seen[email]} and {user.pk} share an email')
            continue
        seen[email] = user.pk
        normalized.append((user.pk, email))

    if conflicts:
        raise RuntimeError(
            'Cannot enforce unique user emails until these accounts are resolved: '
            + '; '.join(conflicts)
        )

    for user_id, email in normalized:
        User.objects.filter(pk=user_id).update(
            email=email,
            # The retired endpoint generated secrets without giving users an
            # authenticator enrollment secret/QR or recovery flow. Clear them
            # to avoid locking those legacy accounts out.
            two_factor_secret=None,
        )


class Migration(migrations.Migration):
    dependencies = [
        ('shop', '0004_user_address'),
    ]

    operations = [
        migrations.RunPython(
            normalize_emails_and_clear_legacy_2fa,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(max_length=254, unique=True, verbose_name='email address'),
        ),
    ]
