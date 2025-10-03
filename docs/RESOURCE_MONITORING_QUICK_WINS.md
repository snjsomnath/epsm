# Quick Wins: Resource Monitoring Improvements

This guide provides **copy-paste ready code** for the highest-value, lowest-risk improvements to the resource monitoring system.

## 1. Add TypeScript Types (15 minutes) ⚡

### Create `frontend/src/types/resource-monitor.ts`:

```typescript
/**
 * System resource monitoring types
 */

export interface CpuStats {
  usage_percent: number;
  physical_cores: number;
  logical_cores: number;
}

export interface MemoryStats {
  total_gb: number;
  available_gb: number;
  usage_percent: number;
}

export interface DiskStats {
  total_gb: number;
  free_gb: number;
  usage_percent: number;
}

export interface NetworkStats {
  bytes_sent_per_sec: number;
  bytes_recv_per_sec: number;
  total_bytes_sent?: number;
  total_bytes_recv?: number;
}

export interface EnergyPlusInfo {
  docker_available: boolean;
  container_image: string;
  status: string;
  exists: boolean;
  version?: string;
}

export interface PlatformInfo {
  system: string;
  release: string;
  python: string;
}

export interface SystemResourceStats {
  cpu?: CpuStats;
  memory?: MemoryStats;
  disk?: DiskStats;
  network?: NetworkStats;
  energyplus?: EnergyPlusInfo;
  platform?: PlatformInfo;
  received_at?: string;
  error?: string;
}

export interface ResourceHistory {
  index: number;
  value: number;
  time: string;
}

export interface ResourceMonitorConfig {
  wsUrl: string;
  updateInterval?: number;
  historySize?: number;
  staleThreshold?: number;
  enabled?: boolean;
}
```

### Update SimulationPage.tsx:

```typescript
import type { SystemResourceStats, ResourceHistory } from '../../types/resource-monitor';

// Replace:
const [resourceStats, setResourceStats] = useState<any>(null);
// With:
const [resourceStats, setResourceStats] = useState<SystemResourceStats | null>(null);

// Replace:
const [cpuHistory, setCpuHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
// With:
const [cpuHistory, setCpuHistory] = useState<ResourceHistory[]>([]);
```

---

## 2. Extract Utility Functions (10 minutes) ⚡

### Create `frontend/src/utils/resource-monitor.ts`:

```typescript
/**
 * Utility functions for resource monitoring
 */

/**
 * Safely convert any value to a finite number, defaulting to 0
 */
export function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Clamp a percentage value between 0 and 100
 */
export function clampPercent(value: unknown): number {
  const num = toNumber(value);
  return Math.min(100, Math.max(0, Math.round(num)));
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get WebSocket URL based on environment
 */
export function getWebSocketUrl(path: string): string {
  const isDev = import.meta.env.DEV;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (isDev) {
    // Development: direct to backend
    const host = import.meta.env.VITE_BACKEND_HOST || 'localhost';
    const port = import.meta.env.VITE_BACKEND_PORT || '8000';
    return `${protocol}//${host}:${port}${path}`;
  } else {
    // Production: same origin (assumes reverse proxy)
    return `${protocol}//${window.location.host}${path}`;
  }
}

/**
 * Get severity color based on percentage
 */
export function getSeverityColor(percent: number): 'success' | 'warning' | 'error' {
  if (percent > 80) return 'error';
  if (percent > 60) return 'warning';
  return 'success';
}

/**
 * Add item to history array with size limit
 */
export function addToHistory<T>(
  history: T[],
  item: T,
  maxSize: number
): T[] {
  return [...history, item].slice(-maxSize);
}
```

### Update your components:

```typescript
import { toNumber, clampPercent, getWebSocketUrl, formatBytes } from '../../utils/resource-monitor';

