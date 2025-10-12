# Migration Order Fix - October 12, 2025

## Problem

The migration order in `docker-entrypoint.sh` was broken, causing the `simulation_results` table existence errors on deployment. The error manifested as:

```
GET https://epsm.chalmers.se/api/simulation/.../results/ 400 (Bad Request)
```

## Root Cause

**Migration 0004** (`0004_create_results_tables.py`) was trying to **recreate** the `SimulationResult`, `SimulationZone`, and `SimulationEnergyUse` models that were already created in **migration 0001**.

### Migration Chain Analysis

1. **0001_initial.py**: Created `SimulationResult` with a ForeignKey field `simulation` pointing to `Simulation`
2. **0002_simulation_progress.py**: Added progress field to `Simulation`
3. **0003_remove_simulationresult_simulation__simulat_55e4dc_idx_and_more.py**: Removed the FK field and replaced it with `simulation_id` UUID field (for cross-database compatibility)
4. **0004_create_results_tables.py**: ❌ **PROBLEM** - Tried to CreateModel `SimulationResult` again (duplicate!)
5. **0005_add_user_and_hourly_timeseries.py**: Added `user_id` field and `SimulationHourlyTimeseries` model
6. **0007_add_gwp_cost_to_simulation_result.py**: Added GWP and cost fields
7. **0008_add_gwp_cost_to_simulation_result.py**: (duplicate of 0007)

The entrypoint was trying to fake migrations individually, but this approach was fragile and kept failing because:
- Migration 0004 tried to create tables that already existed
- The state was inconsistent between default DB and results_db

## Solution

### 1. Fixed Migration 0004

Converted `0004_create_results_tables.py` to a **no-op state sync migration**:

```python
operations = [
    # No operations needed - state is already correct from 0001-0003
    # Tables are created on results_db by faking 0001-0003 first in entrypoint
]
```

This migration now just maintains Django's migration state without trying to recreate tables.

### 2. Fixed Entrypoint Migration Logic

Updated `docker-entrypoint.sh` to apply migrations in the correct order:

**Step 1**: Apply migrations 0001-0003 to results_db (creates table structure)
- Try normal migration first
- Fall back to `--fake` if tables already exist

**Step 2**: Apply all remaining migrations (0004 onwards) normally

This ensures:
- Tables are created from the original 0001 migration
- Cross-database FK changes from 0003 are applied
- No duplicate table creation attempts
- Clean migration state

## Files Changed

1. `/opt/epsm/backend/simulation/migrations/0004_create_results_tables.py`
   - Removed all CreateModel operations
   - Added documentation explaining it's a no-op state sync

2. `/opt/epsm/backend/docker-entrypoint.sh`
   - Rewrote results_db migration logic
   - Apply 0001-0003 first (with fallback to fake)
   - Then apply remaining migrations normally

## Testing

To test the fix:

```bash
# Rebuild and restart the backend
cd /opt/epsm
docker-compose down
docker-compose up --build backend

# Check logs for successful migration
docker-compose logs backend | grep -A 20 "Running database migrations"
```

Expected output:
```
Running database migrations...
  - Migrating default database...
  - Migrating materials_db database...
  - Migrating results_db database...
    Step 1: Apply base migrations (0001-0003) to create table structure...
    Migration 0001_initial already applied to results_db.
    Migration 0002_simulation_progress already applied to results_db.
    Migration 0003 already applied to results_db.
    Step 2: Apply remaining migrations (0004 onwards)...
Operations to perform:
  Apply all migrations: simulation
Running migrations:
  No migrations to apply.
```

## Verification

After deployment, verify:

1. ✅ No migration errors in backend logs
2. ✅ API endpoint `/api/simulation/{id}/results/` returns 200 OK (not 400 Bad Request)
3. ✅ Simulation results are displayed correctly in frontend
4. ✅ No "table already exists" errors

## Future Prevention

- Do NOT create redundant CreateModel operations in migrations
- Use `makemigrations` to auto-generate migrations instead of manual creation
- Test migration order on clean database before deployment
- Consider using `migrations.SeparateDatabaseAndState` for multi-database scenarios

## Notes

- The browser console warnings about "Real-time subscriptions not implemented" are unrelated and can be ignored - they're just feature notifications from the Supabase client
- Migration 0008 appears to be a duplicate of 0007 - consider removing it in a future cleanup
