# Resource Monitoring Architecture

## Overview

The simulation frontend page implements a comprehensive real-time resource monitoring system that tracks CPU, memory, disk, and network usage during batch simulations. This document explains how the monitoring system is architected and how data flows from the backend to the frontend.

## Architecture Components

### 1. Backend Components

#### 1.1 Data Collection (`backend/simulation/utils.py`)

The `get_system_resources()` function is the core data collection utility:

**Dependencies:**
- `psutil` - Python library for system and process utilities

**Data Collected:**
```python
{
    'cpu': {
        'logical_cores': int,      # Total logical CPU cores
        'physical_cores': int,     # Physical CPU cores
        'usage_percent': float     # Current CPU usage (0-100)
    },
    'memory': {
        'total_gb': float,         # Total RAM in GB
        'available_gb': float,     # Available RAM in GB
        'usage_percent': float     # Memory usage percentage
    },
    'disk': {
        'total_gb': float,         # Total disk space
        'free_gb': float,          # Free disk space
        'usage_percent': float     # Disk usage percentage
    },
    'network': {
        'bytes_sent_per_sec': float,    # Upload rate
        'bytes_recv_per_sec': float,    # Download rate
        'total_bytes_sent': int,        # Cumulative sent
        'total_bytes_recv': int         # Cumulative received
    },
    'energyplus': {
        'docker_available': bool,
        'container_image': str,
        'status': str,
        'exists': bool,
        'version': str (optional)
    },
    'platform': {
        'system': str,             # OS name (e.g., 'Darwin', 'Linux')
        'release': str,            # OS version
        'python': str              # Python version
    }
}
```

**Network Rate Calculation:**
The function maintains state between calls to calculate network I/O rates:
- Stores previous network counters and timestamp
- Calculates delta bytes / delta time on each call
- First call returns 0 to establish baseline

#### 1.2 WebSocket Consumer (`backend/simulation/consumers.py`)

**SystemResourceConsumer Class:**
```python
class SystemResourceConsumer(AsyncWebsocketConsumer):
    # Handles WebSocket connections at ws://host:8000/ws/system-resources/
    
    async def connect(self):
        # Accept connection
        # Send initial "connected" message
        # Start background task to send updates
    
    async def send_resource_updates(self):
        # Loop every 1 second
        # Call get_resource_utilisation()
        # Send JSON data to client
        # Handle errors gracefully
    
    async def disconnect(self, close_code):
        # Cancel background task
        # Clean up resources
```

**Key Features:**
- 1-second update interval
- Automatic reconnection via `ReconnectingWebSocket` on frontend
- Error handling with graceful degradation
- Async/await pattern for non-blocking I/O

#### 1.3 Routing Configuration

**WebSocket Routes (`backend/simulation/routing.py`):**
```python
websocket_urlpatterns = [
    re_path(r'^ws/system-resources/?$', SystemResourceConsumer.as_asgi()),
    re_path(r'^ws/simulation-progress/(?P<simulation_id>[0-9a-fA-F-]+)/?$', 
            SimulationProgressConsumer.as_asgi()),
]
```

**ASGI Configuration (`backend/config/asgi.py`):**
```python
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(simulation.routing.websocket_urlpatterns),
})
```

**HTTP Fallback Endpoint:**
- URL: `/api/simulation/system-resources/`
- Used for backend availability checks
- Also used in Docker healthchecks

### 2. Frontend Components

#### 2.1 Main Component (`frontend/src/components/simulation/SimulationPage.tsx`)

**State Management:**
```typescript
// Current resource snapshot
const [resourceStats, setResourceStats] = useState<any>(null);

// Last update timestamp for staleness detection
const [lastResourceAt, setLastResourceAt] = useState<number | null>(null);

// Staleness indicator (>5s without update)
const [monitorStale, setMonitorStale] = useState(false);

// Backend availability flag
const [backendAvailable, setBackendAvailable] = useState<boolean>(true);

// WebSocket connection status
const [_wsConnected, setWsConnected] = useState(false);
const [wsError, setWsError] = useState<string | null>(null);

// Time-series history data (last 60 points)
const [cpuHistory, setCpuHistory] = useState<Array<{
    index: number, 
    value: number, 
    time: string
}>>([]);
const [memoryHistory, setMemoryHistory] = useState<...>([]);
const [diskHistory, setDiskHistory] = useState<...>([]);
const [networkHistory, setNetworkHistory] = useState<...>([]);

// Rolling index for history (avoids timestamp-based shifting)
const [historyIndex, setHistoryIndex] = useState(0);
const MAX_HISTORY_POINTS = 60;
```

#### 2.2 WebSocket Connection Setup

