# Energy Use Tab Normalization

## Change Summary

Updated the "Energy Use" tab (Tab 1) to display all values normalized per square meter (kWh/m²) instead of absolute kWh values.

## What Changed

### Table Headers
**Before:**
- Electricity (kWh)
- District Heating (kWh)
- Total (kWh)

**After:**
- Electricity (kWh/m²)
- District Heating (kWh/m²)
- Total (kWh/m²)

### Table Title
**Before:** "Energy Use Breakdown"
**After:** "Energy Use Breakdown (Normalized per m²)"

### Value Calculations
**Before:**
```tsx
{values.electricity?.toFixed(1) || '0.0'}
{values.district_heating?.toFixed(1) || '0.0'}
{values.total?.toFixed(1) || '0.0'}
```

**After:**
```tsx
{((values.electricity || 0) / floorArea).toFixed(1)}
{((values.district_heating || 0) / floorArea).toFixed(1)}
{((values.total || 0) / floorArea).toFixed(1)}
```

## Benefits

1. **Consistency**: All tabs and visualizations now use the same units (kWh/m²)
2. **Comparability**: Normalized values enable fair comparison across different building sizes
3. **Industry Standard**: kWh/m² is the standard metric for building energy performance
4. **Clarity**: Users immediately understand they're looking at energy intensity, not absolute consumption

## Example Table

| End Use | Electricity (kWh/m²) | District Heating (kWh/m²) | Total (kWh/m²) |
|---------|---------------------|---------------------------|----------------|
| Interior Lighting | 45.2 | 0.0 | 45.2 |
| Interior Equipment | 175.0 | 0.0 | 175.0 |
| Heating | 0.0 | 255.0 | 255.0 |
| Water Systems | 0.0 | 85.4 | 85.4 |
| Pumps | 8.5 | 0.0 | 8.5 |

## Technical Implementation

- Uses the same `floorArea` variable extracted for the charts
- Floor area is extracted from: `buildingArea`, `building_area`, or `floorArea` (defaults to 1)
- All divisions use `(value || 0) / floorArea` to handle null/undefined values safely
- Consistent formatting with `.toFixed(1)` for one decimal place

## Related Changes

This update complements the earlier chart normalization changes, ensuring the entire Results tab presents energy data consistently in kWh/m² across:
- Summary cards
- Energy breakdown charts  
- Energy use table (this update)
- All tooltips and labels
