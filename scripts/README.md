# EPSM Scripts Documentation# Production Deployment Scripts



This directory contains all the scripts for managing the EPSM application in development and production environments.This directory contains automated scripts for deploying EPSM on the Chalmers production VM.



## 📁 Script Organization## Scripts



### 🔵 Development Scripts### 1. `install-production.sh` - Clean Install Script



**`start.sh`** - Start development environment**Purpose:** Sets up EPSM from scratch on a fresh Red Hat Enterprise Linux 9 VM.

- Checks if Docker is running

- Creates `.env` from `.env.example` if needed**What it does:**

- Builds and starts all services- ✅ Installs Docker and Docker Compose

- Runs migrations and creates superuser- ✅ Installs Git and Certbot

- Shows application URLs and useful commands- ✅ Configures firewall (opens ports 80, 443)

- ✅ Clones the EPSM repository

```bash- ✅ Obtains SSL certificates from Let's Encrypt

./scripts/start.sh- ✅ Creates `.env` configuration file with secure random keys

```- ✅ Creates Nginx configuration



**`stop.sh`** - Stop development environment**Usage:**

- Stops all Docker Compose services```bash

- Optionally removes volumes# Run as root or with sudo

sudo bash /opt/epsm/scripts/install-production.sh

```bash```

./scripts/stop.sh

```**Requirements:**

- Fresh RHEL 9 VM

**`restart.sh`** - Quick restart of backend and Celery services- Root access

- Restarts only backend, celery_worker, and celery_beat- DNS configured (epsm.chalmers.se → VM IP)

- Faster than full stop/start- Ports 80 and 443 accessible

- Useful during development

---

```bash

./scripts/restart.sh### 2. `deploy-production.sh` - Deployment Script

```

**Purpose:** Deploys or updates the EPSM application.

**`test.sh`** - Run tests

- Runs Django tests**What it does:**

- Can specify specific tests or apps- ✅ Checks environment (Docker, .env, SSL)

- ✅ Stops running services

```bash- ✅ Pulls latest code from GitHub

./scripts/test.sh- ✅ Pulls latest Docker images

```- ✅ Starts all services

- ✅ Runs database migrations

---- ✅ Collects static files

- ✅ Generates SAML metadata

### 🟢 Production Scripts

**Usage:**

**`deploy-production.sh`** - ⭐ **SINGLE PRODUCTION DEPLOYMENT SCRIPT**```bash

- Uses `docker-compose.production.yml`# Run from any directory (will cd to /opt/epsm)

- Uses `.env` as single source of truthbash /opt/epsm/scripts/deploy-production.sh

- Always builds fresh (no cache)```

- Includes health checks and rollback support

**Requirements:**

```bash- `install-production.sh` must have been run first

# Full deployment with backup and migrations- `.env` file configured

bash scripts/deploy-production.sh- SSL certificates in place



# Quick restart (no rebuild)---

bash scripts/deploy-production.sh --quick

## Quick Start for New VM

# Skip migrations

bash scripts/deploy-production.sh --skip-migrations### Step 1: Initial Setup (First Time Only)



# Skip backup```bash

bash scripts/deploy-production.sh --skip-backup# SSH into the VM

ssh your-cid@epsm.ita.chalmers.se

# Show help

bash scripts/deploy-production.sh --help# Clone the repository (if not already done)

```cd /opt

sudo git clone https://github.com/snjsomnath/epsm.git

**Options:**

- `--quick` - Quick restart without rebuild# Run the installation script

- `--skip-migrations` - Skip database migrationscd epsm

- `--skip-backup` - Skip pre-deployment backupsudo bash scripts/install-production.sh

- `--help` - Show usage information```



---This will:

1. Install all dependencies

### 🗂️ Database Scripts2. Obtain SSL certificates

3. Create configuration files

**`backup.sh`** - Create database backup

- Backs up PostgreSQL databases### Step 2: Customize Configuration

- Creates timestamped backup files

- Includes main DB, materials DB, and results DB```bash

# Edit environment variables if needed

```bashsudo nano /opt/epsm/.env

./scripts/backup.sh```

```

### Step 3: Deploy the Application

**`restore.sh`** - Restore from database backup

