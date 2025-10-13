#!/usr/bin/env bash
# =============================================================================
# EPSM Production Diagnostics
# =============================================================================
# Run this on the production server to diagnose deployment issues
#
# Usage:
#   ssh production-server
#   cd /opt/epsm
#   bash scripts/diagnose-production.sh
# =============================================================================

set -e

echo ""
echo "========================================================================"
echo "  🔍 EPSM Production Diagnostics"
echo "========================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if in correct directory
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}❌ Not in /opt/epsm directory${NC}"
    echo "Run: cd /opt/epsm"
    exit 1
fi

echo -e "${BLUE}📦 Container Status:${NC}"
echo "--------------------------------------------------------------------"
docker-compose -f docker-compose.production.yml ps
echo ""

echo -e "${BLUE}🔍 Environment File Check:${NC}"
echo "--------------------------------------------------------------------"
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✓ .env.production exists${NC}"
    echo "File size: $(wc -c < .env.production) bytes"
    echo "Lines: $(wc -l < .env.production)"
    echo ""
    echo "Key variables:"
    grep "^DJANGO_SETTINGS_MODULE=" .env.production || echo -e "${RED}❌ DJANGO_SETTINGS_MODULE not set${NC}"
    grep "^DEBUG=" .env.production || echo -e "${RED}❌ DEBUG not set${NC}"
    grep "^SAML_IDP_METADATA_URL=" .env.production || echo -e "${YELLOW}⚠️  SAML_IDP_METADATA_URL not set${NC}"
else
    echo -e "${RED}❌ .env.production does not exist${NC}"
fi
echo ""

echo -e "${BLUE}🔍 Backend Container Logs (last 50 lines):${NC}"
echo "--------------------------------------------------------------------"
docker-compose -f docker-compose.production.yml logs backend --tail=50
echo ""

echo -e "${BLUE}🔍 Backend Health Check:${NC}"
echo "--------------------------------------------------------------------"
if docker-compose -f docker-compose.production.yml exec -T backend curl -f http://localhost:8000/health/ 2>/dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi
echo ""

echo -e "${BLUE}🔍 Backend Environment Variables:${NC}"
echo "--------------------------------------------------------------------"
docker-compose -f docker-compose.production.yml exec -T backend env | grep -E "DJANGO_SETTINGS_MODULE|DEBUG|SAML|DB_|ALLOWED_HOSTS" | sort
echo ""

echo -e "${BLUE}🔍 Database Connection:${NC}"
echo "--------------------------------------------------------------------"
if docker-compose -f docker-compose.production.yml exec -T database pg_isready -U epsm_user >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Database is ready${NC}"
else
    echo -e "${RED}❌ Database is not responding${NC}"
fi
echo ""

echo -e "${BLUE}🔍 Redis Connection:${NC}"
echo "--------------------------------------------------------------------"
if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is responding${NC}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
fi
echo ""

echo -e "${BLUE}🔍 Nginx Configuration:${NC}"
echo "--------------------------------------------------------------------"
docker-compose -f docker-compose.production.yml exec -T nginx nginx -t 2>&1 || echo -e "${RED}❌ Nginx config invalid${NC}"
echo ""

echo -e "${BLUE}🔍 Network Connectivity:${NC}"
echo "--------------------------------------------------------------------"
echo "Can nginx reach backend?"
docker-compose -f docker-compose.production.yml exec -T nginx wget -O- http://backend:8000/health/ 2>&1 | head -5 || echo -e "${RED}❌ Cannot reach backend${NC}"
echo ""

echo "========================================================================"
echo -e "${GREEN}✅ Diagnostics complete${NC}"
echo "========================================================================"
echo ""
