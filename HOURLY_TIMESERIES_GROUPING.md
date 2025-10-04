# Hourly Timeseries Grouping and Icon Enhancement

## Overview
Enhanced the hourly timeseries visualization with intelligent grouping by end-use category, cleaner zone name parsing, and visual category icons with color coding.

## Key Improvements

### 1. Improved Zone Name Parsing

**Before:**
```
F L R1 J T T E S T E N S G A T A N 3 19 F L O O R2 R O O M1 - Lights Electricity (8760 hourly values)
```

**After:**
```
Jttestensgatan 3 19 Floor 2 Room 1 - Lights (Electricity)
```

**Parsing Logic:**
- Removes building/floor prefixes (FLR1, FLR2, FLOOR1, etc.)
- Extracts floor and room numbers intelligently
- Formats floor/room as "Floor X Room Y"
- Preserves building/street names
- Removes redundant suffixes (_Energy_J, _Electricity_Energy_J, etc.)
- Properly capitalizes words
- Identifies energy type (Electricity/Gas) and adds as suffix

### 2. Category-Based Grouping

Timeseries datasets are now grouped into logical categories:

**Categories:**
- 🔦 **Lighting** - All lighting-related datasets
- 💻 **Equipment** - Electric equipment, computers, appliances
- 🌡️ **Heating** - Heating systems and components
- ❄️ **Cooling** - Cooling systems and air conditioning
- 💧 **Water Systems** - Hot water, water heating
- 💨 **Ventilation** - Fans, ventilation systems
- ☀️ **Solar** - Solar panels, renewable energy
- 📊 **Other** - Miscellaneous datasets

**Grouping Logic:**
```typescript
// Analyzes both label and original name
if (ts.label.includes('Lights') || ts.name.includes('Lights')) {
  category = 'Lighting';
} else if (ts.label.includes('Equipment') || ts.name.includes('Equipment')) {
  category = 'Equipment';
}
// ... etc
```

### 3. Visual Category Headers

Each category group gets a styled header with:
- **Icon** - Relevant icon for the category
- **Color coding** - Unique color per category
- **Dataset count** - Shows number of datasets in category
- **Left border accent** - 4px colored border

**Header Styling:**
```tsx
<Box sx={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: 1, 
  mb: 1.5,
  p: 1.5,
  borderRadius: 1,
  bgcolor: `${categoryColor}15`,  // 15% opacity background
  borderLeft: `4px solid ${categoryColor}`
}}>
```

### 4. Category Icons

Each category has a dedicated Lucide React icon:

| Category | Icon | Color | Hex Code |
|----------|------|-------|----------|
| Lighting | Lightbulb | Orange | #FFA726 |
| Equipment | Cpu | Blue | #42A5F5 |
| Heating | Thermometer | Red | #EF5350 |
| Cooling | Snowflake | Green | #66BB6A |
| Water Systems | Droplet | Cyan | #26C6DA |
| Ventilation | Wind | Purple | #AB47BC |
| Solar | Sun | Yellow | #FFEE58 |
| Other | Activity | Gray | #78909C |

### 5. Enhanced Accordion Display

Each accordion item now shows:
- **Category icon** (left side, color-coded)
- **Cleaned label** (e.g., "Jttestensgatan 3 19 Floor 2 Room 1 - Lights (Electricity)")
- **Data count** (right side, e.g., "8760 hourly values")

**Accordion Summary:**
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
  <Box sx={{ color: categoryColor }}>
    {categoryIcon}
  </Box>
  <Typography variant="subtitle2">
    {cleanLabel}
  </Typography>
  <Typography variant="caption" sx={{ ml: 'auto', mr: 2 }}>
    {dataLength} hourly values
  </Typography>
</Box>
```

### 6. Improved Info Alert

The alert now shows:
- Total number of datasets
- Number of categories
- Explanation of data sampling

**Example:**
```
ℹ Found 12 hourly timeseries datasets grouped into 3 categories. 
  Each plot shows daily average values (8760 hourly values averaged to 365 daily values).
