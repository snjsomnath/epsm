# EPSM Secrets Management with GitHub Secrets

**Created:** October 13, 2025  
**Status:** Implementation Guide  
**Security Level:** 🔒 Critical

---

## 🎯 Objective

**Remove all hardcoded secrets** from the repository and use **GitHub Secrets** for production deployments with a self-hosted runner.

---

## 📋 Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Secrets Inventory](#secrets-inventory)
4. [GitHub Secrets Setup](#github-secrets-setup)
5. [Implementation Steps](#implementation-steps)
6. [Workflow Updates](#workflow-updates)
7. [Local Development](#local-development)
8. [Security Best Practices](#security-best-practices)
9. [Rotation Schedule](#rotation-schedule)
10. [Troubleshooting](#troubleshooting)

---

## 🔍 Current State Analysis

### What We Have Now

**Production Secrets Location:**
- ❌ Stored in `.env.production` on production server
- ❌ Not in GitHub repository (good!)
- ❌ But managed manually on server
- ❌ No version control or audit trail
- ❌ Hard to rotate or update

**Deployment Method:**
- ✅ Self-hosted GitHub Actions runner on VM
- ✅ Workflow sources `.env.production` from `/opt/epsm/`
- ❌ Secrets must be manually updated on server

**Development Secrets:**
- ✅ Safe defaults in `environments/development.env.example`
- ✅ Not committed to git
- ✅ Simple passwords for local work (OK)

---

## 🏗️ Architecture Overview

### Recommended Approach: Hybrid Strategy

**Use GitHub Secrets for:** (Production only)
- ✅ DJANGO_SECRET_KEY
- ✅ Database passwords
- ✅ Redis password
- ✅ Email credentials
- ✅ API keys
- ✅ SAML configuration

**Keep in .env files for:** (Non-secret configuration)
- ✅ DEBUG=False
- ✅ ALLOWED_HOSTS
- ✅ Domain names
- ✅ Port numbers
- ✅ Service names

### Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Repository Settings → Secrets                   │
│  - DJANGO_SECRET_KEY                                     │
│  - DB_PASSWORD                                           │
│  - REDIS_PASSWORD                                        │
│  - etc.                                                  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          │ GitHub Actions Workflow
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Self-Hosted Runner on VM                               │
│  1. Checkout code                                        │
│  2. Create .env.production from GitHub Secrets          │
│  3. Deploy with docker-compose                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📦 Secrets Inventory

### Critical Secrets (Must be in GitHub Secrets)

| Secret Name | Purpose | Current Location | Rotation Frequency |
|-------------|---------|------------------|-------------------|
| `PROD_DJANGO_SECRET_KEY` | Django encryption | `.env.production` | 90 days |
| `PROD_DB_PASSWORD` | Main database | `.env.production` | 90 days |
| `PROD_MATERIALS_DB_PASSWORD` | Materials DB | `.env.production` | 90 days |
| `PROD_RESULTS_DB_PASSWORD` | Results DB | `.env.production` | 90 days |
| `PROD_REDIS_PASSWORD` | Redis cache | `.env.production` | 90 days |
| `PROD_EMAIL_HOST_PASSWORD` | SMTP email | `.env.production` | 180 days |
| `PROD_SAML_IDP_METADATA_URL` | SAML SSO | `.env.production` | Only if changes |

### Configuration Values (Can stay in .env.production template)

| Variable | Value | Why Not Secret? |
|----------|-------|----------------|
| `DEBUG` | `False` | Not sensitive |
| `ALLOWED_HOSTS` | `epsm.ita.chalmers.se` | Public domain |
| `DB_HOST` | `database` | Service name |
| `DB_PORT` | `5432` | Standard port |
| `DB_NAME` | `epsm_db` | Database name (not sensitive) |
| `DB_USER` | `epsm_user` | Username (not sensitive) |
| `VITE_API_BASE_URL` | `https://epsm.ita.chalmers.se` | Public URL |
| `VERSION` | `0.2.2` | Version number |

---

## 🔐 GitHub Secrets Setup

### Step 1: Navigate to Repository Settings

```
GitHub.com
  └── snjsomnath/epsm
      └── Settings
          └── Secrets and variables
              └── Actions
                  └── New repository secret
```

### Step 2: Add Each Secret

For each secret in the inventory, click **"New repository secret"**:

#### Secret 1: Django Secret Key
```
Name: PROD_DJANGO_SECRET_KEY
Value: [Generate new with command below]
```

**Generate on your machine:**
```bash
# No Django required - uses Python's built-in secrets module
python3 -c 'import secrets, string; chars = string.ascii_letters + string.digits + "!@#$%^&*(-_=+)"; print("".join(secrets.choice(chars) for _ in range(50)))'
```

#### Secret 2: Database Password
```
Name: PROD_DB_PASSWORD
Value: [Generate new with command below]
```

**Generate:**
```bash
openssl rand -base64 32
```

#### Secret 3: Materials Database Password
```
Name: PROD_MATERIALS_DB_PASSWORD
Value: [Use same as DB_PASSWORD or generate new]
```

#### Secret 4: Results Database Password
```
Name: PROD_RESULTS_DB_PASSWORD
Value: [Use same as DB_PASSWORD or generate new]
```

#### Secret 5: Redis Password
```
Name: PROD_REDIS_PASSWORD
Value: [Generate new]
```

**Generate:**
```bash
openssl rand -base64 24
```

#### Secret 6: Email Password
```
Name: PROD_EMAIL_HOST_PASSWORD
Value: [Your actual Chalmers SMTP password or app password]
```

#### Secret 7: SAML Metadata URL
```
Name: PROD_SAML_IDP_METADATA_URL
Value: https://www.ita.chalmers.se/idp.chalmers.se.xml
```

### Step 3: Verify Secrets Added

You should see all 7 secrets listed:
- ✅ PROD_DJANGO_SECRET_KEY
- ✅ PROD_DB_PASSWORD
- ✅ PROD_MATERIALS_DB_PASSWORD
- ✅ PROD_RESULTS_DB_PASSWORD
- ✅ PROD_REDIS_PASSWORD
- ✅ PROD_EMAIL_HOST_PASSWORD
- ✅ PROD_SAML_IDP_METADATA_URL

---

## 🚀 Implementation Steps

### Phase 1: Create .env.production Template

Create `/opt/epsm/.env.production.template` on the server:

```bash
# This is a template - actual secrets come from GitHub Actions
# DO NOT put real secrets here - this file can be in git

# Django Core
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}  # From GitHub Secret
ALLOWED_HOSTS=epsm.ita.chalmers.se,epsm-staging.ita.chalmers.se,backend
CSRF_TRUSTED_ORIGINS=https://epsm.ita.chalmers.se

# Main Database
DB_NAME=epsm_db
DB_USER=epsm_user
DB_PASSWORD=${DB_PASSWORD}  # From GitHub Secret
DB_HOST=database
DB_PORT=5432

# Materials Database
MATERIALS_DB_NAME=epsm_materials
MATERIALS_DB_USER=epsm_user
MATERIALS_DB_PASSWORD=${MATERIALS_DB_PASSWORD}  # From GitHub Secret
MATERIALS_DB_HOST=database
MATERIALS_DB_PORT=5432

# Results Database
RESULTS_DB_NAME=epsm_db
RESULTS_DB_USER=epsm_user
RESULTS_DB_PASSWORD=${RESULTS_DB_PASSWORD}  # From GitHub Secret
RESULTS_DB_HOST=database
RESULTS_DB_PORT=5432

# PostgreSQL Container
POSTGRES_DB=epsm_db
POSTGRES_USER=epsm_user
POSTGRES_PASSWORD=${DB_PASSWORD}  # From GitHub Secret
POSTGRES_MULTIPLE_DATABASES=epsm_db,epsm_materials

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}  # From GitHub Secret
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://epsm.ita.chalmers.se

# EnergyPlus
ENERGYPLUS_DOCKER_IMAGE=nrel/energyplus:23.2.0
SIMULATION_TIMEOUT=600
MAX_CONCURRENT_SIMULATIONS=4
DOCKER_GID=999

# Frontend
VITE_API_BASE_URL=https://epsm.ita.chalmers.se
VITE_WS_URL=wss://epsm.ita.chalmers.se/ws

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.chalmers.se
EMAIL_PORT=587
EMAIL_HOST_USER=${EMAIL_HOST_USER}
EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD}  # From GitHub Secret
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=epsm@chalmers.se

# SAML
SAML_ENABLED=True
SAML_IDP_METADATA_URL=${SAML_IDP_METADATA_URL}  # From GitHub Secret
SAML_ENTITY_CATEGORY=http://refeds.org/category/personalized
SAML_SUPERUSER_WHITELIST=ssanjay,hollberg

# SSL/TLS
SECURE_SSL_REDIRECT=True
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Monitoring
SENTRY_DSN=
SENTRY_ENVIRONMENT=production

# Backup
BACKUP_DIR=/opt/epsm/backups
BACKUP_RETENTION_DAYS=30

# Version
VERSION=0.2.2

# Docker Compose
COMPOSE_PROJECT_NAME=epsm_prod
```

### Phase 2: Update GitHub Actions Workflow

Update `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Production

on:
  workflow_dispatch:  # Manual triggering only

jobs:
  deploy:
    runs-on: self-hosted
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create .env.production from secrets
        run: |
          cd /opt/epsm
          
          # Create .env.production from template
          echo "🔐 Creating .env.production from GitHub Secrets..."
          
          # Start with template
          cp .env.production.template .env.production
          
          # Replace placeholders with actual secrets
          sed -i "s|\${DJANGO_SECRET_KEY}|${{ secrets.PROD_DJANGO_SECRET_KEY }}|g" .env.production
          sed -i "s|\${DB_PASSWORD}|${{ secrets.PROD_DB_PASSWORD }}|g" .env.production
          sed -i "s|\${MATERIALS_DB_PASSWORD}|${{ secrets.PROD_MATERIALS_DB_PASSWORD }}|g" .env.production
          sed -i "s|\${RESULTS_DB_PASSWORD}|${{ secrets.PROD_RESULTS_DB_PASSWORD }}|g" .env.production
          sed -i "s|\${REDIS_PASSWORD}|${{ secrets.PROD_REDIS_PASSWORD }}|g" .env.production
          sed -i "s|\${EMAIL_HOST_PASSWORD}|${{ secrets.PROD_EMAIL_HOST_PASSWORD }}|g" .env.production
          sed -i "s|\${SAML_IDP_METADATA_URL}|${{ secrets.PROD_SAML_IDP_METADATA_URL }}|g" .env.production
          sed -i "s|\${EMAIL_HOST_USER}|epsm@chalmers.se|g" .env.production
          
          # Set proper permissions
          chmod 600 .env.production
          
          echo "✅ .env.production created with secrets from GitHub"

      - name: Deploy application
        run: |
          cd /opt/epsm
          
          # Pull latest code
          echo "📥 Pulling latest code..."
          git pull origin main
          
          # Pull EnergyPlus image
          echo "📥 Pulling EnergyPlus Docker image..."
          docker pull nrel/energyplus:23.2.0
          
          # Rebuild and deploy
          echo "🚀 Rebuilding and deploying services..."
          docker-compose -f docker-compose.production.yml --env-file .env.production build
          docker-compose -f docker-compose.production.yml --env-file .env.production up -d
          
          # Wait for services
          echo "⏳ Waiting for services to start..."
          sleep 30
          
          # Run migrations
          echo "📊 Running database migrations..."
          docker-compose -f docker-compose.production.yml exec -T backend python manage.py migrate --noinput
          
          # Collect static files
          echo "📁 Collecting static files..."
          docker-compose -f docker-compose.production.yml exec -T backend python manage.py collectstatic --noinput
          
          # Clean up
          echo "🧹 Cleaning up..."
          docker system prune -f
          
          # Show status
          echo "✅ Deployment complete!"
          docker-compose -f docker-compose.production.yml ps

      - name: Cleanup secrets file
        if: always()
        run: |
          # Remove .env.production file after deployment
          rm -f /opt/epsm/.env.production
          echo "🗑️  Cleaned up secrets file"
```

### Phase 3: Test Locally (Dry Run)

Before deploying, test the workflow logic locally:

```bash
# On your Mac (simulate the workflow)
cd /Users/ssanjay/GitHub/epsm

# Create test template
cat > /tmp/.env.production.template << 'EOF'
DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
DB_PASSWORD=${DB_PASSWORD}
EOF

# Simulate secret injection
DJANGO_SECRET_KEY="test-secret-key"
DB_PASSWORD="test-db-password"

cp /tmp/.env.production.template /tmp/.env.production
sed -i '' "s|\${DJANGO_SECRET_KEY}|${DJANGO_SECRET_KEY}|g" /tmp/.env.production
sed -i '' "s|\${DB_PASSWORD}|${DB_PASSWORD}|g" /tmp/.env.production

# Verify
cat /tmp/.env.production
# Should show actual values, not ${...} placeholders

# Cleanup
rm /tmp/.env.production.template /tmp/.env.production
```

### Phase 4: Deploy .env.production.template to Server

```bash
# Copy template to server
scp environments/.env.production.template epsm-server:/opt/epsm/

# Or create directly on server
ssh epsm-server
cd /opt/epsm
# Create .env.production.template as shown in Phase 1
```

### Phase 5: First Deployment Test

1. Go to GitHub → Actions → Deploy to Production
2. Click "Run workflow"
3. Monitor logs for:
   - ✅ .env.production created successfully
   - ✅ No secret values shown in logs
   - ✅ Deployment succeeds
   - ✅ .env.production cleaned up after

---

## 🔒 Security Best Practices

### DO's ✅

1. **Use GitHub Secrets for ALL sensitive data**
2. **Prefix secrets with environment** (e.g., `PROD_`, `STAGING_`)
3. **Set file permissions** (`chmod 600 .env.production`)
4. **Clean up secrets file after deployment**
5. **Rotate secrets regularly** (every 90 days)
6. **Use different secrets per environment**
7. **Audit secret access** (GitHub logs who accessed secrets)
8. **Use strong, random passwords** (32+ characters)

### DON'Ts ❌

1. **Never commit `.env.production` to git**
2. **Never echo secrets in workflow logs**
3. **Never store secrets in plain text on server long-term**
4. **Never reuse passwords across environments**
5. **Never share secrets via email/chat**
6. **Never use simple/guessable passwords**

### Verification Checklist

After setup, verify:

```bash
# On server
cd /opt/epsm

# 1. Check .env.production doesn't exist (created during deployment only)
[ ! -f .env.production ] && echo "✅ No persistent secrets file" || echo "❌ Secrets file exists"

# 2. Check git status (should not show .env.production)
git status

# 3. Check no secrets in environment
env | grep -i secret

# 4. Check workflow logs don't show secrets
# (Go to GitHub Actions and review last run)
```

---

## 🔄 Secrets Rotation Schedule

| Secret | Frequency | Next Rotation | How to Rotate |
|--------|-----------|---------------|---------------|
| DJANGO_SECRET_KEY | 90 days | 2026-01-12 | Generate new → Update GitHub Secret → Redeploy |
| DB_PASSWORD | 90 days | 2026-01-12 | Generate new → Update in DB AND GitHub Secret |
| REDIS_PASSWORD | 90 days | 2026-01-12 | Generate new → Update GitHub Secret → Redeploy |
| EMAIL_HOST_PASSWORD | 180 days | 2026-04-12 | Update Chalmers SMTP → Update GitHub Secret |
| SAML_IDP_METADATA_URL | As needed | - | Update if Chalmers IT changes it |

### Rotation Procedure

1. **Generate new secret:**
   ```bash
   # Django Secret Key (no Django required)
   python3 -c 'import secrets, string; chars = string.ascii_letters + string.digits + "!@#$%^&*(-_=+)"; print("".join(secrets.choice(chars) for _ in range(50)))'
   
   # Passwords
   openssl rand -base64 32
   ```

2. **Update GitHub Secret:**
   - Go to Settings → Secrets → Edit secret
   - Paste new value
   - Save

3. **For database passwords (additional step):**
   ```bash
   # Connect to database
   docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_db
   
   # Update password
   ALTER USER epsm_user WITH PASSWORD 'new-password-here';
   ```

4. **Redeploy:**
   - Go to Actions → Deploy to Production
   - Click "Run workflow"
   - New secrets will be used

5. **Verify:**
   - Check application still works
   - Test database connections
   - Test Redis connections
   - Test email sending

---

## 🧪 Testing Procedure

### Test 1: Verify Secrets Not in Logs

```yaml
# Add to workflow for testing
- name: Verify no secrets in environment
  run: |
    echo "Testing secret masking..."
    echo "DJANGO_SECRET_KEY length: ${#SECRET_KEY}" # Length only
    # GitHub automatically masks secrets in logs
```

### Test 2: Verify .env.production Created

```bash
# During deployment, add:
- name: Verify .env.production
  run: |
    if [ -f /opt/epsm/.env.production ]; then
      echo "✅ .env.production exists"
      echo "File permissions: $(stat -c %a /opt/epsm/.env.production)"
      echo "File owner: $(stat -c %U:%G /opt/epsm/.env.production)"
      # Don't show contents!
    else
      echo "❌ .env.production missing"
      exit 1
    fi
```

### Test 3: Verify Services Start

```bash
# After deployment:
docker-compose -f docker-compose.production.yml ps
# All services should be "Up"
```

---

## 🆘 Troubleshooting

### Issue: Secrets not being replaced in .env.production

**Symptoms:**
- `.env.production` has `${DJANGO_SECRET_KEY}` instead of actual value
- Services fail to start
- Django SECRET_KEY errors

**Solution:**
```bash
# Check sed syntax (macOS vs Linux differ)
# On Linux (self-hosted runner):
sed -i "s|pattern|replacement|g" file

# On macOS (local testing):
sed -i '' "s|pattern|replacement|g" file
```

### Issue: GitHub Secret not accessible

**Symptoms:**
- Workflow shows `${{ secrets.PROD_DB_PASSWORD }}` as empty
- sed replaces with empty string

**Solution:**
1. Verify secret exists in GitHub Settings → Secrets
2. Check secret name matches exactly (case-sensitive)
3. Verify workflow has access to secrets

### Issue: File permissions errors

**Symptoms:**
- PostgreSQL won't start
- "permission denied" errors

**Solution:**
```bash
# Set correct permissions
chmod 600 /opt/epsm/.env.production
chown $(whoami):$(whoami) /opt/epsm/.env.production
```

### Issue: Old secrets still being used

**Symptoms:**
- Updated secret but old value still active
- Database password mismatch

**Solution:**
```bash
# Force recreation of containers
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

---

## 📝 Migration Checklist

Migrate from current setup to GitHub Secrets:

### Preparation
- [ ] Document all current production secrets
- [ ] Generate new secrets (don't reuse old ones)
- [ ] Test secret generation commands
- [ ] Backup current `.env.production`

### GitHub Setup
- [ ] Add all 7 secrets to GitHub repository
- [ ] Verify secrets are marked as "Set"
- [ ] Test secret access in a test workflow

### Server Setup
- [ ] Create `.env.production.template` on server
- [ ] Test template has all required variables
- [ ] Set up proper file permissions

### Workflow Update
- [ ] Update `deploy-production.yml` with new steps
- [ ] Add secret injection step
- [ ] Add cleanup step
- [ ] Test workflow syntax

### Testing
- [ ] Run deployment workflow
- [ ] Verify `.env.production` created correctly
- [ ] Verify no secrets in logs
- [ ] Verify application works
- [ ] Verify `.env.production` cleaned up

### Cleanup
- [ ] Remove old `.env.production` from server
- [ ] Document new deployment process
- [ ] Update team documentation
- [ ] Schedule first rotation date

---

## 📚 Related Documentation

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Self-Hosted Runners Documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
- `environments/production.env.example` - Production template
- `DOCKER_COMPOSE_GUIDE.md` - Deployment guide

---

**Status:** Ready for Implementation  
**Security Level:** 🔒 High  
**Next Action:** Add secrets to GitHub and update workflow

---

## 🎯 Quick Start Commands

### Generate All Secrets at Once

```bash
echo "=== EPSM Production Secrets ==="
echo ""
echo "PROD_DJANGO_SECRET_KEY:"
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
echo ""
echo "PROD_DB_PASSWORD:"
openssl rand -base64 32
echo ""
echo "PROD_MATERIALS_DB_PASSWORD:"
openssl rand -base64 32
echo ""
echo "PROD_RESULTS_DB_PASSWORD:"
openssl rand -base64 32
echo ""
echo "PROD_REDIS_PASSWORD:"
openssl rand -base64 24
echo ""
echo "=== Copy these to GitHub Secrets ==="
```

Save output securely, then add each to GitHub Secrets!

---

**Remember:** Secrets are only as secure as their management. Follow the procedures, rotate regularly, and never commit secrets to git! 🔐
