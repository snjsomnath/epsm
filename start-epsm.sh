#!/bin/bash

# EPSM Development Environment Startup Script
# This script starts all services needed for the EPSM application

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the EPSM project root directory"
    exit 1
fi

print_status "Starting EPSM Development Environment..."

# Step 1: Start Docker services
print_info "Starting Docker services (PostgreSQL + Django Backend)..."
docker-compose up -d

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 10

# Check if services are running
print_info "Checking service status..."
docker-compose ps

# Step 2: Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Installing frontend dependencies..."
    npm install
fi

print_status "All services starting in separate terminals..."

# Step 3: Open separate terminals for each service
case "$(uname -s)" in
    Darwin*)  # macOS
        print_info "Opening terminals on macOS..."
        
        # Backend logs terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Backend Logs\" && docker-compose logs -f backend"'
        
        # Frontend development server terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Frontend Development Server\" && npm run dev"'
        
        # Database monitoring terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Database Monitor\" && echo \"Database Status:\" && docker-compose exec db psql -U postgres -d epsm_db -c \"SELECT COUNT(*) as simulations FROM simulation_runs;\" && echo \"Type '\''docker-compose exec db psql -U postgres -d epsm_db'\'' to connect to database\" && bash"'
        
        # Docker status terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Docker Services\" && echo \"Docker Status:\" && docker-compose ps && echo \"\" && echo \"Available commands:\" && echo \"  docker-compose logs -f [service]  - View logs\" && echo \"  docker-compose restart [service] - Restart service\" && echo \"  docker-compose ps              - Service status\" && bash"'
        ;;
        
    Linux*)   # Linux
        print_info "Opening terminals on Linux..."
        
        # Check for available terminal emulators
        if command -v gnome-terminal >/dev/null 2>&1; then
            TERMINAL="gnome-terminal"
        elif command -v xterm >/dev/null 2>&1; then
            TERMINAL="xterm"
        elif command -v konsole >/dev/null 2>&1; then
            TERMINAL="konsole"
        else
            print_warning "No supported terminal emulator found. Please install gnome-terminal, xterm, or konsole."
            TERMINAL=""
        fi
        
        if [ -n "$TERMINAL" ]; then
            # Backend logs
            $TERMINAL --title="EPSM Backend Logs" -- bash -c "cd '$(pwd)' && echo 'EPSM Backend Logs' && docker-compose logs -f backend; exec bash" &
            
            # Frontend development server
            $TERMINAL --title="EPSM Frontend Server" -- bash -c "cd '$(pwd)' && echo 'EPSM Frontend Development Server' && npm run dev; exec bash" &
            
            # Database monitor
            $TERMINAL --title="EPSM Database" -- bash -c "cd '$(pwd)' && echo 'EPSM Database Monitor' && echo 'Database Status:' && docker-compose exec db psql -U postgres -d epsm_db -c 'SELECT COUNT(*) as simulations FROM simulation_runs;' && echo 'Type \"docker-compose exec db psql -U postgres -d epsm_db\" to connect to database' && exec bash" &
            
            # Docker status
            $TERMINAL --title="EPSM Docker" -- bash -c "cd '$(pwd)' && echo 'EPSM Docker Services' && docker-compose ps && echo '' && echo 'Available commands:' && echo '  docker-compose logs -f [service]  - View logs' && echo '  docker-compose restart [service] - Restart service' && echo '  docker-compose ps              - Service status' && exec bash" &
        fi
        ;;
        
    *)        # Fallback
        print_warning "Unsupported operating system. Starting services manually..."
        print_info "Please open separate terminals and run:"
        print_info "  Terminal 1: docker-compose logs -f backend"
        print_info "  Terminal 2: npm run dev"
        print_info "  Terminal 3: docker-compose ps (for monitoring)"
        ;;
esac

# Wait a moment for terminals to open
sleep 3

# Display service information
print_status "EPSM Development Environment Started!"
echo ""
print_info "🌐 Services Available:"
echo "  • Frontend:        http://localhost:5173"
echo "  • Backend API:     http://localhost:8000"
echo "  • Django Admin:    http://localhost:8000/admin/"
echo "  • Database:        localhost:5432"
echo ""
print_info "🔑 Login Credentials:"
echo "  • Username: sanjay.somanath@chalmers.se"
echo "  • Password: password"
echo ""
print_info "🐳 Docker Services:"
docker-compose ps
echo ""
print_info "📊 Database Status:"
docker-compose exec db psql -U postgres -d epsm_db -c "SELECT COUNT(*) as total_simulations FROM simulation_runs;" 2>/dev/null || echo "Database connection pending..."
echo ""
print_status "Development environment is ready! Check the opened terminals for logs and monitoring."
echo ""
print_warning "To stop all services, run: ./stop-epsm.sh or docker-compose down"