#!/bin/bash
# Celery Migration Script for EPSM
# This script handles the migration from threading to Celery-based task queue

set -e  # Exit on error

echo "========================================"
echo "EPSM Celery Migration Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
print_info "Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi
print_info "Docker is running ✓"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose not found. Please install docker-compose."
    exit 1
fi
print_info "docker-compose found ✓"

# Stop existing services
print_info "Stopping existing services..."
docker-compose down
print_info "Services stopped ✓"

# Build services with new dependencies
print_info "Building services with new dependencies..."
docker-compose build backend celery_worker celery_beat
print_info "Services built ✓"

# Start database and wait for it to be ready
print_info "Starting database..."
docker-compose up -d database
print_info "Waiting for database to be ready..."
sleep 10

# Check database health
print_info "Checking database health..."
until docker-compose exec -T database pg_isready -U epsm_user -d epsm_db > /dev/null 2>&1; do
    print_warning "Database not ready, waiting..."
    sleep 5
done
print_info "Database is ready ✓"

# Run migrations
print_info "Running database migrations..."
docker-compose run --rm backend python manage.py makemigrations simulation
docker-compose run --rm backend python manage.py migrate
print_info "Migrations completed ✓"

# Start Redis
print_info "Starting Redis..."
docker-compose up -d redis
sleep 5

# Check Redis health
print_info "Checking Redis health..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    print_warning "Redis not ready, waiting..."
    sleep 3
done
print_info "Redis is ready ✓"

# Start Celery worker
print_info "Starting Celery worker..."
docker-compose up -d celery_worker
sleep 5

# Check Celery worker
print_info "Checking Celery worker status..."
if docker-compose ps | grep celery_worker | grep -q "Up"; then
    print_info "Celery worker is running ✓"
else
    print_error "Celery worker failed to start"
    docker-compose logs celery_worker
    exit 1
fi

# Start Celery beat
print_info "Starting Celery beat..."
docker-compose up -d celery_beat
sleep 5

# Start remaining services
print_info "Starting backend and frontend services..."
docker-compose up -d backend frontend

# Wait for backend to be ready
print_info "Waiting for backend to be ready..."
sleep 10

# Health check
print_info "Performing health checks..."

# Check backend
if curl -f -s http://localhost:8000/api/simulation/system-resources/ > /dev/null 2>&1; then
    print_info "Backend is responding ✓"
else
    print_warning "Backend health check failed. It may still be starting..."
fi

# Check Celery worker
if docker-compose exec -T celery_worker celery -A config inspect ping > /dev/null 2>&1; then
    print_info "Celery worker is responding to commands ✓"
else
    print_warning "Celery worker ping failed. Check logs with: docker-compose logs celery_worker"
fi

# Display service status
echo ""
print_info "Service Status:"
docker-compose ps

echo ""
print_info "========================================"
print_info "Migration Complete!"
print_info "========================================"
echo ""
echo "Services are running:"
echo "  - Frontend:     http://localhost:5173"
echo "  - Backend API:  http://localhost:8000"
echo "  - Django Admin: http://localhost:8000/admin"
echo ""
echo "Celery Services:"
echo "  - Worker:       docker-compose logs -f celery_worker"
echo "  - Beat:         docker-compose logs -f celery_beat"
echo "  - Redis:        redis-cli -h localhost -p 6379"
echo ""
echo "Useful Commands:"
echo "  - Check workers:       docker-compose exec celery_worker celery -A config inspect active"
echo "  - Worker stats:        docker-compose exec celery_worker celery -A config inspect stats"
echo "  - View all logs:       docker-compose logs -f"
echo "  - Stop services:       docker-compose down"
echo ""
print_info "Next Steps:"
echo "  1. Test simulation workflow through the UI"
echo "  2. Monitor Celery worker logs: docker-compose logs -f celery_worker"
echo "  3. Check task status endpoint: curl http://localhost:8000/api/simulation/task/{task_id}/status/"
echo ""
print_info "Documentation: See docs/CELERY_MIGRATION.md for details"
echo ""
