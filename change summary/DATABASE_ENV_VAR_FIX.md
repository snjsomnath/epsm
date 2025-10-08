# Database Environment Variable Fix - Production Deployment

**Date:** 8 October 2025  
**Issue:** Backend container crash loop with "connection to server at localhost:5432 failed"  
**Root Cause:** Environment variable mismatch between docker-compose.production.yml and Django settings  
**Severity:** Critical - Blocking production deployment

## Problem Description

### Symptoms
```
django.db.utils.OperationalError: connection to server at "localhost" (127.0.0.1), port 5432 failed: Connection refused
    Is the server running on that host and accepting TCP/IP connections?
```

Backend container status:
```bash
NAME                STATUS
epsm_backend_prod   Restarting (1) 1 second ago
```

### Root Cause Analysis

The `docker-compose.production.yml` file was using **POSTGRES_*** environment variables:
```yaml
environment:
  POSTGRES_DB: ${POSTGRES_DB:-epsm_db}
  POSTGRES_USER: ${POSTGRES_USER:-epsm_user}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  POSTGRES_HOST: database
```

However, `backend/config/settings.py` expects **DB_*** environment variables:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'epsm_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),  # ← Falls back to localhost!
        'PORT': os.getenv('DB_PORT', '5432'),
    },
}
```

**Result:** Django couldn't read `POSTGRES_HOST` from environment, defaulted to `localhost`, which doesn't exist inside the container. The database service is accessible at hostname `database` in the Docker network.

## Solution

### Changed Environment Variables

**For backend service:**
```yaml
environment:
  DB_NAME: ${POSTGRES_DB:-epsm_db}
  DB_USER: ${POSTGRES_USER:-epsm_user}
  DB_PASSWORD: ${POSTGRES_PASSWORD}
  DB_HOST: database  # ← Correct hostname
  MATERIALS_DB_NAME: ${POSTGRES_DB:-epsm_db}
  MATERIALS_DB_USER: ${POSTGRES_USER:-epsm_user}
  MATERIALS_DB_PASSWORD: ${POSTGRES_PASSWORD}
  MATERIALS_DB_HOST: database
```

**For celery-worker service:**
```yaml
environment:
  DB_NAME: ${POSTGRES_DB:-epsm_db}
  DB_USER: ${POSTGRES_USER:-epsm_user}
  DB_PASSWORD: ${POSTGRES_PASSWORD}
  DB_HOST: database
  MATERIALS_DB_NAME: ${POSTGRES_DB:-epsm_db}
  MATERIALS_DB_USER: ${POSTGRES_USER:-epsm_user}
  MATERIALS_DB_PASSWORD: ${POSTGRES_PASSWORD}
  MATERIALS_DB_HOST: database
```

**For celery-beat service:**
```yaml
environment:
  DB_NAME: ${POSTGRES_DB:-epsm_db}
  DB_USER: ${POSTGRES_USER:-epsm_user}
  DB_PASSWORD: ${POSTGRES_PASSWORD}
  DB_HOST: database
  MATERIALS_DB_NAME: ${POSTGRES_DB:-epsm_db}
  MATERIALS_DB_USER: ${POSTGRES_USER:-epsm_user}
  MATERIALS_DB_PASSWORD: ${POSTGRES_PASSWORD}
  MATERIALS_DB_HOST: database
```

### Key Changes
1. **POSTGRES_DB → DB_NAME** - Aligns with Django settings
2. **POSTGRES_USER → DB_USER** - Aligns with Django settings  
3. **POSTGRES_PASSWORD → DB_PASSWORD** - Aligns with Django settings
4. **POSTGRES_HOST → DB_HOST** - Aligns with Django settings
5. **Added MATERIALS_DB_*** - For secondary materials database connection

## Files Modified

### `docker-compose.production.yml`
- Updated `backend` service environment variables
- Updated `celery-worker` service environment variables  
- Updated `celery-beat` service environment variables
- Added materials database configuration

**Commit:** `9c601c7` - "fix: Align database environment variables with Django settings"

## Deployment Instructions

### On Production VM

1. **Pull latest code:**
   ```bash
   cd /opt/epsm
   git pull origin development
   ```

2. **Restart services:**
   ```bash
   docker-compose -f docker-compose.production.yml down
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Monitor backend startup:**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f backend
   ```

4. **Verify connection:**
   ```bash
   docker-compose -f docker-compose.production.yml exec backend python manage.py check --database default
   ```

## Expected Outcome

✅ Backend connects to database at `database:5432`  
✅ Django migrations run successfully  
✅ Backend container stays healthy (not restarting)  
✅ API accessible at http://localhost:8000

## Lessons Learned

1. **Environment Variable Consistency:** Always ensure docker-compose environment variables match exactly what the application code expects
2. **Default Values:** Check application default values (like `localhost`) that can mask configuration issues
3. **Multi-Database Setup:** Remember to configure all database connections (default + materials_db + results_db)
4. **Container Networking:** Database hostname in Docker Compose is the service name, not `localhost`

## Related Issues

- Initial backend crash: Logs directory permissions (fixed in commit 493c91c)
- Platform mismatch: ARM64 vs AMD64 Docker images (fixed with multi-platform builds)
- This issue: Environment variable naming mismatch

## Testing Checklist

After deploying this fix, verify:

- [ ] Backend container running (not restarting)
- [ ] Database migrations complete
- [ ] Static files collected
- [ ] Health check endpoint responds: `curl http://localhost:8000/health/`
- [ ] Django admin accessible
- [ ] SAML metadata generation works

## References

- Django Database Settings: https://docs.djangoproject.com/en/3.2/ref/settings/#databases
- Docker Compose Environment Variables: https://docs.docker.com/compose/environment-variables/
- Container Networking: https://docs.docker.com/compose/networking/
