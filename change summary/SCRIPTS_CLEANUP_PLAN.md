# Scripts Cleanup Plan - October 12, 2025

## Current Situation

You have **21 scripts** in `/opt/epsm/scripts/`, many with overlapping functionality and confusion around production deployment.

## Scripts Analysis

### ✅ **KEEP** - Active Development Scripts (4)
These are used regularly for development:
- **`start.sh`** - Start development environment
- **`stop.sh`** - Stop development environment  
- **`restart.sh`** - Quick restart of backend/Celery
- **`release.sh`** - Version bump and release tagging

### ✅ **KEEP** - Utility Scripts (5)
These are useful and non-conflicting:
- **`backup.sh`** - Database backup
- **`restore.sh`** - Database restore
- **`seed-database.sh`** - Seed initial data
- **`status.sh`** - Check service status
- **`test.sh`** - Run tests

### ⚠️ **KEEP BUT UPDATE** - Migration Scripts (2)
One-time migrations that should be archived after use:
- **`migrate-to-streamlined.sh`** - SAML/Celery migration (can archive after use)
- **`migrate_to_celery.sh`** - Old Celery migration (can archive)

### ❌ **ARCHIVE** - Redundant Production Scripts (7)
These are all doing similar things and causing confusion:

1. **`deploy-prod.sh`** ❌
   - References `docker-compose.prod.yml` (archived)
   - References `.env.production` (archived)
   - REDUNDANT

2. **`deploy-production.sh`** ❌
   - References old `docker-compose.prod.yml`
   - Pulls from remote registry (we don't want this)
   - REDUNDANT

3. **`deploy-production-clean.sh`** ❌
   - References `.env.production` (archived)
   - Has lots of features but we simplified the workflow
   - REDUNDANT (though it has good ideas)

4. **`manage-prod.sh`** ❌
   - References `docker-compose.prod.yml` (archived)
   - Interactive menu for production management
   - REDUNDANT (can use docker-compose directly)

5. **`install-production.sh`** ❌
   - Full VM setup script
   - Only needed once during initial setup
   - SHOULD BE ARCHIVED (not deleted, as reference)

6. **`pre-build-hook.sh`** ❌
   - Not used in current workflow
   - REDUNDANT

7. **`setup-external-images.sh`** ❌
   - Sets up remote image pulling (we explicitly don't want this)
   - REDUNDANT

### ⚠️ **REVIEW** - Special Cases (3)
- **`deploy.sh`** - Need to check what this does
- **`undo-release.sh`** - Probably useful for rollback
- **`check_delete_scenario.py`** - Python script, need to check purpose

## Recommended Structure

```
/opt/epsm/scripts/
├── README.md                          # Documentation of available scripts
│
├── Development Scripts/
│   ├── start.sh                       # ✅ KEEP
│   ├── stop.sh                        # ✅ KEEP
│   ├── restart.sh                     # ✅ KEEP
│   └── test.sh                        # ✅ KEEP
│
├── Production Scripts/
│   └── deploy-production.sh           # ✨ CREATE NEW (simplified)
│
├── Versioning Scripts/
│   ├── release.sh                     # ✅ KEEP
│   └── undo-release.sh                # ✅ KEEP (if exists)
│
├── Database Scripts/
│   ├── backup.sh                      # ✅ KEEP
│   ├── restore.sh                     # ✅ KEEP
│   └── seed-database.sh               # ✅ KEEP
│
├── Utility Scripts/
│   ├── status.sh                      # ✅ KEEP
│   └── check_delete_scenario.py       # ⚠️ REVIEW
│
└── archive/                           # 📦 ARCHIVED
    ├── deploy-prod.sh
    ├── deploy-production.old.sh
    ├── deploy-production-clean.sh
    ├── manage-prod.sh
    ├── install-production.sh
    ├── pre-build-hook.sh
    ├── setup-external-images.sh
    ├── migrate-to-streamlined.sh      # After migration done
    └── migrate_to_celery.sh           # After migration done
```

## New Simplified Production Script

Create **ONE** production deployment script that:
- Uses `docker-compose.production.yml`
- Uses `.env` (single source of truth)
- Always builds fresh (no cache)
- Simple, predictable behavior

## Action Plan

### Phase 1: Archive Redundant Scripts
```bash
cd /opt/epsm
mkdir -p scripts/archive

# Archive redundant production scripts
mv scripts/deploy-prod.sh scripts/archive/
mv scripts/deploy-production.sh scripts/archive/deploy-production.old.sh
mv scripts/deploy-production-clean.sh scripts/archive/
mv scripts/manage-prod.sh scripts/archive/
mv scripts/install-production.sh scripts/archive/
mv scripts/pre-build-hook.sh scripts/archive/
mv scripts/setup-external-images.sh scripts/archive/
```

### Phase 2: Create New Production Script
Create a simple, focused `deploy-production.sh`:
```bash
#!/bin/bash
# Simple production deployment
set -e
cd /opt/epsm
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build --force-recreate --no-cache
docker-compose -f docker-compose.production.yml exec backend python manage.py migrate --noinput
docker-compose -f docker-compose.production.yml exec backend python manage.py collectstatic --noinput
docker-compose -f docker-compose.production.yml ps
```

### Phase 3: Update Documentation
- Update `scripts/README.md` with current scripts
- Document when to use each script
- Add troubleshooting tips

### Phase 4: Archive Migration Scripts (after confirming migrations are done)
```bash
# Only after confirming you don't need these anymore
mv scripts/migrate-to-streamlined.sh scripts/archive/
mv scripts/migrate_to_celery.sh scripts/archive/
```

## Benefits

✅ **Single production script** - No confusion about which to use  
✅ **Clear naming** - Development vs Production scripts  
✅ **No cache issues** - Always builds fresh  
✅ **Easier maintenance** - Less code to maintain  
✅ **Better onboarding** - New developers know which scripts to use  
✅ **Safe history** - Old scripts archived, not deleted

## Estimated Time Savings

- **Before**: 15-20 minutes figuring out which script to use, debugging cache issues
- **After**: 2 minutes to deploy with confidence

---

**Next Steps:**
1. Review special scripts (`deploy.sh`, `undo-release.sh`, `check_delete_scenario.py`)
2. Execute Phase 1 (archive redundant scripts)
3. Execute Phase 2 (create new simple script)
4. Execute Phase 3 (update docs)
5. Test new workflow

**Status:** ⏳ Pending approval
