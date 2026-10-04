from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('shop', '0007_commerce_payment_refund_states')]
    operations = [migrations.RemoveIndex(model_name='productvariant', name='variant_sku_idx')]
