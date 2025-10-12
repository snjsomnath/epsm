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
chmod -R 777 /app/logs /app/media /app/staticfiles 2>/dev/null || echo "Warning: Some chmod operations failed (non-fatal)"

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
echo "  - Migrating default database..."
python manage.py migrate --noinput --fake-initial

echo "  - Migrating materials_db database..."
python manage.py migrate database --database=materials_db --noinput --fake-initial

echo "  - Migrating results_db database..."
# The challenge: migrations 0001-0003 reference Simulation model with FK
# which exists on default DB but not on results_db
# Solution: Fake 0001-0003, then manually create tables, then apply 0004+

# Check if tables already exist
TABLE_EXISTS=$(python << 'PYEOF'
import psycopg2, os, sys
try:
    conn = psycopg2.connect(
        dbname='epsm_results',
        user=os.getenv('DB_USER', 'epsm_user'),
        password=os.getenv('DB_PASSWORD', 'epsm_secure_password'),
        host=os.getenv('DB_HOST', 'database'),
        port=os.getenv('DB_PORT', '5432')
    )
    cur = conn.cursor()
    cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='simulation_results')")
    print('true' if cur.fetchone()[0] else 'false')
    cur.close()
    conn.close()
except: print('false')
PYEOF
)

if [ "$TABLE_EXISTS" = "true" ]; then
    echo "    ✓ Tables exist on results_db, syncing migration state..."
    python manage.py migrate simulation --database=results_db --fake-initial --noinput
else
    echo "    Creating tables on results_db..."
    # Fake 0001-0003 (they have FK to Simulation which doesn't exist here)
    python manage.py migrate simulation 0003 --database=results_db --fake --noinput
    
    # Manually create the tables that 0001 would have created
    echo "    Manually creating simulation result tables..."
    python manage.py shell <<'SHELLEOF'
from django.db import connection
from simulation.models import SimulationResult, SimulationZone, SimulationEnergyUse, SimulationHourlyTimeseries

# Use results_db connection
from django.db import connections
results_conn = connections['results_db']
with results_conn.schema_editor() as schema_editor:
    # Create the tables from current model state (includes all fields from migrations 0001-0008)
    schema_editor.create_model(SimulationResult)
    schema_editor.create_model(SimulationZone)
    schema_editor.create_model(SimulationEnergyUse)
    schema_editor.create_model(SimulationHourlyTimeseries)
print("Tables created successfully")
SHELLEOF
    
    # Fake all migrations since tables are at current state
    echo "    Marking all migrations as applied (tables created from current models)..."
    python manage.py migrate simulation --database=results_db --fake --noinput
fi

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