```

## Visual Layout

### Before
```
Hourly Timeseries Data
────────────────────────────────────────
ℹ Found 12 hourly timeseries datasets.
────────────────────────────────────────
▶ F L R1 J T T E S... - Lights... (8760...)
▶ J T T E S T E N S... - Lights... (8760...)
▶ J T T E S T E N S... - Lights... (8760...)
▶ F L R1 J T T E S... - Equipment... (8760...)
...
```

### After
```
Hourly Timeseries Data
────────────────────────────────────────
ℹ Found 12 datasets in 3 categories.
────────────────────────────────────────
╔══════════════════════════════════════╗
║ 💡 Lighting              4 datasets  ║
╚══════════════════════════════════════╝
  ▶ 💡 Jttestensgatan 3 19 Floor 2... 8760 values
  ▶ 💡 Jttestensgatan 3 19 Floor 1... 8760 values
  ▶ 💡 Jttestensgatan 3 19 Floor 4... 8760 values
  ▶ 💡 Jttestensgatan 3 19 Floor 2... 8760 values

╔══════════════════════════════════════╗
║ 💻 Equipment            5 datasets   ║
╚══════════════════════════════════════╝
  ▶ 💻 Jttestensgatan 3 19 Floor 2... 8760 values
  ▶ 💻 Jttestensgatan 3 19 Floor 1... 8760 values
  ...
```

## Benefits

### 1. Better Organization
- Datasets grouped by logical categories
- Easier to find specific end uses
- Clearer overview of what data is available

### 2. Visual Clarity
- Color coding helps distinguish categories
- Icons provide instant recognition
- Cleaner, more professional appearance

### 3. Improved Readability
- Zone names are now human-readable
- Floor and room numbers clearly identified
- Energy types properly labeled

### 4. Enhanced UX
- Category headers show dataset counts
- Icons make navigation intuitive
- Visual hierarchy guides the eye

### 5. Scalability
- Works well with few or many datasets
- Categories automatically detected
- Handles complex naming conventions

## Technical Implementation

### Functions Added

**1. groupedTimeseries (useMemo)**
```typescript
const groupedTimeseries = useMemo(() => {
  const groups: Record<string, Array<...>> = {};
  hourlyTimeseriesData.forEach(ts => {
    let category = determineCategory(ts);
    if (!groups[category]) groups[category] = [];
    groups[category].push(ts);
  });
  return groups;
}, [hourlyTimeseriesData]);
```

**2. getCategoryIcon()**
```typescript
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Lighting': return <Lightbulb size={18} />;
    case 'Equipment': return <Cpu size={18} />;
    // ... etc
  }
};
```

**3. getCategoryColor()**
```typescript
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Lighting': return '#FFA726';
    case 'Equipment': return '#42A5F5';
    // ... etc
  }
};
```

**4. createCleanLabel()**
Enhanced parsing logic that:
- Detects zone patterns
- Removes prefixes (FLR, FLOOR, BLD)
- Extracts floor/room numbers
- Formats building names
- Removes energy suffixes
- Capitalizes properly

### Zone Name Parsing Examples

| Input | Output |
|-------|--------|
| `FLR1_JTTESTENSGATAN_3_19_FLOOR2_ROOM1_Zone_Lights_Electricity_Energy_J` | `Jttestensgatan 3 19 Floor 2 Room 1 - Lights (Electricity)` |
| `JTTESTENSGATAN_3_19_FLOOR1_ROOM1_Zone_Electric_Equipment_Electricity` | `Jttestensgatan 3 19 Floor 1 Room 1 - Electric Equipment (Electricity)` |
| `FLOOR2_ROOM3_Zone_Heating_Gas_Energy_J` | `Floor 2 Room 3 - Heating (Gas)` |

## Dependencies

**Icons Added:**
- `Lightbulb` - Lighting systems
- `Cpu` - Equipment
- `Droplet` - Water systems
- `Wind` - Ventilation
- `Sun` - Solar
- `Activity` - Other/miscellaneous

All from `lucide-react` package.

## Future Enhancements

1. **Collapsible categories** - Allow entire category sections to expand/collapse
2. **Category filtering** - Show/hide specific categories
3. **Custom category colors** - User-configurable color schemes
4. **Category statistics** - Show min/max/avg across entire category
5. **Export by category** - Download all datasets in a category at once
6. **Search/filter** - Search within zone names
7. **Sort options** - Sort by zone, floor, room, or alphabetically

## Code Location

**File:** `frontend/src/components/baseline/ResultsTab.tsx`

**Key Sections:**
- Lines ~380-460: createCleanLabel() function
- Lines ~524-555: groupedTimeseries useMemo
- Lines ~557-595: getCategoryIcon() and getCategoryColor()
- Lines ~865-950: Grouped UI rendering with category headers
