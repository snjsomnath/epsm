#!/bin/bash
set -e

echo "Starting EPSM Backend..."

# Configure Docker group for EnergyPlus container access
if [ -S /var/run/docker.sock ] && [ "$DOCKER_GID" ]; then
    echo "Configuring Docker group access (GID: $DOCKER_GID)..."
    
    # Get the current Docker socket GID
    DOCKER_SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
    echo "Docker socket GID: $DOCKER_SOCK_GID"
    
    # Create/modify docker group to match the socket GID
    if getent group docker > /dev/null 2>&1; then
        groupmod -g "$DOCKER_SOCK_GID" docker 2>/dev/null || echo "Group modification failed, trying alternative approach"
    else
        groupadd -g "$DOCKER_SOCK_GID" docker 2>/dev/null || echo "Group creation failed"
    fi
    
    # Ensure appuser is in docker group
    usermod -a -G docker appuser 2>/dev/null || echo "User modification failed"
    
    # Set socket permissions to allow appuser access (production-ready approach)
    chmod 666 /var/run/docker.sock 2>/dev/null || echo "Socket permission change failed"
    echo "Docker socket permissions configured for EnergyPlus access"
fi

# Create required directories with proper permissions
echo "Creating required directories..."
mkdir -p /app/logs /app/media /app/staticfiles
chmod -R 777 /app/logs /app/media /app/staticfiles

# Wait for database to be ready
echo "Waiting for database..."
python << END
import sys
import time
import psycopg2
import os

db_config = {
    'dbname': os.getenv('DB_NAME', os.getenv('POSTGRES_DB', 'epsm_db')),
    'user': os.getenv('DB_USER', os.getenv('POSTGRES_USER', 'epsm_user')),
    'password': os.getenv('DB_PASSWORD', os.getenv('POSTGRES_PASSWORD', 'epsm_secure_password')),
    'host': os.getenv('DB_HOST', os.getenv('POSTGRES_HOST', 'database')),
    'port': os.getenv('DB_PORT', os.getenv('POSTGRES_PORT', '5432')),
}

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(**db_config)
        conn.close()
        print("Database is ready!")
        sys.exit(0)
    except psycopg2.OperationalError:
        retry_count += 1
        print(f"Database not ready, waiting... ({retry_count}/{max_retries})")
        time.sleep(2)

print("Database connection failed after maximum retries")
sys.exit(1)
END

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput --fake-initial

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create superuser if it doesn't exist (for production setup)
if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser if not exists..."
    python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('Superuser created.')
else:
    print('Superuser already exists.')
END
fi

echo "Starting Gunicorn..."
exec "$@"