// Remove the local toNumber and clampPercent functions
// Use the imported ones instead
```

---

## 3. Fix Duplicate useEffect (5 minutes) ⚡

### In SimulationPage.tsx, remove lines ~420-470:

**DELETE THIS BLOCK:**
```typescript
// Update resource stats history when new data arrives - ONLY when we have valid data
useEffect(() => {
  if (!resourceStats || !resourceStats.cpu) return;
  
  const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
  setHistoryIndex(prev => prev + 1);
  
  // Update CPU history safely
  setCpuHistory(prev => {
    const newData = [...prev, {
      index: historyIndex, 
      value: resourceStats.cpu?.usage_percent || 0,
      time: timestamp
    }];
    return newData.slice(-MAX_HISTORY_POINTS);
  });
  // ... rest of duplicate logic
}, [resourceStats, historyIndex]);
```

**Why?** This duplicates the history update logic already in the WebSocket `onmessage` handler (lines 245-277).

---

## 4. Improve Backend Logging (10 minutes) ⚡

### Update `backend/simulation/consumers.py`:

```python
import asyncio
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class SystemResourceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        client_info = self.scope.get('client', 'unknown')
        logger.info(f"Resource monitor WebSocket connected: {client_info}")
        
        await self.accept()
        await self.send(text_data=json.dumps({"message": "connected"}))
        
        self.keep_running = True
        self.send_task = asyncio.create_task(self.send_resource_updates())

    async def disconnect(self, close_code):
        logger.info(f"Resource monitor WebSocket disconnecting: code={close_code}")
        
        self.keep_running = False
        if hasattr(self, "send_task"):
            self.send_task.cancel()
            try:
                await self.send_task
            except asyncio.CancelledError:
                pass

    async def receive(self, text_data=None, bytes_data=None):
        # Optionally handle ping/pong for keep-alive
        if text_data:
            try:
                data = json.loads(text_data)
                if data.get('type') == 'ping':
                    await self.send(text_data=json.dumps({'type': 'pong'}))
            except json.JSONDecodeError:
                logger.warning(f"Received invalid JSON: {text_data}")

    async def send_resource_updates(self):
        try:
            from .services import get_resource_utilisation
            
            while self.keep_running:
                try:
                    data = get_resource_utilisation()
                    await self.send(text_data=json.dumps({
                        "status": "ok",
                        "data": data
                    }))
                except Exception as e:
                    logger.error(f"Error collecting resource data: {e}", exc_info=True)
                    # Send minimal error response to maintain heartbeat
                    await self.send(text_data=json.dumps({
                        "status": "error",
                        "message": "Failed to collect metrics",
                        "data": {
                            "cpu": {"usage_percent": 0},
                            "memory": {"usage_percent": 0}
                        }
                    }))

                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            logger.debug("Resource update task cancelled")
        except Exception as e:
            logger.error(f"Unexpected error in send_resource_updates: {e}", exc_info=True)
            await self.close()
```

---

## 5. Add Configuration File (10 minutes) ⚡

### Create `frontend/src/config/resource-monitor.ts`:

```typescript
export const RESOURCE_MONITOR_CONFIG = {
  // WebSocket settings
  wsPath: '/ws/system-resources/',
  wsPort: import.meta.env.VITE_BACKEND_PORT || '8000',
  
  // Update frequency
  updateInterval: parseInt(import.meta.env.VITE_MONITOR_UPDATE_INTERVAL || '1000', 10),
  
  // History settings
  historySize: parseInt(import.meta.env.VITE_MONITOR_HISTORY_SIZE || '60', 10),
  
  // Staleness detection
  staleThreshold: parseInt(import.meta.env.VITE_MONITOR_STALE_THRESHOLD || '5000', 10),
  
  // Reconnection settings
  reconnect: {
    maxRetries: 10,
    connectionTimeout: 5000,
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1000,
  }
} as const;
```

### Create `.env` files:

**`frontend/.env.development`:**
```bash
VITE_BACKEND_HOST=localhost
VITE_BACKEND_PORT=8000
VITE_MONITOR_UPDATE_INTERVAL=1000
VITE_MONITOR_HISTORY_SIZE=60
VITE_MONITOR_STALE_THRESHOLD=5000
```

**`frontend/.env.production`:**
```bash
# Production uses same-origin via reverse proxy
VITE_MONITOR_UPDATE_INTERVAL=2000
VITE_MONITOR_HISTORY_SIZE=30
VITE_MONITOR_STALE_THRESHOLD=10000
```

### Update SimulationPage.tsx:

```typescript
import { RESOURCE_MONITOR_CONFIG } from '../../config/resource-monitor';

// Replace hardcoded values:
const MAX_HISTORY_POINTS = RESOURCE_MONITOR_CONFIG.historySize;

// In useEffect:
const age = Date.now() - lastResourceAt;
setMonitorStale(age > RESOURCE_MONITOR_CONFIG.staleThreshold);
```

---

## 6. Add Error Boundary (15 minutes) ⚡

### Create `frontend/src/components/common/ErrorBoundary.tsx`:

```typescript
import React, { Component, ReactNode } from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 3 }}>
          <Alert 
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={this.handleReset}>
                Retry
              </Button>
            }
          >
            <AlertTitle>Something went wrong</AlertTitle>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

### Wrap resource monitoring components:

```typescript
import { ErrorBoundary } from '../common/ErrorBoundary';

// In SimulationPage:
<ErrorBoundary>
  <Card>
    <CardContent>
      <Typography variant="h6">System Resources Monitor</Typography>
      {/* Resource monitoring UI */}
    </CardContent>
  </Card>
</ErrorBoundary>
```

---

## 7. Add Loading States (10 minutes) ⚡

### Update SimulationPage.tsx:

```typescript
const [monitorLoading, setMonitorLoading] = useState(true);

// In WebSocket useEffect:
ws.onopen = () => {
  setWsConnected(true);
  setWsError(null);
  setMonitorLoading(false);  // ✅ Add this
};

// In render:
{monitorLoading ? (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
    <CircularProgress />
  </Box>
) : (
  // Resource monitoring UI
)}
```

---

## 8. Add Backend Configuration (10 minutes) ⚡

### Update `backend/config/settings.py`:

```python
import os

# Resource Monitoring Settings
RESOURCE_MONITOR = {
    'UPDATE_INTERVAL': float(os.getenv('RESOURCE_MONITOR_UPDATE_INTERVAL', 1.0)),
    'MAX_CLIENTS': int(os.getenv('RESOURCE_MONITOR_MAX_CLIENTS', 100)),
    'ENABLE_NETWORK_STATS': os.getenv('RESOURCE_MONITOR_ENABLE_NETWORK', 'true').lower() == 'true',
    'ENABLE_DISK_STATS': os.getenv('RESOURCE_MONITOR_ENABLE_DISK', 'true').lower() == 'true',
}
```

### Update `consumers.py`:

```python
from django.conf import settings

async def send_resource_updates(self):
    # ...
    update_interval = settings.RESOURCE_MONITOR['UPDATE_INTERVAL']
    await asyncio.sleep(update_interval)
```

---

## Implementation Checklist

Use this checklist to track your progress:

### Phase 1: Type Safety (30 minutes total)
- [ ] Create `types/resource-monitor.ts`
- [ ] Create `utils/resource-monitor.ts`
- [ ] Update SimulationPage.tsx to use types
- [ ] Update HomePage.tsx to use shared utilities
- [ ] Test: No TypeScript errors

### Phase 2: Code Cleanup (25 minutes total)
- [ ] Remove duplicate useEffect in SimulationPage
- [ ] Update backend logging in consumers.py
- [ ] Create configuration files
- [ ] Add ErrorBoundary component
- [ ] Add loading states
- [ ] Test: Functionality unchanged

### Phase 3: Backend Improvements (10 minutes total)
- [ ] Add backend configuration in settings.py
- [ ] Update consumers.py to use config
- [ ] Add environment variables to docker-compose
- [ ] Test: Backend still works

### Total Time: ~65 minutes for all quick wins! ⚡

---

## Testing Checklist

After implementing the changes:

- [ ] Frontend compiles without TypeScript errors
- [ ] Backend starts without errors
- [ ] WebSocket connects successfully
- [ ] Resource cards update every second
- [ ] History charts render smoothly
- [ ] Staleness warning appears after 5 seconds of no data
- [ ] Error boundary catches and displays errors
- [ ] Configuration changes take effect
- [ ] No console errors in browser
- [ ] No Python exceptions in backend logs

---

## Next Steps

After completing these quick wins, consider:

1. **Extract Custom Hook** - See `RESOURCE_MONITORING_REVIEW.md` Phase 2
2. **Add Component Tests** - Test ResourceCards, ResourceCharts separately
3. **Performance Monitoring** - Measure render times, WebSocket latency
4. **Documentation** - Update API docs with new types

---

## Need Help?

- **TypeScript Errors**: Check import paths and type definitions
- **WebSocket Not Connecting**: Verify backend is running on port 8000
- **Changes Not Showing**: Clear browser cache, restart dev server
- **Backend Errors**: Check Django logs, ensure psutil is installed

Good luck! 🚀
