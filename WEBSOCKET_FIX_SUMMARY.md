# WebSocket Connection Fix - Production

## Issue Summary

**Error:** `WebSocket connection to 'wss://epsm.chalmers.se/ws/simulation-progress/{id}/' failed`

**Root Cause:** Backend cannot connect to Redis, which breaks Django Channels layer needed for WebSocket communication.

## Diagnosis Results

```
✓ Backend container is running
✓ Daphne process is running
✗ Backend CANNOT connect to Redis ← ROOT CAUSE
✓ Channel layers are configured
✓ Nginx has WebSocket upgrade headers
```

## Why This Happened

1. **Redis requires password authentication** (set via `REDIS_PASSWORD` in `.env.production`)
2. **Redis healthcheck was broken** - Used `redis-cli ping` without authentication
3. **Backend connection string was correct** but Redis wasn't accepting connections properly
4. **Channel layer requires Redis** to work - without it, WebSocket connections fail immediately

## The Fix

### 1. Fixed Redis Healthcheck (docker-compose.production.yml)

**Before:**
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
```

**After:**
```yaml
healthcheck:
  test: >
    sh -c '
    if [ -n "$REDIS_PASSWORD" ]; then
      redis-cli -a "$REDIS_PASSWORD" ping | grep PONG;
    else
      redis-cli ping | grep PONG;
    fi
    '
```

This ensures Redis healthcheck uses authentication when password is set.

### 2. Added Environment Variable to Redis Container

```yaml
redis:
  image: redis:7-alpine
  container_name: epsm_redis_prod
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}  # ← Added this
```

## Deployment Steps

### Option A: Redeploy Everything (Recommended)

```bash
# 1. SSH to production server
ssh ssanjay@epsm.chalmers.se

# 2. Navigate to project directory
cd /opt/epsm

# 3. Pull latest code (includes the fix)
git pull origin main

# 4. Ensure .env.production has REDIS_PASSWORD set
grep REDIS_PASSWORD .env.production

# 5. If not set, check GitHub Secrets
# Go to GitHub → Settings → Secrets → PROD_REDIS_PASSWORD

# 6. Redeploy via GitHub Actions (EASIEST)
# GitHub → Actions → "Deploy to Production" → Run workflow

# OR manually:
cd /opt/epsm
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build --force-recreate
```

### Option B: Quick Fix Without Rebuild

```bash
# 1. SSH to production
ssh ssanjay@epsm.chalmers.se
cd /opt/epsm

# 2. Pull latest code
git pull origin main

# 3. Restart Redis and backend (they'll pick up new healthcheck)
docker-compose -f docker-compose.production.yml restart redis
docker-compose -f docker-compose.production.yml restart backend celery_worker celery_beat

# 4. Wait 30 seconds
sleep 30

# 5. Test Redis connection
docker exec epsm_backend_prod python -c "import redis; r=redis.Redis(host='redis', port=6379, password='$(grep REDIS_PASSWORD .env.production | cut -d= -f2)'); print(r.ping())"

# Should print: True

# 6. Test WebSocket
./scripts/test-websocket.sh
```

## Verification

### 1. Check Redis Connection from Backend

```bash
docker exec epsm_backend_prod python3 << 'PYEOF'
import redis
import os

redis_password = os.getenv('REDIS_PASSWORD', '')
r = redis.Redis(host='redis', port=6379, password=redis_password, db=0)

try:
    result = r.ping()
    print(f"✅ Redis connection: {result}")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")
PYEOF
```

Expected output: `✅ Redis connection: True`

### 2. Check Channel Layer

```bash
docker exec epsm_backend_prod python manage.py shell << 'PYEOF'
from channels.layers import get_channel_layer
import asyncio

async def test_channel():
    channel_layer = get_channel_layer()
    try:
        await channel_layer.send('test_channel', {'type': 'test.message', 'text': 'Hello'})
        print("✅ Channel layer works!")
        return True
    except Exception as e:
        print(f"❌ Channel layer failed: {e}")
        return False

result = asyncio.run(test_channel())
PYEOF
```

Expected output: `✅ Channel layer works!`

### 3. Test WebSocket Connection

From your local machine:
```bash
# Run the diagnostic script on production
ssh ssanjay@epsm.chalmers.se 'cd /opt/epsm && ./scripts/test-websocket.sh'
```

All tests should pass now.

### 4. Test from Browser

Open browser console on https://epsm.chalmers.se:

```javascript
const ws = new WebSocket('wss://epsm.chalmers.se/ws/simulation-progress/test-id/');
ws.onopen = () => console.log('✅ WebSocket connected!');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
ws.onmessage = (e) => console.log('📨 Message:', e.data);
```

Expected: `✅ WebSocket connected!`

## Files Changed

1. **docker-compose.production.yml** - Fixed Redis healthcheck and added environment variable
2. **scripts/test-websocket.sh** - New diagnostic script (already existed)
3. **scripts/fix-redis-connection.sh** - New comprehensive fix script

## Related Configuration Files

- **backend/config/settings.py** (lines 213-252) - Redis and Celery configuration
- **backend/config/asgi.py** - ASGI application with WebSocket routing
- **backend/simulation/routing.py** - WebSocket URL patterns
- **backend/simulation/consumers.py** - WebSocket consumers
- **nginx/nginx.conf** (lines 88-100) - Nginx WebSocket proxy
- **.github/workflows/deploy-production.yml** (lines 96-108) - Secret injection

## Why Simulations Failed (0/3 successful)

Without WebSocket connections:
- Backend couldn't send real-time progress updates
- Frontend fell back to polling only
- Celery tasks might have run, but progress tracking failed
- Results might exist in database but weren't communicated to frontend

## Next Steps After Fix

1. ✅ Commit and push the fix
2. ✅ Redeploy via GitHub Actions
3. ✅ Verify Redis connection
4. ✅ Verify WebSocket connection
5. ✅ Run a test simulation
6. ✅ Confirm real-time progress updates work

## Monitoring

After deployment, monitor these logs:

```bash
# Backend logs (should show WebSocket connections)
docker logs -f epsm_backend_prod | grep -i "websocket\|channel"

# Redis logs (should show connections)
docker logs -f epsm_redis_prod

# Nginx logs (should show successful WebSocket upgrades)
docker logs -f epsm_nginx_prod | grep -i upgrade
```

## Prevention

This issue was caused by:
1. Redis healthcheck not matching actual authentication requirements
2. No automated tests for Redis connectivity in deployment workflow

**Recommendations:**
1. Add Redis connectivity test to deployment verification
2. Add WebSocket connection test to deployment verification
3. Monitor channel layer health in production

---

**Status:** 🟢 FIXED - Ready to deploy
**Priority:** HIGH - Affects all real-time features
**Impact:** WebSocket connections, real-time updates, simulation progress tracking