**Connection Logic:**
```typescript
useEffect(() => {
    if (!backendAvailable) return;

    // Construct WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname || 'localhost';
    const wsPort = '8000'; // Backend port
    const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}/ws/system-resources/`;

    const ws = new ReconnectingWebSocket(wsUrl);
    
    // Track last message to deduplicate
    const lastMsgRef = { current: '' };

    ws.onopen = () => {
        setWsConnected(true);
        setWsError(null);
    };

    ws.onmessage = (event) => {
        // Parse and normalize data
        // Deduplicate identical consecutive messages
        // Update resourceStats and histories
    };

    ws.onerror = () => {
        setWsConnected(false);
        setWsError("Failed to connect to system monitoring service");
    };

    return () => ws.close();
}, [backendAvailable]);
```

**Data Normalization:**
```typescript
// Clamp percentages to 0-100 range
const clampPercent = (v: any) => {
    const n = toNumber(v);
    if (n < 0) return 0;
    if (n > 100) return 100;
    return Math.round(n);
};

// Normalize incoming data
const cpu = raw.cpu ? {
    usage_percent: clampPercent(raw.cpu.usage_percent),
    physical_cores: toNumber(raw.cpu.physical_cores),
    logical_cores: toNumber(raw.cpu.logical_cores),
} : undefined;
```

#### 2.3 History Management

**Index-Based Approach:**
Instead of timestamp-based keys (which can cause chart shifting), the system uses a monotonically increasing index:

```typescript
setHistoryIndex(prevIndex => {
    const next = prevIndex + 1;
    const timeLabel = new Date().toLocaleTimeString();

    // Update CPU history
    if (cpu) {
        setCpuHistory(prev => {
            const newData = [...prev, { 
                index: next, 
                value: cpu.usage_percent || 0, 
                time: timeLabel 
            }];
            return newData.slice(-MAX_HISTORY_POINTS);
        });
    }
    
    // Similar for memory, disk, network...
    
    return next;
});
```

**Benefits:**
- No chart jitter from timestamp rounding
- Smooth animations
- Consistent X-axis progression
- Automatic windowing (last 60 points)

#### 2.4 Staleness Detection

```typescript
useEffect(() => {
    const interval = setInterval(() => {
        if (!lastResourceAt) {
            setMonitorStale(true);
            return;
        }
        const age = Date.now() - lastResourceAt;
        setMonitorStale(age > 5000); // Stale if >5 seconds old
    }, 2000);
    return () => clearInterval(interval);
}, [lastResourceAt]);
```

### 3. Visualization Components

#### 3.1 Resource Cards

Four cards display current values:
- **CPU Usage**: Percentage + core count
- **Memory**: Percentage + GB used/total
- **Disk**: Percentage + GB used/total
- **Network**: Combined KB/s + upload/download breakdown

```tsx
<Card variant="outlined">
    <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Cpu size={18} />
            <Typography variant="body2">CPU Usage</Typography>
        </Box>
        <Typography variant="h6">
            {clampPercent(resourceStats?.cpu?.usage_percent)}%
        </Typography>
        <Typography variant="caption">
            {resourceStats?.cpu?.physical_cores || 0} cores
        </Typography>
    </CardContent>
</Card>
```

#### 3.2 Time-Series Charts

Four charts using Recharts library:
- CPU Usage History (%)
- Memory Usage History (%)
- Disk Usage History (%)
- Network Activity (KB/s)

**Chart Configuration:**
```tsx
<ResponsiveContainer width="100%" height="100%">
    <LineChart data={cpuHistory}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
            dataKey="index"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={() => ''}
            tick={false}
        />
        <YAxis 
            domain={[0, 100]} 
            tickFormatter={(value) => `${value}%`}
        />
        <RechartsTooltip 
            formatter={(value) => [`${value}%`, 'CPU']}
            labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time}`}
        />
        <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
        />
    </LineChart>
</ResponsiveContainer>
```

**Key Settings:**
- `isAnimationActive={false}` - Prevents janky animations during rapid updates
- `dot={false}` - Cleaner lines for dense data
- `type="number"` on XAxis - Ensures proper spacing with index-based data
- Custom tooltip showing time labels

#### 3.3 CoreLaneView Visualization (`frontend/src/components/simulation/CoreLaneView.tsx`)

A custom SVG-based visualization showing simulation distribution across CPU cores.

**Props:**
```typescript
{
    totalSimulations: number,      // Total number of simulations
    cpuCores: number,             // Number of CPU cores
    completedSimulations: number, // Completed count
    progress: number,             // Overall progress (0-100)
    maxSegments: number,          // Max segments per lane (default 150)
    width: number,                // SVG width
    height: number                // SVG height
}
```

