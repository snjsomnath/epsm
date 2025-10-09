#!/bin/bash

# EPSM Production Deployment Script
# This script automates the deployment process on the Chalmers VM

set -e  # Exit on error

echo "🚀 EPSM Production Deployment Script"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running on the VM
print_info "Checking environment..."
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    echo "Please create .env.production file first. See DEPLOYMENT_STEPS.md"
    exit 1
fi
print_success "Environment file found"

# Load environment variables
print_info "Loading environment variables..."
export $(cat .env.production | grep -v '^#' | xargs)
print_success "Environment variables loaded"

# Validate required variables
print_info "Validating required environment variables..."
required_vars=("DJANGO_SECRET_KEY" "DB_PASSWORD" "ALLOWED_HOSTS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required variable $var is not set in .env.production"
        exit 1
    fi
done
print_success "All required variables are set"

# Check SSL certificates
print_info "Checking SSL certificates..."
if [ ! -f ".docker/nginx/ssl/fullchain.pem" ] || [ ! -f ".docker/nginx/ssl/privkey.pem" ]; then
    print_error "SSL certificates not found in .docker/nginx/ssl/"
    echo "Please obtain SSL certificates first. See DEPLOYMENT_STEPS.md Step 5"
    exit 1
fi
print_success "SSL certificates found"

# Check Docker
print_info "Checking Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running or you don't have permission"
    exit 1
fi
print_success "Docker is ready"

# Check Docker Compose
print_info "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi
print_success "Docker Compose is ready"

echo ""
echo "======================================"
echo "Starting deployment..."
echo "======================================"
echo ""

# Stop existing containers
print_info "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down
print_success "Containers stopped"

# Pull latest images
print_info "Pulling latest base images..."
docker-compose -f docker-compose.prod.yml pull database redis
print_success "Base images pulled"

# Build application images
print_info "Building application images..."
docker-compose -f docker-compose.prod.yml build --no-cache
print_success "Application images built"

# Start services
print_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d
print_success "Services started"

# Wait for database to be ready
print_info "Waiting for database to be ready..."
for i in {1..30}; do
    if docker-compose -f docker-compose.prod.yml exec -T database pg_isready -U epsm_user -d epsm_db > /dev/null 2>&1; then
        print_success "Database is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Database failed to start"
        exit 1
    fi
    sleep 2
done

# Run migrations
print_info "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput
print_success "Migrations completed"

# Collect static files
print_info "Collecting static files..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput
print_success "Static files collected"

# Check service status
print_info "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "======================================"
echo "Health Checks"
echo "======================================"
echo ""

# Wait a bit for services to fully start
sleep 5

# Check database
print_info "Testing database connection..."
if docker-compose -f docker-compose.prod.yml exec -T database pg_isready -U epsm_user -d epsm_db > /dev/null 2>&1; then
    print_success "Database is healthy"
else
    print_error "Database health check failed"
fi

# Check Redis
print_info "Testing Redis connection..."
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
    print_success "Redis is healthy"
else
    print_error "Redis health check failed"
fi

echo ""
echo "======================================"
echo "Deployment Summary"
echo "======================================"
echo ""

print_success "EPSM has been deployed successfully!"
echo ""
echo "🌐 Application URL: https://epsm.chalmers.se"
echo "🔧 Admin Panel: https://epsm.chalmers.se/admin"
echo "📄 Privacy Policy: https://epsm.chalmers.se/privacy"
echo ""
echo "Next steps:"
echo "1. Create a superuser account:"
echo "   docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo ""
echo "2. Generate SAML metadata:"
echo "   docker-compose -f docker-compose.prod.yml exec backend python manage.py saml_metadata > sp_metadata.xml"
echo ""
echo "3. Send sp_metadata.xml to Björn for SAML registration"
echo ""
echo "To view logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
print_success "Deployment complete! 🎉"
