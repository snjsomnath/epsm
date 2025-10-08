#!/bin/bash
# Clean Install Script for EPSM on Chalmers VM
# This script sets up EPSM from scratch on a fresh Red Hat Enterprise Linux 9 VM

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/epsm"
REPO_URL="https://github.com/snjsomnath/epsm.git"
BRANCH="development"
DOMAIN="epsm.chalmers.se"

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

# Check if running as root or with sudo
check_sudo() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Install Docker
install_docker() {
    print_step "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        print_warning "Docker already installed"
        docker --version
        return 0
    fi
    
    # Update system packages
    dnf update -y
    
    # Install required dependencies
    dnf install -y yum-utils device-mapper-persistent-data lvm2
    
    # Add Docker CE repository
    dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
    
    # Install Docker CE
    dnf install -y docker-ce docker-ce-cli containerd.io
    
    # Start and enable Docker service
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker installed successfully"
    docker --version
}

# Install Docker Compose
install_docker_compose() {
    print_step "Installing Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose already installed"
        docker-compose --version
        return 0
    fi
    
    # Download Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Make it executable
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
    docker-compose --version
}

# Install Git
install_git() {
    print_step "Installing Git..."
    
    if command -v git &> /dev/null; then
        print_warning "Git already installed"
        git --version
        return 0
    fi
    
    dnf install -y git
    
    print_success "Git installed successfully"
    git --version
}

# Install Certbot for SSL certificates
install_certbot() {
    print_step "Installing Certbot for SSL certificates..."
    
    if command -v certbot &> /dev/null; then
        print_warning "Certbot already installed"
        certbot --version
        return 0
    fi
    
    # Enable EPEL repository
    dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
    
    # Install certbot
    dnf install -y certbot
    
    print_success "Certbot installed successfully"
    certbot --version
}

# Clone repository
clone_repository() {
    print_step "Cloning EPSM repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Repository already exists at $INSTALL_DIR"
        read -p "Do you want to remove it and clone fresh? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            print_warning "Skipping repository clone"
            return 0
        fi
    fi
    
    cd /opt
    git clone "$REPO_URL"
    cd "$INSTALL_DIR"
    git checkout "$BRANCH"
    
    print_success "Repository cloned successfully"
}

# Configure firewall
configure_firewall() {
    print_step "Configuring firewall..."
    
    # Open HTTP and HTTPS ports
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    
    print_success "Firewall configured (ports 80 and 443 opened)"
}

# Obtain SSL certificate
obtain_ssl_certificate() {
    print_step "Obtaining SSL certificate..."
    
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        print_warning "SSL certificate already exists for $DOMAIN"
        return 0
    fi
    
    print_warning "This will obtain an SSL certificate from Let's Encrypt"
    print_warning "Make sure DNS for $DOMAIN points to this server"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Skipping SSL certificate"
        return 0
    fi
    
    certbot certonly --standalone -d "$DOMAIN"
    
    print_success "SSL certificate obtained"
}

# Copy SSL certificates to project
copy_ssl_certificates() {
    print_step "Copying SSL certificates to project..."
    
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        print_warning "SSL certificates not found, skipping"
        return 0
    fi
    
    mkdir -p "$INSTALL_DIR/nginx/ssl"
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$INSTALL_DIR/nginx/ssl/"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$INSTALL_DIR/nginx/ssl/"
    chmod 644 "$INSTALL_DIR/nginx/ssl/fullchain.pem"
    chmod 600 "$INSTALL_DIR/nginx/ssl/privkey.pem"
    
    print_success "SSL certificates copied"
}

# Create environment file
create_env_file() {
    print_step "Creating environment file..."
    
    if [ -f "$INSTALL_DIR/.env" ]; then
        print_warning ".env file already exists"
        return 0
    fi
    
    # Generate a random SECRET_KEY
    SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
    
    cat > "$INSTALL_DIR/.env" << EOF
# Django Settings
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=$SECRET_KEY
DEBUG=False
ALLOWED_HOSTS=$DOMAIN

# Database
POSTGRES_DB=epsm_db
POSTGRES_USER=epsm_user
POSTGRES_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
DATABASE_URL=postgresql://epsm_user:\${POSTGRES_PASSWORD}@database:5432/epsm_db

# Redis
REDIS_URL=redis://redis:6379/0

# SAML Configuration
SAML_ENABLED=True
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml
SAML_ENTITY_ID=https://$DOMAIN/saml/metadata/
SAML_ACS_URL=https://$DOMAIN/saml/acs/

# CORS
CORS_ALLOWED_ORIGINS=https://$DOMAIN

# Production URLs
FRONTEND_URL=https://$DOMAIN
BACKEND_URL=https://$DOMAIN/api
EOF
    
    chmod 600 "$INSTALL_DIR/.env"
    
    print_success "Environment file created at $INSTALL_DIR/.env"
}

# Create Nginx configuration
create_nginx_config() {
    print_step "Creating Nginx configuration..."
    
    if [ -f "$INSTALL_DIR/nginx/nginx.conf" ]; then
        print_warning "Nginx config already exists"
        return 0
    fi
    
    mkdir -p "$INSTALL_DIR/nginx"
    
    cat > "$INSTALL_DIR/nginx/nginx.conf" << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name epsm.chalmers.se;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name epsm.chalmers.se;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Backend API
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
        }

        # Django admin
        location /admin/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # SAML endpoints
        location /saml/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Privacy policy
        location /privacy/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket for real-time updates
        location /ws/ {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /app/staticfiles/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Media files
        location /media/ {
            alias /app/media/;
            expires 1y;
            add_header Cache-Control "public";
        }

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
    
    print_success "Nginx configuration created"
}

# Show next steps
show_next_steps() {
    echo ""
    print_success "Installation Complete!"
    echo ""
    echo "Next steps:"
    echo "1. Review and customize the .env file:"
    echo "   nano $INSTALL_DIR/.env"
    echo ""
    echo "2. Deploy the application:"
    echo "   cd $INSTALL_DIR"
    echo "   bash scripts/deploy-production.sh"
    echo ""
    echo "3. Create a Django superuser:"
    echo "   docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser"
    echo ""
    echo "4. Share SAML metadata with Björn:"
    echo "   https://$DOMAIN/saml/metadata/"
    echo ""
}

# Main installation flow
main() {
    echo ""
    echo "╔════════════════════════════════════════════╗"
    echo "║  EPSM Clean Install Script                ║"
    echo "║  Chalmers University of Technology         ║"
    echo "╚════════════════════════════════════════════╝"
    echo ""
    
    check_sudo
    install_docker
    install_docker_compose
    install_git
    install_certbot
    configure_firewall
    clone_repository
    obtain_ssl_certificate
    copy_ssl_certificates
    create_env_file
    create_nginx_config
    show_next_steps
}

# Run main function
main "$@"
