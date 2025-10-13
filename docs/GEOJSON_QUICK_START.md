# GeoJSON Processor - Quick Start Guide

## What We Built

A complete service to automatically generate EnergyPlus IDF files from map selections using DTCC (Digital Twin Cities Centre) building data.

## User Flow

```
1. User opens Select Area page
   ↓
2. User draws rectangle/polygon on map over Sweden
   ↓
3. User clicks "Fetch Area" button
   ↓
4. System:
   - Converts coordinates (WGS84 → SWEREF99)
   - Downloads building footprints via DTCC
   - Builds terrain and LOD1 models
   - Filters buildings (height, area)
   - Enriches with energy metadata
   - Generates IDF file
   ↓
5. Success! IDF ready for simulation
```

## Installation

### 1. Install Dependencies

The dependencies are already added to `requirements.txt`, but you need to install them:

```bash
# Enter backend container
docker-compose exec backend bash

# Install new packages
pip install dtcc geopandas ladybug-geometry ladybug-core dragonfly-core dragonfly-energy honeybee-core honeybee-energy honeybee-energy-standards pyproj

# Or reinstall all requirements
pip install -r requirements.txt
```

### 2. Restart Backend

```bash
docker-compose restart backend
```

### 3. Verify Installation

```bash
curl http://localhost:8000/api/health/
```

Should return:
```json
{
  "status": "healthy",
  "dtcc_available": true,
  "ladybug_tools_available": true
}
```

## Testing

### From Frontend

1. Navigate to: http://localhost:5173/select-area

2. Use the map drawing tools (top-left):
   - Click rectangle or polygon tool
   - Draw over Sweden (e.g., Gothenburg area)
   - Make it small for testing (DTCC downloads can be slow)

3. Click "Fetch Area" button

4. Watch the processing dialog:
   - "Downloading building footprints from DTCC..."
   - "IDF files generated successfully!"

5. Check the generated files:
   ```bash
   ls backend/media/geojson_processing/
   ```

### From API (cURL)

```bash
# Small test area in Gothenburg
curl -X POST http://localhost:8000/api/process-geojson/ \
  -H "Content-Type: application/json" \
  -d '{
    "bounds": {
      "north": 57.71,
      "south": 57.70,
      "east": 11.98,
      "west": 11.97
    },
    "filter_height_min": 3,
    "filter_height_max": 100,
    "filter_area_min": 100,
    "use_multiplier": false
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "IDF files generated successfully",
  "idf_path": "geojson_processing/xxxxx/city.idf",
  "geojson_path": "geojson_processing/xxxxx/city_enriched.geojson",
  "idf_url": "/media/geojson_processing/xxxxx/city.idf"
}
```

### Download Generated Files

Once you have the path:

```bash
# Download IDF
curl http://localhost:8000/media/geojson_processing/xxxxx/city.idf -o city.idf

# Download GeoJSON
curl http://localhost:8000/media/geojson_processing/xxxxx/city_enriched.geojson -o city.geojson
```

## File Structure

```
backend/
├── geojson_processor/          # NEW Django app
│   ├── __init__.py
│   ├── apps.py
│   ├── dtcc_service.py         # DTCC integration
│   ├── geojson_to_idf.py       # Ladybug/Dragonfly converter
│   ├── views.py                # API endpoints
│   ├── urls.py                 # URL routing
│   └── README.md
├── media/
│   └── geojson_processing/     # Generated files
│       └── <uuid>/
│           ├── city.geojson
│           ├── city_filtered.geojson
│           ├── city_enriched.geojson
│           ├── city.idf        # ← Use this in baseline
│           └── city.dfjson
└── requirements.txt            # Updated with new deps

frontend/
└── src/
    └── components/
        └── selectarea/
            └── SelectAreaPage.tsx  # Updated with API call
```

## API Reference

### POST `/api/process-geojson/`

**Request:**
```json
{
  "bounds": {
    "north": float,    // Latitude (WGS84)
    "south": float,    // Latitude (WGS84)
    "east": float,     // Longitude (WGS84)
    "west": float      // Longitude (WGS84)
  },
  "filter_height_min": 3,        // Optional, default: 3m
  "filter_height_max": 100,      // Optional, default: 100m
  "filter_area_min": 100,        // Optional, default: 100m²
  "use_multiplier": false        // Optional, default: false
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "IDF files generated successfully",
  "idf_path": "geojson_processing/uuid/city.idf",
  "geojson_path": "geojson_processing/uuid/city_enriched.geojson",
  "work_dir": "geojson_processing/uuid",
  "idf_url": "/media/geojson_processing/uuid/city.idf",
  "geojson_url": "/media/geojson_processing/uuid/city_enriched.geojson"
}
```

