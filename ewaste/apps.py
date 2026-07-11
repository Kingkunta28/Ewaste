from django.apps import AppConfig


class EwasteConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = 'ewaste'

    def ready(self):
        import ewaste.signals  # noqa: F401
