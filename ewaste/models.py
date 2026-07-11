from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone

User = get_user_model()


class UserProfile(models.Model):
    ROLE_USER = "user"
    ROLE_ADMIN = "admin"
    ROLE_COLLECTOR = "collector"
    ROLE_CHOICES = (
        (ROLE_USER, "User"),
        (ROLE_ADMIN, "Admin"),
        (ROLE_COLLECTOR, "Collector"),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class EWasteRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ASSIGNED = "assigned"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_ASSIGNED, "Assigned"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="requests")
    item_type = models.CharField(max_length=120)
    quantity = models.PositiveIntegerField(default=1)
    condition = models.CharField(max_length=50, blank=True)
    brand = models.CharField(max_length=80, blank=True)
    pickup_address = models.CharField(max_length=255)
    pickup_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True)
    assigned_collector = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_requests",
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def mark_assigned(self, collector):
        self.assigned_collector = collector
        self.status = self.STATUS_ASSIGNED
        self.assigned_at = timezone.now()

    def mark_completed(self):
        self.status = self.STATUS_COMPLETED
        self.completed_at = timezone.now()

    def clean(self):
        if self.assigned_collector_id:
            profile = getattr(self.assigned_collector, "profile", None)
            if not profile or profile.role != UserProfile.ROLE_COLLECTOR:
                raise ValidationError({"assigned_collector": "Assigned user must have collector role."})

        if self.status in {self.STATUS_ASSIGNED, self.STATUS_COMPLETED} and not self.assigned_collector_id:
            raise ValidationError({"assigned_collector": "Assigned or completed requests must have a collector."})

        if self.status == self.STATUS_COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_type} ({self.status}) - {self.user.username}"