**Features:**
- **Lane-based layout**: One horizontal lane per CPU core
- **Segment aggregation**: If simulations > maxSegments, groups them automatically
- **Progressive rendering**: Shows completed (green), partial (orange), pending (gray)
- **Fractional progress**: Can show partial completion within a segment
- **Interactive tooltips**: Hover shows simulation count and completion status
- **Responsive**: Adapts to container width using ResizeObserver
- **Theme-aware**: Adapts colors for dark/light mode

**Distribution Algorithm:**
```typescript
// Distribute simulations evenly across cores
const perCoreBase = Math.floor(totalSimulations / cores);
const remainder = totalSimulations % cores;
const coreCounts = Array.from({ length: cores }).map((_, i) => 
    perCoreBase + (i < remainder ? 1 : 0)
);

// Distribute completed proportionally
const completedDistribution = coreCounts.map((c) => 
    (c / totalSlots) * fractionalTotalCompleted
);
```

**Segment Aggregation:**
```typescript
if (count <= maxSegments) {
    // Show individual simulations
    return Array.from({ length: count }).map((_, i) => ({
        size: 1,
        completed: i < completed ? 1 : (i === Math.floor(completed) ? partial : 0)
    }));
} else {
    // Aggregate into groups
    const groups = Math.ceil(count / maxSegments);
    const base = Math.floor(count / groups);
    // ... distribute completed across groups
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Backend (Django)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌─────────────────┐           │
│  │   psutil     │────────▶│ get_system_     │           │
│  │  (System     │         │ resources()     │           │
│  │   Metrics)   │         └────────┬────────┘           │
│  └──────────────┘                  │                     │
│                                    │                     │
│                          ┌─────────▼──────────┐          │
│                          │ get_resource_      │          │
│                          │ utilisation()      │          │
│                          └─────────┬──────────┘          │
│                                    │                     │
│                          ┌─────────▼──────────┐          │
│                          │ SystemResource     │          │
│                          │ Consumer           │          │
│                          │ (WebSocket)        │          │
│                          └─────────┬──────────┘          │
│                                    │ 1 sec interval      │
└────────────────────────────────────┼─────────────────────┘
                                     │
                        WebSocket    │ JSON payload
                        ws://host:8000/ws/system-resources/
                                     │
┌────────────────────────────────────▼─────────────────────┐
│                  Frontend (React + TypeScript)            │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────┐                                 │
│  │ ReconnectingWebSocket│                                 │
│  │  Connection          │                                 │
│  └──────────┬───────────┘                                 │
│             │                                              │
│             │ onmessage                                    │
│             ▼                                              │
│  ┌─────────────────────┐                                  │
│  │ Data Normalization  │                                  │
│  │ - clampPercent()    │                                  │
│  │ - toNumber()        │                                  │
│  │ - Deduplication     │                                  │
│  └──────────┬──────────┘                                  │
│             │                                              │
│    ┌────────▼─────────┐                                   │
│    │  State Updates   │                                   │
│    │ - resourceStats  │                                   │
│    │ - lastResourceAt │                                   │
│    │ - histories      │                                   │
│    └────────┬─────────┘                                   │
│             │                                              │
│    ┌────────┴─────────┬──────────┬──────────┐            │
│    ▼                  ▼          ▼          ▼            │
│  ┌─────┐         ┌─────┐    ┌─────┐    ┌──────┐         │
│  │ CPU │         │ Mem │    │Disk │    │ Net  │         │
│  │Card │         │Card │    │Card │    │ Card │         │
│  └─────┘         └─────┘    └─────┘    └──────┘         │
│                                                            │
│  ┌──────────────────────────────────────────────┐         │
│  │     Time-Series Charts (Recharts)            │         │
│  │  - CPU History    - Memory History           │         │
│  │  - Disk History   - Network History          │         │
│  └──────────────────────────────────────────────┘         │
│                                                            │
│  ┌──────────────────────────────────────────────┐         │
│  │     CoreLaneView (Custom SVG)                │         │
│  │  - Per-core simulation distribution          │         │
│  │  - Progressive completion visualization      │         │
│  └──────────────────────────────────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. WebSocket vs Polling
- **Chosen**: WebSocket with automatic reconnection
- **Rationale**: 
  - Lower latency (1s updates)
  - Reduced server load
  - Real-time feel for monitoring
  - HTTP fallback available for health checks

### 2. Index-Based History
- **Chosen**: Monotonic integer index instead of timestamps
- **Rationale**:
  - Prevents chart jitter from timestamp rounding
  - Smooth X-axis progression
  - Simpler tooltip handling
  - Better performance with Recharts

### 3. Deduplication
- **Chosen**: Compare JSON strings to skip identical consecutive messages
- **Rationale**:
  - Reduces unnecessary re-renders
  - Prevents chart flicker
  - Saves CPU on frontend
  - Network efficiency (compression helps identical payloads)

### 4. Staleness Detection
- **Chosen**: 5-second threshold with visual warning
- **Rationale**:
  - User feedback on connection issues
  - Distinguishes stale data from zero activity
  - Allows for network hiccups without false alarms
  - 2-second check interval balances responsiveness/overhead

### 5. Graceful Degradation
- **Chosen**: Fallback to dummy data if backend unavailable
- **Rationale**:
  - Development mode support (no backend)
  - Better UX than hard failures
  - Allows frontend testing independently
  - Clear visual indicators (warnings, disabled features)

### 6. Resource Allocation Hints
- **Chosen**: Calculate suggested workers from available resources
- **Rationale**:
  - Prevents over-subscription
  - Educates users on resource constraints
  - Dynamic based on actual hardware
  - Leaves headroom for system stability

## Performance Considerations

### Backend
- **psutil overhead**: ~0.1s CPU sampling interval balances accuracy/load
- **WebSocket broadcasts**: 1 client = ~1KB/s, scales linearly
- **Network rate calculation**: Stateful but lightweight (2 floats + timestamp)

### Frontend
- **Re-render optimization**: Deduplication + React.memo on charts
- **History windowing**: Fixed 60-point limit prevents memory leaks
- **Chart animations**: Disabled to reduce CPU during rapid updates
- **SVG complexity**: CoreLaneView aggregates segments when >150 to prevent DOM bloat

## Error Handling

### Connection Failures
1. WebSocket connection error → Set `wsError` state
2. Display warning alert with retry button
3. ReconnectingWebSocket auto-retries with exponential backoff
4. User can manually reload page

### Data Parsing Errors
1. Catch JSON parse errors in `onmessage`
2. Log error to console
3. Set `wsError` with generic message
4. Continue processing subsequent messages

### Backend Unavailability
1. Initial HTTP check on mount
2. Set `backendAvailable = false`
3. Skip WebSocket setup
4. Display warning banner
5. Optionally enable dummy data mode

### Stale Data
1. Track `lastResourceAt` timestamp
2. Periodic check (2s interval)
3. If >5s old, set `monitorStale = true`
4. Display visual warning
5. Auto-clears when fresh data arrives

## Future Enhancements

### Potential Improvements
1. **Per-core CPU usage**: Visualize load balance across cores
2. **GPU monitoring**: Add GPU utilization for CUDA-enabled simulations
3. **Historical persistence**: Store metrics in database for post-simulation analysis
4. **Alerting**: Threshold-based warnings (e.g., memory >90%)
5. **Configurable intervals**: Allow user to adjust update frequency
6. **Export metrics**: Download CSV of resource usage over time
7. **Comparative analysis**: Overlay resource usage from multiple simulation runs
8. **Process-level details**: Show EnergyPlus process breakdown (vs system-wide)

### Known Limitations
1. **Network rates**: First reading always zero (baseline needed)
2. **System-wide metrics**: Includes non-simulation processes
3. **No historical data**: Metrics lost on page refresh
4. **Fixed 60-point window**: Could be configurable
5. **Disk I/O**: Only shows usage %, not read/write rates

## Testing & Debugging

### Backend Testing
```bash
# Test resource endpoint
curl http://localhost:8000/api/simulation/system-resources/

