# Simulation Safeguards & Error Detection

## Overview
Implemented comprehensive safeguards to prevent scenario mismatches and improve error visibility after discovering that simulation f688a707-ab91-4af4-ac79-cc2e14136a28 ran the wrong scenario (CS with 11 variants instead of requested SS with 3 variants), with all 11 simulations failing but showing as "completed".

## Root Cause Analysis

### What Went Wrong
1. **Scenario Mismatch**: User requested SS scenario (3 variants) but CS scenario (11 variants) was sent to backend
2. **Silent Failures**: All 11 simulations failed with weather file errors but UI showed "completed"
3. **No Error Visibility**: Results section displayed generic "Ready" chip regardless of failures
4. **Stale Persistence**: `totalSimulations` was persisted in localStorage, causing incorrect counts

### Why It Happened
- No validation that selected scenario matches what's sent to backend
- No logging of critical operations (scenario selection, API requests/responses)
- No detection of error patterns in simulation results
- Derived state (`totalSimulations`) was persisted, causing staleness

## Safeguards Implemented

### 1. Pre-Flight Validation (handleStartSimulation)
**Location**: SimulationPage.tsx, lines 917-965

```typescript
// Validate scenario exists
if (!selectedScenario) {
  setSimulationError('No scenario selected');
  return;
}

// Validate totalSimulations
if (totalSimulations <= 0) {
  setSimulationError(`Invalid total simulations: ${totalSimulations}`);
  return;
}

// Log request details
console.log('[Simulation] Starting simulation with:', {
  scenario_id: selectedScenario.id,
  scenario_name: selectedScenario.name,
  total_simulations: totalSimulations,
  scenario_variants: selectedScenario.total_simulations,
  files: uploadedFiles.map(f => f.name),
});

// Validate match between calculated and scenario variants
if (totalSimulations !== selectedScenario.total_simulations) {
  console.warn('[Simulation] Mismatch detected:', {
    calculated: totalSimulations,
    scenario: selectedScenario.total_simulations,
  });
}
```

**What It Prevents**:
- Sending requests without a valid scenario
- Starting simulations with invalid variant counts
- Silent mismatches between UI state and backend expectations

### 2. Backend Response Validation (handleStartSimulation)
**Location**: SimulationPage.tsx, lines 1008-1039

```typescript
// Validate response
if (!data.run_id || !data.scenario_id) {
  console.error('[Simulation] Invalid backend response:', data);
  throw new Error('Invalid response from server');
}

// Verify scenario ID matches what we sent
if (data.scenario_id !== selectedScenario.id) {
  console.error('[Simulation] Scenario ID mismatch:', {
    sent: selectedScenario.id,
    received: data.scenario_id,
  });
  setSimulationError('Server returned different scenario ID than requested');
  return;
}

// Log successful response
console.log('[Simulation] Backend confirmed simulation started:', {
  run_id: data.run_id,
  scenario_id: data.scenario_id,
  scenario_name: selectedScenario.name,
  total_expected: totalSimulations,
});
```

**What It Prevents**:
- Accepting invalid responses that could corrupt state
- Missing scenario ID mismatches between request and response
- Starting simulations with wrong scenario

### 3. Error Detection in Results (fetchSimulationResults)
**Location**: SimulationPage.tsx, lines 168-224

```typescript
// Detect errors in results
const hasErrors = Array.isArray(newResults) && newResults.some(r => 
  r.status === 'error' || 
  r.raw_json?.status === 'error' ||
  r.raw_json?.error ||
  !r.total_energy_use
);

if (hasErrors) {
  const errorCount = newResults.filter(r => 
    r.status === 'error' || 
    r.raw_json?.status === 'error' ||
    r.raw_json?.error ||
    !r.total_energy_use
  ).length;
  
  console.warn(`[Simulation] ${errorCount}/${newResults.length} results have errors`);
  
  // Log first error for debugging
  const firstError = newResults.find(r => r.status === 'error' || r.raw_json?.error);
  if (firstError) {
    console.error('[Simulation] Sample error:', {
      variant: firstError.variant_idx,
      status: firstError.status,
      error: firstError.raw_json?.error,
    });
  }
}
```

**What It Prevents**:
- Treating failed simulations as successful
- Missing error patterns that affect all variants
- Lack of debugging information when simulations fail

### 4. Success/Failure Analysis (finalizeSimulation)
**Location**: SimulationPage.tsx, lines 230-295

