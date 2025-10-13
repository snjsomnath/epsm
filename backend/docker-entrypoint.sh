#!/bin/bash
set -e

echo "Starting EPSM Backend..."

# Configure Docker group for EnergyPlus container access
if [ -S /var/run/docker.sock ] && [ "$DOCKER_GID" ]; then
    echo "Configuring Docker group access (GID: $DOCKER_GID)..."
    DOCKER_SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
    groupadd -g "$DOCKER_SOCK_GID" docker 2>/dev/null || groupmod -g "$DOCKER_SOCK_GID" docker 2>/dev/null || true
    usermod -a -G docker appuser 2>/dev/null || true
    chmod 666 /var/run/docker.sock 2>/dev/null || true
    echo "Docker socket permissions configured"
fi

# Create required directories
echo "Creating required directories..."
mkdir -p /app/logs /app/media /app/staticfiles
chmod -R 777 /app/logs /app/media /app/staticfiles 2>/dev/null || true

# Wait for database
echo "Waiting for database..."
python << END
import sys, time, psycopg2, os
config = {
    'dbname': os.getenv('DB_NAME', 'epsm_db'),
    'user': os.getenv('DB_USER', 'epsm_user'),
    'password': os.getenv('DB_PASSWORD', 'epsm_secure_password'),
    'host': os.getenv('DB_HOST', 'database'),
    'port': os.getenv('DB_PORT', '5432'),
}
for i in range(30):
    try:
        psycopg2.connect(**config).close()
        print("Database is ready!")
        sys.exit(0)
    except psycopg2.OperationalError:
        print(f"Waiting for database... ({i+1}/30)")
        time.sleep(2)
sys.exit(1)
END

# Run all migrations automatically (single database - simple!)
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create default superuser for development/initial setup
echo "Creating default superuser (epsm@chalmers.se) if not exists..."
python manage.py shell << 'END'
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='epsm@chalmers.se').exists():
    User.objects.create_superuser('epsm@chalmers.se', 'epsm@chalmers.se', 'password')
    print('✅ Default superuser created: epsm@chalmers.se / password')
else:
    print('ℹ️  Superuser already exists.')
END

# Create superuser from environment variables if provided (for custom setup)
if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating custom superuser if not exists..."
    python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('✅ Custom superuser created.')
else:
    print('ℹ️  Custom superuser already exists.')
END
fi

echo "Starting Gunicorn..."
exec "$@"
