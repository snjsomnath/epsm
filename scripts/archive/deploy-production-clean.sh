#!/bin/bash
# ============================================================================
# EPSM Production Deployment Script - STREAMLINED VERSION
# ============================================================================
# This script deploys EPSM to production with:
# - Fresh builds (no cache)
# - Clean state (removes old images)
# - Single source of truth (.env.production)
# - Proper health checks
# ============================================================================
# Usage:
#   bash scripts/deploy-production-clean.sh
#
# Options:
#   --skip-migrations    Skip database migrations
#   --skip-seed          Skip database seeding
#   --keep-volumes       Don't recreate volumes (keeps data)
# ============================================================================

set -e  # Exit on error

# ============================================================================
# Colors for output
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper functions
# ============================================================================
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# Parse arguments
# ============================================================================
SKIP_MIGRATIONS=false
SKIP_SEED=false
KEEP_VOLUMES=false

for arg in "$@"; do
    case $arg in
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --keep-volumes)
            KEEP_VOLUMES=true
            shift
            ;;
        *)
            log_error "Unknown option: $arg"
            echo "Usage: $0 [--skip-migrations] [--skip-seed] [--keep-volumes]"
            exit 1
            ;;
    esac
done

# ============================================================================
# Pre-flight checks
# ============================================================================
log_info "Running pre-flight checks..."

# Check we're in the right directory
if [ ! -f "docker-compose.production.yml" ]; then
    log_error "docker-compose.production.yml not found!"
    log_error "Please run this script from /opt/epsm directory"
    exit 1
fi

# Check environment file exists
if [ ! -f ".env.production" ]; then
    log_error ".env.production not found!"
    exit 1
fi

# Check if running as root or with docker permissions
if ! docker ps > /dev/null 2>&1; then
    log_error "Cannot access Docker. Run with sudo or add user to docker group"
    exit 1
fi

log_success "Pre-flight checks passed"

# ============================================================================
# Load environment variables
# ============================================================================
log_info "Loading environment variables from .env.production..."
set -a
source .env.production
set +a
log_success "Environment variables loaded"

# ============================================================================
# Display deployment plan
# ============================================================================
echo ""
echo "============================================================================"
echo "                    PRODUCTION DEPLOYMENT PLAN"
echo "============================================================================"
echo "Environment File:    .env.production"
echo "Compose File:        docker-compose.production.yml"
echo "Version:             ${VERSION:-latest}"
echo "Skip Migrations:     $SKIP_MIGRATIONS"
echo "Skip Seeding:        $SKIP_SEED"
echo "Keep Volumes:        $KEEP_VOLUMES"
echo "============================================================================"
echo ""

# Confirmation prompt
read -p "⚠️  Continue with production deployment? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_warning "Deployment cancelled"
    exit 0
fi

# ============================================================================
# Stop existing containers
# ============================================================================
log_info "Stopping existing containers..."
docker-compose -f docker-compose.production.yml down || true
log_success "Containers stopped"

# ============================================================================
# Clean Docker cache and old images
# ============================================================================
log_info "Cleaning Docker build cache..."
docker builder prune -af
log_success "Build cache cleared"

log_info "Removing old EPSM images..."
docker images | grep epsm | awk '{print $3}' | xargs -r docker rmi -f || true
log_success "Old images removed"

# ============================================================================
# Pull EnergyPlus image
# ============================================================================
log_info "Pulling EnergyPlus Docker image: ${ENERGYPLUS_DOCKER_IMAGE}"
docker pull ${ENERGYPLUS_DOCKER_IMAGE}
log_success "EnergyPlus image ready"

# ============================================================================
# Build services from source (NO CACHE)
# ============================================================================
log_info "Building services from source (NO CACHE)..."
log_warning "This will take several minutes..."

docker-compose -f docker-compose.production.yml build \
    --no-cache \
    --pull \
    --progress=plain

log_success "Build complete"

# ============================================================================
# Start services
# ============================================================================
log_info "Starting services..."

