# Production Configuration Migration - October 12, 2025

## Summary
Successfully streamlined production configuration by consolidating environment variables and Docker Compose files.

## What Was Changed

### 1. Environment Files Migration
**Archived (moved to `archive/` directory):**
- `.env` → `archive/.env.legacy.20251012`
- `.env.production` → `archive/.env.production.legacy.20251012`

**New Defaults:**
- `.env` - Single source of truth for all environment variables
- `.env.production.new` - Kept as backup/reference

### 2. Docker Compose Files Migration
**Archived (moved to `archive/` directory):**
- `docker-compose.prod.yml` → `archive/docker-compose.prod.legacy.20251012.yml`
- `docker-compose.production.yml` → `archive/docker-compose.production.legacy.20251012.yml`
- `docker-compose.production.yml.backup` → `archive/docker-compose.production.yml.backup`

**New Default:**
- `docker-compose.production.yml` - Streamlined production configuration

## Key Improvements

### 1. Single Source of Truth
- **One `.env` file** contains all environment variables
- No more confusion between `.env` and `.env.production`
- Clear separation: `.env` (active) vs `.env.*.example` (templates)

### 2. No Remote Cache Issues
- `no_cache: true` in Docker Compose ensures fresh builds
- `--no-cache --pull` flags in build commands
- No more stale builds from remote registries

### 3. No Local Fallback
- Removed remote image pulling logic
- Always builds from source
- Consistent builds across environments

### 4. Simplified Workflow
```bash
# Build and deploy (single command)
docker-compose -f docker-compose.production.yml up -d --build --force-recreate --no-cache

# Stop services
docker-compose -f docker-compose.production.yml down

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## File Structure (After Migration)

```
/opt/epsm/
├── .env                              # ✅ ACTIVE - Single source of truth
├── .env.production.new               # Backup/reference
├── .env.example                      # Template for development
├── .env.production.example           # Template for production
├── docker-compose.production.yml     # ✅ ACTIVE - Production config
├── docker-compose.yml                # Development config
├── archive/
│   ├── .env.legacy.20251012
│   ├── .env.production.legacy.20251012
│   ├── docker-compose.prod.legacy.20251012.yml
│   ├── docker-compose.production.legacy.20251012.yml
│   └── docker-compose.production.yml.backup
```

## Migration Checklist

- [x] Archive legacy `.env` files
- [x] Archive legacy `docker-compose` files
- [x] Create new `.env` from `.env.production.new`
- [x] Promote `docker-compose.production.new.yml` to default
- [ ] Update GitHub Actions workflows (if needed)
- [ ] Update deployment documentation
- [ ] Test production build
- [ ] Test production deployment

## Next Steps

### 1. Test the New Configuration
```bash
# Clean slate
docker-compose -f docker-compose.production.yml down -v

# Build and start fresh
docker-compose -f docker-compose.production.yml up -d --build --force-recreate --no-cache

# Verify all services
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs backend frontend nginx
```

### 2. Update CI/CD (if applicable)
- Update GitHub Actions to use `docker-compose.production.yml`
- Ensure `.env` is properly loaded from secrets
- Remove any old file references

### 3. Clean Up (after verification)
```bash
# Optional: Remove .env.production.new after confirming everything works
# rm .env.production.new

# Optional: Archive old versioned docker-compose files
# mv docker-compose.versioned.yml archive/
```

## Environment Variables Reference

All variables are now in `.env`:
- **Django**: SECRET_KEY, DEBUG, ALLOWED_HOSTS
- **Databases**: Main DB, Materials DB, Results DB
- **Redis**: REDIS_URL, CELERY_*
- **SAML**: SAML_IDP_METADATA_URL, SAML_ENTITY_ID
- **Frontend**: VITE_API_BASE_URL, VITE_WS_URL
- **Docker**: DOCKER_GID, VERSION

## Rollback Plan (if needed)

If you need to revert to the old configuration:
```bash
# Restore old files
cp archive/.env.legacy.20251012 .env
cp archive/docker-compose.production.legacy.20251012.yml docker-compose.production.yml

# Rebuild
docker-compose -f docker-compose.production.yml up -d --build --force-recreate
```

## Benefits

✅ **Single source of truth** - One `.env` file to manage  
✅ **No cache confusion** - Always builds from source  
✅ **No remote registry issues** - Eliminated remote pulls  
✅ **Easier testing** - Simple, predictable builds  
✅ **Better version control** - Clear file structure  
✅ **Faster debugging** - Less places to check for config issues

---

**Migration Date:** October 12, 2025  
**Migrated By:** System Administrator  
**Status:** ✅ Complete (pending testing)
