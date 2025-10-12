# Current Status and Next Steps - October 12, 2025

## ✅ What We've Fixed

1. **Migration 0004** - Converted to no-op migration (was trying to recreate tables)
2. **Database Permissions** - Fixed PostgreSQL 15+ schema permissions on all databases
3. **Portainer** - Running successfully at https://localhost:9443
4. **Database Init Script** - Fixed permissions script created (`fix_db_permissions.sh`)
5. **Cleaned Docker** - Pruned volumes and images (preserved EnergyPlus image)

## ⚠️ Current Issue

**Backend container is crash-looping** due to migration conflict on `results_db`:

### Problem
- Tables created manually from current model state (includes all fields from migrations 0001-0008)
- Django trying to apply migration 0005 which adds `user_id` column that already exists
- `--fake-initial` not working because tables weren't created by initial migration

### Root Cause
The multi-database setup with cross-database foreign keys creates a complex migration scenario:
- Default DB has `Simulation` model
- Results DB has `SimulationResult` etc. but NO `Simulation` model
- Migrations 0001-0003 reference `Simulation` FK which causes errors on results_db
- We manually create tables but migration state gets out of sync

## 🔧 Solution Approach

### Option 1: Drop and Recreate results_db (RECOMMENDED)
Since this is a fresh deployment, the cleanest solution is:

```bash
# 1. Drop the results database and recreate it
docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_db -c "DROP DATABASE IF EXISTS epsm_results;"
docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_db -c "CREATE DATABASE epsm_results OWNER epsm_user;"

# 2. Fix permissions
docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_results -c "
GRANT ALL ON SCHEMA public TO epsm_user;
GRANT ALL ON SCHEMA public TO PUBLIC;
ALTER SCHEMA public OWNER TO epsm_user;
"

# 3. Restart backend (will create tables fresh)
docker-compose -f docker-compose.production.yml restart backend celery_worker celery_beat
```

### Option 2: Manually Fix Migration State
Directly mark migrations as applied in the django_migrations table on results_db.

```bash
# Connect to results_db
docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_results

# Check current migration state
SELECT * FROM django_migrations WHERE app = 'simulation';

# Manually insert missing migration records
INSERT INTO django_migrations (app, name, applied) VALUES 
('simulation', '0005_add_user_and_hourly_timeseries', NOW()),
('simulation', '0006_auto_20251001_1132', NOW()),
('simulation', '0007_add_gwp_cost_to_simulation_result', NOW()),
('simulation', '0008_add_gwp_cost_to_simulation_result', NOW());
```

## 📝 Files Modified

1. `/opt/epsm/backend/simulation/migrations/0004_create_results_tables.py` - Now a no-op
2. `/opt/epsm/backend/docker-entrypoint.sh` - Updated results_db migration logic
3. `/opt/epsm/fix_db_permissions.sh` - PostgreSQL 15+ permission fix script
4. `/opt/epsm/MIGRATION_ORDER_FIX.md` - Documentation of the migration issue

## 🚀 Next Actions

1. **Choose a solution** (Option 1 recommended for clean state)
2. **Execute the fix**
3. **Verify backend starts** with `docker-compose -f docker-compose.production.yml logs backend -f`
4. **Test the API** - Visit https://epsm.chalmers.se/api/simulation/{id}/results/
5. **Monitor for errors** in browser console

## 💡 Long-term Solution

Consider creating a proper migration that uses `migrations.SeparateDatabaseAndState` to handle the cross-database scenario. This would:
- Create tables on results_db without FK to Simulation
- Keep Django migration state correct
- Avoid manual intervention

Example structure:
```python
class Migration(migrations.Migration):
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # What Django thinks happened
                migrations.CreateModel(...)
            ],
            database_operations=[
                # What actually happens in DB (without FK)
                migrations.RunSQL(...)
            ]
        )
    ]
```

## 🔍 Verification Commands

```bash
# Check all services
cd /opt/epsm && docker-compose -f docker-compose.production.yml ps

# Watch backend logs
cd /opt/epsm && docker-compose -f docker-compose.production.yml logs backend -f

# Check Portainer
curl -k https://localhost:9443/api/status

# Test database connection
docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_results -c "\dt"
```
