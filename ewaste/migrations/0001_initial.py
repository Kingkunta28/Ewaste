from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("address", models.CharField(blank=True, max_length=255)),
                (
                    "role",
                    models.CharField(
                        choices=[("user", "User"), ("admin", "Admin"), ("collector", "Collector")],
                        default="user",
                        max_length=20,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
        migrations.CreateModel(
            name="EWasteRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("item_type", models.CharField(max_length=120)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("condition", models.CharField(blank=True, max_length=50)),
                ("brand", models.CharField(blank=True, max_length=80)),
                ("pickup_address", models.CharField(max_length=255)),
                ("pickup_date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("assigned", "Assigned"), ("completed", "Completed"), ("cancelled", "Cancelled")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("assigned_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "assigned_collector",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="requests", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
    ]
