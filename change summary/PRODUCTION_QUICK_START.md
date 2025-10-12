# Production Quick Start Guide

## Single Command Deployment

### Fresh Build & Deploy
```bash
cd /opt/epsm
docker-compose -f docker-compose.production.yml up -d --build --force-recreate --no-cache
```

### Stop Services
```bash
docker-compose -f docker-compose.production.yml down
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
```

### Check Status
```bash
docker-compose -f docker-compose.production.yml ps
```

## Configuration Files

### Active Files
- **`.env`** - Single source of truth for all environment variables
- **`docker-compose.production.yml`** - Production Docker Compose configuration

### Backup/Template Files
- `.env.production.new` - Backup of environment variables
- `.env.example` - Template for development
- `.env.production.example` - Template for production

## Key Features

✅ **No cache** - Always builds fresh (`no_cache: true`)  
✅ **No remote pulls** - Builds from local source only  
✅ **Single env file** - All variables in `.env`  
✅ **Predictable builds** - No version confusion

## Environment Variables

All variables are defined in `.env`:
- Django settings (SECRET_KEY, DEBUG, ALLOWED_HOSTS)
- Database credentials (main, materials, results)
- Redis & Celery configuration
- SAML authentication
- Frontend URLs
- Docker configuration

## Troubleshooting

### Problem: Environment variable not loading
```bash
# Check .env file exists
cat .env | grep VARIABLE_NAME

# Recreate containers to reload env
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

### Problem: Build using old code
```bash
# Force clean rebuild
docker-compose -f docker-compose.production.yml build --no-cache --pull
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

### Problem: Database connection issues
```bash
# Check database health
docker-compose -f docker-compose.production.yml ps database

# View database logs
docker-compose -f docker-compose.production.yml logs database
```

## Clean Slate Rebuild

```bash
# Stop and remove everything
docker-compose -f docker-compose.production.yml down -v

# Remove old images (optional)
docker system prune -a

# Fresh build and start
docker-compose -f docker-compose.production.yml up -d --build --force-recreate --no-cache
```

---

Last updated: October 12, 2025
