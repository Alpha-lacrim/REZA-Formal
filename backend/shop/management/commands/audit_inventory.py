"""Read-only reconciliation evidence; never invent or repair stock."""
import json

from django.core.management.base import BaseCommand
from django.db.models import Count, F, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce

from shop.models import InventoryMovement, Product, ProductVariant


class Command(BaseCommand):
    help = 'Report inventory projection/ledger disagreements without changing any rows.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=25)

    def handle(self, *args, **options):
        limit = min(max(options['limit'], 1), 100)
        products = Product.objects.annotate(
            variant_count=Count('variants'),
            active_stock=Coalesce(Sum('variants__stock', filter=Q(variants__is_active=True)), Value(0)),
        )
        mismatches = products.filter(variant_count__gt=0).exclude(stock=F('active_stock'))
        latest = InventoryMovement.objects.filter(variant_id=OuterRef('pk')).order_by('-created_at', '-pk')
        variants = ProductVariant.objects.annotate(ledger_stock=Subquery(latest.values('resulting_stock')[:1]))
        ledger_mismatches = variants.filter(ledger_stock__isnull=False).exclude(stock=F('ledger_stock'))
        self.stdout.write(json.dumps({
            'projection_mismatch_count': mismatches.count(),
            'projection_samples': list(mismatches.order_by('pk').values('id', 'stock', 'active_stock')[:limit]),
            'products_without_variants_count': products.filter(variant_count=0).count(),
            'ledger_mismatch_count': ledger_mismatches.count(),
            'ledger_samples': list(ledger_mismatches.order_by('pk').values('sku', 'stock', 'ledger_stock')[:limit]),
            'variants_without_ledger_count': variants.filter(ledger_stock__isnull=True).count(),
        }))
