#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input

# Neon recommends a direct connection for migrations. Runtime traffic can keep
# using the pooled DATABASE_URL while MIGRATION_DATABASE_URL is supplied only
# for schema changes.
if [[ -n "${MIGRATION_DATABASE_URL:-}" ]]; then
  DATABASE_URL="$MIGRATION_DATABASE_URL" python manage.py migrate
else
  python manage.py migrate
fi

# Never create a predictable administrator. Bootstrap one only when secure
# credentials are explicitly configured in the deployment environment.
if [[ -n "${DJANGO_SUPERUSER_EMAIL:-}" && -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]]; then
  python manage.py shell -c "
import os
from django.contrib.auth import get_user_model

User = get_user_model()
email = os.environ['DJANGO_SUPERUSER_EMAIL']
username = os.environ.get('DJANGO_SUPERUSER_USERNAME') or email
password = os.environ['DJANGO_SUPERUSER_PASSWORD']
user, created = User.objects.get_or_create(username=username, defaults={'email': email})
user.email = email
user.is_staff = True
user.is_superuser = True
user.set_password(password)
user.save()
print('Superuser created:' if created else 'Superuser updated:', username)
"
else
  echo "Skipping superuser bootstrap; deployment credentials are not configured."
fi
