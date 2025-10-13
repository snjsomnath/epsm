#!/usr/bin/env bash
# =============================================================================
# EPSM Auto-Setup GitHub Secrets
# =============================================================================
# 
# This script will:
# 1. Generate all production secrets
# 2. Save them to ~/Desktop/epsm-secrets.txt (backup)
# 3. Automatically add them to GitHub using gh CLI
#
# Usage:
#   ./scripts/auto-setup-secrets.sh
#
# Prerequisites:
#   - GitHub CLI installed (brew install gh)
#   - GitHub CLI authenticated (gh auth login)
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "========================================================================"
echo "  🔐 EPSM Auto-Setup GitHub Secrets"
echo "========================================================================"
echo ""

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not installed${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not authenticated${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI ready${NC}"
echo ""

# Generate secrets
echo -e "${BLUE}🔑 Generating secrets...${NC}"
echo ""

# Django Secret Key
# Use characters safe for both Django and shell environments
# Avoid: ()$`\! which can cause shell interpretation issues
DJANGO_SECRET=$(python3 -c 'import secrets, string; chars = string.ascii_letters + string.digits + "@#%^&*-_=+[]{}:;,.<>?/~"; print("".join(secrets.choice(chars) for _ in range(50)))')
echo -e "${GREEN}✓${NC} Django Secret Key"

# Database passwords
DB_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}✓${NC} Main DB Password"

MATERIALS_DB_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}✓${NC} Materials DB Password"

RESULTS_DB_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}✓${NC} Results DB Password"

# Redis password
REDIS_PASSWORD=$(openssl rand -base64 24)
echo -e "${GREEN}✓${NC} Redis Password"

# Django superuser password
DJANGO_SUPERUSER_PASSWORD=$(openssl rand -base64 16)
echo -e "${GREEN}✓${NC} Django Superuser Password"

echo ""
echo -e "${BLUE}💾 Saving backup to ~/Desktop/epsm-secrets.txt...${NC}"

# Save to file
cat > ~/Desktop/epsm-secrets.txt << EOF
========================================================================
EPSM Production Secrets - Generated $(date)
========================================================================

⚠️  IMPORTANT: Keep this file secure and delete after verification!

These secrets have been automatically added to GitHub.
Backup location: ~/Desktop/epsm-secrets.txt

========================================================================

PROD_DJANGO_SECRET_KEY
${DJANGO_SECRET}

PROD_DB_PASSWORD
${DB_PASSWORD}

PROD_MATERIALS_DB_PASSWORD
${MATERIALS_DB_PASSWORD}

PROD_RESULTS_DB_PASSWORD
${RESULTS_DB_PASSWORD}

PROD_REDIS_PASSWORD
${REDIS_PASSWORD}

PROD_DJANGO_SUPERUSER_PASSWORD
${DJANGO_SUPERUSER_PASSWORD}

PROD_EMAIL_HOST_PASSWORD
[MANUALLY SET - Use: gh secret set PROD_EMAIL_HOST_PASSWORD]
Value: Your Chalmers email password

PROD_SAML_IDP_METADATA_URL
https://www.ita.chalmers.se/idp.chalmers.se.xml

========================================================================

Next steps:
1. Manually set PROD_EMAIL_HOST_PASSWORD:
   gh secret set PROD_EMAIL_HOST_PASSWORD

2. Copy template to server:
   scp environments/.env.production.template epsm-server:/opt/epsm/

3. Deploy:
   GitHub → Actions → Deploy to Production → Run workflow

4. Delete this file after verification:
   rm ~/Desktop/epsm-secrets.txt

========================================================================
EOF

echo -e "${GREEN}✅ Backup saved${NC}"
echo ""

# Add to GitHub
echo -e "${BLUE}📤 Adding secrets to GitHub...${NC}"
echo ""

gh secret set PROD_DJANGO_SECRET_KEY --body "$DJANGO_SECRET" && echo -e "${GREEN}✓${NC} PROD_DJANGO_SECRET_KEY"
gh secret set PROD_DB_PASSWORD --body "$DB_PASSWORD" && echo -e "${GREEN}✓${NC} PROD_DB_PASSWORD"
gh secret set PROD_MATERIALS_DB_PASSWORD --body "$MATERIALS_DB_PASSWORD" && echo -e "${GREEN}✓${NC} PROD_MATERIALS_DB_PASSWORD"
gh secret set PROD_RESULTS_DB_PASSWORD --body "$RESULTS_DB_PASSWORD" && echo -e "${GREEN}✓${NC} PROD_RESULTS_DB_PASSWORD"
gh secret set PROD_REDIS_PASSWORD --body "$REDIS_PASSWORD" && echo -e "${GREEN}✓${NC} PROD_REDIS_PASSWORD"
gh secret set PROD_DJANGO_SUPERUSER_PASSWORD --body "$DJANGO_SUPERUSER_PASSWORD" && echo -e "${GREEN}✓${NC} PROD_DJANGO_SUPERUSER_PASSWORD"
gh secret set PROD_SAML_IDP_METADATA_URL --body "https://www.ita.chalmers.se/idp.chalmers.se.xml" && echo -e "${GREEN}✓${NC} PROD_SAML_IDP_METADATA_URL"

echo ""
echo -e "${YELLOW}⚠️  Manual action required:${NC}"
echo "Set your email password:"
echo "  gh secret set PROD_EMAIL_HOST_PASSWORD"
echo ""

# Verify
echo -e "${BLUE}🔍 Verifying secrets in GitHub...${NC}"
echo ""
gh secret list
echo ""

echo "========================================================================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Secrets added to GitHub:"
echo "  ✓ PROD_DJANGO_SECRET_KEY"
echo "  ✓ PROD_DB_PASSWORD"
echo "  ✓ PROD_MATERIALS_DB_PASSWORD"
echo "  ✓ PROD_RESULTS_DB_PASSWORD"
echo "  ✓ PROD_REDIS_PASSWORD"
echo "  ✓ PROD_DJANGO_SUPERUSER_PASSWORD"
echo "  ✓ PROD_SAML_IDP_METADATA_URL"
echo "  ⏳ PROD_EMAIL_HOST_PASSWORD (manual)"
echo ""
echo "Backup saved: ~/Desktop/epsm-secrets.txt"
echo ""
echo "Next steps:"
echo "  1. Set email password: gh secret set PROD_EMAIL_HOST_PASSWORD"
echo "  2. Deploy workflow"
echo "  3. Delete backup: rm ~/Desktop/epsm-secrets.txt"
echo ""
echo "========================================================================"
echo ""