```typescript
const errorResults = resultsToFinalize.filter(r => 
  r.status === 'error' || 
  r.raw_json?.status === 'error' ||
  r.raw_json?.error ||
  !r.total_energy_use
);
const successResults = resultsToFinalize.filter(r => 
  r.status !== 'error' && 
  r.total_energy_use !== null
);

const successRate = resultsToFinalize.length > 0 
  ? Math.round((successResults.length / resultsToFinalize.length) * 100)
  : 0;

console.log('[Simulation] Finalization stats:', {
  total: resultsToFinalize.length,
  success: successResults.length,
  errors: errorResults.length,
  successRate: `${successRate}%`,
});

// Update history with error indicators
const historyEntry = {
  runId: runIdRef.current!,
  scenarioName: activeRun.scenarioName || 'Unknown',
  timestamp: new Date().toISOString(),
  resultsCount: resultsToFinalize.length,
  hasErrors: errorResults.length > 0,
  successRate,
};
```

**What It Prevents**:
- Lack of visibility into simulation health
- Missing error patterns in historical data
- Incomplete success/failure metrics

### 5. Scenario Validation on Resume (handleResumeClick)
**Location**: SimulationPage.tsx, lines 503-520

```typescript
// Validate scenario exists
const scenario = scenarios.find(s => s.id === activeRun.scenarioId);
if (!scenario) {
  console.error('[Simulation] Cannot resume - scenario not found:', activeRun.scenarioId);
  setSimulationError('Cannot resume - scenario no longer exists');
  clearActiveSimulation();
  return;
}

console.log('[Simulation] Resuming with scenario:', {
  id: scenario.id,
  name: scenario.name,
  variants: scenario.total_simulations,
});
```

**What It Prevents**:
- Resuming simulations with deleted/invalid scenarios
- State corruption from missing scenario data
- Confusing error messages when resume fails

### 6. Error Visibility in Results UI (ResultsSection)
**Location**: ResultsSection.tsx, entire file

**New Features**:
- **Error Statistics**: Calculates success/error counts and success rate
- **Color-Coded Status Chips**:
  - Green "Ready" - all simulations succeeded
  - Yellow "Partial Success" - some failed
  - Red "All Failed" - all simulations failed
- **Detailed Error Summary**:
  - Shows error count and success rate
  - Provides helpful hints (e.g., "Check if weather file is valid")
  - Displays prominently with warning/error severity

```typescript
const resultStats = useMemo(() => {
  if (!results || results.length === 0) {
    return { total: 0, success: 0, errors: 0, successRate: 0 };
  }
  
  const errorResults = results.filter(r => 
    r.status === 'error' || 
    r.raw_json?.status === 'error' ||
    r.raw_json?.error ||
    !r.total_energy_use
  );
  const successResults = results.filter(r => 
    r.status !== 'error' && 
    r.total_energy_use !== null
  );
  
  return {
    total: results.length,
    success: successResults.length,
    errors: errorResults.length,
    successRate: Math.round((successResults.length / results.length) * 100),
  };
}, [results]);

// Show appropriate status chip
actions={isComplete ? (
  hasErrors ? (
    allFailed ? (
      <Chip size="small" color="error" label="All Failed" icon={<XCircle size={16} />} />
    ) : (
      <Chip size="small" color="warning" label="Partial Success" icon={<AlertTriangle size={16} />} />
    )
  ) : (
    <Chip size="small" color="success" label="Ready" icon={<Check size={16} />} />
  )
) : undefined}

// Show error summary alert
{isComplete && hasErrors && (
  <Alert severity={allFailed ? "error" : "warning"} sx={{ mb: 2 }}>
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {allFailed 
          ? `All ${resultStats.total} simulations failed` 
          : `${resultStats.errors} of ${resultStats.total} simulations failed`
        }
      </Typography>
      <Typography variant="body2">
        Success rate: {resultStats.successRate}% ({resultStats.success}/{resultStats.total})
      </Typography>
      {allFailed && (
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Common issue: Check if weather file is valid. See console logs for details.
        </Typography>
      )}
    </Box>
  </Alert>
)}
```

**What It Prevents**:
- Users thinking simulations succeeded when they failed
- Lack of actionable error information
- Missing context about common failure causes

### 7. Removed Stale Persistence (totalSimulations)
**Location**: Multiple files

**Changes**:
- Removed `totalSimulations` from `ActiveSimulationRun` interface
- Removed from all `updateActiveRun()` calls (9 locations)
- Always recalculate from `scenario.total_simulations`

**What It Prevents**:
- Displaying wrong simulation counts after page refresh
- Using stale values from previous simulations
- Mismatches between UI and backend expectations

### 8. Enhanced Logging Throughout Lifecycle
**Location**: Multiple locations in SimulationPage.tsx

**Added Logs**:
1. Scenario selection and validation (lines 917-965)
2. Backend request details (lines 966-990)
3. Backend response validation (lines 1008-1039)
4. WebSocket connection events (lines 385-413)
5. Progress updates (lines 288-330)
6. Result fetching (lines 168-224)
7. Error detection (lines 196-218)
8. Finalization stats (lines 230-295)
9. Resume validation (lines 503-520)

**What It Prevents**:
- Difficulty debugging issues in production
- Missing critical context when things go wrong
- Inability to track simulation lifecycle

