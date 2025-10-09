#!/bin/bash

# EPSM Production Management Script
# Common operations for managing the production deployment

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "Error: Must be run from /opt/epsm directory"
    exit 1
fi

# Show menu
echo "======================================"
echo "EPSM Production Management"
echo "======================================"
echo ""
echo "1) View logs (all services)"
echo "2) View backend logs"
echo "3) View nginx logs"
echo "4) Restart all services"
echo "5) Restart backend only"
echo "6) Check service status"
echo "7) Create superuser"
echo "8) Generate SAML metadata"
echo "9) Run database backup"
echo "10) Update application (git pull + rebuild)"
echo "11) Access Django shell"
echo "12) Run migrations"
echo "13) Collect static files"
echo "0) Exit"
echo ""
read -p "Select option: " option

case $option in
    1)
        print_info "Showing logs for all services (Ctrl+C to exit)..."
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    2)
        print_info "Showing backend logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.prod.yml logs -f backend
        ;;
    3)
        print_info "Showing nginx logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.prod.yml logs -f nginx
        ;;
    4)
        print_info "Restarting all services..."
        docker-compose -f docker-compose.prod.yml restart
        print_success "All services restarted"
        ;;
    5)
        print_info "Restarting backend..."
        docker-compose -f docker-compose.prod.yml restart backend
        print_success "Backend restarted"
        ;;
    6)
        print_info "Service status:"
        docker-compose -f docker-compose.prod.yml ps
        ;;
    7)
        print_info "Creating superuser..."
        docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
        print_success "Superuser created"
        ;;
    8)
        print_info "Generating SAML metadata..."
        docker-compose -f docker-compose.prod.yml exec backend python manage.py saml_metadata > sp_metadata.xml
        print_success "SAML metadata saved to sp_metadata.xml"
        echo "Send this file to Björn at biorn@chalmers.se"
        ;;
    9)
        print_info "Creating database backup..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose -f docker-compose.prod.yml exec -T database \
            pg_dump -U epsm_user epsm_db > "$BACKUP_FILE"
        print_success "Backup saved to $BACKUP_FILE"
        ;;
    10)
        print_info "Updating application..."
        git pull origin main
        docker-compose -f docker-compose.prod.yml up -d --build
        docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
        docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
        print_success "Application updated"
        ;;
    11)
        print_info "Opening Django shell..."
        docker-compose -f docker-compose.prod.yml exec backend python manage.py shell
        ;;
    12)
        print_info "Running database migrations..."
        docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
        print_success "Migrations completed"
        ;;
    13)
        print_info "Collecting static files..."
        docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
        print_success "Static files collected"
        ;;
    0)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac
