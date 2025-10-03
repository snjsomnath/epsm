# Resource Monitoring Implementation Review

**Date**: October 3, 2025  
**Reviewer**: Architecture Analysis  
**Component**: Real-time Resource Monitoring System

## Executive Summary

The current implementation is **functional and well-structured** for a production application, but there are several opportunities for improvement in terms of:
- Code organization and reusability
- Performance optimization
- Type safety
- Separation of concerns
- Testing and maintainability

## Overall Assessment: ⭐⭐⭐⭐ (4/5 Stars)

### Strengths ✅
1. **Solid architecture** - WebSocket-based real-time updates
2. **Graceful degradation** - Fallback to polling, dummy data mode
3. **Error handling** - Comprehensive error boundaries
4. **User feedback** - Staleness detection, connection status
5. **Performance conscious** - Deduplication, windowing, disabled animations

### Areas for Improvement 🔧
1. Component is too large (800+ lines)
2. Resource monitoring logic tightly coupled to simulation page
3. Duplicate history update logic
4. Missing TypeScript types
5. No custom hooks for reusability
6. Limited testing surface

---

## Detailed Analysis

### 1. Code Organization Issues

#### Problem: Monolithic Component
**Current State**: `SimulationPage.tsx` is ~1,800 lines with multiple responsibilities:
- Simulation control
- File uploads
- Resource monitoring
- Queue management
- Results display

**Impact**: 
- Hard to test individual features
- Difficult to maintain
- Poor reusability
- Higher cognitive load

**Recommendation**: Extract into smaller, focused components:

```
simulation/
├── SimulationPage.tsx (orchestrator)
├── SimulationControl/
│   ├── SimulationControlPanel.tsx
│   ├── FileUploadDialog.tsx
│   └── QueueMetricsCard.tsx
├── ResourceMonitor/
│   ├── ResourceMonitorCard.tsx
│   ├── ResourceCards.tsx
│   ├── ResourceCharts.tsx
│   └── useResourceMonitor.ts (custom hook)
└── Results/
    └── SimulationResultsView.tsx
```

---

### 2. Missing Custom Hooks

#### Problem: Resource Monitoring Logic in Component
**Current State**: 100+ lines of WebSocket/state logic directly in `SimulationPage`

**Better Approach**: Extract to custom hook `useResourceMonitor.ts`:

```typescript
// hooks/useResourceMonitor.ts
export interface ResourceStats {
  cpu: {
    usage_percent: number;
    physical_cores: number;
    logical_cores: number;
  };
  memory: {
    total_gb: number;
    available_gb: number;
    usage_percent: number;
  };
  disk: {
    total_gb: number;
    free_gb: number;
    usage_percent: number;
  };
  network: {
    bytes_sent_per_sec: number;
    bytes_recv_per_sec: number;
  };
}

export interface ResourceHistory {
  index: number;
  value: number;
  time: string;
}

export interface UseResourceMonitorReturn {
  resourceStats: ResourceStats | null;
  cpuHistory: ResourceHistory[];
  memoryHistory: ResourceHistory[];
  diskHistory: ResourceHistory[];
  networkHistory: ResourceHistory[];
  isConnected: boolean;
  isStale: boolean;
  error: string | null;
}

export function useResourceMonitor(
  backendUrl: string,
  options?: {
    enabled?: boolean;
    updateInterval?: number;
    historySize?: number;
  }
): UseResourceMonitorReturn {
  // All WebSocket logic here
  // State management
  // History updates
  // Error handling
}
```

**Benefits**:
- ✅ Reusable across components (HomePage, SimulationPage, etc.)
- ✅ Testable in isolation
- ✅ Type-safe
- ✅ Configurable
- ✅ Clear API

---

### 3. Type Safety Issues

#### Problem: Excessive `any` Types
**Current Issues**:
```typescript
const [resourceStats, setResourceStats] = useState<any>(null);  // ❌
const [systemResources, setSystemResources] = useState<any>(null);  // ❌
```

**Better Approach**:
```typescript
// types/resource-monitor.ts
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

export interface SystemResourceStats {
  cpu?: CpuStats;
  memory?: MemoryStats;
  disk?: DiskStats;
  network?: NetworkStats;
  received_at?: string;
}

// Usage
const [resourceStats, setResourceStats] = useState<SystemResourceStats | null>(null);
```

**Benefits**:
- ✅ Type checking at compile time
- ✅ Better IDE autocomplete
- ✅ Self-documenting code
- ✅ Catch errors early

---

### 4. Duplicate History Update Logic

#### Problem: Repeated Code Pattern
**Current State**: Similar code blocks for CPU, Memory, Disk, Network:

```typescript
if (cpu) {
  setCpuHistory(prev => {
    const newData = [...prev, { index: next, value: cpu.usage_percent || 0, time: timeLabel }];
    return newData.slice(-MAX_HISTORY_POINTS);
  });
}

if (memory) {
  setMemoryHistory(prev => {
    const newData = [...prev, { index: next, value: memory.usage_percent || 0, time: timeLabel }];
    return newData.slice(-MAX_HISTORY_POINTS);
  });
}
// ... repeated for disk, network
```

**Better Approach**: Generic helper function:

```typescript
function updateHistory<T>(
  setter: React.Dispatch<React.SetStateAction<T[]>>,
  newValue: T,
  maxSize: number
): void {
  setter(prev => {
    const newData = [...prev, newValue];
    return newData.slice(-maxSize);
  });
}

// Usage
if (cpu) {
  updateHistory(setCpuHistory, {
    index: next,
    value: cpu.usage_percent || 0,
    time: timeLabel
  }, MAX_HISTORY_POINTS);
}
```

**Even Better**: Use a reducer pattern:

```typescript
type HistoryAction = 
  | { type: 'ADD_CPU'; payload: { index: number; value: number; time: string } }
  | { type: 'ADD_MEMORY'; payload: { index: number; value: number; time: string } }
  | { type: 'ADD_DISK'; payload: { index: number; value: number; time: string } }
  | { type: 'ADD_NETWORK'; payload: { index: number; value: number; time: string } }
  | { type: 'CLEAR_ALL' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'ADD_CPU':
      return {
        ...state,
        cpu: [...state.cpu, action.payload].slice(-MAX_HISTORY_POINTS)
      };
    // ... other cases
  }
}

const [histories, dispatch] = useReducer(historyReducer, initialState);
```

---

### 5. Backend: Logging & Error Handling

#### Problem: Print Statements for Production
**Current State** (`consumers.py`):
```python
print(f"New WebSocket connection from {self.scope.get('client', 'unknown')}")
print(f"Error getting resource data: {e}")
print(f"Unexpected error in send_resource_updates: {e}")
```

**Better Approach**: Use Python's `logging` module:

```python
import logging

logger = logging.getLogger(__name__)

class SystemResourceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        client = self.scope.get('client', 'unknown')
        logger.info(f"Resource monitor connected: {client}")
        await self.accept()
        # ...
    
    async def send_resource_updates(self):
        try:
            # ...
        except Exception as e:
            logger.error(f"Error in resource updates: {e}", exc_info=True)
            await self.close()
```

**Benefits**:
- ✅ Log levels (DEBUG, INFO, WARNING, ERROR)
- ✅ Structured logging (can add context)
- ✅ Production-ready (log to files, external services)
- ✅ Better debugging

---

### 6. Backend: Error Recovery

#### Problem: Silent Failures
**Current State**: If `get_resource_utilisation()` fails, sends nothing:

```python
try:
    data = get_resource_utilisation()
    await self.send(text_data=json.dumps(data))
except Exception as e:
    print(f"Error getting resource data: {e}")
    # No data sent - client might timeout
```

**Better Approach**: Send error indicator to client:

```python
try:
    data = get_resource_utilisation()
    await self.send(text_data=json.dumps({
        "status": "ok",
        "data": data
    }))
except Exception as e:
    logger.error(f"Error getting resource data: {e}", exc_info=True)
    await self.send(text_data=json.dumps({
        "status": "error",
        "message": "Failed to collect metrics",
        "data": {
            "cpu": {"usage_percent": 0},
            "memory": {"usage_percent": 0}
        }
    }))
```

**Benefits**:
- ✅ Client knows about errors
- ✅ Can show specific warnings
- ✅ Maintains heartbeat
- ✅ Better UX

---

### 7. Performance Optimizations

#### Issue: Unnecessary Re-renders
**Current State**: Multiple state updates in rapid succession can cause cascading re-renders.

**Better Approach**: Batch updates with `useReducer` or single state object:

```typescript
// Instead of 20+ individual useState calls:
interface SimulationState {
  simulation: {
    selectedScenario: string;
    isRunning: boolean;
    isPaused: boolean;
    progress: number;
    completedSimulations: number;
    totalSimulations: number;
  };
  resources: {
    stats: SystemResourceStats | null;
    lastUpdateAt: number | null;
    isStale: boolean;
    histories: {
      cpu: ResourceHistory[];
      memory: ResourceHistory[];
      disk: ResourceHistory[];
      network: ResourceHistory[];
    };
  };
  ui: {
    confirmDialogOpen: boolean;
    uploadDialogOpen: boolean;
    snackbar: SnackbarState;
  };
}

const [state, dispatch] = useReducer(simulationReducer, initialState);
```

**Benefits**:
- ✅ Single source of truth
- ✅ Atomic updates
- ✅ Easier to debug (Redux DevTools)
- ✅ Better performance

#### Issue: Chart Re-renders
**Current State**: Charts re-render on every data point update.

**Better Approach**: Memoize chart components:

```typescript
const CpuHistoryChart = React.memo<{ data: ResourceHistory[] }>(
  ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        {/* ... */}
      </LineChart>
    </ResponsiveContainer>
  ),
  (prev, next) => prev.data.length === next.data.length && 
                  prev.data[prev.data.length - 1]?.value === next.data[next.data.length - 1]?.value
);
```

---

### 8. Testing Gaps

#### Problem: No Tests Visible
**Missing Coverage**:
- Unit tests for utility functions (`clampPercent`, `toNumber`)
- Integration tests for WebSocket connection
- Component tests for SimulationPage
- E2E tests for simulation workflow

**Recommended Tests**:

```typescript
// utils/resource-monitor.test.ts
describe('clampPercent', () => {
  it('should clamp negative values to 0', () => {
    expect(clampPercent(-10)).toBe(0);
  });
  
  it('should clamp values over 100 to 100', () => {
    expect(clampPercent(150)).toBe(100);
  });
  
  it('should round to nearest integer', () => {
    expect(clampPercent(45.7)).toBe(46);
  });
});

// hooks/useResourceMonitor.test.ts
describe('useResourceMonitor', () => {
  it('should connect to WebSocket on mount', async () => {
    const { result } = renderHook(() => useResourceMonitor('ws://localhost:8000'));
    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });
  
  it('should update history when receiving data', async () => {
    // Mock WebSocket messages
    // Assert history updates
  });
});
```

---

### 9. Configuration Management

#### Problem: Hardcoded Values
**Current Issues**:
```typescript
const wsPort = '8000';  // ❌ Hardcoded
const MAX_HISTORY_POINTS = 60;  // ❌ Not configurable
await asyncio.sleep(1)  # ❌ Fixed update interval
```

**Better Approach**: Environment variables + config:

```typescript
// config/resource-monitor.ts
export const RESOURCE_MONITOR_CONFIG = {
  wsPort: import.meta.env.VITE_BACKEND_PORT || '8000',
  wsPath: '/ws/system-resources/',
  updateInterval: parseInt(import.meta.env.VITE_MONITOR_UPDATE_INTERVAL || '1000'),
  historySize: parseInt(import.meta.env.VITE_MONITOR_HISTORY_SIZE || '60'),
  staleThreshold: parseInt(import.meta.env.VITE_MONITOR_STALE_THRESHOLD || '5000'),
} as const;
```

```python
# settings.py
RESOURCE_MONITOR_UPDATE_INTERVAL = float(os.getenv('RESOURCE_MONITOR_UPDATE_INTERVAL', 1.0))
RESOURCE_MONITOR_MAX_CLIENTS = int(os.getenv('RESOURCE_MONITOR_MAX_CLIENTS', 100))
```

---

### 10. Documentation Gaps

#### Missing Documentation:
1. **API Contract**: What exact JSON shape does WebSocket send?
2. **Error Codes**: Standardized error messages
3. **Performance Metrics**: Expected latency, throughput
4. **Scaling Limits**: How many concurrent clients?
5. **Debugging Guide**: How to troubleshoot connection issues?

**Recommendation**: Create OpenAPI-style spec for WebSocket:

```yaml
# docs/websocket-api.yaml
paths:
  /ws/system-resources/:
    websocket:
      summary: Real-time system resource monitoring
      description: |
        Streams system resource metrics every 1 second.
        Auto-reconnects on disconnection.
      
      messages:
        connected:
          payload:
            type: object
            properties:
              message:
                type: string
                enum: [connected]
        
        resource_update:
          payload:
            $ref: '#/components/schemas/SystemResourceStats'
      
      errors:
        connection_failed:
          description: Failed to establish WebSocket connection
          code: 1006
```

---

## Recommended Refactoring Plan

### Phase 1: Type Safety (Low Risk, High Value)
**Effort**: 2-4 hours
1. Create `types/resource-monitor.ts` with proper interfaces
2. Replace `any` types throughout codebase
3. Add TypeScript strict mode for resource monitoring files

### Phase 2: Extract Custom Hook (Medium Risk, High Value)
**Effort**: 4-6 hours
1. Create `hooks/useResourceMonitor.ts`
2. Move WebSocket logic from SimulationPage
3. Add unit tests for hook
4. Update SimulationPage to use hook
5. Refactor HomePage to use same hook (remove duplication)

### Phase 3: Component Decomposition (Medium Risk, High Value)
**Effort**: 6-8 hours
1. Extract `ResourceMonitorCard.tsx`
2. Extract `ResourceCharts.tsx`
3. Extract `QueueMetricsCard.tsx`
4. Update SimulationPage to compose these components
5. Add component-level tests

### Phase 4: Backend Improvements (Low Risk, Medium Value)
**Effort**: 2-3 hours
1. Replace `print()` with `logger`
2. Add structured error responses
3. Add configuration for update interval
4. Add metrics/telemetry (optional)

### Phase 5: Testing & Documentation (Low Risk, High Value)
**Effort**: 4-6 hours
1. Add unit tests for utilities
2. Add integration tests for WebSocket
3. Add component tests
4. Document WebSocket API contract
5. Create troubleshooting guide

---

## Alternative Architectures to Consider

### Option 1: Server-Sent Events (SSE)
**Instead of WebSocket, use SSE for one-way data flow**

**Pros**:
- ✅ Simpler than WebSocket (HTTP-based)
- ✅ Auto-reconnect built-in
- ✅ Better browser support
- ✅ Works through proxies more reliably

**Cons**:
- ❌ One-way only (server → client)
- ❌ No binary data support
- ❌ Connection limit per domain (6 in most browsers)

**When to use**: If you never need client → server messages for monitoring

### Option 2: GraphQL Subscriptions
**Use GraphQL over WebSocket**

**Pros**:
- ✅ Strongly typed schema
- ✅ Client can request specific fields
- ✅ Better tooling (GraphiQL, Apollo DevTools)
- ✅ Unified API (queries + subscriptions)

**Cons**:
- ❌ More complex setup
- ❌ Heavier payload
- ❌ Overkill for simple monitoring

**When to use**: If you're already using GraphQL

### Option 3: Polling with HTTP/2
**Long polling or short polling with HTTP/2 multiplexing**

**Pros**:
- ✅ No WebSocket infrastructure needed
- ✅ Simpler deployment
- ✅ Better caching options
- ✅ Easier to debug (standard HTTP)

**Cons**:
- ❌ Higher latency than WebSocket
- ❌ More server resources (short polling)
- ❌ Complexity managing long polls

**When to use**: For compatibility or if WebSocket is blocked

---

## Specific Code Improvements

### Improvement 1: Duplicate useEffect for History

**Current Problem** (lines 420-470):
```typescript
useEffect(() => {
  if (!resourceStats || !resourceStats.cpu) return;
  
  const timestamp = new Date().toLocaleTimeString(/*...*/);
  setHistoryIndex(prev => prev + 1);
  
  setCpuHistory(prev => {/*...*/});
  setMemoryHistory(prev => {/*...*/});
  // ... duplicates the logic from WebSocket onmessage handler
}, [resourceStats, historyIndex]);
```

**Issue**: 
- This `useEffect` duplicates history update logic already in WebSocket `onmessage`
- Creates potential race condition
- Runs on every `resourceStats` change

**Fix**: Remove this `useEffect` - history is already updated in WebSocket handler (lines 245-277)

### Improvement 2: Helper Functions Inside Component

**Current State** (lines 312-322):
```typescript
const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const clampPercent = (v: any) => {
  const n = toNumber(v);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
};
```

**Issue**: 
- Recreated on every render
- Duplicated in HomePage.tsx
- Not type-safe

**Fix**: Move to shared utilities:

```typescript
// utils/resource-monitor.ts
export function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function clampPercent(value: unknown): number {
  const num = toNumber(value);
  return Math.min(100, Math.max(0, Math.round(num)));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
```

### Improvement 3: Better WebSocket URL Construction

**Current State** (lines 180-183):
```typescript
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsHost = window.location.hostname || 'localhost';
const wsPort = '8000'; // <-- hardcoded backend port
const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}/ws/system-resources/`;
```

**Issue**:
- Hardcoded port breaks in production
- Doesn't respect reverse proxy setups
- No fallback logic

**Better Approach**:

```typescript
// utils/websocket.ts
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

// Usage
const wsUrl = getWebSocketUrl('/ws/system-resources/');
```

---

## Security Considerations

### Current Issues:
1. **No authentication on WebSocket**: Anyone can connect
2. **No rate limiting**: Client can overwhelm server
3. **No validation**: Accepts any WebSocket client

### Recommendations:

```python
# consumers.py
class SystemResourceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Add authentication
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)  # Unauthorized
            return
        
        # Rate limiting (check Redis for connection count)
        connection_count = await get_user_connection_count(user.id)
        if connection_count >= MAX_CONNECTIONS_PER_USER:
            await self.close(code=4002)  # Too many connections
            return
        
        await self.accept()
        await increment_user_connection_count(user.id)
        # ...
```

```typescript
// Frontend: Send auth token
const ws = new ReconnectingWebSocket(wsUrl, [], {
  connectionTimeout: 5000,
  maxRetries: 10,
  WebSocket: class extends WebSocket {
    constructor(url: string, protocols?: string | string[]) {
      const token = localStorage.getItem('auth_token');
      const authUrl = `${url}?token=${token}`;
      super(authUrl, protocols);
    }
  }
});
```

---

## Performance Benchmarks

### Current Performance (Estimated):
- **Backend**: ~5ms to collect metrics (psutil)
- **Network**: ~50ms round-trip (local)
- **Frontend**: ~10ms to process and render
- **Memory**: ~1MB per client (WebSocket + history)
- **CPU**: ~0.1% per client

### Scalability Limits:
- **Max concurrent clients**: ~1,000 (depends on system)
- **Max update frequency**: 10 Hz (100ms interval)
- **History memory**: 60 points × 4 metrics × 24 bytes = ~5.7 KB per client

### Optimization Opportunities:
1. **Lazy loading**: Don't connect until monitoring card is visible
2. **Throttling**: Allow user to reduce update frequency
3. **Compression**: Use binary format (Protocol Buffers, MessagePack)
4. **Sampling**: Send averages over 5-second windows instead of raw data

---

## Conclusion

### Is This the Best Way? 

**Short Answer**: It's a **solid 80/20 implementation** - handles the common cases well but has room for improvement.

### What's Good:
✅ WebSocket-based real-time updates  
✅ Graceful degradation and error handling  
✅ User feedback (staleness, connection status)  
✅ Performance optimizations (deduplication, windowing)  
✅ Works well for the intended use case

### What Could Be Better:
🔧 Extract into reusable custom hook  
🔧 Add proper TypeScript types  
🔧 Decompose monolithic component  
🔧 Improve backend logging and error handling  
🔧 Add comprehensive testing  
🔧 Better configuration management  

### When to Refactor:
- ✅ **Now**: Type safety improvements (low risk, high value)
- ✅ **Soon**: Extract custom hook for reusability
- ⏳ **Later**: Consider alternative architectures (SSE, GraphQL) if requirements change
- ⏳ **Eventually**: Full decomposition and testing suite

### Bottom Line:
The current implementation is **production-ready** but would benefit from the refactoring outlined above. Prioritize:
1. Type safety (quick win)
2. Custom hook extraction (reusability)
3. Testing (confidence for future changes)

**Recommendation**: Adopt the **Phase 1-2** refactoring plan (8-10 hours total) for immediate improvements, then plan **Phase 3-5** based on team capacity and priorities.
