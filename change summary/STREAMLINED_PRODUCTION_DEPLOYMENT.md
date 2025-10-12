# 🚀 Streamlined Production Deployment Guide

**Last Updated:** October 11, 2025  
**Version:** 0.2.2

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What Changed](#what-changed)
3. [New Structure](#new-structure)
4. [Quick Start](#quick-start)
5. [Migration Guide](#migration-guide)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide documents the **streamlined production deployment** strategy that resolves the following issues:

### ❌ Previous Problems

1. **Environment Variable Confusion**
   - Two different `.env` files (`.env` and `.env.production`)
   - Conflicting values between files
   - Unclear which file was the source of truth

2. **Docker Compose File Confusion**
   - Multiple production compose files (`docker-compose.prod.yml`, `docker-compose.production.yml`)
   - Different strategies (local builds vs. remote images)
   - Unclear which file to use when

3. **Build Cache Issues**
   - Docker using cached layers with old code
   - Remote images not reflecting latest changes
   - No clear way to force clean builds

4. **Deployment Workflow Issues**
   - Workflow sometimes pulling stale remote images
   - Workflow sometimes building locally but using cache
   - Hard to test production configurations

### ✅ New Solution

**Single source of truth for everything:**
- ✅ One environment file: `.env.production`
- ✅ One compose file: `docker-compose.production.yml`
- ✅ One deployment script: `scripts/deploy-production-clean.sh`
- ✅ One workflow: `.github/workflows/deploy-production.yml`
- ✅ Always builds from source with `--no-cache`
- ✅ No remote image fetching
- ✅ No cache confusion

---

## 🔄 What Changed

### File Changes

| Old Files | New Files | Status |
|-----------|-----------|--------|
| `.env` | `.env.production` | `.env` moved to `archive/.env.old` |
| `.env.production` (partial) | `.env.production` (complete) | Merged and consolidated |
| `docker-compose.prod.yml` | `docker-compose.production.yml` | Old file moved to `archive/` |
| `docker-compose.production.yml` (old) | `docker-compose.production.yml` (new) | Replaced with streamlined version |
| `.github/workflows/deploy-production.yml` (old) | `.github/workflows/deploy-production.yml` (new) | Updated for new approach |

### Key Principles

1. **Single Environment File**
   - All environment variables in `.env.production`
   - Comprehensive comments explaining each variable
   - No duplicate or conflicting variables

2. **Build from Source Always**
   - Never pull pre-built images
   - Always build locally from source
   - Use `--no-cache` to prevent stale builds

3. **Explicit and Clear**
   - No hidden defaults
   - No magic behavior
   - Clear error messages

---

## 🏗️ New Structure

### Directory Layout

```
/opt/epsm/
├── .env.production              # ⭐ SINGLE source of truth for env vars
├── docker-compose.production.yml # ⭐ SINGLE production compose file
├── .github/
│   └── workflows/
│       └── deploy-production.yml # ⭐ STREAMLINED workflow
├── scripts/
│   └── deploy-production-clean.sh # ⭐ CLEAN deployment script
└── archive/                      # Old files for reference
    ├── .env.old
    ├── docker-compose.prod.yml
    └── docker-compose.production.yml.old
```

### Environment File Structure

`.env.production` is organized into sections:

```bash
# Django Settings
DJANGO_SECRET_KEY=...
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=False
ALLOWED_HOSTS=epsm.chalmers.se,epsm.ita.chalmers.se,localhost,backend

# Main Database Configuration
DB_HOST=database
DB_PORT=5432
DB_NAME=epsm_db
# ... etc
```

### Docker Compose Features

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
      no_cache: true  # ⭐ Always build fresh
      args:
        VERSION: ${VERSION:-latest}
    # ...
```

---

## ⚡ Quick Start

### Option 1: Manual Deployment (Recommended for Testing)

```bash
# 1. Navigate to project directory
cd /opt/epsm

# 2. Review environment file
cat .env.production

# 3. Deploy with clean build
bash scripts/deploy-production-clean.sh

# 4. Check status
docker-compose -f docker-compose.production.yml ps
```

### Option 2: GitHub Actions Workflow

```bash
# Trigger deployment from GitHub
# Go to: Actions → Deploy to Production → Run workflow
```

### Option 3: Manual Docker Compose

```bash
cd /opt/epsm

# Load environment
source .env.production

# Stop existing
docker-compose -f docker-compose.production.yml down

# Clean cache
docker builder prune -af

# Build fresh (NO CACHE)
docker-compose -f docker-compose.production.yml build \
  --no-cache \
  --pull \
  --progress=plain

# Start services
docker-compose -f docker-compose.production.yml up -d --force-recreate

# Run migrations
docker-compose -f docker-compose.production.yml exec backend python manage.py migrate

# Collect static
docker-compose -f docker-compose.production.yml exec backend python manage.py collectstatic --noinput
```

---

## 📖 Migration Guide

### Step-by-Step Migration

#### 1. Backup Current Setup

```bash
cd /opt/epsm

# Backup current .env files
cp .env archive/.env.old
cp .env.production archive/.env.production.old

# Backup compose files
cp docker-compose.prod.yml archive/
cp docker-compose.production.yml archive/docker-compose.production.yml.old

# Export current container state
docker-compose -f docker-compose.prod.yml ps > archive/containers-state-$(date +%Y%m%d).txt
```

#### 2. Replace Files

```bash
# Replace environment file
mv .env.production.new .env.production

# Replace compose file
mv docker-compose.production.new.yml docker-compose.production.yml

# Replace workflow
mv .github/workflows/deploy-production.new.yml .github/workflows/deploy-production.yml
```

#### 3. Review Configuration

```bash
# Check environment variables
cat .env.production | grep -v "^#" | grep -v "^$"

# Validate compose file
docker-compose -f docker-compose.production.yml config
```

#### 4. Test Deployment

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Deploy with new configuration
bash scripts/deploy-production-clean.sh
```

#### 5. Verify

```bash
# Check all services are running
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f --tail=50

# Test application
curl https://epsm.chalmers.se/health/
```

---

## 🔧 Detailed Configuration

### Environment Variables

The `.env.production` file contains all configuration. Key sections:

#### Required Variables (Must Configure)

```bash
# Security - CHANGE THESE!
DJANGO_SECRET_KEY=your-secret-key-here
DB_PASSWORD=your-database-password
RESULTS_DB_PASSWORD=your-results-db-password

# Domain
ALLOWED_HOSTS=epsm.chalmers.se,epsm.ita.chalmers.se,localhost,backend
VITE_API_BASE_URL=https://epsm.chalmers.se
VITE_WS_URL=wss://epsm.chalmers.se/ws

# SAML
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml
```

#### Optional Variables (Use Defaults)

```bash
# Database pools
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000

# Simulation
ENERGYPLUS_DOCKER_IMAGE=nrel/energyplus:23.2.0
SIMULATION_TIMEOUT=600
```

### Docker Compose Services

All services defined in `docker-compose.production.yml`:

| Service | Purpose | Exposed Port |
|---------|---------|--------------|
| `database` | PostgreSQL 15 | 5432 (localhost only) |
| `redis` | Cache & message broker | 6379 (internal) |
| `backend` | Django API | 8000 (internal) |
| `celery_worker` | Background tasks | - |
| `celery_beat` | Scheduled tasks | - |
| `frontend` | React SPA | 80 (internal) |
| `nginx` | Reverse proxy | 80, 443 (public) |

### Build Options

The compose file uses these build options:

```yaml
build:
  context: ./backend
  dockerfile: Dockerfile.prod
  no_cache: true  # ⭐ Forces fresh build
  args:
    VERSION: ${VERSION:-latest}
```

This ensures:
- ✅ No cached layers
- ✅ Latest source code
- ✅ Consistent builds
- ✅ Reproducible deployments

---

## 🐛 Troubleshooting

### Issue: Environment Variables Not Loading

**Symptom:** Services fail with "missing environment variable" errors

**Solution:**
```bash
# Check file exists
ls -lh .env.production

# Validate syntax
cat .env.production | grep -v "^#" | grep -v "^$"

# Source manually
source .env.production
echo $DJANGO_SECRET_KEY  # Should print value
```

### Issue: Build Using Old Code

**Symptom:** Changes not reflected after deployment

**Solution:**
```bash
# Clean everything
docker-compose -f docker-compose.production.yml down
docker builder prune -af
docker images | grep epsm | awk '{print $3}' | xargs docker rmi -f

# Deploy fresh
bash scripts/deploy-production-clean.sh
```

### Issue: Services Not Starting

**Symptom:** Containers exit immediately or restart loop

**Solution:**
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs database

# Check health
docker-compose -f docker-compose.production.yml ps

# Verify environment
docker-compose -f docker-compose.production.yml exec backend env | grep DB_
```

### Issue: Database Connection Errors

**Symptom:** Backend can't connect to database

**Solution:**
```bash
# Check database is ready
docker-compose -f docker-compose.production.yml exec database pg_isready -U epsm_user

# Check credentials match
grep "^DB_" .env.production
grep "^POSTGRES_" .env.production

# Test connection from backend
docker-compose -f docker-compose.production.yml exec backend python manage.py dbshell
```

### Issue: Static Files Not Serving

**Symptom:** 404 errors for CSS/JS files

**Solution:**
```bash
# Recollect static files
docker-compose -f docker-compose.production.yml exec backend python manage.py collectstatic --noinput --clear

# Check nginx volume
docker-compose -f docker-compose.production.yml exec nginx ls -la /app/staticfiles

# Restart nginx
docker-compose -f docker-compose.production.yml restart nginx
```

### Issue: Celery Worker Not Processing Tasks

**Symptom:** Tasks stay in "PENDING" state

**Solution:**
```bash
# Check worker is running
docker-compose -f docker-compose.production.yml ps celery_worker

# Check worker logs
docker-compose -f docker-compose.production.yml logs celery_worker

# Test worker connection
docker-compose -f docker-compose.production.yml exec celery_worker celery -A config inspect ping

# Check Redis connection
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

---

## 📊 Deployment Script Options

The `deploy-production-clean.sh` script supports several options:

### Basic Usage

```bash
bash scripts/deploy-production-clean.sh
```

### Skip Migrations

Useful if you've already run migrations:

```bash
bash scripts/deploy-production-clean.sh --skip-migrations
```

### Skip Database Seeding

Useful for redeployments:

```bash
bash scripts/deploy-production-clean.sh --skip-seed
```

### Keep Existing Data

**WARNING:** Default behavior recreates containers but keeps volumes (data safe).

To also recreate volumes (⚠️ **DELETES ALL DATA**):

```bash
# Script will prompt for confirmation
bash scripts/deploy-production-clean.sh
```

### Combine Options

```bash
bash scripts/deploy-production-clean.sh --skip-migrations --skip-seed
```

---

## 🔍 Verification Checklist

After deployment, verify:

### 1. All Containers Running

```bash
docker-compose -f docker-compose.production.yml ps
```

Should show all services as "Up":
- ✅ database
- ✅ redis
- ✅ backend
- ✅ celery_worker
- ✅ celery_beat
- ✅ frontend
- ✅ nginx

### 2. Health Checks Passing

```bash
# Database
docker-compose -f docker-compose.production.yml exec database pg_isready -U epsm_user

# Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# Backend
docker-compose -f docker-compose.production.yml exec backend curl -f http://localhost:8000/health/

# Celery
docker-compose -f docker-compose.production.yml exec celery_worker celery -A config inspect ping
```

### 3. Application Accessible

```bash
# From server
curl https://epsm.chalmers.se/health/

# From browser
# Visit: https://epsm.chalmers.se
```

### 4. Logs Clean

```bash
# Check for errors
docker-compose -f docker-compose.production.yml logs --tail=100 | grep -i error

# Should see normal operation logs
docker-compose -f docker-compose.production.yml logs backend --tail=50
```

---

## 📝 Best Practices

### Before Every Deployment

1. ✅ Commit all changes to Git
2. ✅ Review `.env.production` for any needed updates
3. ✅ Test build locally first
4. ✅ Backup database if making schema changes

### During Deployment

1. ✅ Use the deployment script (don't run commands manually)
2. ✅ Watch logs for errors
3. ✅ Don't interrupt the deployment process

### After Deployment

1. ✅ Run full verification checklist
2. ✅ Test critical user flows
3. ✅ Monitor logs for first 15 minutes
4. ✅ Check Celery tasks are processing

### Regular Maintenance

```bash
# Weekly: Clean Docker system
docker system prune -f

# Monthly: Review logs
docker-compose -f docker-compose.production.yml logs --since 24h > logs-$(date +%Y%m%d).txt

# As needed: Backup database
docker-compose -f docker-compose.production.yml exec database pg_dump -U epsm_user epsm_db > backup-$(date +%Y%m%d).sql
```

---

## 🎓 Understanding the Architecture

### Why Single Environment File?

**Problem:** Having `.env` and `.env.production` caused:
- Values getting out of sync
- Confusion about which file to edit
- Different behavior in different contexts

**Solution:** Single `.env.production` with:
- All variables in one place
- Comprehensive documentation
- Clear ownership

### Why Build from Source?

**Problem:** Pulling pre-built images from remote registry caused:
- Stale images with old code
- Cache confusion
- CI/CD complexity

**Solution:** Always build from source with:
- `--no-cache` flag
- Latest code from repository
- Consistent builds
- No remote dependencies

### Why One Compose File?

**Problem:** Multiple compose files caused:
- Confusion about which to use
- Different configurations
- Deployment errors

**Solution:** Single `docker-compose.production.yml` with:
- All services defined
- Clear documentation
- Production-optimized settings

---

## 📚 Additional Resources

### Key Files

- `.env.production` - Environment variables
- `docker-compose.production.yml` - Service definitions
- `scripts/deploy-production-clean.sh` - Deployment automation
- `.github/workflows/deploy-production.yml` - CI/CD workflow

### Documentation

- `README.md` - Project overview
- `DEPLOYMENT_STEPS.md` - Detailed deployment guide
- `DEPLOYMENT_QUICK_REF.md` - Quick reference
- `change summary/DOCKER_COMPOSE_STRATEGY.md` - Architecture decisions

### Useful Commands

```bash
# View all running services
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f [service-name]

# Execute command in service
docker-compose -f docker-compose.production.yml exec [service-name] [command]

# Restart specific service
docker-compose -f docker-compose.production.yml restart [service-name]

# Stop all services
docker-compose -f docker-compose.production.yml down

# Remove everything (including volumes - DANGEROUS)
docker-compose -f docker-compose.production.yml down -v
```

---

## ✅ Summary

### Before (Problems)

❌ Multiple environment files  
❌ Multiple compose files  
❌ Remote image confusion  
❌ Cache issues  
❌ Hard to test production  

### After (Solutions)

✅ Single `.env.production`  
✅ Single `docker-compose.production.yml`  
✅ Always build from source  
✅ `--no-cache` by default  
✅ Easy to test and deploy  

### Migration Steps

1. ✅ Created new `.env.production` (consolidated)
2. ✅ Created new `docker-compose.production.yml` (streamlined)
3. ✅ Created `deploy-production-clean.sh` (automation)
4. ✅ Updated GitHub workflow
5. ✅ Archived old files
6. ✅ Documented everything

### Next Steps

1. Review `.env.production` and update any secrets
2. Test deployment with `bash scripts/deploy-production-clean.sh`
3. Verify all services are healthy
4. Update DNS/SSL if needed
5. Monitor first production deployment closely

---

**Questions or Issues?**

Check the troubleshooting section or review the logs:
```bash
docker-compose -f docker-compose.production.yml logs -f
```

---

**Last Updated:** October 11, 2025  
**Author:** EPSM Team  
**Version:** 1.0
