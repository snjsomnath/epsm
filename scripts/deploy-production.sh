#!/bin/bash
# Production Deployment Script for EPSM on Chalmers VM
# This script automates the deployment process for the EPSM application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="/opt/epsm"
COMPOSE_FILE="docker-compose.production.yml"
BACKEND_IMAGE="ghcr.io/snjsomnath/epsm-backend"
FRONTEND_IMAGE="ghcr.io/snjsomnath/epsm-frontend"

# Functions
print_step() {
    echo -e "${BLUE}==> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running on the production VM
check_environment() {
    print_step "Checking environment..."
    
    if [ ! -d "$REPO_DIR" ]; then
        print_error "Repository not found at $REPO_DIR"
        print_warning "Please clone the repository first:"
        echo "  cd /opt && sudo git clone https://github.com/snjsomnath/epsm.git"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_success "Environment check passed"
}

# Stop running services
stop_services() {
    print_step "Stopping running services..."
    cd "$REPO_DIR"
    docker-compose -f "$COMPOSE_FILE" down || true
    print_success "Services stopped"
}

# Pull latest code
pull_latest_code() {
    print_step "Pulling latest code from GitHub..."
    cd "$REPO_DIR"
    
    # Stash any local changes
    if git diff-index --quiet HEAD --; then
        print_success "No local changes to stash"
    else
        print_warning "Stashing local changes..."
        git stash
    fi
    
    # Pull latest code
    git pull origin development
    print_success "Code updated"
}

# Pull latest Docker images
pull_docker_images() {
    print_step "Pulling latest Docker images..."
    cd "$REPO_DIR"
    docker-compose -f "$COMPOSE_FILE" pull
    print_success "Docker images pulled"
}

# Check environment file
check_env_file() {
    print_step "Checking environment configuration..."
    
    if [ ! -f "$REPO_DIR/.env" ]; then
        print_error ".env file not found"
        print_warning "Please create .env file with required variables"
        echo "  Required variables:"
        echo "    - POSTGRES_PASSWORD"
        echo "    - SECRET_KEY"
        echo "    - SAML_IDP_METADATA_URL"
        exit 1
    fi
    
    # Check for required variables
    if ! grep -q "POSTGRES_PASSWORD=" "$REPO_DIR/.env"; then
        print_error "POSTGRES_PASSWORD not set in .env"
        exit 1
    fi
    
    if ! grep -q "SECRET_KEY=" "$REPO_DIR/.env"; then
        print_error "SECRET_KEY not set in .env"
        exit 1
    fi
    
    print_success "Environment configuration valid"
}

# Check SSL certificates
check_ssl() {
    print_step "Checking SSL certificates..."
    
    if [ ! -f "$REPO_DIR/nginx/ssl/fullchain.pem" ] || [ ! -f "$REPO_DIR/nginx/ssl/privkey.pem" ]; then
        print_error "SSL certificates not found"
        print_warning "Please obtain SSL certificates first:"
        echo "  sudo certbot certonly --standalone -d epsm.chalmers.se"
        echo "  mkdir -p $REPO_DIR/nginx/ssl"
        echo "  sudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem $REPO_DIR/nginx/ssl/"
        echo "  sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem $REPO_DIR/nginx/ssl/"
        exit 1
    fi
    
    print_success "SSL certificates found"
}

# Start services
start_services() {
    print_step "Starting services..."
    cd "$REPO_DIR"
    docker-compose -f "$COMPOSE_FILE" up -d
    print_success "Services started"
}

# Wait for backend to be healthy
wait_for_backend() {
    print_step "Waiting for backend to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "import django; print('OK')" &> /dev/null; then
            print_success "Backend is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "Backend failed to start"
    return 1
}

# Run database migrations
run_migrations() {
    print_step "Running database migrations..."
    cd "$REPO_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --noinput
    print_success "Migrations completed"
}

# Collect static files
collect_static() {
    print_step "Collecting static files..."
    cd "$REPO_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput --clear
    print_success "Static files collected"
}

# Generate SAML metadata
generate_saml_metadata() {
    print_step "Generating SAML metadata..."
    cd "$REPO_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py saml_metadata > "$REPO_DIR/sp_metadata.xml" 2>/dev/null || true
    
    if [ -f "$REPO_DIR/sp_metadata.xml" ]; then
        print_success "SAML metadata generated at $REPO_DIR/sp_metadata.xml"
        print_warning "Share this with Björn: https://epsm.chalmers.se/saml/metadata/"
    else
        print_warning "SAML metadata generation skipped (command may not be available yet)"
    fi
}

# Show service status
show_status() {
    print_step "Service Status:"
    cd "$REPO_DIR"
    docker-compose -f "$COMPOSE_FILE" ps
}

# Show application URLs
show_urls() {
    echo ""
    print_success "Deployment Complete!"
    echo ""
    echo "Application URLs:"
    echo "  Frontend:        https://epsm.chalmers.se"
    echo "  Admin:           https://epsm.chalmers.se/admin/"
    echo "  SAML Metadata:   https://epsm.chalmers.se/saml/metadata/"
    echo "  Privacy Policy:  https://epsm.chalmers.se/privacy/"
    echo ""
    echo "To view logs:"
    echo "  docker-compose -f $COMPOSE_FILE logs -f backend"
    echo "  docker-compose -f $COMPOSE_FILE logs -f frontend"
    echo ""
}

# Main deployment flow
main() {
    echo ""
    echo "╔════════════════════════════════════════════╗"
    echo "║  EPSM Production Deployment Script        ║"
    echo "║  Chalmers University of Technology         ║"
    echo "╚════════════════════════════════════════════╝"
    echo ""
    
    check_environment
    check_env_file
    check_ssl
    stop_services
    pull_latest_code
    pull_docker_images
    start_services
    
    if wait_for_backend; then
        run_migrations
        collect_static
        generate_saml_metadata
        show_status
        show_urls
    else
        print_error "Deployment failed - backend not ready"
        echo ""
        echo "Check logs with:"
        echo "  docker-compose -f $COMPOSE_FILE logs backend"
        exit 1
    fi
}

# Run main function
main "$@"
