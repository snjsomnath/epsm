# Simulation Persistence Fix

## Problem

After implementing persistence to survive page refreshes, the simulation tracking showed incorrect counts like:
- **"Running 8/3"** when only 3 simulations were requested
- Worker queue and run status were not harmonized
- Stale `totalSimulations` values were being restored from localStorage

## Root Cause

The issue occurred because:

1. **`totalSimulations` was being persisted** in `activeRun` (localStorage)
2. When the page refreshed, the **resume logic restored the old `totalSimulations`** value
3. This **overrode the correct value** that should come from the scenario
4. The scenario's `total_simulations` field contains the complete count of variants
5. Multiple `useEffect` hooks conflicted, with stale persisted data winning over fresh scenario data

### Example Flow (Broken):
1. User starts simulation with Scenario A (3 variants) → `totalSimulations = 3` ✓
2. System persists `activeRun.totalSimulations = 3` to localStorage
3. User switches to Scenario B (8 variants) but doesn't start sim
4. Page refreshes
5. Resume logic restores `totalSimulations = 3` from localStorage ✗
6. But the active scenario is B (8 variants)
7. UI shows "0/3" but should show "0/8" or vice versa

## Solution

**Stop persisting `totalSimulations` entirely** - always derive it from the selected scenario.

### Changes Made

#### 1. Removed `totalSimulations` from `ActiveSimulationRun` interface
```tsx
// Before
export interface ActiveSimulationRun {
  ...
  totalSimulations?: number;  // ✗ REMOVED
}

// After  
export interface ActiveSimulationRun {
  ...
  // totalSimulations removed - derived from scenario
}
```

#### 2. Updated Resume Logic
- **Don't restore** `totalSimulations` from `activeRun` when resuming
- Let the scenario-based `useEffect` calculate it fresh each time

```tsx
// Removed these lines from resume logic:
if (activeRun.totalSimulations) {
  setTotalSimulations(activeRun.totalSimulations); // ✗ REMOVED
}
```

#### 3. Enhanced Scenario-based Calculation
- Made the `totalSimulations` useEffect depend on `activeRun` too
- Ensures it runs AFTER resume logic
- Always syncs `totalSimulationsRef.current` with state

```tsx
useEffect(() => {
  if (selectedScenario) {
    const scenario = scenarios.find(s => String(s.id) === String(selectedScenario));
    const scenarioTotal = scenario?.total_simulations || 0;
    if (scenarioTotal > 0) {
      setTotalSimulations(scenarioTotal);
      totalSimulationsRef.current = scenarioTotal; // Keep ref in sync
    }
  }
  // Now depends on activeRun to override any stale persisted values
}, [uploadedFiles, selectedScenario, scenarios, activeRun]);
```

#### 4. Removed from All `updateActiveRun` Calls
- `fetchSimulationResults`: No longer persists `totalSimulations`
- `finalizeSimulation`: No longer persists `totalSimulations`
- `startMonitoring` (polling): No longer persists `totalSimulations`
- `startMonitoring` (WebSocket): No longer persists `totalSimulations`
- `handleStartSimulation`: No longer persists `totalSimulations`
- `simulateDummyProgress`: No longer persists `totalSimulations`

## Benefits

✅ **Always shows correct count** based on selected scenario
✅ **No stale data** from previous sessions
✅ **Harmonized status** between worker queue and run status
✅ **Clean separation** between persisted state (progress, completed count) and derived state (total count)
✅ **Survives page refresh** while maintaining accuracy

## What IS Still Persisted

The following ARE still persisted and restored (intentionally):
- `simulationId` - needed to resume monitoring
- `scenarioId` - needed to reselect the scenario
- `status` - current state (running/paused/completed/failed)
- `startedAt` - when the simulation started
- `progress` - percentage complete (0-100)
- `completedSimulations` - actual count of finished variants

## What IS Derived (Not Persisted)

- `totalSimulations` - **always calculated from scenario.total_simulations**

## Testing

1. **Start a simulation** with 3 variants
2. **Refresh the page** while running
3. **Verify count shows "X/3"** (not "X/8" or other wrong values)
4. **Check worker queue** matches run status
5. **Complete the simulation**
6. **Refresh again**
7. **Verify still shows "3/3"** correctly

## Files Modified

- `/frontend/src/components/simulation/SimulationPage.tsx`
  - Lines 490-497: Removed `totalSimulations` restore in completed/failed resume
  - Lines 524-530: Removed `totalSimulations` restore in running resume  
  - Lines 756-783: Enhanced scenario calculation to override stale values
  - Lines 882, 933, 210-215, 245-250, 323-328, 397-401: Removed from updateActiveRun calls
  - Lines 968, 986: Removed from dummy progress

- `/frontend/src/context/SimulationContext.tsx`
  - Lines 16-24: Removed `totalSimulations` from `ActiveSimulationRun` interface
