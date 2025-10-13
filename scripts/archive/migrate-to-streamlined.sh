#!/bin/bash
# ============================================================================
# EPSM Production Migration Script
# ============================================================================
# This script helps migrate from the old multi-file configuration to the
# new streamlined single-source-of-truth configuration
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "============================================================================"
echo "           EPSM PRODUCTION CONFIGURATION MIGRATION"
echo "============================================================================"
echo -e "${NC}"

# ============================================================================
# Step 1: Backup Current Files
# ============================================================================
echo -e "${YELLOW}Step 1: Backing up current configuration...${NC}"

# Create archive directory if it doesn't exist
mkdir -p archive

# Backup environment files
if [ -f ".env" ]; then
    cp .env "archive/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backed up .env${NC}"
fi

if [ -f ".env.production" ]; then
    cp .env.production "archive/.env.production.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backed up .env.production${NC}"
fi

# Backup compose files
if [ -f "docker-compose.prod.yml" ]; then
    cp docker-compose.prod.yml "archive/docker-compose.prod.backup.$(date +%Y%m%d_%H%M%S).yml"
    echo -e "${GREEN}✅ Backed up docker-compose.prod.yml${NC}"
fi

if [ -f "docker-compose.production.yml" ]; then
    cp docker-compose.production.yml "archive/docker-compose.production.backup.$(date +%Y%m%d_%H%M%S).yml"
    echo -e "${GREEN}✅ Backed up docker-compose.production.yml${NC}"
fi

# Backup workflow
if [ -f ".github/workflows/deploy-production.yml" ]; then
    mkdir -p archive/.github/workflows
    cp .github/workflows/deploy-production.yml "archive/.github/workflows/deploy-production.backup.$(date +%Y%m%d_%H%M%S).yml"
    echo -e "${GREEN}✅ Backed up GitHub workflow${NC}"
fi

echo ""

# ============================================================================
# Step 2: Show What Will Change
# ============================================================================
echo -e "${YELLOW}Step 2: Changes to be made...${NC}"
echo ""
echo "The following files will be replaced with streamlined versions:"
echo ""
echo "  .env.production              → Consolidated, comprehensive version"
echo "  docker-compose.production.yml → Single, no-cache, build-from-source version"
echo "  .github/workflows/deploy-production.yml → Streamlined workflow"
echo "  scripts/deploy-production-clean.sh → New deployment script"
echo ""

# ============================================================================
# Step 3: Confirm
# ============================================================================
echo -e "${RED}⚠️  WARNING: This will replace your current configuration files!${NC}"
echo -e "${YELLOW}All backups are saved in the 'archive/' directory.${NC}"
echo ""
read -p "Continue with migration? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Migration cancelled. No changes made.${NC}"
    exit 0
fi

echo ""

# ============================================================================
# Step 4: Apply New Configuration
# ============================================================================
echo -e "${YELLOW}Step 4: Applying new configuration...${NC}"

# Replace environment file
if [ -f ".env.production.new" ]; then
    mv .env.production.new .env.production
    echo -e "${GREEN}✅ Updated .env.production${NC}"
else
    echo -e "${RED}❌ .env.production.new not found!${NC}"
    exit 1
fi

# Replace compose file
if [ -f "docker-compose.production.new.yml" ]; then
    mv docker-compose.production.new.yml docker-compose.production.yml
    echo -e "${GREEN}✅ Updated docker-compose.production.yml${NC}"
else
    echo -e "${RED}❌ docker-compose.production.new.yml not found!${NC}"
    exit 1
fi

# Replace workflow
if [ -f ".github/workflows/deploy-production.new.yml" ]; then
    mv .github/workflows/deploy-production.new.yml .github/workflows/deploy-production.yml
    echo -e "${GREEN}✅ Updated .github/workflows/deploy-production.yml${NC}"
else
    echo -e "${RED}❌ .github/workflows/deploy-production.new.yml not found!${NC}"
    exit 1
fi

# Deployment script should already be in place
if [ -f "scripts/deploy-production-clean.sh" ]; then
    chmod +x scripts/deploy-production-clean.sh
    echo -e "${GREEN}✅ Deployment script ready${NC}"
else
    echo -e "${YELLOW}⚠️  scripts/deploy-production-clean.sh not found${NC}"
fi

echo ""

# ============================================================================
# Step 5: Verification
# ============================================================================
echo -e "${YELLOW}Step 5: Verifying new configuration...${NC}"

# Check environment file
if grep -q "DJANGO_SECRET_KEY" .env.production && \
   grep -q "DB_PASSWORD" .env.production && \
   grep -q "VITE_API_BASE_URL" .env.production; then
    echo -e "${GREEN}✅ .env.production has all required variables${NC}"
else
    echo -e "${RED}❌ .env.production is missing required variables!${NC}"
    exit 1
fi

# Check compose file syntax
if docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose.production.yml syntax is valid${NC}"
else
    echo -e "${RED}❌ docker-compose.production.yml has syntax errors!${NC}"
    docker-compose -f docker-compose.production.yml config
    exit 1
fi

echo ""

# ============================================================================
# Step 6: Summary & Next Steps
# ============================================================================
echo -e "${GREEN}"
echo "============================================================================"
echo "                    MIGRATION COMPLETED SUCCESSFULLY!"
echo "============================================================================"
echo -e "${NC}"
echo ""
echo "📁 Backups saved in: ${BLUE}archive/${NC}"
echo ""
echo "📝 New files in place:"
echo "   ✅ .env.production"
echo "   ✅ docker-compose.production.yml"
echo "   ✅ .github/workflows/deploy-production.yml"
echo "   ✅ scripts/deploy-production-clean.sh"
echo ""
echo -e "${YELLOW}🔧 IMPORTANT: Review .env.production and update any secrets!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Review and update .env.production:"
echo "   ${BLUE}nano .env.production${NC}"
echo ""
echo "2. Update sensitive values:"
echo "   - DJANGO_SECRET_KEY"
echo "   - DB_PASSWORD"
echo "   - RESULTS_DB_PASSWORD"
echo ""
echo "3. Test the new deployment:"
echo "   ${BLUE}bash scripts/deploy-production-clean.sh${NC}"
echo ""
echo "4. Read the full guide:"
echo "   ${BLUE}cat 'change summary/STREAMLINED_PRODUCTION_DEPLOYMENT.md'${NC}"
echo ""
echo -e "${GREEN}Migration complete! 🎉${NC}"
echo ""
