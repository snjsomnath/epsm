# Scripts Cleanup Summary - October 12, 2025

## What Was Done

Successfully streamlined the scripts directory by consolidating production deployment scripts and improving organization.

## Changes Made

### 1. ✅ Archived Redundant Scripts (8 scripts → archive/)

Moved to `scripts/archive/`:
- `deploy-prod.sh` - Referenced old `docker-compose.prod.yml`
- `deploy-production.sh` - Old version referencing archived files
- `deploy-production-clean.sh` - Legacy clean deployment
- `deploy.sh` - Old generic deployment
- `manage-prod.sh` - Interactive production menu
- `install-production.sh` - One-time VM setup (kept for reference)
- `pre-build-hook.sh` - Unused build hook
- `setup-external-images.sh` - Remote image setup (deprecated)

**Why archived:**
- Referenced `docker-compose.prod.yml` (now archived)
- Referenced `.env.production` (now archived)
- Pulled from remote registries (we want local builds)
- Overlapping functionality causing confusion

### 2. ✨ Created New Streamlined Production Script

**`deploy-production.sh`** - Single, focused production deployment script

**Features:**
- Uses `docker-compose.production.yml` (new standard)
- Uses `.env` as single source of truth
- Always builds fresh with `--no-cache`
- No remote registry pulls
- Built-in health checks
- Multiple deployment modes

**Usage:**
```bash
# Full deployment
bash scripts/deploy-production.sh

# Quick restart (no rebuild)
bash scripts/deploy-production.sh --quick

# Skip migrations
bash scripts/deploy-production.sh --skip-migrations

# Skip backup
bash scripts/deploy-production.sh --skip-backup
```

### 3. 📚 Updated Documentation

**Updated `scripts/README.md`** with:
- Complete script inventory
- Usage examples for each script
- Common workflows
- Troubleshooting guide
- Quick reference card
- Script organization by category

**Also archived:**
- `README.old.md` - Previous documentation (moved to archive/)

## Current Script Structure

```
/opt/epsm/scripts/
├── Development Scripts (4)
│   ├── start.sh              ✅ Start dev environment
│   ├── stop.sh               ✅ Stop dev environment
│   ├── restart.sh            ✅ Quick restart
│   └── test.sh               ✅ Run tests
│
├── Production Scripts (1)
│   └── deploy-production.sh  ✨ NEW - Streamlined deployment
│
├── Database Scripts (3)
│   ├── backup.sh             ✅ Backup database
│   ├── restore.sh            ✅ Restore database
│   └── seed-database.sh      ✅ Seed initial data
│
├── Versioning Scripts (2)
│   ├── release.sh            ✅ Create release
│   └── undo-release.sh       ✅ Undo release
│
├── Utility Scripts (2)
│   ├── status.sh             ✅ Check status
│   └── check_delete_scenario.py  ✅ Database utility
│
├── Migration Scripts (2)
│   ├── migrate_to_celery.sh ⚠️  One-time migration
│   └── migrate-to-streamlined.sh ⚠️  One-time migration
│
└── archive/                   📦 Old scripts (9)
```

## Active Scripts Summary

### Total Active: 14 scripts
- **Development:** 4 scripts
- **Production:** 1 script (simplified from 7!)
- **Database:** 3 scripts
- **Versioning:** 2 scripts  
- **Utility:** 2 scripts
- **Migration:** 2 scripts (can be archived after use)

### Archived: 9 scripts
All redundant production scripts safely archived for reference.

## Benefits

### Before
- **7 production scripts** with overlapping functionality
- Confusion about which script to use
- Multiple environment files (`.env`, `.env.production`)
- Remote cache issues
- Unpredictable builds

### After
- **1 production script** with clear purpose
- Single source of truth (`.env`)
- Always fresh builds (no cache)
- Predictable, reproducible deployments
- Clear documentation

## Key Improvements

✅ **Reduced complexity** - 7 → 1 production script  
✅ **Single source of truth** - One `.env`, one `docker-compose.production.yml`  
✅ **No cache confusion** - Always builds fresh  
✅ **Better documentation** - Complete README with examples  
✅ **Safer workflow** - Old scripts archived, not deleted  
✅ **Easier onboarding** - New developers know which scripts to use

## Migration Scripts

Two migration scripts remain active but can be archived after confirming migrations are complete:
- `migrate_to_celery.sh` - Celery migration (older)
- `migrate-to-streamlined.sh` - Recent SAML/Celery migration

**Recommendation:** Archive these after confirming they're no longer needed.

## Testing

The new deployment script includes:
- ✅ Pre-flight checks
- ✅ Environment validation
- ✅ Service health checks
- ✅ Database migration support
- ✅ Backup integration
- ✅ Comprehensive error handling

## Quick Reference

### Development
```bash
./scripts/start.sh              # Start dev
./scripts/restart.sh            # Quick restart
./scripts/stop.sh               # Stop dev
```

### Production
```bash
bash scripts/deploy-production.sh           # Full deploy
bash scripts/deploy-production.sh --quick   # Quick restart
```

### Database
```bash
./scripts/backup.sh                         # Backup
./scripts/restore.sh backup.sql             # Restore
./scripts/seed-database.sh                  # Seed data
```

### Versioning
```bash
./scripts/release.sh patch                  # Create release
./scripts/undo-release.sh                   # Undo release
```

## Files Changed

### Created
- `scripts/deploy-production.sh` - New streamlined deployment script
- `scripts/README.md` - Updated comprehensive documentation
- `SCRIPTS_CLEANUP_PLAN.md` - Planning document

### Archived
- `scripts/archive/deploy-prod.sh`
- `scripts/archive/deploy-production.old.sh` (renamed)
- `scripts/archive/deploy-production-clean.sh`
- `scripts/archive/deploy.sh`
- `scripts/archive/manage-prod.sh`
- `scripts/archive/install-production.sh`
- `scripts/archive/pre-build-hook.sh`
- `scripts/archive/setup-external-images.sh`
- `scripts/archive/README.old.md`

## Related Changes

This scripts cleanup is part of a larger production configuration streamlining:

1. ✅ **Environment consolidation** - Single `.env` file
2. ✅ **Docker Compose streamlining** - One `docker-compose.production.yml`
3. ✅ **Scripts cleanup** - This document
4. ✅ **Documentation updates** - `PRODUCTION_QUICK_START.md`, `MIGRATION_PRODUCTION_CONFIG.md`

## Next Steps

1. **Test the new deployment:**
   ```bash
   bash scripts/deploy-production.sh --help
   # Then do actual deployment
   ```

2. **Archive migration scripts (after confirming done):**
   ```bash
   mv scripts/migrate_to_celery.sh scripts/archive/
   mv scripts/migrate-to-streamlined.sh scripts/archive/
   ```

3. **Update any CI/CD pipelines** to use new script names

4. **Train team** on new simplified workflow

## Rollback Plan

If needed, archived scripts can be restored:
```bash
# Restore old script
cp scripts/archive/deploy-production-clean.sh scripts/

# Restore old env files
cp archive/.env.production.legacy.20251012 .env.production
```

However, this is **not recommended** as it reintroduces the original problems.

---

**Cleanup Date:** October 12, 2025  
**Status:** ✅ Complete  
**Impact:** High - Significant simplification of deployment workflow  
**Risk:** Low - All old scripts safely archived
