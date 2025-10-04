# Energy Use Chart Stacking Update

## Overview
Modified the "Energy Use by End Use" chart to display energy consumption in two stacked bars:
1. **Electric Bar**: All electric end uses (lighting, equipment, pumps, etc.) stacked together in shades of blue
2. **Heating Bar**: All district heating end uses (heating, water systems, etc.) stacked together in shades of red/pink

## Changes Made

### Chart Structure

**New Approach:**
- Chart has **two x-axis labels**: "Electric" and "District Heating"
- Each end use category creates datasets with values in the appropriate bar
- Electric end uses: `data: [value, 0]` (show in first bar only)
- Heating end uses: `data: [0, value]` (show in second bar only)
- All datasets use the same stack (`stack0`) to stack within each bar
- Each segment within a stack has a distinct shade for easy identification

### Color Scheme

**Blue Shades (Electric):**
- Dark blue: `rgba(13, 71, 161, 0.8)` - First electric end use
- Medium blue: `rgba(25, 118, 210, 0.8)` - Second electric end use
- Light blue: `rgba(66, 165, 245, 0.8)` - Third electric end use
- Lighter blue: `rgba(100, 181, 246, 0.8)` - Fourth electric end use
- Very light blue: `rgba(144, 202, 249, 0.8)` - Fifth electric end use

**Red/Pink Shades (Heating):**
- Dark red: `rgba(183, 28, 28, 0.8)` - First heating end use
- Medium red: `rgba(211, 47, 47, 0.8)` - Second heating end use
- Red: `rgba(244, 67, 54, 0.8)` - Third heating end use
- Light red: `rgba(239, 83, 80, 0.8)` - Fourth heating end use
- Pink: `rgba(255, 138, 128, 0.8)` - Fifth heating end use

### Enhanced Tooltip

The tooltip now shows:
1. **Non-zero values only**: Zero values are hidden to reduce clutter
2. **Specific end use value**: e.g., "Interior Lighting (Electric): 50,000 kWh"
3. **Footer with total**: Shows the total for whichever bar you're hovering over

### Example Tooltip Display
```
When hovering over Electric bar:
Interior Lighting (Electric): 50,000 kWh
Interior Equipment (Electric): 175,000 kWh
Pumps (Electric): [value] kWh
Total: 225,000 kWh

When hovering over Heating bar:
Heating (Heating): 255,000 kWh
Water Systems (Heating): 85,000 kWh
Total: 340,000 kWh
```

## Visual Layout

```
         Electric              District Heating
           Bar                      Bar
   |  ╔═══════════╗          ╔═══════════╗
   |  ║   Pink    ║          ║   Pink    ║
   |  ║  L Red    ║          ║  L Red    ║  <- Water Systems
   |  ║   Red     ║          ║   Red     ║  <- Heating
   |  ╠═══════════╣          ╠═══════════╣
   |  ║  V L Blue ║          ║           ║
   |  ║  L Blue   ║          ║           ║  <- Pumps
   |  ║  M Blue   ║          ║           ║  <- Equipment
   |  ║  D Blue   ║          ║           ║  <- Lighting
   |  ╚═══════════╝          ╚═══════════╝
   |___________________________________________
        Electric          District Heating
```

## Benefits

1. **Clear Energy Type Comparison**: Easy to compare total electric vs total heating energy at a glance
2. **End Use Breakdown**: Within each stack, see individual end use contributions with distinct colors
3. **Color-Coded**: Intuitive color scheme (blue for electric, red for heating)
4. **Clean Tooltips**: Only shows relevant values (hides zeros)
5. **Scalable**: Automatically handles different numbers of end use categories with color cycling

## Technical Details

- **File Modified**: `frontend/src/components/baseline/ResultsTab.tsx`
- **Chart Library**: Chart.js with react-chartjs-2
- **Chart Type**: Stacked Bar Chart
- **X-axis Labels**: ["Electric", "District Heating"]
- **Stack Configuration**: All datasets use `stack: 'stack0'` with strategic zero placement
- **Dynamic Color Assignment**: Colors cycle through predefined shade arrays

## Data Processing Logic

1. Filter categories with non-zero total energy
2. For each category, check if it has electricity and/or district heating values
3. Create separate dataset entries:
   - Electric entries: `data: [electricValue, 0]` with blue shades
   - Heating entries: `data: [0, heatingValue]` with red/pink shades
4. All datasets share the same stack name for proper stacking
5. Assign sequential colors from respective color palettes
6. Zero values in data arrays ensure each segment appears in only one bar

This approach creates two visually distinct stacked bars that clearly show the breakdown of electric vs heating energy consumption.