if [ "$KEEP_VOLUMES" = true ]; then
    docker-compose -f docker-compose.production.yml up -d --force-recreate
else
    # Recreate everything including volumes (DANGEROUS - loses data!)
    log_warning "Recreating volumes - THIS WILL DELETE ALL DATA!"
    read -p "Are you absolutely sure? (type 'DELETE ALL DATA'): " -r
    if [[ $REPLY == "DELETE ALL DATA" ]]; then
        docker-compose -f docker-compose.production.yml up -d --force-recreate -V
    else
        log_error "Volume recreation cancelled for safety"
        exit 1
    fi
fi

log_success "Services started"

# ============================================================================
# Wait for services to be healthy
# ============================================================================
log_info "Waiting for services to be healthy..."

# Wait for database
log_info "Checking database..."
timeout 120 sh -c 'until docker-compose -f docker-compose.production.yml exec -T database pg_isready -U '"${POSTGRES_USER}"' 2>/dev/null; do sleep 2; done'
log_success "Database is ready"

# Wait for Redis
log_info "Checking Redis..."
timeout 60 sh -c 'until docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 2; done'
log_success "Redis is ready"

# Wait for backend
log_info "Checking backend..."
timeout 120 sh -c 'until docker-compose -f docker-compose.production.yml exec -T backend curl -f http://localhost:8000/health/ 2>/dev/null; do sleep 2; done'
log_success "Backend is ready"

# Additional buffer
sleep 10

# ============================================================================
# Run migrations
# ============================================================================
if [ "$SKIP_MIGRATIONS" = false ]; then
    log_info "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T backend python manage.py migrate --noinput
    log_success "Migrations complete"
else
    log_warning "Skipping migrations"
fi

# ============================================================================
# Seed database
# ============================================================================
if [ "$SKIP_SEED" = false ]; then
    log_info "Seeding database with initial data..."
    if [ -f "scripts/seed-database.sh" ]; then
        bash scripts/seed-database.sh
        log_success "Database seeding complete"
    else
        log_warning "Seed script not found, skipping..."
    fi
else
    log_warning "Skipping database seeding"
fi

# ============================================================================
# Collect static files
# ============================================================================
log_info "Collecting static files..."
docker-compose -f docker-compose.production.yml exec -T backend python manage.py collectstatic --noinput
log_success "Static files collected"

# ============================================================================
# Clean up
# ============================================================================
log_info "Cleaning up Docker system..."
docker system prune -f
log_success "Cleanup complete"

# ============================================================================
# Verify deployment
# ============================================================================
log_info "Verifying deployment..."

echo ""
echo "============================================================================"
echo "                         CONTAINER STATUS"
echo "============================================================================"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "============================================================================"
echo "                         SERVICE HEALTH"
echo "============================================================================"

# Check each service
SERVICES=("database" "redis" "backend" "celery_worker" "frontend" "nginx")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker-compose -f docker-compose.production.yml ps | grep -q "$service.*Up"; then
        echo -e "${GREEN}✅ $service: RUNNING${NC}"
    else
        echo -e "${RED}❌ $service: NOT RUNNING${NC}"
        ALL_HEALTHY=false
    fi
done

# ============================================================================
# Display summary
# ============================================================================
echo ""
echo "============================================================================"
echo "                      DEPLOYMENT SUMMARY"
echo "============================================================================"
echo "Deployed at:        $(date)"
echo "Git commit:         $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
echo "Git branch:         $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')"
echo "Version:            ${VERSION:-latest}"
echo "URL:                https://epsm.chalmers.se"
echo "============================================================================"
echo ""

if [ "$ALL_HEALTHY" = true ]; then
    log_success "DEPLOYMENT SUCCESSFUL! 🎉"
    log_info "Access the application at: https://epsm.chalmers.se"
    exit 0
else
    log_error "DEPLOYMENT COMPLETED WITH ERRORS!"
    log_warning "Some services are not running. Check logs:"
    log_info "docker-compose -f docker-compose.production.yml logs [service-name]"
    exit 1
fi
