"""Site image writes use the same staged, validated storage as products."""
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction

from .models import SiteSettings


def save_site_settings(instance, data):
    data = dict(data)
    saved = []
    try:
        with transaction.atomic():
            if instance:
                instance = SiteSettings.objects.select_for_update().get(pk=instance.pk)
            for field, value in data.items():
                if isinstance(value, ContentFile):
                    name = default_storage.save(f'site/{value.name}', value)
                    saved.append(name)
                    data[field] = name
            if instance is None:
                instance = SiteSettings.objects.create(**data)
            else:
                for field, value in data.items():
                    setattr(instance, field, value)
                instance.save(update_fields=list(data))
    except Exception:
        for name in saved:
            default_storage.delete(name)
        raise
    # Retain previous assets: historical references and rollback may use them.
    return instance
