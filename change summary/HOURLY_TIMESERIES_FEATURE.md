# Hourly Timeseries Visualization Feature

## Overview
Added automatic parsing and visualization of hourly timeseries data from EnergyPlus simulation results. The system detects all hourly datasets (8760 or 8784 values), creates collapsible plots for each, and provides data export capabilities.

## Features Implemented

### 1. Automatic Data Detection
The system now automatically detects hourly timeseries data from the simulation results structure:

```json
{
  "hourly_timeseries": {
    "is_hourly": true,
    "rows": 8760,
    "series": {
      "FLR1_JTTESTENSGATAN_3_19_FLOOR2_ROOM1_Zone_Lights_Electricity_Energy_J": [...],
      "FLR1_JTTESTENSGATAN_3_19_FLOOR2_ROOM2_Zone_Lights_Electricity_Energy_J": [...],
      // ... more series
    }
  }
}
```

**Detection Logic:**
- Looks for `hourly_timeseries.series` object
- Validates each series has exactly 8760 (standard year) or 8784 (leap year) values
- Counts and displays all valid hourly datasets

### 2. New "Hourly Data" Tab
Added a new tab between "Energy Use" and "Raw Data" tabs that displays:
- Count of detected hourly datasets
- Collapsible accordion for each timeseries
- Individual line charts for each dataset
- Statistics (min, max, average)
- CSV export functionality

### 3. Intelligent Label Formatting
Automatically creates readable labels from variable names:

**Input:** `FLR1_JTTESTENSGATAN_3_19_FLOOR2_ROOM1_Zone_Lights_Electricity_Energy_J`

**Output:** `Flr1 Jttestensgatan 3 19 Floor2 Room1 - Lights (Electricity)`

**Formatting Rules:**
- Replaces `_Zone_` with ` - ` for better readability
- Removes common suffixes like `_Energy_J`, `_J`
- Identifies energy types: `(Electricity)`, `(Gas)`
- Capitalizes words properly
- Replaces underscores with spaces

### 4. Unit Conversion
Automatically converts units based on variable naming:

**Energy (Joules to kWh):**
- Detects `_Energy_J` or `_J` suffix
- Converts from Joules to kWh: `value / 3,600,000`
- Labels show "kWh" unit
- Statistics display converted values

**Other Units:**
- Temperature: Displays in °C
- Power: Displays in W
- Auto-detected from variable names

### 5. Data Sampling for Performance
To ensure smooth chart rendering:
- **Original:** 8760 hourly data points
- **Displayed:** 365 daily average data points
- **Sampling Rate:** 24 hours (calculates daily average)
- **Benefits:** 
  - Faster rendering
  - Clearer trends
  - Better performance with multiple datasets

### 6. Interactive Charts
Each timeseries gets a line chart with:
- **Daily average values** on Y-axis
- **Day of year** on X-axis (1-365)
- **Smooth curves** with tension = 0.4
- **No point markers** for cleaner look
- **Hover tooltips** showing exact values
- **Auto-scaled** Y-axis
- **Limited X-axis ticks** (12 labels max)

### 7. Statistics Display
For each timeseries, shows:
- **Minimum value** (converted to appropriate units)
- **Maximum value** (converted to appropriate units)
- **Average value** (converted to appropriate units)
- **Unit label** (kWh for energy data)

### 8. CSV Export
Each timeseries can be exported:
- **Button:** "Download CSV" per accordion
- **Format:** Hour number, Value
- **Filename:** `{variable_name}_hourly_data.csv`
- **Data:** All 8760 original hourly values (not sampled)

## User Interface

### Tab Structure
```
┌─────────────────────────────────────────────┐
│ Summary | Energy Use | Hourly Data | Raw Data│
└─────────────────────────────────────────────┘
```

