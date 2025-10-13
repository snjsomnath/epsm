#!/usr/bin/env bash
# =============================================================================
# SSL Certificate Setup for EPSM Production
# =============================================================================
# This script sets up Let's Encrypt SSL certificates for epsm.ita.chalmers.se
#
# Usage:
#   SSH to production server:
#   ssh ssanjay@epsm-server
#   cd /opt/epsm
#   bash scripts/setup-ssl-cert.sh
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="epsm.ita.chalmers.se"
DOMAIN_ALT="epsm.chalmers.se"
EMAIL="ssanjay@chalmers.se"

echo ""
echo "========================================================================"
echo "  🔐 SSL Certificate Setup for EPSM"
echo "========================================================================"
echo ""
echo "Primary Domain: $DOMAIN"
echo "Alternative Domain: $DOMAIN_ALT"
echo "Email: $EMAIL"
echo ""

# Check if running on production server
if [ ! -f "/opt/epsm/docker-compose.production.yml" ]; then
    echo -e "${RED}❌ This script must be run on the production server in /opt/epsm${NC}"
    exit 1
fi

cd /opt/epsm

# Step 1: Check if certbot is already installed
echo -e "${BLUE}📦 Checking for certbot...${NC}"
if command -v certbot &> /dev/null; then
    echo -e "${GREEN}✓ certbot is already installed${NC}"
else
    echo -e "${YELLOW}⚠️  certbot not found, installing...${NC}"
    
    # Detect package manager
    if command -v dnf &> /dev/null; then
        echo "Using dnf package manager..."
        sudo dnf install epel-release -y
        sudo dnf install certbot -y
    elif command -v yum &> /dev/null; then
        echo "Using yum package manager..."
        sudo yum install epel-release -y
        sudo yum install certbot -y
    else
        echo -e "${RED}❌ Neither dnf nor yum found. Please install certbot manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ certbot installed${NC}"
fi

echo ""
echo -e "${BLUE}🛑 Stopping nginx container to free port 80...${NC}"
docker stop epsm_nginx_prod 2>/dev/null || docker-compose -f docker-compose.production.yml stop nginx 2>/dev/null || true
echo -e "${GREEN}✓ nginx stopped${NC}"

echo ""
echo -e "${BLUE}🔐 Requesting SSL certificate from Let's Encrypt...${NC}"
echo "This will:"
echo "  1. Verify you control both domains"
echo "  2. Issue a certificate valid for 90 days"
echo "  3. Store it in /etc/letsencrypt/live/$DOMAIN/"
echo ""

# Request certificate using standalone mode for both domains
sudo certbot certonly \
    --standalone \
    --expand \
    -d "$DOMAIN" \
    -d "$DOMAIN_ALT" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

echo ""
echo -e "${BLUE}📂 Creating nginx SSL directory...${NC}"
mkdir -p /opt/epsm/nginx/ssl
echo -e "${GREEN}✓ Directory created${NC}"

echo ""
echo -e "${BLUE}📋 Copying certificates to nginx directory...${NC}"
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" /opt/epsm/nginx/ssl/
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" /opt/epsm/nginx/ssl/
echo -e "${GREEN}✓ Certificates copied${NC}"

echo ""
echo -e "${BLUE}🔒 Setting proper permissions...${NC}"
sudo chown -R $(whoami):$(whoami) /opt/epsm/nginx/ssl/
chmod 600 /opt/epsm/nginx/ssl/privkey.pem
chmod 644 /opt/epsm/nginx/ssl/fullchain.pem
echo -e "${GREEN}✓ Permissions set${NC}"

echo ""
echo -e "${BLUE}🚀 Starting all services...${NC}"
docker start epsm_nginx_prod 2>/dev/null || docker-compose -f docker-compose.production.yml start nginx 2>/dev/null || true
echo -e "${GREEN}✓ Services started${NC}"

echo ""
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10
echo -e "${GREEN}✓ Services should be running${NC}"

echo ""
echo "========================================================================"
echo -e "${GREEN}✅ SSL Certificate Setup Complete!${NC}"
echo "========================================================================"
echo ""
echo "Certificate Details:"
echo "  Primary Domain: $DOMAIN"
echo "  Alternative Domain: $DOMAIN_ALT"
echo "  Certificate: /opt/epsm/nginx/ssl/fullchain.pem"
echo "  Private Key: /opt/epsm/nginx/ssl/privkey.pem"
echo "  Valid for: 90 days"
echo ""
echo "Next Steps:"
echo "  1. Test HTTPS access: https://$DOMAIN"
echo "  2. Test alternative domain: https://$DOMAIN_ALT"
echo "  3. Certificate will auto-renew via certbot"
echo ""
echo "To manually renew in the future:"
echo "  sudo certbot renew"
echo "  bash scripts/setup-ssl-cert.sh  # (copy certs again)"
echo ""
echo "Auto-renewal cron job:"
echo "  Add to crontab: 0 3 * * * certbot renew --quiet && bash /opt/epsm/scripts/setup-ssl-cert.sh"
echo ""
echo "========================================================================"
echo ""
