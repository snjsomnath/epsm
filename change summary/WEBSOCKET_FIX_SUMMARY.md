# WebSocket Connection Fix Summary

## Problem
WebSocket connections were failing with the error:
```
WebSocket connection to 'wss://epsm.chalmers.se:8000/ws/system-resources/' failed
```

## Root Causes

### 1. Frontend - Incorrect WebSocket URL Construction
The frontend was trying to connect directly to port 8000, bypassing the nginx proxy:
- `wss://epsm.chalmers.se:8000/ws/system-resources/` ❌
- Should be: `wss://epsm.chalmers.se/ws/system-resources/` ✅

### 2. Backend - Wrong Server Type
The backend was running **Gunicorn (WSGI)**, which doesn't support WebSockets.
- WebSockets require an **ASGI server** like Daphne or Uvicorn.

## Solutions Applied

### 1. Fixed Frontend WebSocket URLs
**File:** `/opt/epsm/frontend/src/components/simulation/SimulationPage.tsx`

#### Resource Monitoring WebSocket (Line ~690)
```typescript
// OLD - Hardcoded port 8000
const wsHost = window.location.hostname || 'localhost';
const wsPort = '8000';
const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}/ws/system-resources/`;

// NEW - Use nginx proxy
const wsHost = window.location.host; // includes port if present
const wsUrl = `${wsProtocol}://${wsHost}/ws/system-resources/`;
```

#### Simulation Progress WebSocket (Line ~450)
```typescript
// OLD - Fallback to port 8000
const candidateUrls = [
  `${wsProtocol}://${host}/ws/simulation-progress/${simulationId}/`,
  `${wsProtocol}://${hostnameFallback}:8000/ws/simulation-progress/${simulationId}/`,
];

// NEW - Only use nginx proxy
const candidateUrls = [
  `${wsProtocol}://${host}/ws/simulation-progress/${simulationId}/`,
];
```

### 2. Switched Backend to Daphne (ASGI)
**File:** `/opt/epsm/backend/Dockerfile.prod`

```dockerfile
# OLD - Gunicorn (WSGI - no WebSocket support)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--worker-class", "gevent", "config.wsgi:application"]

# NEW - Daphne (ASGI - WebSocket support)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
```

### 3. Enhanced Nginx WebSocket Configuration
**File:** `/opt/epsm/nginx/nginx.conf`

Added timeout settings to prevent WebSocket disconnections:
```nginx
location /ws/ {
    proxy_pass http://epsm_backend_prod:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket timeout settings
    proxy_read_timeout 86400s;  # 24 hours
    proxy_send_timeout 86400s;  # 24 hours
    proxy_connect_timeout 60s;
}
```

### 4. Fixed Entrypoint Script
**File:** `/opt/epsm/backend/docker-entrypoint.sh`

Made chmod operations non-fatal to prevent container restart loops:
```bash
chmod -R 777 /app/logs /app/media /app/staticfiles 2>/dev/null || echo "Warning: Some chmod operations failed (non-fatal)"
```

## Deployment Steps

1. **Rebuild Frontend:**
   ```bash
   cd /opt/epsm
   docker-compose -f docker-compose.production.yml build --no-cache frontend
   docker-compose -f docker-compose.production.yml up -d frontend
   ```

2. **Rebuild Backend:**
   ```bash
   docker-compose -f docker-compose.production.yml build --no-cache backend
   docker-compose -f docker-compose.production.yml up -d backend celery_worker celery_beat
   ```

3. **Restart Nginx:**
   ```bash
   docker-compose -f docker-compose.production.yml restart nginx
   ```

## Verification

### Check Backend is Running Daphne:
```bash
docker logs epsm_backend_prod | grep -i "daphne\|listening"
```

Expected output:
```
INFO Starting server at tcp:port=8000:interface=0.0.0.0
INFO Listening on TCP address 0.0.0.0:8000
```

### Test WebSocket Connection:
Open browser console and check for:
- ✅ `WebSocket live` indicator in the UI
- ✅ No WebSocket connection errors
- ✅ Real-time system resource updates

## Technical Details

### WebSocket Architecture
```
Browser (wss://epsm.chalmers.se/ws/*)
    ↓
Nginx (port 443) - Proxies WebSocket upgrade
    ↓
Backend (Daphne ASGI on port 8000)
    ↓
Django Channels + Redis
    ↓
WebSocket Consumers (SystemResourceConsumer, SimulationProgressConsumer)
```

### Files Modified
1. `frontend/src/components/simulation/SimulationPage.tsx` - WebSocket URL fixes
2. `backend/Dockerfile.prod` - Switch to Daphne
3. `backend/docker-entrypoint.sh` - Non-fatal chmod
4. `nginx/nginx.conf` - WebSocket timeout settings

## Important: Nginx DNS Resolution Issue

### Why Nginx Doesn't Auto-Update Container IPs

**Problem:** When you rebuild/restart backend containers, nginx continues trying to connect to the old IP address.

**Root Cause:** Nginx resolves upstream hostnames (like `epsm_backend_prod`) **only at startup**:
1. At nginx startup: Resolves `epsm_backend_prod` → IP (e.g., `172.19.0.6`)
2. Caches this IP in memory
3. Never re-resolves (unless nginx is reloaded/restarted)

When backend container restarts:
- Backend gets new IP: `172.19.0.4`
- Nginx still uses old cached IP: `172.19.0.6`
- Result: **502 Bad Gateway** errors

### Solution 1: Restart Nginx After Backend Changes
```bash
docker-compose -f docker-compose.production.yml restart nginx
```

### Solution 2: Advanced - Use Variables for Dynamic DNS
To make nginx re-resolve IPs on every request, you would need to:

```nginx
# Add resolver directive (Docker's internal DNS)
resolver 127.0.0.11 valid=10s;

# Use variable for upstream (forces re-resolution)
location /api/ {
    set $backend http://epsm_backend_prod:8000;
    proxy_pass $backend;
    # ... other proxy settings
}
```

**Note:** We're using Solution 1 (restart nginx) as it's simpler and container restarts are infrequent in production.

## Complete Deployment Workflow

Whenever you rebuild the backend:

```bash
# 1. Rebuild backend
docker-compose -f docker-compose.production.yml build backend

# 2. Restart backend services
docker-compose -f docker-compose.production.yml up -d backend celery_worker celery_beat

# 3. IMPORTANT: Restart nginx to refresh DNS
docker-compose -f docker-compose.production.yml restart nginx
```

## Troubleshooting

### Check Container IPs
```bash
# Backend IP
docker inspect epsm_backend_prod | grep IPAddress

# What nginx sees
docker exec epsm_nginx_prod nslookup epsm_backend_prod
```

### Test API Connectivity
```bash
# Test from host
curl -k https://localhost/api/scenarios/

# Test from nginx container
docker exec epsm_nginx_prod wget -O- http://epsm_backend_prod:8000/health/
```

### Common Errors

**502 Bad Gateway:**
- Backend container IP changed → Restart nginx
- Backend not running → Check `docker-compose ps`
- Backend crashed → Check `docker logs epsm_backend_prod`

**WebSocket connection failed:**
- Check backend is running Daphne (not Gunicorn)
- Check nginx WebSocket proxy configuration
- Verify no firewall blocking port 443

## Date
Fixed: October 12, 2025
Version: 0.2.2

## Author
Fixed by: GitHub Copilot + ssanjay@chalmers.se