# Test WebSocket (requires wscat)
npm install -g wscat
wscat -c ws://localhost:8000/ws/system-resources/
```

### Frontend Testing
```javascript
// Enable debug logging in SimulationPage.tsx
console.log('WS message:', data);
console.log('History length:', cpuHistory.length);
console.log('Last resource at:', new Date(lastResourceAt));
```

### Common Issues

**"Failed to connect to system monitoring service"**
- Check backend is running on port 8000
- Verify WebSocket route in routing.py
- Check CORS/CSRF settings if using proxy
- Inspect browser console for connection errors

**Charts not updating**
- Verify `isAnimationActive={false}`
- Check history state updates
- Look for console errors in normalization
- Ensure `index` dataKey matches history objects

**Stale data warning**
- Backend may be overloaded (>1s to generate data)
- WebSocket disconnected but not detected yet
- System resources slow to query (VM/container)
- Check backend logs for exceptions

## Dependencies

### Backend
```
Django>=4.2
channels>=4.0
psutil>=5.9.0
```

### Frontend
```
@mui/material
lucide-react
recharts
reconnecting-websocket
```

## Conclusion

The resource monitoring system provides real-time visibility into system performance during batch simulations. The architecture balances responsiveness, accuracy, and robustness through WebSocket-based streaming, intelligent caching, and graceful degradation. The CoreLaneView visualization offers unique insight into simulation distribution across CPU cores, helping users optimize resource allocation.