- Restores PostgreSQL databases from backup file```bash

- Prompts for confirmation before restoring# Run the deployment script

cd /opt/epsm

```bashbash scripts/deploy-production.sh

./scripts/restore.sh backup_20251012_120000.sql```

```

### Step 4: Create Django Superuser

**`seed-database.sh`** - Seed database with initial data

- Loads fixtures and sample data```bash

- Used for initial setup or testing# Create an admin user

docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser

```bash```

./scripts/seed-database.sh

```### Step 5: Share SAML Metadata



---Send this URL to Björn for SAML integration:

- **SAML Metadata:** `https://epsm.chalmers.se/saml/metadata/`

### 📦 Versioning Scripts

---

**`release.sh`** - Create a new release

- Bumps version (major, minor, or patch)## Updating the Application

- Updates VERSION file

- Updates package.jsonTo deploy updates after the initial setup:

- Updates CHANGELOG.md

- Creates git tag```bash

- Prepares for GitHub Actions deploymentcd /opt/epsm

bash scripts/deploy-production.sh

```bash```

# Bump patch version (0.0.X)

./scripts/release.sh patchThis will:

1. Pull latest code

# Bump minor version (0.X.0)2. Pull latest Docker images

./scripts/release.sh minor "Add new features"3. Restart services

4. Run migrations

# Bump major version (X.0.0)5. Collect static files

./scripts/release.sh major "Breaking changes"

```---



**`undo-release.sh`** - Undo last release## Troubleshooting

- Removes last git tag

- Reverts last commit### Check Service Status

- Use when you need to redo a release```bash

cd /opt/epsm

```bashdocker-compose -f docker-compose.production.yml ps

./scripts/undo-release.sh```

```

### View Logs

---```bash

# Backend logs

### 🔧 Utility Scriptsdocker-compose -f docker-compose.production.yml logs -f backend



**`status.sh`** - Check service status# Frontend logs

- Shows Docker Compose service statusdocker-compose -f docker-compose.production.yml logs -f frontend

- Displays health of all containers

# All services

```bashdocker-compose -f docker-compose.production.yml logs -f

./scripts/status.sh```

```

### Restart Services

**`check_delete_scenario.py`** - Database utility script```bash

- Python script for specific database operationscd /opt/epsm

- Run with Django environmentdocker-compose -f docker-compose.production.yml restart

```

```bash

docker-compose exec backend python scripts/check_delete_scenario.py### Rebuild Containers

``````bash

cd /opt/epsm

---docker-compose -f docker-compose.production.yml down

docker-compose -f docker-compose.production.yml up -d --build

## 📦 Archived Scripts```



The `archive/` directory contains old scripts that are no longer used but kept for reference:### SSL Certificate Renewal

```bash

- `deploy-prod.sh` - Old production deployment# Renew SSL certificates (auto-renewed by certbot)

- `deploy-production.sh` - Previous production script (referenced old files)sudo certbot renew

- `deploy-production-clean.sh` - Legacy clean deployment

- `deploy.sh` - Old generic deployment# Copy renewed certificates

- `manage-prod.sh` - Old production management menusudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem /opt/epsm/nginx/ssl/

- `install-production.sh` - VM setup script (one-time use, reference only)sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem /opt/epsm/nginx/ssl/

- `pre-build-hook.sh` - Legacy build hook

- `setup-external-images.sh` - Remote image setup (deprecated)# Restart nginx

docker-compose -f docker-compose.production.yml restart nginx

**⚠️ Do not use archived scripts** - They reference old configuration files and may cause issues.```



------



## 🎯 Common Workflows## Application URLs



### Development WorkflowAfter successful deployment:



```bash- **Frontend:** https://epsm.chalmers.se

# Start development environment- **Admin Panel:** https://epsm.chalmers.se/admin/

./scripts/start.sh- **SAML Metadata:** https://epsm.chalmers.se/saml/metadata/

- **Privacy Policy:** https://epsm.chalmers.se/privacy/

# Make changes to code...

---

# Quick restart backend

./scripts/restart.sh## Environment Variables



# View logsKey variables in `.env`:

docker-compose logs -f backend

```bash

# Stop when done# Django

./scripts/stop.shSECRET_KEY=<random-secret-key>

```DEBUG=False

ALLOWED_HOSTS=epsm.chalmers.se

### Production Deployment Workflow

# Database

```bashPOSTGRES_DB=epsm_db