### Hourly Data Tab Layout
```
┌─────────────────────────────────────────────────┐
│ Hourly Timeseries Data                         │
├─────────────────────────────────────────────────┤
│ ℹ Found 10 hourly timeseries datasets.         │
│   Each plot shows daily average values...      │
├─────────────────────────────────────────────────┤
│ ▼ Flr1 Room1 - Lights (Electricity) (8760...)  │
│ ├─────────────────────────────────────────────┤ │
│ │ [Line Chart: 365 daily averages]           │ │
│ │                                             │ │
│ │ Min: 0.59 | Max: 1.45 | Avg: 0.92 kWh      │ │
│ │                         [Download CSV]      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ▶ Flr1 Room2 - Lights (Electricity) (8760...)  │
│ ▶ Flr2 Room1 - Equipment (Electricity) (8760..)│
│ ▶ ...                                           │
└─────────────────────────────────────────────────┘
```

## Technical Implementation

### Data Structure
```typescript
interface TimeseriesData {
  name: string;      // Original variable name
  data: number[];    // Array of 8760 hourly values
  label: string;     // Formatted display label
}
```

### Key Functions

**1. hourlyTimeseriesData (useMemo)**
- Parses `hourly_timeseries.series` from results
- Validates array length (8760 or 8784)
- Creates formatted labels
- Returns array of timeseries objects

**2. createTimeseriesChartData()**
- Takes: raw data array, label, variable name
- Detects if Joules (converts to kWh)
- Samples to daily averages (8760 → 365 points)
- Returns Chart.js data structure with unit

**3. timeseriesChartOptions**
- Configures line chart appearance
- Sets axis labels and limits
- Configures tooltips and interactions

### Chart.js Configuration
```javascript
{
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      title: 'Day of Year',
      ticks: { maxTicksLimit: 12 }
    },
    y: {
      title: 'Value (auto-unit)'
    }
  }
}
```

## Performance Optimizations

1. **useMemo for parsing:** Only re-parses when results change
2. **Data sampling:** 8760 → 365 points per chart
3. **Lazy rendering:** Charts only render when accordion expanded
4. **No point markers:** Reduces DOM elements
5. **Limited ticks:** Fewer labels to render

## Error Handling

**No Data Found:**
- Shows warning alert
- Suggests data may be in different format
- Doesn't break the UI

**Invalid Data:**
- Validates array length (must be 8760 or 8784)
- Skips non-array values
- Handles missing fields gracefully

## Example Use Cases

### 1. Zone-Level Energy Analysis
View hourly electricity consumption for each zone:
- Lighting energy per zone
- Equipment energy per zone
- Heating/cooling per zone

### 2. System Performance
Monitor HVAC system performance:
- Hourly heating loads
- Hourly cooling loads
- Equipment runtime patterns

### 3. Load Profiles
Analyze building load patterns:
- Daily peaks and valleys
- Seasonal variations
- Identify optimization opportunities

### 4. Data Export
Export any dataset for:
- External analysis
- Custom visualizations
- Integration with other tools
- Reporting purposes

## Future Enhancements

Potential improvements:
1. **Hourly vs Daily toggle:** Switch between hourly and daily views
2. **Date range selector:** Zoom into specific time periods
3. **Multiple series comparison:** Overlay multiple datasets
4. **Heatmap view:** Show hourly data as a calendar heatmap
5. **Statistical analysis:** Add peak detection, load duration curves
6. **Unit selector:** Toggle between J, kWh, MWh
7. **Download all:** Bulk export all timeseries at once

## Dependencies

**Required npm packages:**
- `chart.js`: ^4.x - Chart rendering
- `react-chartjs-2`: ^5.x - React wrapper for Chart.js
- `@mui/material`: ^5.x - Accordion components

**Chart.js Plugins Registered:**
- CategoryScale
- LinearScale
- LineElement
- PointElement
- Title
- Tooltip
- Legend

## Code Location

**File:** `frontend/src/components/baseline/ResultsTab.tsx`

**Key Sections:**
- Lines ~380-460: Data parsing logic
- Lines ~465-510: Chart data creation
- Lines ~515-540: Chart options
- Lines ~730-790: Hourly Data tab UI

## Testing Recommendations

1. **Test with different data sizes:**
   - 8760 values (standard year)
   - 8784 values (leap year)
   
2. **Test variable names:**
   - Different naming conventions
   - Various units (J, W, °C)
   - Complex nested names

3. **Test performance:**
   - 1 timeseries
   - 10 timeseries
   - 50+ timeseries

4. **Test edge cases:**
   - No hourly data
   - Malformed data structure
   - Missing fields
