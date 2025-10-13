# Docker Compose Review - October 13, 2025

## 📋 Review Summary

Reviewed both compose files for best practices, consistency, and improvements.

---

## ✅ What's Good

### Both Files
- ✅ Clear service organization
- ✅ Proper health checks on all services
- ✅ Correct dependency management (`depends_on` with conditions)
- ✅ Named volumes for data persistence
- ✅ Proper network configuration
- ✅ Good use of environment variables

### Development (docker-compose.yml)
- ✅ Hot reload volumes for backend/frontend
- ✅ Exposed ports for debugging
- ✅ Safe default passwords
- ✅ Good comments explaining configuration

### Production (docker-compose.production.yml)
- ✅ Security-focused (localhost-only DB port)
- ✅ Uses `expose` instead of `ports` for internal services
- ✅ Nginx reverse proxy setup
- ✅ Comprehensive environment variable mapping

---

## 🔧 Issues Found & Recommendations

### Issue 1: `version:` Field in Production File

**Production file still has:**
```yaml
version: '3.8'
```

**Issue:** Deprecated in Docker Compose v2+ (since 2020)

**Fix:** Remove the version line

**Why:** 
- Docker Compose v2+ ignores it
- It's no longer needed or recommended
- Compose auto-detects features based on schema

---

### Issue 2: Inconsistent Build Context

**Production - Backend service:**
```yaml
backend:
  build:
    context: .  # Project root
    dockerfile: ./backend/Dockerfile.prod
```

**Production - Celery services:**
```yaml
celery_worker:
  build:
    context: ./backend  # Backend directory
    dockerfile: Dockerfile.prod
```

**Issue:** Inconsistent - backend uses root context, celery uses backend context

**Recommendation:** Be consistent. Either:
- **Option A:** All use backend context (simpler)
- **Option B:** All use root context (if Dockerfile.prod needs project files)

**Impact:** Could cause build issues if Dockerfile.prod expects different context

---

### Issue 3: `no_cache: true` in Production

**Production file has:**
```yaml
build:
  no_cache: true  # Always build fresh
```

**Issue:** Forces fresh build every time, even when nothing changed

**Recommendation:** Remove `no_cache: true` from compose file, use CLI flag instead:

```bash
# When you WANT fresh build:
docker-compose -f docker-compose.production.yml build --no-cache

# Normal builds (use cache):
docker-compose -f docker-compose.production.yml build
```

**Why:**
- Faster rebuilds when nothing changed
- More flexibility (use flag when needed)
- Standard practice

---

### Issue 4: Duplicate Image Building

**Production - Backend image built 3 times:**
```yaml
backend:
  build: ... 
  image: epsm-backend:${VERSION:-latest}

celery_worker:
  build: ...  # Builds again!
  image: epsm-backend:${VERSION:-latest}  # Same image

celery_beat:
  build: ...  # Builds again!
  image: epsm-backend:${VERSION:-latest}  # Same image
```

**Issue:** Celery services rebuild the same image unnecessarily

**Fix:** Celery services should just reference the image:

```yaml
backend:
  build: ...
  image: epsm-backend:${VERSION:-latest}

celery_worker:
  image: epsm-backend:${VERSION:-latest}  # Just use the image
  # Remove build section

celery_beat:
  image: epsm-backend:${VERSION:-latest}  # Just use the image
  # Remove build section
```

**Why:**
- Faster deployment (build once, use thrice)
- Guaranteed same code in all containers
- Standard practice

---

### Issue 5: Hardcoded HOST_MEDIA_ROOT in Production

**Production file:**
```yaml
HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

**Issue:** Hardcoded Docker volume path

**Recommendation:** Either:
- **Option A:** Remove it (not needed if using Docker volumes)
- **Option B:** Make it configurable via .env

```yaml
HOST_MEDIA_ROOT=${HOST_MEDIA_ROOT:-/var/lib/docker/volumes/epsm_media_data_prod/_data}
```

---

### Issue 6: Inconsistent Environment Variable Format

**Development uses `KEY: VALUE`:**
```yaml
environment:
  DEBUG: "True"
  DB_NAME: epsm_db
```

**Production uses `- KEY=VALUE`:**
```yaml
environment:
  - DEBUG=${DEBUG}
  - DB_NAME=${DB_NAME}
```

**Issue:** Both work, but inconsistency is confusing

**Recommendation:** Use same format in both files (prefer key: value format)

```yaml
# Preferred (cleaner, easier to read)
environment:
  DEBUG: ${DEBUG}
  DB_NAME: ${DB_NAME}
```

---

### Issue 7: Missing .env File Reference

**Neither file specifies env_file**

**Current:** Relies on automatic .env loading

**Recommendation:** Be explicit in production:

```yaml
# Production
services:
  backend:
    env_file:
      - .env.production
    environment:
      # Override specific values here
