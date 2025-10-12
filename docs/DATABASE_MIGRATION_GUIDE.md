# EPSM Database Migration Guide

## Overview

EPSM uses a **multi-database architecture** with three separate PostgreSQL databases:

1. **`default` (epsm_db)** - Django core tables (users, sessions, admin, simulation metadata)
2. **`materials_db` (epsm_materials)** - Materials, constructions, scenarios, building data
3. **`results_db` (epsm_results)** - Simulation results, zones, energy use data, timeseries

## Why This Architecture?

- **Separation of concerns**: Core Django data vs. domain data vs. large result datasets
- **Scalability**: Results database can be scaled independently
- **Performance**: Heavy result queries don't impact core application
- **Backup strategies**: Different retention policies for different data types

## Database Router

The database router (`backend/config/db_router.py`) automatically routes model operations to the correct database:

```python
# Models that go to materials_db
- database.material
- database.construction
- database.constructionset
- database.scenario
- etc.

# Models that go to results_db
- simulation.simulationresult
- simulation.simulationzone
- simulation.simulationenergyuse
- simulation.simulationhourlytimeseries

# Everything else goes to default
- auth.user
- simulation.simulation
- etc.
```

## Migration Strategy

### Automatic Migration (Production)

The `docker-entrypoint.sh` script now automatically migrates all three databases on container startup:

```bash
# Default database
python manage.py migrate --noinput --fake-initial

# Materials database
python manage.py migrate database --database=materials_db --noinput --fake-initial

# Results database (special handling)
python manage.py migrate simulation 0003 --database=results_db --fake --noinput
python manage.py migrate simulation --database=results_db --noinput
```

**Why the special handling for results_db?**

Migrations 0001-0003 create tables that belong in the `default` database (like `simulation_runs`). The database router prevents these from being created in `results_db`, so we:
1. **Fake** migrations 0001-0003 (mark them as applied without running them)
2. **Run** migration 0004+ (which create the actual results tables)

### Manual Migration

If you need to manually run migrations:

```bash
# All databases at once (recommended)
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py migrate database --database=materials_db
docker-compose exec backend python manage.py migrate simulation 0003 --database=results_db --fake
docker-compose exec backend python manage.py migrate simulation --database=results_db

# Or use the start script
./scripts/start.sh

# Or check health and migrate if needed
./scripts/check-database-health.sh
```

### Development Workflow

When creating new migrations:

1. **For default database models**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **For materials database models** (database app):
   ```bash
   python manage.py makemigrations database
   python manage.py migrate database --database=materials_db
   ```

3. **For results database models** (simulation app - results only):
   ```bash
   python manage.py makemigrations simulation
   # Test which database it should go to based on db_router.py
   python manage.py migrate simulation --database=results_db
   ```

## Troubleshooting

### Error: "relation 'simulation_results' does not exist"

**Cause**: Migrations haven't been run on `results_db`

**Fix**:
```bash
docker-compose exec backend python manage.py migrate simulation 0003 --database=results_db --fake
docker-compose exec backend python manage.py migrate simulation --database=results_db
```

### Error: "relation 'materials' does not exist"

**Cause**: Migrations haven't been run on `materials_db`

**Fix**:
```bash
docker-compose exec backend python manage.py migrate database --database=materials_db
```

### Error: "relation 'simulation_runs' does not exist"

**Cause**: This table belongs in `default` database, not `results_db`

**Fix**: This is expected if you see it during `results_db` migration. The table should exist in the `default` database:
```bash
docker-compose exec backend python manage.py migrate
```

### Check Migration Status

```bash
# Default database
docker-compose exec backend python manage.py showmigrations

# Materials database
docker-compose exec backend python manage.py showmigrations database --database=materials_db

# Results database
docker-compose exec backend python manage.py showmigrations simulation --database=results_db
```

### Verify Tables Exist