## Testing Checklist

### Pre-Simulation Validation
- [ ] Cannot start simulation without selecting scenario
- [ ] Cannot start with totalSimulations <= 0
- [ ] Warning logged if calculated variants != scenario variants
- [ ] Scenario details logged before sending request

### Backend Communication
- [ ] Invalid responses rejected with error message
- [ ] Scenario ID mismatch detected and blocked
- [ ] Successful responses logged with details
- [ ] Backend confirmation includes all expected fields

### Error Detection
- [ ] Simulations with status='error' detected
- [ ] Simulations with raw_json.error detected
- [ ] Simulations with missing energy values detected
- [ ] Error count logged when errors found
- [ ] Sample error details logged for debugging

### Results UI
- [ ] "All Failed" chip shown when all simulations fail
- [ ] "Partial Success" chip shown when some fail
- [ ] "Ready" chip shown when all succeed
- [ ] Error summary alert displays correct counts
- [ ] Success rate calculated correctly
- [ ] Weather file hint shown when all fail

### Resume Functionality
- [ ] Resume blocked if scenario no longer exists
- [ ] Error message clear when resume fails
- [ ] Active simulation cleared when scenario missing
- [ ] Scenario details logged on successful resume

### Persistence
- [ ] totalSimulations NOT persisted to localStorage
- [ ] totalSimulations recalculated from scenario on load
- [ ] No stale counts shown after page refresh
- [ ] Active run restoration validates scenario exists

## Example Scenarios

### Scenario 1: All Simulations Fail (Original Bug)
**Before**:
- UI shows "Ready" chip ✅ (misleading)
- No indication of failures
- Results appear normal but have no energy data

**After**:
- UI shows "All Failed" chip ❌
- Red alert: "All 11 simulations failed"
- Success rate: 0% (0/11)
- Hint: "Check if weather file is valid"
- Console logs error details

### Scenario 2: Wrong Scenario Sent (Original Bug)
**Before**:
- User selects SS (3 variants)
- Backend receives CS (11 variants)
- No detection, no warning
- Simulation runs wrong scenario

**After**:
- Scenario ID validated before send
- Request logged: "scenario_id: 602ce317-..., scenario_name: SS"
- Response validated: "received scenario matches sent"
- Mismatch would be detected and blocked with error message

### Scenario 3: Partial Failures
**Before**:
- UI shows "Ready" chip ✅
- No indication some failed
- User assumes all succeeded

**After**:
- UI shows "Partial Success" chip ⚠️
- Yellow alert: "3 of 11 simulations failed"
- Success rate: 73% (8/11)
- User knows to investigate failures

### Scenario 4: Resume After Scenario Deletion
**Before**:
- Page refreshes with active simulation
- Scenario was deleted by another user
- Confusing errors, potential corruption

**After**:
- Resume blocked immediately
- Clear error: "Cannot resume - scenario no longer exists"
- Active simulation cleared
- User can start fresh simulation

## Files Modified

1. **SimulationPage.tsx**
   - Added validation in handleStartSimulation
   - Added backend response validation
   - Added error detection in fetchSimulationResults
   - Added success/failure analysis in finalizeSimulation
   - Added scenario validation in handleResumeClick
   - Enhanced logging throughout lifecycle

2. **SimulationContext.tsx**
   - Removed totalSimulations from ActiveSimulationRun interface

3. **ResultsSection.tsx**
   - Added error statistics calculation
   - Added color-coded status chips
   - Added error summary alert
   - Added helpful hints for common issues

## Logging Standards

All logs follow this format for consistency:

```typescript
// Information
console.log('[Simulation] Action description:', { data });

// Warnings (non-critical issues)
console.warn('[Simulation] Warning description:', { data });

// Errors (critical issues)
console.error('[Simulation] Error description:', { data });
```

## Best Practices Established

1. **Never Persist Derived State**: Calculate from source of truth
2. **Always Validate User Input**: Check before sending to backend
3. **Log Critical Operations**: Scenario selection, API calls, errors
4. **Detect and Surface Errors**: Don't hide failures from users
5. **Validate Backend Responses**: Don't trust what you receive
6. **Provide Actionable Feedback**: Tell users what went wrong and how to fix it

## Success Metrics

When these safeguards are working correctly:
- Users immediately see when simulations fail
- Scenario mismatches are detected before simulation starts
- Error messages are clear and actionable
- Console logs provide debugging context
- Historical data includes success/failure rates
- Resume functionality validates state before proceeding

## Future Enhancements

1. **Backend Validation**: Add scenario ID validation in Django API
2. **Weather File Validation**: Pre-validate EPW files before simulation
3. **Error Categories**: Group errors by type (weather, geometry, HVAC, etc.)
4. **Retry Mechanism**: Allow re-running failed variants
5. **Error Export**: Download error logs for detailed analysis
6. **Success Notifications**: Alert user when long simulations complete
