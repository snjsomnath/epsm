#!/bin/bash

# EPSM Production Deployment Script
# This script deploys EPSM to production environment

set -e

echo "🚀 Deploying EPSM to Production..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ No .env file found. Please create one with production values."
    exit 1
fi

# Validate required environment variables
echo "🔍 Validating environment configuration..."
required_vars=("DB_PASSWORD" "DJANGO_SECRET_KEY" "ALLOWED_HOSTS")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=.*your.*" .env; then
        echo "❌ Please set ${var} in .env file with a production value"
        exit 1
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