```bash
# Default database
docker-compose exec database psql -U epsm_user -d epsm_db -c "\dt"

# Materials database
docker-compose exec database psql -U epsm_user -d epsm_materials -c "\dt"

# Results database
docker-compose exec database psql -U epsm_results_user -d epsm_results -c "\dt"
```

## Health Check

Run the automated health check script:

```bash
./scripts/check-database-health.sh
```

This checks:
- ✓ Database connectivity for all three databases
- ✓ Table counts (minimum expected tables)
- ✓ Critical tables exist
- ✓ Migration status

## Deployment Checklist

When deploying to production:

1. ✓ Ensure all three databases exist (handled by `database/init/` scripts)
2. ✓ Environment variables are set correctly (`.env.production`)
3. ✓ Run migrations automatically via `docker-entrypoint.sh` ✓ (FIXED)
4. ✓ Or run deployment script: `./scripts/deploy-localhost-fix.sh` ✓ (FIXED)
5. ✓ Verify with health check: `./scripts/check-database-health.sh`

## Common Patterns

### Querying Across Databases

Django doesn't support JOINs across databases. Use this pattern:

```python
# Get simulation from default db
simulation = Simulation.objects.get(id=sim_id)

# Get results from results_db using simulation_id
results = SimulationResult.objects.using('results_db').filter(
    simulation_id=simulation.id
)
```

### Saving to the Correct Database

The router handles this automatically, but you can be explicit:

```python
# Automatic (router decides)
result = SimulationResult.objects.create(...)

# Explicit
result = SimulationResult.objects.using('results_db').create(...)
```

### Transactions

Keep transactions within a single database:

```python
from django.db import transaction

# ✓ Good - single database
with transaction.atomic():
    user.save()
    simulation.save()

# ✓ Good - explicit database
with transaction.atomic(using='results_db'):
    result.save()
    zones.bulk_create([...])

# ✗ Bad - don't span databases
with transaction.atomic():
    material.save()  # materials_db
    result.save()    # results_db - WRONG!
```

## Environment Variables

Required for all three databases:

```bash
# Default database
DB_NAME=epsm_db
DB_USER=epsm_user
DB_PASSWORD=epsm_secure_password
DB_HOST=database
DB_PORT=5432

# Materials database
MATERIALS_DB_NAME=epsm_materials
MATERIALS_DB_USER=epsm_user
MATERIALS_DB_PASSWORD=epsm_secure_password
MATERIALS_DB_HOST=database
MATERIALS_DB_PORT=5432

# Results database
RESULTS_DB_NAME=epsm_results
RESULTS_DB_USER=epsm_results_user
RESULTS_DB_PASSWORD=epsm_results_password
RESULTS_DB_HOST=database
RESULTS_DB_PORT=5432
```

## Migration History

### Recent Changes (October 2024)

**Fixed Issue**: Results database migrations were not being run automatically

**What was broken**:
- `docker-entrypoint.sh` only migrated the default database
- Production deployments didn't create `simulation_results` table
- Error: "relation 'simulation_results' does not exist"

**What was fixed**:
- ✓ Updated `docker-entrypoint.sh` to migrate all three databases
- ✓ Updated `scripts/deploy-localhost-fix.sh` to migrate all databases
- ✓ Updated `scripts/start.sh` to migrate all databases
- ✓ Created `scripts/check-database-health.sh` for verification
- ✓ Created this documentation

**Files changed**:
- `/opt/epsm/backend/docker-entrypoint.sh`
- `/opt/epsm/scripts/deploy-localhost-fix.sh`
- `/opt/epsm/scripts/start.sh`
- `/opt/epsm/scripts/check-database-health.sh` (new)
- `/opt/epsm/docs/DATABASE_MIGRATION_GUIDE.md` (new)

## References

- Django Multi-DB Documentation: https://docs.djangoproject.com/en/stable/topics/db/multi-db/
- Database Router: `backend/config/db_router.py`
- Settings: `backend/config/settings.py` (DATABASES section)
- Init Scripts: `database/init/`
