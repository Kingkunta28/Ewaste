from django.contrib import admin
from .models import EWasteRequest, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "phone")
    search_fields = ("user__username", "user__email", "phone")
    list_filter = ("role",)


@admin.register(EWasteRequest)
class EWasteRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "item_type",
        "quantity",
        "pickup_date",
        "status",
        "assigned_collector",
    )
    list_filter = ("status", "pickup_date")
    search_fields = ("user__username", "item_type", "pickup_address")
