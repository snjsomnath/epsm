# Complete Baseline Simulation Fix - October 2025

**Date**: October 12, 2025  
**Status**: ✅ FULLY RESOLVED

## Overview

Fixed a series of cascading issues preventing baseline simulations from running successfully:

1. ✅ Database tables missing
2. ✅ Celery workers not migrated
3. ✅ Docker volume mounting broken

## Quick Summary

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Database** | `relation "simulation_results" does not exist` | Added multi-database migrations to `docker-entrypoint.sh` |
| **Celery** | Workers using unmigrated database | Restart workers after migration |
| **Docker Mounts** | `input_file: File does not exist` | Set `HOST_MEDIA_ROOT` environment variable |

## Console Warnings (Non-Critical)

These warnings are **expected and harmless**:
```
Real-time subscriptions not implemented for browser-compatible client
```

- Caused by placeholder functions in frontend
- No functional impact
- Can be suppressed by changing `console.warn` to `console.debug` in `database-browser.ts`

## All Changes Made

### 1. Backend Docker Entrypoint
**File**: `/opt/epsm/backend/docker-entrypoint.sh`

**Added**:
```bash
echo "  - Migrating materials_db database..."
python manage.py migrate database --database=materials_db --noinput --fake-initial

echo "  - Migrating results_db database..."
python manage.py migrate simulation 0003 --database=results_db --fake --noinput || true
python manage.py migrate simulation --database=results_db --noinput
```

### 2. Deployment Scripts
**Files**: 
- `/opt/epsm/scripts/deploy-localhost-fix.sh`
- `/opt/epsm/scripts/start.sh`

**Added**: Multi-database migration logic to both scripts

### 3. Health Check Script
**File**: `/opt/epsm/scripts/check-database-health.sh` (NEW)

**Purpose**: Verify all three databases are properly migrated and accessible

### 4. Docker Compose Production
**File**: `/opt/epsm/docker-compose.production.yml`

**Added** to backend service:
```yaml
environment:
  - HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

**Added** to celery_worker service:
```yaml
environment:
  - HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

### 5. Documentation
**New files**:
- `/opt/epsm/docs/DATABASE_MIGRATION_GUIDE.md`
- `/opt/epsm/change summary/DATABASE_MIGRATION_FIX_OCT2024.md`
- `/opt/epsm/change summary/SIMULATION_EXECUTION_FIX_OCT2024.md`
- `/opt/epsm/change summary/COMPLETE_FIX_SUMMARY_OCT2024.md` (this file)

## Testing Checklist

### ✅ Database Health
```bash
./scripts/check-database-health.sh
```
Expected: All three databases show as healthy with correct tables.

### ✅ Environment Variables
```bash
docker-compose -f docker-compose.production.yml exec backend env | grep HOST_MEDIA_ROOT
```
Expected: `HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data`

### ✅ Simulation Execution
1. Upload valid IDF file
2. Upload EPW weather file
3. Run baseline simulation
4. Progress bar reaches 100%
5. Results show actual energy data (not errors)

### ✅ Output Files Generated
```bash
docker-compose exec backend ls -la /app/media/simulation_results/<latest-sim-id>/<idf-name>/
```
Expected files:
- `output.htm` - EnergyPlus HTML report
- `output.html` - Browser-accessible copy
- `output.err` - Error log
- `output.csv` - Timeseries data
- `run_output.log` - Execution log

## What Was Wrong

### Problem 1: Multi-Database Architecture Not Deployed

EPSM uses THREE databases:
- `default` (epsm_db) - Django core
- `materials_db` (epsm_materials) - Materials/constructions
- `results_db` (epsm_results) - Simulation results

**But only `default` was being migrated during deployment!**

This caused the `simulation_results` table to never be created.

### Problem 2: Celery Workers Not Restarted

Even after manually running the migrations, Celery workers were still using the old database connection state.

**Workers needed to be restarted to pick up the new tables.**

### Problem 3: Docker-in-Docker Volume Mounting

The backend runs **inside a Docker container** but spawns **EnergyPlus in another container** by calling the **host Docker daemon**.

When backend said "mount `/app/media/...`", the host Docker daemon didn't know that path (it only exists inside the backend container).

**Solution**: Tell the backend the "host path" via `HOST_MEDIA_ROOT` so it can translate container paths to host paths.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Docker Compose Environment                               │
│                                                          │
│  ┌────────────────────┐      ┌────────────────────┐    │
│  │ Backend Container  │      │ Database Container │    │
│  │                    │──────│                    │    │
│  │ - Django           │      │ - PostgreSQL       │    │
│  │ - REST API         │      │   * epsm_db        │    │
│  │ - Simulation Mgmt  │      │   * epsm_materials │    │
│  └────────┬───────────┘      │   * epsm_results   │    │
│           │                  └────────────────────┘    │
│           │ Calls Docker CLI                           │
│           ↓                                             │
│  ┌────────────────────┐                                │
│  │ Host Docker Daemon │                                │
│  └────────┬───────────┘                                │
│           │ Spawns                                      │
│           ↓                                             │
│  ┌────────────────────┐                                │
│  │ EnergyPlus         │                                │
│  │ Container          │                                │
│  │ (nrel/energyplus)  │                                │
│  └────────────────────┘                                │
│                                                          │
│  Volume: media_data_prod (/var/lib/docker/volumes/...) │
└─────────────────────────────────────────────────────────┘
```

## How to Deploy Fresh

### Development
```bash
./scripts/start.sh
```
- Automatically migrates all databases
- Sets up results DB
- Creates superuser

### Production
```bash
# 1. Ensure .env.production has all variables
# 2. Run deployment
./scripts/deploy-localhost-fix.sh

