#!/bin/bash

# EPSM Development Environment Startup Script
# This script starts all services needed for the EPSM application
# Updated for new containerized architecture

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
if [ ! -f "docker-compose.yml" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the EPSM project root directory"
    print_info "Expected structure: frontend/, backend/, docker-compose.yml"
    exit 1
fi

print_status "Starting EPSM Development Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning "No .env file found. Creating one from .env.example..."
    cp .env.example .env
    print_info "You can edit .env with your specific configuration values."
    print_info "Default values will work for development."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Step 1: Start Docker services
print_info "Starting Docker services (Database + Backend + Frontend + Redis)..."
docker-compose up -d

# Wait for database to be ready
print_info "Waiting for database to be ready..."
until docker-compose exec -T database pg_isready -U epsm_user -d epsm_db 2>/dev/null; do
    echo "   Database is unavailable - sleeping..."
    sleep 2
done

print_status "Database is ready!"

# Run migrations
print_info "Running database migrations..."
docker-compose exec backend python manage.py migrate

# Create superuser if it doesn't exist
print_info "Ensuring Django superuser exists..."
docker-compose exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
" 2>/dev/null || print_warning "Could not create/check superuser"

# Check if services are running
print_info "Checking service status..."
docker-compose ps

print_status "All services running! Opening monitoring terminals..."

# Step 3: Open separate terminals for each service
case "$(uname -s)" in
    Darwin*)  # macOS
        print_info "Opening terminals on macOS..."
        
        # Backend logs terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Backend Logs\" && docker-compose logs -f backend"'
        
        # Frontend logs terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Frontend Logs\" && docker-compose logs -f frontend"'
        
        # Database monitoring terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Database Monitor\" && echo \"Database Status:\" && docker-compose exec database psql -U epsm_user -d epsm_db -c \"SELECT current_database(), current_user;\" && echo \"Type '\''docker-compose exec database psql -U epsm_user -d epsm_db'\'' to connect to database\" && bash"'
        
        # Docker status terminal
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && echo \"EPSM Docker Services\" && echo \"Docker Status:\" && docker-compose ps && echo \"\" && echo \"Available commands:\" && echo \"  docker-compose logs -f [service]  - View logs\" && echo \"  docker-compose restart [service] - Restart service\" && echo \"  docker-compose ps              - Service status\" && echo \"  ./scripts/stop.sh              - Stop all services\" && bash"'
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
            
            # Frontend logs
            $TERMINAL --title="EPSM Frontend Logs" -- bash -c "cd '$(pwd)' && echo 'EPSM Frontend Logs' && docker-compose logs -f frontend; exec bash" &
            
            # Database monitor
            $TERMINAL --title="EPSM Database" -- bash -c "cd '$(pwd)' && echo 'EPSM Database Monitor' && echo 'Database Status:' && docker-compose exec database psql -U epsm_user -d epsm_db -c 'SELECT current_database(), current_user;' && echo 'Type \"docker-compose exec database psql -U epsm_user -d epsm_db\" to connect to database' && exec bash" &
            
            # Docker status
            $TERMINAL --title="EPSM Docker" -- bash -c "cd '$(pwd)' && echo 'EPSM Docker Services' && docker-compose ps && echo '' && echo 'Available commands:' && echo '  docker-compose logs -f [service]  - View logs' && echo '  docker-compose restart [service] - Restart service' && echo '  docker-compose ps              - Service status' && echo '  ./scripts/stop.sh              - Stop all services' && exec bash" &
        fi
        ;;
        
    *)        # Fallback
        print_warning "Unsupported operating system. Starting services manually..."
        print_info "Please open separate terminals and run:"
        print_info "  Terminal 1: docker-compose logs -f backend"
        print_info "  Terminal 2: docker-compose logs -f frontend"
        print_info "  Terminal 3: docker-compose ps (for monitoring)"
        ;;
esac

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
echo "  • Redis:           localhost:6379"
echo ""
print_info "🔑 Default Login Credentials:"
echo "  • Admin:           admin / admin123"
echo "  • Database:        epsm_user / epsm_secure_password"
echo ""
print_info "🐳 Docker Services:"
docker-compose ps
echo ""
print_info "📊 Database Status:"
docker-compose exec database psql -U epsm_user -d epsm_db -c "SELECT current_database() as database, current_user as user, version();" 2>/dev/null || echo "Database connection pending..."
echo ""
print_info "📋 Useful Commands:"
echo "  • View all logs:           docker-compose logs -f"
echo "  • View service logs:       docker-compose logs -f [service]"
echo "  • Restart service:         docker-compose restart [service]"
echo "  • Stop all services:       ./scripts/stop.sh"
echo "  • Access backend shell:    docker-compose exec backend bash"
echo "  • Access database:         docker-compose exec database psql -U epsm_user -d epsm_db"
echo ""
print_status "Development environment is ready! Check the opened terminals for logs and monitoring."
echo ""
print_warning "To stop all services, run: ./scripts/stop.sh or docker-compose down"