**Response (Error):**
```json
{
  "error": "Failed to download city data: ...",
  "details": "DTCC service may be unavailable..."
}
```

### GET `/api/health/`

Check service health.

**Response:**
```json
{
  "status": "healthy",
  "dtcc_available": true,
  "ladybug_tools_available": true
}
```

## Configuration

Default settings in `backend/geojson_processor/geojson_to_idf.py`:

```python
DEFAULT_CLIMATE_ZONE = 'ClimateZone6'  # Sweden
DEFAULT_CONSTRUCTION_TYPE = 'Mass'
DEFAULT_YEAR = 2000
FLOOR_TO_FLOOR_HEIGHT = 2.8           # meters
WINDOW_TO_WALL_RATIO = 0.4
WINDOW_HEIGHT = 1.6                    # meters
WINDOW_SILL_HEIGHT = 0.7               # meters
ADD_DEFAULT_IDEAL_AIR = True
```

## Troubleshooting

### "DTCC library not available"

```bash
docker-compose exec backend pip install dtcc
docker-compose restart backend
```

### "Ladybug tools not available"

```bash
docker-compose exec backend pip install ladybug-geometry dragonfly-core honeybee-energy honeybee-energy-standards
docker-compose restart backend
```

### "Failed to download city data"

- DTCC may not have data for the selected area
- Try a different area in Sweden
- Check DTCC service status
- Use a smaller area (large downloads can timeout)

### "Conversion failed"

- Check backend logs: `docker-compose logs backend`
- Verify GeoJSON file was created: `ls backend/media/geojson_processing/`
- Check for errors in file: `cat backend/media/geojson_processing/*/city.geojson`

### Empty or invalid GeoJSON

- Area may have no buildings
- Buildings filtered out (too small, too large)
- Try adjusting filter parameters

## Next Steps

### 1. Auto-Navigate to Baseline

See `docs/GEOJSON_BASELINE_INTEGRATION.md` for:
- Automatic navigation after IDF generation
- Pre-loading IDF into baseline form
- EPW file selection

### 2. Run a Simulation

1. Go to Baseline page
2. Upload generated `city.idf`
3. Upload weather file (EPW)
4. Click "Run Simulation"

### 3. View Results

After simulation completes:
- View energy use breakdown
- Analyze heating/cooling demands
- Compare scenarios

## Documentation

- **Implementation Details:** `docs/GEOJSON_PROCESSOR_IMPLEMENTATION.md`
- **Baseline Integration:** `docs/GEOJSON_BASELINE_INTEGRATION.md`
- **App README:** `backend/geojson_processor/README.md`

## Support

Common issues:

1. **No buildings found:** Area may be too small or have no buildings
2. **DTCC timeout:** Use smaller area
3. **Invalid coordinates:** Ensure bounds are valid lat/lon
4. **Import errors:** Reinstall requirements

## Example Areas

Good test areas in Sweden:

1. **Gothenburg City Center:**
   ```json
   {
     "north": 57.71,
     "south": 57.70,
     "east": 11.98,
     "west": 11.97
   }
   ```

2. **Stockholm District:**
   ```json
   {
     "north": 59.33,
     "south": 59.32,
     "east": 18.07,
     "west": 18.06
   }
   ```

3. **Helsingborg (from original example):**
   ```json
   {
     "north": 56.046,
     "south": 56.028,
     "east": 12.702,
     "west": 12.684
   }
   ```

Start with small areas for testing!

## Success Checklist

- ✅ Dependencies installed
- ✅ Health check passes
- ✅ Can draw area on map
- ✅ "Fetch Area" button works
- ✅ Processing dialog appears
- ✅ IDF file generated
- ✅ Files saved in media directory

## Questions?

Check the comprehensive docs:
- Implementation: `docs/GEOJSON_PROCESSOR_IMPLEMENTATION.md`
- Integration: `docs/GEOJSON_BASELINE_INTEGRATION.md`
- API: `backend/geojson_processor/README.md`