# Deploy to productionPOSTGRES_USER=epsm_user

bash scripts/deploy-production.shPOSTGRES_PASSWORD=<random-password>



# Or quick restart after code change# SAML

bash scripts/deploy-production.sh --quickSAML_ENABLED=True

SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml

# View logsSAML_ENTITY_ID=https://epsm.chalmers.se/saml/metadata/

docker-compose -f docker-compose.production.yml logs -f backendSAML_ACS_URL=https://epsm.chalmers.se/saml/acs/

```

# Check status

docker-compose -f docker-compose.production.yml ps---

```

## Support

### Release Workflow

For issues or questions:

```bash- **Principal Investigator:** Alexander Hollberg (alexander.hollberg@chalmers.se)

# Create patch release- **Developer:** Sanjay Somanath (sanjay.somanath@chalmers.se)

./scripts/release.sh patch "Bug fixes and improvements"- **Chalmers IT:** Björn (SAML/infrastructure support)


# Review changes
git log -1 --stat

# Push to GitHub (triggers CI/CD)
git push origin main
git push origin v0.2.3

# Deploy to production
bash scripts/deploy-production.sh
```

### Backup Workflow

```bash
# Create backup before major changes
./scripts/backup.sh

# Make changes...

# If something goes wrong, restore
./scripts/restore.sh backup_YYYYMMDD_HHMMSS.sql
```

---

## 🛠️ Troubleshooting

### Script Won't Run
```bash
# Make sure script is executable
chmod +x scripts/script-name.sh
```

### Docker Permission Issues
```bash
# Add your user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and log back in

# Or run with sudo (not recommended for production)
sudo ./scripts/start.sh
```

### Database Connection Issues
```bash
# Check if database is running
docker-compose ps database

# View database logs
docker-compose logs database

# Restart database
docker-compose restart database
```

### Build Cache Issues
```bash
# Force clean rebuild (development)
docker-compose build --no-cache
docker-compose up -d --force-recreate

# Production deployment already uses --no-cache
bash scripts/deploy-production.sh
```

---

## 📝 Creating New Scripts

When creating new scripts, follow these guidelines:

1. **Add shebang**: `#!/bin/bash`
2. **Use `set -e`**: Exit on errors
3. **Add help text**: Comment block at the top
4. **Use colors**: For better readability
5. **Make executable**: `chmod +x script-name.sh`
6. **Update this README**: Document the new script

Example template:
```bash
#!/bin/bash
# ============================================================================
# Script Name - Brief description
# ============================================================================
# Usage: bash scripts/script-name.sh [options]
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}ℹ️  Script running...${NC}"
echo -e "${GREEN}✅ Done!${NC}"
```

---

## 🔗 Related Documentation

- **PRODUCTION_QUICK_START.md** - Quick reference for production deployment
- **MIGRATION_PRODUCTION_CONFIG.md** - Migration from old to new config
- **SCRIPTS_CLEANUP_PLAN.md** - Script consolidation plan
- **README.md** - Main project documentation

---

## 📊 Script Statistics

**Active Scripts:** 11
- Development: 4 scripts
- Production: 1 script
- Database: 3 scripts
- Versioning: 2 scripts
- Utility: 2 scripts

**Archived Scripts:** 9 (in `archive/` directory)

---

## 🚀 Quick Reference Card

| Task | Command |
|------|---------|
| Start dev environment | `./scripts/start.sh` |
| Stop dev environment | `./scripts/stop.sh` |
| Restart backend | `./scripts/restart.sh` |
| Deploy production | `bash scripts/deploy-production.sh` |
| Quick prod restart | `bash scripts/deploy-production.sh --quick` |
| Create release | `./scripts/release.sh patch` |
| Backup database | `./scripts/backup.sh` |
| Restore database | `./scripts/restore.sh backup_file.sql` |
| Check status | `./scripts/status.sh` |
| Run tests | `./scripts/test.sh` |

---

**Last Updated:** October 12, 2025  
**Maintained By:** EPSM Development Team  
**Principal Investigator:** Alexander Hollberg (alexander.hollberg@chalmers.se)  
**Developer:** Sanjay Somanath (sanjay.somanath@chalmers.se)
