# WebSocket Channel Layer Fix - October 12, 2025

## Problem
WebSocket connections for simulation progress were failing with the error:
```
WebSocket connection to 'wss://epsm.chalmers.se/ws/simulation-progress/<simulation_id>/' failed
```

Backend logs showed:
```
ERROR: Exception inside application: 'NoneType' object has no attribute 'group_add'
```

## Root Cause
The Django Channels WebSocket consumer (`SimulationProgressConsumer`) requires a configured **channel layer** to enable pub/sub messaging between:
- The WebSocket consumer (subscribes to progress updates)
- The Celery workers (publish progress updates)

The channel layer was **not configured** in Django settings, so `self.channel_layer` was `None`, causing the WebSocket connection to immediately fail.

## Solution

### 1. Added `channels-redis` Package
**File**: `/opt/epsm/backend/requirements.txt`

```diff
 channels>=3.0,<4.0
+channels-redis>=4.0.0,<5.0
 daphne<4.0
```

The `channels-redis` package enables Django Channels to use Redis as the message broker for WebSocket communication.

### 2. Configured Channel Layer
**File**: `/opt/epsm/backend/config/settings.py`

Added after the Celery configuration:

```python
# Channels Layer Configuration (WebSocket support)
# Uses the same Redis instance as Celery
if REDIS_PASSWORD:
    redis_url = f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/1'
else:
    redis_url = f'redis://{REDIS_HOST}:{REDIS_PORT}/1'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [redis_url],
            'capacity': 1500,  # Maximum number of messages to store
            'expiry': 10,      # Message expiry time in seconds
        },
    },
}
```

**Note**: Uses Redis database 1 (separate from Celery's database 0) to avoid conflicts.

### 3. Rebuilt and Restarted Services
```bash
# Rebuild backend with new dependency
docker-compose -f docker-compose.production.yml build backend

# Restart backend
docker-compose -f docker-compose.production.yml up -d backend

# Restart Celery worker (to pick up channel layer)
docker-compose -f docker-compose.production.yml restart celery_worker
```

## Verification

### Before Fix
```javascript
WebSocket connection to 'wss://epsm.chalmers.se/ws/simulation-progress/abc501bc-186e-40ae-9ae2-316a40bd086f/' failed
```

### After Fix
```javascript
Connected to simulation progress WebSocket for 7b278a1e-2230-4b8d-af40-cf7c7ae4569a via wss://epsm.chalmers.se/ws/simulation-progress/7b278a1e-2230-4b8d-af40-cf7c7ae4569a/
```

✅ **WebSocket connection now successfully established**

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │  WSS    │   Daphne/ASGI    │  Redis  │  Celery Worker  │
│   (Browser)     │◄───────►│   + Channels     │◄───────►│  (Publishers)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  Redis Channel   │
                            │     Layer        │
                            │  (Database 1)    │
                            └──────────────────┘
```

1. **Frontend** opens WebSocket connection to `/ws/simulation-progress/<id>/`
2. **Daphne** accepts connection, hands to `SimulationProgressConsumer`
3. **Consumer** subscribes to Redis channel group: `simulation_progress_<id>`
4. **Celery workers** publish progress updates to the same group via `channel_layer.group_send()`
5. **Redis** distributes messages to all subscribed WebSocket connections
6. **Frontend** receives real-time progress updates

## Related Files
- `/opt/epsm/backend/requirements.txt` - Added channels-redis
- `/opt/epsm/backend/config/settings.py` - Added CHANNEL_LAYERS config
- `/opt/epsm/backend/simulation/consumers.py` - WebSocket consumer (unchanged)
- `/opt/epsm/backend/simulation/routing.py` - WebSocket URL patterns (unchanged)
- `/opt/epsm/backend/config/asgi.py` - ASGI routing (unchanged)

## Known Issue - HTML Results Not Found
The simulations are completing and calculating GWP/cost correctly, but EnergyPlus is not generating the `output.htm` file. This causes all variants to be marked with `status: 'error'` even though they have valid results:

```
'error': 'HTML results file not found'
'status': 'error'
'gwp_total': 330193.01
'cost_total': 2855836.41
```

This is a separate issue from the WebSocket fix and needs investigation in the EnergyPlus simulation runner.

## Impact
- ✅ Real-time WebSocket progress updates now working
- ✅ Simulation status updates visible in frontend
- ✅ Progress bar updates in real-time
- ⚠️ Results marked as errors due to missing HTML files (separate issue)

## Testing
To test WebSocket functionality:
1. Navigate to Simulation page
2. Select a scenario
3. Upload IDF and EPW files
4. Click "Start Simulation"
5. Observe console logs: Should see "Connected to simulation progress WebSocket"
6. Observe progress bar: Should update in real-time (2-second intervals via polling, instant via WebSocket)

---

**Status**: ✅ FIXED - WebSocket connections now working
**Date**: October 12, 2025
**Version**: 0.2.2
