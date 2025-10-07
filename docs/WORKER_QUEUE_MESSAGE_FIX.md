# Worker Queue Message Fix

## Problem

The queue overview was showing **"All available workers are busy"** even when idle workers existed.

**Example**: With 4 workers and 3 simulations:
- Active workers: **3/4** ✓
- Idle workers: **1** ✓  
- Message: **"All available workers are busy."** ✗ (INCORRECT!)

## Root Cause

The message logic only checked if `nextQueuedVariant` was null, which happened when:
```tsx
nextQueuedVariant = remainingVariants > activeWorkers ? ... : null
```

### Example Calculation:
- `totalSimulations = 3`
- `completedSimulations = 0`
- `remainingVariants = 3`
- `batchSize = 4` (workers available)
- `activeWorkers = min(4, 3) = 3` ✓
- `queueVariants = 3 - 3 = 0` ✓
- `nextQueuedVariant = (3 > 3) ? ... : null` → **null**
- `idleWorkers = 4 - 3 = 1` ✓

The logic incorrectly assumed:
- ✗ `nextQueuedVariant === null` means "all workers busy"
- ✓ Actually means "no queue, but may have idle workers"

## Solution

Enhanced the message logic to check `idleWorkers` when there's no queue:

```tsx
// Before (WRONG):
{queueMetrics.remainingVariants > 0
  ? queueMetrics.nextQueuedVariant
    ? `Next up: variant #${queueMetrics.nextQueuedVariant}...`
    : 'All available workers are busy.'  // ✗ Doesn't check idleWorkers!
  : ...
}

// After (CORRECT):
{queueMetrics.remainingVariants > 0
  ? queueMetrics.nextQueuedVariant
    ? `Next up: variant #${queueMetrics.nextQueuedVariant}...`
    : queueMetrics.idleWorkers > 0
      ? `${activeWorkers} worker(s) running, ${idleWorkers} idle. No queue.`  // ✓ Shows reality!
      : 'All available workers are busy.'
  : ...
}
```

## Message States

The queue message now correctly shows:

### 1. **When simulations are running:**

| Condition | Message |
|-----------|---------|
| Queue has items | `Next up: variant #5. 12 waiting.` |
| No queue + idle workers | `3 workers running, 1 idle. No queue.` ✓ **NEW** |
| No queue + all busy | `All available workers are busy.` |

### 2. **When idle:**

| Condition | Message |
|-----------|---------|
| All workers idle | `Queue empty — all workers idle and ready.` |
| Some workers idle | `Queue empty — awaiting new tasks.` |

## Example Scenarios

### Scenario A: 3 simulations, 4 workers
- Active: 3
- Idle: 1
- **Message**: "3 workers running, 1 idle. No queue." ✓

### Scenario B: 5 simulations, 4 workers  
- Active: 4
- Queue: 1
- **Message**: "Next up: variant #5. 1 waiting." ✓

### Scenario C: 4 simulations, 4 workers
- Active: 4
- Idle: 0
- **Message**: "All available workers are busy." ✓

## Files Modified

- `/frontend/src/components/simulation/sections/QueueOverviewSection.tsx`
  - Lines 141-147: Enhanced message logic to check `idleWorkers` before showing "all busy"

## Testing

After restarting frontend:
1. **Run 3 simulations** with 4 workers
2. **Check queue details** - should show "3 workers running, 1 idle. No queue."
3. **Run 5+ simulations** - should show queue count correctly
4. **Run exactly 4 simulations** - should show "All available workers are busy."

The message now accurately reflects the actual worker state! 🎯
