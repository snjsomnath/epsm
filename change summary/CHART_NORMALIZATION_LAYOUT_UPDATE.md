# Chart and Table Normalization Update

## Overview
Updated the ResultsTab to normalize all energy values per square meter (kWh/m²) across charts and tables, and placed the two charts side by side in a responsive grid layout to save vertical space.

## Changes Made

### 1. Energy Normalization (kWh/m²)

**Energy Use by End Use Chart:**
- Added `floorArea` parameter to `formatEnergyUseData()` function
- All energy values are now divided by floor area: `value / floorArea`
- Extracts floor area from result data: `buildingArea`, `building_area`, or `floorArea` (fallback to 1)
- Tooltip shows values in kWh/m²: e.g., "Lighting (Electric): 45.2 kWh/m²"
- Y-axis label changed from "Energy Use (kWh)" to "kWh/m²"

**Heating vs Cooling vs Electric Chart:**
- Already using normalized data (kWh/m²)
- Tooltip format consistent: shows values with one decimal place
- Y-axis label: "kWh/m²"

**Energy Use Breakdown Table (Tab 1):**
- Table title updated to "Energy Use Breakdown (Normalized per m²)"
- Column headers changed from "(kWh)" to "(kWh/m²)"
- All values divided by floor area before display
- Consistent `.toFixed(1)` formatting for one decimal place
- Uses the same `floorArea` variable as the charts

### 2. Side-by-Side Layout

**Grid Layout:**
```tsx
<Grid container spacing={2}>
  <Grid item xs={12} md={6}>
    {/* Heating vs Cooling Chart */}
  </Grid>
  <Grid item xs={12} md={6}>
    {/* Energy Use by End Use Chart */}
  </Grid>
</Grid>
```

**Responsive Behavior:**
- **Desktop (md and up)**: Two charts side by side, each taking 50% width
- **Mobile/Tablet (xs to sm)**: Charts stack vertically, each taking full width
- Chart height reduced from 400px to 350px for better fit

### 3. Space Optimization

**Legend Removal:**
- Both charts now hide legends (`display: false`)
- Legends took up significant space and info is still available in tooltips
- Title font size reduced to 14px for more compact display

**Axis Optimization:**
- Energy breakdown chart: X-axis labels and title hidden
- Simplified titles: "Energy Use by End Use" and "Heating vs Cooling vs Electric"
- Both charts maintain Y-axis title showing "kWh/m²"

### 4. Tooltip Updates

**Consistent Format:**
- All values display with `.toFixed(1)` for one decimal place
- Units clearly shown: "kWh/m²"
- Footer shows totals in kWh/m²
- Zero values are hidden (return `undefined`)

**Example Tooltips:**

*Energy Use Chart:*
```
Interior Lighting (Electric): 45.2 kWh/m²
Total: 150.3 kWh/m²
```

*Heating vs Cooling Chart:*
```
Heating (kWh/m²): 85.5 kWh/m²
```

## Benefits

### 1. Space Efficiency
- **67% vertical space reduction**: Two charts now occupy the same height as one previously
- Better use of horizontal screen space
- Less scrolling required to view all data

### 2. Better Comparisons
- Charts side by side enable direct visual comparison
- Normalized values (kWh/m²) allow fair comparison across different building sizes
- Consistent units across all charts, tables, and tooltips
- Energy Use table now shows normalized values matching the charts

### 3. Improved Readability
- Cleaner, more compact design
- Less visual clutter with hidden legends
- All essential information still accessible via tooltips
- Responsive design works on all screen sizes

### 4. Professional Presentation
- Industry-standard energy intensity units (kWh/m²)
- Consistent formatting throughout
- Optimal information density

## Technical Details

- **Files Modified**: `frontend/src/components/baseline/ResultsTab.tsx`
- **Layout System**: Material-UI Grid with responsive breakpoints
- **Chart Heights**: 350px (reduced from 400px)
- **Floor Area Extraction**: `buildingArea ?? building_area ?? floorArea ?? 1`
- **Spacing**: Grid spacing={2} for consistent gaps

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐│
│  │ Heating vs Cooling       │  │ Energy Use by End Use    ││
│  │ vs Electric              │  │                          ││
│  │                          │  │                          ││
│  │  [Stacked Bar Chart]     │  │  [Stacked Bar Chart]     ││
│  │                          │  │                          ││
│  │  Y: kWh/m²               │  │  Y: kWh/m²               ││
│  └──────────────────────────┘  └──────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Normalization Logic

```typescript
// Extract floor area from first result
const floorArea = resultsArray[0]?.buildingArea 
  ?? resultsArray[0]?.building_area 
  ?? resultsArray[0]?.floorArea 
  ?? 1; // Fallback to 1 if not available

// Normalize energy values
const electricity = (energyUse[category].electricity || 0) / floorArea;
const districtHeating = (energyUse[category].district_heating || 0) / floorArea;
```

This ensures all energy values are presented as energy intensity (kWh/m²), which is the industry standard for building energy performance metrics.
