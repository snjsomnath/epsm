#!/bin/bash

# EPSM Development Environment Shutdown Script
# This script stops all EPSM services and cleans up

set -e  # Exit on any error

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

print_status "Stopping EPSM Development Environment..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the EPSM project root directory"
    exit 1
fi

# Stop Docker services
print_info "Stopping Docker services..."
docker-compose down

# Kill any remaining processes (frontend dev server, etc.)
print_info "Cleaning up remaining processes..."

# Kill npm/node processes that might be running the frontend
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Kill any remaining docker-compose processes
pkill -f "docker-compose" 2>/dev/null || true

print_status "EPSM Development Environment stopped successfully!"
print_info "All services have been terminated."
echo ""
print_info "To restart the environment, run: ./start-epsm.sh"