# 3. Verify
./scripts/check-database-health.sh
```

## Emergency Fixes

### If simulation fails with "relation does not exist"
```bash
# Migrate results_db manually
docker-compose exec backend python manage.py migrate simulation 0003 --database=results_db --fake
docker-compose exec backend python manage.py migrate simulation --database=results_db

# Restart workers
docker-compose restart celery_worker celery_beat
```

### If simulation fails with "File does not exist"
```bash
# Check HOST_MEDIA_ROOT
docker-compose exec backend env | grep HOST_MEDIA_ROOT

# If missing, add to docker-compose.yml and restart
docker-compose up -d backend celery_worker
```

### If database connection fails
```bash
# Check all databases are accessible
docker-compose exec database psql -U epsm_user -d epsm_db -c "SELECT 1"
docker-compose exec database psql -U epsm_user -d epsm_materials -c "SELECT 1"
docker-compose exec database psql -U epsm_results_user -d epsm_results -c "SELECT 1"
```

## Known Limitations

### Volume Path Assumptions

The `HOST_MEDIA_ROOT` is currently hardcoded to:
```
/var/lib/docker/volumes/epsm_media_data_prod/_data
```

This is the **default Docker volume location** on Linux. On different systems:
- **macOS with Docker Desktop**: May be different
- **Windows WSL2**: May be under `/mnt/wsl/...`
- **Kubernetes**: Completely different (PVC paths)

**Solution**: Make `HOST_MEDIA_ROOT` configurable via `.env.production`:
```bash
HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

### Cross-Database Foreign Keys

Django doesn't support foreign keys across databases. The current design:
- `Simulation` model is in `default` DB
- `SimulationResult` model is in `results_db`
- They reference each other via UUID, not ForeignKey

This means:
- ✅ Can query results for a simulation
- ❌ Cannot use `simulation.results.all()` (no ForeignKey)
- ❌ No database-level referential integrity

**Workaround**: Application-level integrity checks.

## Future Improvements

### 1. Auto-Detect Volume Path
Instead of hardcoding, detect the volume path:
```python
import subprocess
result = subprocess.run(['docker', 'volume', 'inspect', 'epsm_media_data_prod', '--format', '{{.Mountpoint}}'], capture_output=True)
volume_path = result.stdout.decode().strip()
```

### 2. Health Check Endpoint
Add `/api/health/simulation/` endpoint that:
- ✅ Checks all databases are accessible
- ✅ Verifies tables exist
- ✅ Tests Docker access
- ✅ Validates volume mounts

### 3. Deployment Validation
Add to CI/CD pipeline:
```bash
# After deployment, verify:
- Database migrations applied
- HOST_MEDIA_ROOT set correctly
- Docker daemon accessible
- Test simulation runs successfully
```

### 4. Monitoring Alerts
Alert if:
- Simulation fails with database errors
- Simulation fails with Docker mount errors
- Celery workers are down
- Database connections are lost

## Rollback Plan

If issues occur after deployment:

### Database Rollback
```bash
# Migrations are idempotent, but if needed:
docker-compose exec backend python manage.py migrate simulation 0003 --database=results_db
```

### Environment Rollback
```bash
# Remove HOST_MEDIA_ROOT if causing issues
docker-compose exec backend unset HOST_MEDIA_ROOT
# Then restart
docker-compose restart backend celery_worker
```

### Complete Rollback
```bash
# Stop all services
docker-compose down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and restart
docker-compose up -d --build
```

## Success Metrics

✅ **Database**: All 3 databases show "healthy" in health check  
✅ **Environment**: `HOST_MEDIA_ROOT` is set in all simulation services  
✅ **Execution**: EnergyPlus containers can access input files  
✅ **Results**: Simulations generate `output.htm` files  
✅ **Persistence**: Results are saved to `simulation_results` table  
✅ **Display**: Frontend shows actual energy data, not errors  

## Related Documentation

- [DATABASE_MIGRATION_GUIDE.md](../docs/DATABASE_MIGRATION_GUIDE.md) - Multi-database setup
- [DATABASE_MIGRATION_FIX_OCT2024.md](./DATABASE_MIGRATION_FIX_OCT2024.md) - Database fix details
- [SIMULATION_EXECUTION_FIX_OCT2024.md](./SIMULATION_EXECUTION_FIX_OCT2024.md) - Docker mount fix details

## Contact

For questions or issues:
1. Check the health check: `./scripts/check-database-health.sh`
2. Review logs: `docker-compose logs backend celery_worker`
3. Verify environment: `docker-compose exec backend env | grep -E "HOST_MEDIA_ROOT|DB_"`

---

**All issues are now resolved. Baseline simulations should work correctly!** 🎉
