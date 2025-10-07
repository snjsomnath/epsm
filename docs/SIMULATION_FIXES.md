# Simulation Tracking Fixes

## Issues Fixed

### 1. Incorrect Simulation Count (Running 4/3)
**Problem**: The UI showed "running 4/3" when requesting 3 simulations, indicating the total count was wrong.

**Root Cause**: The `totalSimulations` state was being calculated by multiplying the number of uploaded files by the scenario's `total_simulations` value. However, the scenario's `total_simulations` already represents the total number of variants, not a multiplier.

**Fix**: Updated the `useEffect` in `SimulationPage.tsx` (lines 756-778) to use the scenario's `total_simulations` directly without multiplication:
```tsx
// Before (WRONG):
const fileCount = uploadedFiles.length;
setTotalSimulations(fileCount * numVariants);

// After (CORRECT):
if (selectedScenario) {
  const scenario = scenarios.find(s => String(s.id) === String(selectedScenario));
  const scenarioTotal = scenario?.total_simulations || 0;
  if (scenarioTotal > 0) {
    setTotalSimulations(scenarioTotal);
  }
}
```

### 2. Recent Simulation Runs Defaulting to Wrong Number
**Problem**: The recent runs display always showed the wrong count (defaulting to 11 or other incorrect values).

**Root Cause**: When finalizing a simulation and adding it to history, the code was using `totalSimulationsRef.current` (the expected total) instead of the actual number of results received (`resultsCountRef.current`).

**Fix**: Updated `finalizeSimulation()` to:
1. Fetch final results first to ensure accurate count
2. Use the actual `resultsCountRef.current` value for the history entry
3. Add better logging to track what's being saved

```tsx
// Now properly uses the actual result count
const finalResultCount = resultsCountRef.current;
addToHistory?.(String(simulationId), `${finalResultCount} result${finalResultCount !== 1 ? 's' : ''}`);
```

### 3. Results Not Being Stored Correctly
**Problem**: After simulations completed, results weren't being properly stored or displayed.

**Root Cause**: Multiple issues:
- Race conditions between state updates in `fetchSimulationResults`
- Results not being cached properly
- Incomplete async handling in `finalizeSimulation`

**Fix**: 
- Made `fetchSimulationResults` update results atomically
- Added await and delay in `finalizeSimulation` to ensure state updates complete
- Improved result caching with `cacheLastResults`
- Added comprehensive logging to track result fetching

### 4. Incomplete Simulation Progress Tracking
**Problem**: Progress tracking was unreliable and didn't properly synchronize between WebSocket updates and polling.

**Root Cause**:
- Progress calculations used inconsistent formulas
- WebSocket updates and polling had different logic
- Missing logging made debugging difficult

**Fix**:
- Standardized progress calculation across WebSocket and polling:
  ```tsx
  const total = totalSimulationsRef.current || 0;
  const estimatedCompleted = Math.max(
    resultsCountRef.current,
    total > 0 ? Math.floor((total * progressValue) / 100) : 0
  );
  ```
- Added comprehensive console logging for progress updates
- Improved WebSocket message handling with better state updates
- Changed result fetch threshold from 1% to 5% to reduce unnecessary API calls

## Testing Recommendations

1. **Verify Simulation Count**:
   - Select a scenario with known variant count (e.g., 3 variants)
   - Upload files and start simulation
   - Confirm UI shows correct total (e.g., "0/3" not "0/9")

2. **Check Recent Runs**:
   - Run a simulation to completion
   - Check the "Recent Runs" section
   - Verify the run shows correct result count

3. **Validate Results Storage**:
   - Complete a simulation
   - Navigate away and return to the page
   - Verify results are still visible
   - Check browser localStorage for `simulation_last_results`

4. **Monitor Progress**:
   - Start a simulation
   - Watch console logs for progress updates
   - Verify progress bar increases smoothly
   - Confirm WebSocket updates appear in logs

## Additional Improvements Made

- Added `console.log` statements throughout the simulation flow for better debugging
- Improved error handling in `finalizeSimulation` and `fetchSimulationResults`
- Better synchronization between refs and state
- More reliable handling of completion events
- Prevented duplicate finalization calls with `completionHandledRef`

## Files Modified

- `/Users/ssanjay/GitHub/epsm/frontend/src/components/simulation/SimulationPage.tsx`
  - Lines 756-778: Fixed totalSimulations calculation
  - Lines 211-249: Improved finalizeSimulation function
  - Lines 168-212: Enhanced fetchSimulationResults
  - Lines 283-308: Better progress tracking in startMonitoring (polling)
  - Lines 357-385: Improved WebSocket progress handling

## No Backend Changes Required

The backend was already correctly:
- Reporting accurate progress values
- Storing results in the database
- Sending WebSocket updates
- Tracking variant completion

The issues were entirely in the frontend's state management and calculation logic.