```

**Why:**
- Makes it clear which env file is used
- Prevents accidentally loading wrong .env file
- Better for documentation

---

### Issue 8: Unused Volumes in Development

**Development defines but doesn't use:**
```yaml
volumes:
  simulation_files_dev:  # Not mounted anywhere
  simulation_results_dev:  # Not mounted anywhere
```

**Issue:** Declared but never used

**Fix:** Remove unused volume declarations

---

### Issue 9: Database Exports Path Inconsistency

**Development:**
```yaml
- ./database/exports:/docker-entrypoint-initdb.d/exports:ro
- ./database/migrations:/docker-entrypoint-initdb.d/migrations:ro
```

**Production:**
```yaml
- ./database/init:/docker-entrypoint-initdb.d
- ./database/exports:/docker-entrypoint-initdb.d/exports:ro
```

**Issue:** Production has `/init` mount that dev doesn't have

**Question:** Is `./database/init/` needed? Does it exist?

---

### Issue 10: Network Subnet Only in Development

**Development:**
```yaml
networks:
  epsm_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Production:**
```yaml
networks:
  epsm_network:
    driver: bridge
```

**Issue:** Inconsistent network configuration

**Question:** Is specific subnet needed in dev? If not, remove it for simplicity.

---

## 🎯 Prioritized Fixes

### High Priority (Do These)

1. **Remove `version: '3.8'` from production file**
2. **Fix duplicate image builds in production** (celery services)
3. **Make build context consistent**
4. **Remove unused volumes from development**

### Medium Priority (Should Do)

5. **Remove `no_cache: true`** (use CLI flag instead)
6. **Make environment variable format consistent**
7. **Make HOST_MEDIA_ROOT configurable or remove it**

### Low Priority (Nice to Have)

8. **Add explicit env_file reference in production**
9. **Review database init paths**
10. **Standardize network configuration**

---

## 📝 Recommended Changes

### Change 1: Production File - Remove Version & Fix Builds

**Remove:**
```yaml
version: '3.8'  # DELETE THIS LINE
```

**Change celery services:**
```yaml
# celery_worker - REMOVE build section
celery_worker:
  image: epsm-backend:${VERSION:-latest}  # Just use the image
  container_name: epsm_celery_worker_prod
  command: celery -A config worker --loglevel=info --concurrency=4
  # ... rest of config

# celery_beat - REMOVE build section
celery_beat:
  image: epsm-backend:${VERSION:-latest}  # Just use the image
  container_name: epsm_celery_beat_prod
  command: celery -A config beat --loglevel=info
  # ... rest of config
```

### Change 2: Backend Build Context

**Make consistent - use backend context:**
```yaml
backend:
  build:
    context: ./backend  # Changed from "."
    dockerfile: Dockerfile.prod
    args:
      VERSION: ${VERSION:-latest}
```

### Change 3: Remove no_cache

**Remove from all build sections:**
```yaml
build:
  context: ./backend
  dockerfile: Dockerfile.prod
  # REMOVE: no_cache: true
```

**Use CLI flag when needed:**
```bash
docker-compose -f docker-compose.production.yml build --no-cache
```

### Change 4: Development - Remove Unused Volumes

**Remove these:**
```yaml
volumes:
  postgres_data_dev:
    driver: local
  redis_data_dev:
    driver: local
  # DELETE: simulation_files_dev
  # DELETE: simulation_results_dev
```

---

## ✅ After Fixes Checklist

Test both files:

```bash
# Validate syntax
docker-compose config
docker-compose -f docker-compose.production.yml config

# Test build (don't start)
docker-compose build --dry-run
docker-compose -f docker-compose.production.yml build --dry-run

# Test development startup
docker-compose up -d
docker-compose ps

# Test production config (on server)
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml ps
```

---

## 📊 Summary

| Issue | Severity | Impact | Effort |
|-------|----------|--------|--------|
| `version:` field | Low | None (ignored) | 1 min |
| Duplicate builds | High | Slow deploys | 5 min |
| Build context | Medium | Build failures | 5 min |
| `no_cache: true` | Medium | Slow builds | 2 min |
| Unused volumes | Low | Confusion | 2 min |
| Env var format | Low | Readability | 10 min |
| Hardcoded paths | Medium | Portability | 3 min |

**Total Time to Fix High/Medium Issues: ~20 minutes**

---

## 🎓 Best Practices Applied

After fixes, your compose files will follow:
- ✅ Modern Docker Compose practices (no version field)
- ✅ DRY principle (build once, use multiple times)
- ✅ Consistent configuration style
- ✅ Portable configuration (no hardcoded paths)
- ✅ Clear separation of dev vs prod
- ✅ Proper health checks and dependencies
- ✅ Security best practices (production hardening)

---

**Next Step:** Would you like me to apply these fixes to your compose files?
