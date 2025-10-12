# EnergyPlus Construction Layer Fix - October 12, 2025

## Problem
All simulation variants are failing with the error:
```
** Severe  ** <root>[Construction][Triple Glazed Low-E Window] - Missing required property 'outside_layer'.
```

## Root Cause Analysis

### What's Happening
1. The `UnifiedIDFParser.insert_construction_set()` method creates Construction objects for windows
2. Window constructions like "Triple Glazed Low-E Window" are being created with **only a Name field**
3. EnergyPlus requires Construction objects to have at minimum:
   - `Name` (A1) - required
   - `Outside Layer` (A2) - **required**
   - `Layer 2` (A3) - optional
   - etc.

### Investigation
Checked the generated IDF file:
```idf
CONSTRUCTION,
    Triple Glazed Low-E Window;    !- Name
```

This is invalid - missing the `Outside Layer` field!

Compare to working constructions in the same file:
```idf
Construction,
    Generic Double Pane,      !- Name
    Generic Low-e Glass,      !- Outside Layer
    Generic Window Air Gap,    !- Layer 2
    Generic Clear Glass;      !- Layer 3
```

### Code Issue Location
File: `/opt/epsm/backend/simulation/unified_idf_parser.py`
Function: `_ensure_construction_exact()` (line ~879)

The problem occurs in the `else` branch when no example Construction object exists:
```python
else:
    for i, layer in enumerate(layers, start=1):
        kwargs[f"Layer_{i}"] = layer  # WRONG!
```

This creates fields like `Layer_1`, `Layer_2`, etc., but EnergyPlus expects:
- First layer: `Outside Layer` (with space, not underscore)
- Subsequent layers: `Layer 2`, `Layer 3`, etc. (with spaces)

## The Fix

### Change 1: Correct Field Names
```python
else:
    # No example construction found - use EnergyPlus standard field names
    # The first layer must be named "Outside Layer", subsequent layers are "Layer 2", "Layer 3", etc.
    for i, layer in enumerate(layers):
        if i == 0:
            kwargs["Outside Layer"] = layer  # Note: space not underscore
        else:
            kwargs[f"Layer {i + 1}"] = layer  # Note: space not underscore
```

### EnergyPlus IDD Reference
From `/app/Energy+.idd`:
```
Construction,
       \memo Start with outside layer and work your way to the inside layer
  A1 , \field Name
       \required-field
  A2 , \field Outside Layer
       \required-field
  A3 , \field Layer 2
  A4 , \field Layer 3
```

Note the field names use **spaces**, not underscores!

## Testing

### Before Fix
```idf
CONSTRUCTION,
    Triple Glazed Low-E Window;    !- Name
```
Result: **Fatal error** - missing `outside_layer`

### After Fix (Expected)
```idf
CONSTRUCTION,
    Triple Glazed Low-E Window,    !- Name
    epsm_triple_glazed_low_e;      !- Outside Layer
```
Result: Should run successfully

## Related Files
- `/opt/epsm/backend/simulation/unified_idf_parser.py` - IDF parser and editor
- `/opt/epsm/backend/simulation/tasks.py` - Celery task that generates variants
- `/opt/epsm/WEBSOCKET_CHANNEL_LAYER_FIX.md` - WebSocket fix (separate issue)

## Deployment
1. Edit `unified_idf_parser.py` with correct field names
2. Rebuild backend container: `docker-compose -f docker-compose.production.yml build backend`
3. Restart services: `docker-compose -f docker-compose.production.yml up -d backend celery_worker`
4. Test with a new simulation run

## Status
- ✅ Root cause identified
- ✅ Fix implemented
- 🔄 Container rebuild in progress
- ⏳ Testing pending

## Notes
- This issue only affects **scenario-based simulations** with construction set variants
- Baseline simulations (single IDF without variants) work fine
- The GWP and cost calculations are working correctly (construction sets are valid)
- Only the IDF generation step has the bug

---
**Date**: October 12, 2025
**Issue**: All 23 variants failing with missing 'outside_layer' error
**Fix**: Correct Construction field names to use spaces instead of underscores
