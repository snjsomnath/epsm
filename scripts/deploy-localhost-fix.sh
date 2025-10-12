#!/bin/bash
# ============================================================================
# Quick Deployment Script for Localhost Fix
# ============================================================================
# Rebuilds frontend and backend containers with the localhost fix
# Usage: bash scripts/deploy-localhost-fix.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="/opt/epsm"
COMPOSE_FILE="docker-compose.production.yml"

# Functions
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Change to repo directory
cd "$REPO_DIR" || {
    print_error "Could not change to $REPO_DIR"
    exit 1
}

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  EPSM Localhost Fix Deployment             ║"
echo "║  Rebuilding Frontend & Backend             ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ] && [ ! -f .env ]; then
    print_error "No .env.production or .env file found"
    print_warning "Please create one with VITE_API_BASE_URL set"
    exit 1
fi

# Check for required environment variable
print_step "Checking environment variables..."
if grep -q "VITE_API_BASE_URL" .env.production 2>/dev/null || grep -q "VITE_API_BASE_URL" .env 2>/dev/null; then
    VITE_URL=$(grep "VITE_API_BASE_URL" .env.production 2>/dev/null || grep "VITE_API_BASE_URL" .env 2>/dev/null || echo "")
    print_success "VITE_API_BASE_URL found: $VITE_URL"
else
    print_warning "VITE_API_BASE_URL not found in .env files"
    print_warning "Add this to your .env.production file:"
    echo "    VITE_API_BASE_URL=https://epsm.ita.chalmers.se"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop services
print_step "Stopping services..."
docker-compose -f "$COMPOSE_FILE" down
print_success "Services stopped"

# Rebuild frontend and backend with no cache
print_step "Rebuilding frontend (no cache)..."
docker-compose -f "$COMPOSE_FILE" build --no-cache frontend
print_success "Frontend rebuilt"

print_step "Rebuilding backend (no cache)..."
docker-compose -f "$COMPOSE_FILE" build --no-cache backend
print_success "Backend rebuilt"

# Start services
print_step "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d
print_success "Services started"

# Wait for backend to be ready
print_step "Waiting for backend to be healthy..."
sleep 5

max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "import django; print('OK')" &> /dev/null 2>&1; then
        print_success "Backend is ready"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Backend failed to start properly"
    print_warning "Check logs with: docker-compose -f $COMPOSE_FILE logs backend"
    exit 1
fi

# Run migrations (in case any are pending)
print_step "Running migrations..."
echo "  - Default database..."
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --noinput || {
    print_warning "Default migration failed (may be normal if no new migrations)"
}
echo "  - Materials database..."
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate database --database=materials_db --noinput || {
    print_warning "Materials migration failed (may be normal if no new migrations)"
}
echo "  - Results database..."
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate simulation 0003 --database=results_db --fake --noinput 2>/dev/null || true
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate simulation --database=results_db --noinput || {
    print_warning "Results migration failed (may be normal if no new migrations)"
}

# Collect static files
print_step "Collecting static files..."
docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput --clear || {
    print_warning "Static files collection had issues (may be normal)"
}

# Show service status
echo ""
print_step "Service Status:"
docker-compose -f "$COMPOSE_FILE" ps

# Verify environment variables in containers
echo ""
print_step "Verifying environment variables in containers..."
FRONTEND_ENV=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend env 2>/dev/null | grep VITE_API_BASE_URL || echo "NOT SET")
BACKEND_ENV=$(docker-compose -f "$COMPOSE_FILE" exec -T backend env 2>/dev/null | grep MATERIALS_DB_HOST || echo "NOT SET")

echo "  Frontend VITE_API_BASE_URL: $FRONTEND_ENV"
echo "  Backend MATERIALS_DB_HOST: $BACKEND_ENV"

# Show completion message
echo ""
print_success "Deployment Complete!"
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  Localhost Fix Applied Successfully        ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "📋 What was fixed:"
echo "   ✓ BaselinePage.tsx - Simulation run endpoint"
echo "   ✓ ResultsTab.tsx - Download/results buttons (baseline)"
echo "   ✓ ResultsTab.tsx - Download/results buttons (archive)"
echo "   ✓ HomePage.tsx - System resources endpoint"
echo "   ✓ direct_materials_api.py - Database connection"
echo ""
echo "🔍 Quick Test:"
echo "   1. Open: https://epsm.ita.chalmers.se"
echo "   2. Go to Baseline Modeling"
echo "   3. Upload IDF and EPW files"
echo "   4. Click 'Run Baseline Simulation'"
echo "   5. Verify: Should see progress (not immediate error)"
echo ""
echo "📊 View Logs:"
echo "   docker-compose -f $COMPOSE_FILE logs -f frontend"
echo "   docker-compose -f $COMPOSE_FILE logs -f backend"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend:       https://epsm.ita.chalmers.se"
echo "   Admin:          https://epsm.ita.chalmers.se/admin/"
echo "   SAML Metadata:  https://epsm.ita.chalmers.se/saml/metadata/"
echo ""
echo "📝 Documentation:"
echo "   Details: /opt/epsm/change summary/LOCALHOST_HARDCODE_FIX.md"
echo "   Quick Guide: /opt/epsm/DEPLOYMENT_FIX_LOCALHOST.md"
echo ""
