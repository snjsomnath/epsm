#!/bin/bash

# EPSM Development Start Script
# This script starts the EPSM application in development mode

set -e  # Exit on any error

echo "🚀 Starting EPSM Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating one from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your specific configuration values."
    echo "   You can continue with the defaults for development."
    read -p "Press Enter to continue with default values, or Ctrl+C to edit .env first..."
fi

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down --remove-orphans

# Pull latest images for third-party services
echo "📥 Pulling latest images..."
docker-compose pull

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec -T database pg_isready -U epsm_user -d epsm_db; do
    echo "   Database is unavailable - sleeping..."
    sleep 2
done

echo "✅ Database is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec backend python manage.py migrate

# Create superuser if it doesn't exist
echo "👤 Creating Django superuser (if needed)..."
docker-compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

# Show running services
echo "📊 Application Status:"
docker-compose ps

echo ""
echo "🎉 EPSM Development Environment is ready!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "👨‍💻 Django Admin: http://localhost:8000/admin (admin/admin123)"
echo "🗄️  Database: localhost:5432 (epsm_user/epsm_secure_password)"
echo "📊 Redis: localhost:6379"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f [service_name]"
echo "   Stop all: ./scripts/stop.sh"
echo "   Restart: ./scripts/stop.sh && ./scripts/start.sh"
echo ""
echo "🐛 For debugging:"
echo "   Backend shell: docker-compose exec backend python manage.py shell"
echo "   Database shell: docker-compose exec database psql -U epsm_user -d epsm_db"
echo "   Frontend logs: docker-compose logs -f frontend"