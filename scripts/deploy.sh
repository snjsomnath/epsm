#!/bin/bash

# EPSM Production Deployment Script
# This script deploys EPSM to production environment

set -e

echo "🚀 Deploying EPSM to Production..."

PYTHON_BIN="$(command -v python3 || command -v python)"
if [ -z "$PYTHON_BIN" ]; then
    echo "❌ Python is required to run this deployment script. Please install python3."
    exit 1
fi

# Helper to upsert .env values without relying on sed variations
update_env_var() {
    local key="$1"
    local value="$2"
    "$PYTHON_BIN" - "$key" "$value" <<'PY'
import sys
from pathlib import Path

key, value = sys.argv[1:3]
env_path = Path('.env')
lines = env_path.read_text().splitlines()
updated = False

for idx, line in enumerate(lines):
    if line.split('=', 1)[0] == key:
        lines[idx] = f"{key}={value}"
        updated = True
        break

if not updated:
    lines.append(f"{key}={value}")

env_path.write_text('\n'.join(lines) + '\n')
PY
}

# Helper to generate a secure Django secret key
generate_secret_key() {
    "$PYTHON_BIN" - <<'PY'
import secrets

print(secrets.token_urlsafe(64))
PY
}

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ No .env file found. Please create one with production values."
    exit 1
fi

# Validate required environment variables
echo "🔍 Validating environment configuration..."
required_vars=("DB_PASSWORD" "DJANGO_SECRET_KEY" "ALLOWED_HOSTS")
for var in "${required_vars[@]}"; do
    env_line="$(grep -E "^${var}=" .env || true)"
    env_value="${env_line#*=}"

    if [ -z "$env_line" ] || [[ "$env_value" == *"your"* ]]; then
        if [ "$var" = "DJANGO_SECRET_KEY" ]; then
            echo "🛠️  Generating secure DJANGO_SECRET_KEY..."
            new_secret="$(generate_secret_key)"
            update_env_var "$var" "$new_secret"
            echo "✅ Updated DJANGO_SECRET_KEY in .env"
        else
            echo "❌ Please set ${var} in .env file with a production value"
            exit 1
        fi
    fi
done

# Create backup of current production data
if docker-compose -f docker-compose.prod.yml ps | grep -q epsm_database_prod; then
    echo "💾 Creating backup of production database..."
    ./scripts/backup.sh
fi

# Stop existing production services
echo "🛑 Stopping existing production services..."
docker-compose -f docker-compose.prod.yml down

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Build and start production services
echo "🏗️  Building and starting production services..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose -f docker-compose.prod.yml exec -T database pg_isready -U epsm_user -d epsm_db; do
    echo "   Database is unavailable - sleeping..."
    sleep 2
done

echo "✅ Database is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
echo "📦 Collecting static files..."
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Health check
echo "🏥 Performing health checks..."
sleep 10

# Check if services are healthy
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

if curl -f http://localhost/api/health/ > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Show running services
echo "📊 Production Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 EPSM Production Deployment Complete!"
echo ""
echo "🌐 Application: http://localhost (or your domain)"
echo "🔧 API Health: http://localhost/api/health/"
echo "👨‍💻 Django Admin: http://localhost/admin"
echo ""
echo "📝 Next steps:"
echo "   1. Update DNS to point to this server"
echo "   2. Configure SSL certificates (see docs/SSL.md)"
echo "   3. Set up monitoring and alerting"
echo "   4. Configure automated backups"