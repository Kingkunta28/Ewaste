#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

DJANGO_SUPERUSER_EMAIL="${DJANGO_SUPERUSER_EMAIL:-raya@gmail.com}"
DJANGO_SUPERUSER_USERNAME="${DJANGO_SUPERUSER_USERNAME:-$DJANGO_SUPERUSER_EMAIL}"
DJANGO_SUPERUSER_PASSWORD="${DJANGO_SUPERUSER_PASSWORD:-Raya@1234}"

python manage.py shell -c "
from django.contrib.auth import get_user_model

User = get_user_model()
email = '${DJANGO_SUPERUSER_EMAIL}'
username = '${DJANGO_SUPERUSER_USERNAME}'
password = '${DJANGO_SUPERUSER_PASSWORD}'

user, created = User.objects.get_or_create(
    username=username,
    defaults={'email': email, 'is_staff': True, 'is_superuser': True},
)

user.email = email
user.is_staff = True
user.is_superuser = True
user.set_password(password)
user.save()

print('Superuser created:' if created else 'Superuser updated:', username)
"
