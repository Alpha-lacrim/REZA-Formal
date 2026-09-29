"""Transactional product writes shared by the staff API and compatibility route."""
import hashlib

from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from .commerce_services import CommerceError
from .models import InventoryMovement, Product, ProductVariant
from .product_media import store_product_media


def inventory_version(obj):
    rows = sorted(
        (str(v.pk), v.stock, v.is_active, v.updated_at.isoformat())
        for v in obj.variants.all()
    )
    state = (obj.stock, obj.updated_at.isoformat(), rows)
    return hashlib.sha256(repr(state).encode()).hexdigest()


def save_product(instance, data, variants, actor, *, expected_version=None):
    data = dict(data)
    saved_names = []
    try:
        with transaction.atomic():
            if instance is not None:
                try:
                    instance = Product.objects.select_for_update().get(pk=instance.pk)
                except Product.DoesNotExist as exc:
                    raise CommerceError('product_not_found', 'Product not found.', 404) from exc
                if 'stock' in data or variants is not None:
                    if not expected_version or expected_version != inventory_version(instance):
                        raise CommerceError('inventory_conflict', 'Inventory changed. Reload the product before saving.', 409)
            store_product_media(data, saved_names)
            if instance is None:
                instance = Product.objects.create(**data)
            else:
                for field, value in data.items():
                    setattr(instance, field, value)
                instance.save(update_fields=[*data, 'updated_at'])
            _sync_product_variants(instance, variants, actor, update_stock='stock' in data)
    except Exception:
        for name in saved_names:
            default_storage.delete(name)
        raise
    return instance


def _sync_product_variants(product, variants, actor, *, update_stock=False):
    """Keep SKU inventory auditable and maintain legacy Product.stock as a projection."""
    if variants is None:
        current = list(product.variants.select_for_update())
        if len(current) > 1 or (current and (current[0].size or current[0].color)):
            projected_stock = sum(item.stock for item in current if item.is_active)
            if product.stock != projected_stock:
                product.stock = projected_stock
                product.save(update_fields=['stock', 'updated_at'])
            return
        if current:
            variant = current[0]
            created = False
        else:
            variant = ProductVariant.objects.create(
                product=product,
                size='',
                color='',
                sku=f'DEFAULT-{product.pk}'.upper(),
                stock=product.stock,
                is_active=product.is_active,
            )
            created = True
        old_stock = variant.stock
        if not created and ((update_stock and variant.stock != product.stock) or variant.is_active != product.is_active):
            if update_stock:
                variant.stock = product.stock
            variant.is_active = product.is_active
            variant.save(update_fields=['stock', 'is_active', 'updated_at'])
        delta = variant.stock if created else variant.stock - old_stock
        if delta:
            InventoryMovement.objects.create(
                variant=variant,
                actor=actor,
                sku=variant.sku,
                delta=delta,
                resulting_stock=variant.stock,
                reason='initial' if created else 'adjustment',
                reference=f'PRODUCT-{product.pk}',
            )
        projected_stock = variant.stock if variant.is_active else 0
        if product.stock != projected_stock:
            product.stock = projected_stock
            product.save(update_fields=['stock', 'updated_at'])
        return

    existing = {str(item.id): item for item in product.variants.select_for_update()}
    retained = set()
    active_stock = 0
    for values in variants:
        values = dict(values)
        variant_id = str(values.pop('id', ''))
        variant = existing.get(variant_id) if variant_id else None
        if variant_id and (variant is None or variant_id in retained):
            raise DjangoValidationError('Variant IDs must be distinct and belong to this product.')
        if variant is None:
            variant = ProductVariant(product=product)
            old_stock = 0
            reason = 'initial'
        else:
            old_stock = variant.stock
            retained.add(str(variant.id))
            reason = 'adjustment'
        for field in ('sku', 'size', 'color', 'price', 'stock', 'is_active'):
            if field in values:
                setattr(variant, field, values[field])
        variant.full_clean()
        variant.save()
        retained.add(str(variant.id))
        if variant.is_active:
            active_stock += variant.stock
        delta = variant.stock - old_stock
        if delta:
            InventoryMovement.objects.create(
                variant=variant,
                actor=actor,
                sku=variant.sku,
                delta=delta,
                resulting_stock=variant.stock,
                reason=reason,
                reference=f'PRODUCT-{product.pk}',
            )

    product.variants.exclude(id__in=retained).update(is_active=False)
    if product.stock != active_stock:
        product.stock = active_stock
        product.save(update_fields=['stock', 'updated_at'])

