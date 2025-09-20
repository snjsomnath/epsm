#!/bin/bash

# EPSM Development Environment Status Script
# This script shows the current status of all EPSM services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[EPSM]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[EPSM]${NC} $1"
}

print_error() {
    echo -e "${RED}[EPSM]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[EPSM]${NC} $1"
}

print_status "EPSM Development Environment Status"
echo ""

# Check Docker services
print_info "🐳 Docker Services:"
if docker-compose ps | grep -q "Up"; then
    docker-compose ps
else
    print_warning "No Docker services running"
fi
echo ""

# Check if frontend is running
print_info "🌐 Frontend Status:"
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    print_status "✅ Frontend running on http://localhost:5173"
else
    print_warning "❌ Frontend not accessible on http://localhost:5173"
fi

# Check if backend is running
print_info "🔧 Backend Status:"
if curl -s http://localhost:8000/api/test/ >/dev/null 2>&1; then
    print_status "✅ Backend API running on http://localhost:8000"
else
    print_warning "❌ Backend API not accessible on http://localhost:8000"
fi

# Check database
print_info "🗄️ Database Status:"
if docker-compose exec -T db psql -U postgres -d epsm_db -c "SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ Database accessible"
    # Show simulation count
    SIMULATIONS=$(docker-compose exec -T db psql -U postgres -d epsm_db -t -c "SELECT COUNT(*) FROM simulation_runs;" 2>/dev/null | tr -d ' \n' || echo "0")
    print_info "   Total simulations: $SIMULATIONS"
else
    print_warning "❌ Database not accessible"
fi
echo ""

# Show helpful URLs
print_info "🔗 Available URLs:"
echo "  • Frontend:        http://localhost:5173"
echo "  • Backend API:     http://localhost:8000"
echo "  • Django Admin:    http://localhost:8000/admin/"
echo "  • API Test:        http://localhost:8000/api/test/"
echo ""

# Show login credentials
print_info "🔑 Login Credentials:"
echo "  • Username: sanjay.somanath@chalmers.se"
echo "  • Password: password"
echo ""

# Show available commands
print_info "📋 Available Commands:"
echo "  • ./start-epsm.sh    - Start all services"
echo "  • ./stop-epsm.sh     - Stop all services"
echo "  • ./status-epsm.sh   - Show this status"
echo "  • docker-compose logs -f [service] - View logs"