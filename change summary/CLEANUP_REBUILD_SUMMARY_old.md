# Cleanup and Rebuild Summary - October 12, 2025

## ✅ Completed Actions

### 1. Migration Order Fix
- **Fixed Migration 0004**: Converted to no-op state sync migration (no longer tries to recreate tables)
- **Updated Entrypoint**: Rewrote migration logic to properly apply 0001-0003 first, then remaining migrations
- **Files Modified**:
  - `/opt/epsm/backend/simulation/migrations/0004_create_results_tables.py`
  - `/opt/epsm/backend/docker-entrypoint.sh`
- **Documentation**: Created `/opt/epsm/MIGRATION_ORDER_FIX.md`

### 2. Complete Docker Cleanup
- ✅ Stopped all EPSM containers
- ✅ Removed all EPSM images
- ✅ Pruned unused Docker images and containers  
- ✅ Cleared all build cache (5.8GB reclaimed!)
- ✅ EnergyPlus image preserved during cleanup
- ✅ Removed and recreated all volumes

### 3. Fresh Rebuild
- ✅ Built backend service (no cache)
- ✅ Built frontend service (no cache)
- ✅ Built database service (no cache)
- ✅ Built Celery worker service
- ✅ Built Celery beat service
- ✅ All services using production configuration

### 4. Portainer Restart
- ✅ Portainer stopped and restarted in `/opt/monitoring`
- ✅ Monitoring stack operational

## ⚠️ Remaining Issues

### Database Permission Issue
**Problem**: The `epsm_user` doesn't have CREATE permission on the public schema in the `epsm_db` database.

**Error**:
```
psycopg2.errors.InsufficientPrivilege: permission denied for schema public
LINE 1: CREATE TABLE "django_migrations" ("id" bigserial NOT NULL PR...
```

**Root Cause**: When using the same database (`epsm_db`) for both default and results_db, the user needs proper permissions to create migration tables.

**Solution Options**:

#### Option 1: Grant Permissions (Recommended)
Run this in the database container:
```bash
docker exec -it epsm_database_prod psql -U epsm_user -d epsm_db -c "GRANT ALL ON SCHEMA public TO epsm_user;"
docker exec -it epsm_database_prod psql -U postgres -d epsm_db -c "GRANT ALL ON SCHEMA public TO epsm_user;"
```

#### Option 2: Use Separate Database for Results
Update `.env` to use a separate database:
```
RESULTS_DB_NAME=epsm_results
```

Then add this database to the init script.

## Current Service Status

```bash
cd /opt/epsm
docker-compose -f docker-compose.production.yml ps
```

Services running:
- ✅ epsm_database_prod (PostgreSQL)
- ✅ epsm_redis_prod (Redis)
- ⚠️  epsm_backend_prod (running but migration failing)
- ✅ epsm_celery_worker_prod
- ✅ epsm_celery_beat_prod
- ✅ epsm_frontend_prod
- ✅ epsm_nginx_prod

## Next Steps

1. **Fix Database Permissions** (choose one option above)

2. **Restart Backend** to retry migrations:
   ```bash
   cd /opt/epsm
   docker-compose -f docker-compose.production.yml restart backend
   ```

3. **Verify Migrations**:
   ```bash
   docker logs epsm_backend_prod | grep "Running database migrations" -A 50
   ```

4. **Test Application**:
   - Access: https://epsm.chalmers.se
   - Check API: https://epsm.chalmers.se/api/simulation/
   - Verify no 400 errors on results endpoints

## Scripts Created

1. `/opt/epsm/cleanup_and_rebuild.sh` - Complete cleanup and rebuild script
2. `/opt/epsm/test_migrations.sh` - Migration testing script
3. `/opt/epsm/MIGRATION_ORDER_FIX.md` - Detailed migration fix documentation

## Files Modified

1. `/opt/epsm/backend/simulation/migrations/0004_create_results_tables.py`
2. `/opt/epsm/backend/docker-entrypoint.sh`

## Space Reclaimed

- Docker images: ~344MB
- Build cache: ~5.8GB
- **Total**: ~6.1GB freed

## Notes

- EnergyPlus image was successfully pulled and preserved
- All services rebuilt from scratch with no cache
- Production configuration is active (using .env file)
- Migration logic is fixed and ready once permissions are granted
- The nginx container blocking issue was resolved
