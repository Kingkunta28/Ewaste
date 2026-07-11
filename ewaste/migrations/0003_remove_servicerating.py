from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("ewaste", "0002_servicerating"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ServiceRating",
        ),
    ]
