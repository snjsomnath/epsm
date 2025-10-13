# GeoJSON Processor App

Django app for processing geographic areas into EnergyPlus IDF files using DTCC and Ladybug Tools.

## Purpose

Automatically generate building energy models from geographic area selections:
1. User draws area on map
2. System downloads building footprints from DTCC
3. Converts to GeoJSON with enriched metadata
4. Generates EnergyPlus IDF files ready for simulation

## API Endpoints

### POST `/api/process-geojson/`

Process a geographic area and generate IDF files.

**Request:**
```json
{
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
}
```

**Response:**
```json
{
  "success": true,
  "message": "IDF files generated successfully",
  "idf_path": "geojson_processing/uuid/city.idf",
  "geojson_path": "geojson_processing/uuid/city_enriched.geojson",
  "idf_url": "/media/geojson_processing/uuid/city.idf"
}
```

### GET `/api/health/`

Check service health and library availability.

## Services

### DTCCService (`dtcc_service.py`)

Downloads building data using DTCC library:
- Building footprints
- Pointcloud data
- Terrain mesh
- LOD1 building models

### GeoJSONToIDFConverter (`geojson_to_idf.py`)

Converts GeoJSON to IDF format:
- Filters buildings by height and area
- Enriches with energy model metadata
- Uses Dragonfly/Honeybee for conversion
- Applies construction sets and program types
- Generates simulation-ready IDF files

## Dependencies

See `backend/requirements.txt`:
- `dtcc-builder` - Building data download
- `geopandas` - Geographic data processing
- `pyproj` - Coordinate system conversion
- `ladybug-*` / `dragonfly-*` / `honeybee-*` - Energy modeling

## Attribution

- DTCC integration: Copyright (C) 2023 Sanjay Somanath
- Ladybug Tools: GPL-3.0 License (https://github.com/ladybug-tools)

## Usage

From frontend:
1. Navigate to Select Area page
2. Draw rectangle or polygon on map
3. Click "Fetch Area"
4. Wait for processing
5. Use generated IDF in baseline simulation

From API:
```bash
curl -X POST http://localhost:8000/api/process-geojson/ \
  -H "Content-Type: application/json" \
  -d '{"bounds": {"north": 57.71, "south": 57.70, "east": 11.98, "west": 11.97}}'
```

## Output Files

Generated in `media/geojson_processing/<uuid>/`:
- `city.geojson` - Raw DTCC output
- `city_filtered.geojson` - After filtering
- `city_enriched.geojson` - With energy metadata
- `city.idf` - EnergyPlus input file
- `city.dfjson` - Dragonfly model (for debugging)

## Configuration

Constants in `geojson_to_idf.py`:
- `DEFAULT_CLIMATE_ZONE = 'ClimateZone6'` - For Sweden
- `DEFAULT_CONSTRUCTION_TYPE = 'Mass'`
- `FLOOR_TO_FLOOR_HEIGHT = 2.8` - meters
- `WINDOW_TO_WALL_RATIO = 0.4`

## Error Handling

Service handles:
- Missing DTCC data for area
- Invalid coordinates
- Building filtering issues
- Conversion errors
- Library import errors

All errors logged and returned with descriptive messages.
