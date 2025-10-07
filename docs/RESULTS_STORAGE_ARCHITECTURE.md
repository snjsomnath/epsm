# EPSM Simulation Results Storage Architecture

## Overview

EPSM uses a **hybrid storage approach** that combines file system storage for raw EnergyPlus outputs with database storage for parsed summary data. This provides both detailed raw results access and efficient querying capabilities.

## Storage Architecture Diagram

```
EnergyPlus Simulation
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│  LOCAL FILE SYSTEM (backend/media/)                            │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  media/simulation_files/<simulation_id>/                       │
│  ├── building1.idf          (uploaded input files)             │
│  ├── building2.idf                                             │
│  └── weather.epw                                               │
│                                                                 │
│  media/simulation_results/<simulation_id>/                     │
│  ├── building1/                                                │
│  │   ├── output.htm         ◄─── RAW HTML REPORT               │
│  │   ├── output.html        (copy of .htm)                     │
│  │   ├── output.json        ◄─── PARSED SUMMARY                │
│  │   ├── output.csv         (hourly timeseries)                │
│  │   ├── run_output.log     (EnergyPlus logs)                  │
│  │   └── eplustbl.htm       (detailed tables)                  │
│  ├── building2/                                                │
│  │   └── ... (same structure)                                  │
│  └── combined_results.json  ◄─── AGGREGATED RESULTS            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
         │
         │ Parsed & Saved to DB
         ▼
┌────────────────────────────────────────────────────────────────┐
│  POSTGRESQL DATABASE                                            │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  SimulationResult (summary metrics)                            │
│  ├── total_energy_use                                          │
│  ├── heating_demand                                            │
│  ├── cooling_demand                                            │
│  ├── lighting_demand                                           │
│  ├── equipment_demand                                          │
│  ├── gwp_total                                                 │
│  ├── cost_total                                                │
│  ├── total_area                                                │
│  ├── run_time                                                  │
│  └── raw_json (complete parsed results)                        │
│                                                                 │
│  SimulationZone (zone-specific data)                           │
│  ├── zone_name                                                 │
│  ├── area                                                      │
│  └── volume                                                    │
│                                                                 │
│  SimulationEnergyUse (energy breakdown)                        │
│  ├── end_use (Heating, Cooling, Lighting, etc.)               │
│  ├── electricity                                               │
│  ├── district_heating                                          │
│  └── total                                                     │
│                                                                 │
│  SimulationHourlyTimeseries (8760 hourly values)              │
│  ├── has_hourly (boolean flag)                                │
│  └── hourly_values (JSON array ~8760 values)                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Detailed Breakdown

### 1. **File System Storage** (Primary Raw Data)

#### Location
```
MEDIA_ROOT/simulation_results/<simulation_id>/
```

**Configuration**: `backend/config/settings.py`
```python
MEDIA_ROOT = BASE_DIR / 'media'
```

#### What's Stored

| File | Source | Purpose | Size | Parsed? |
|------|--------|---------|------|---------|
| `output.htm` | EnergyPlus | Raw HTML report with all tables | ~500KB | ✅ Yes |
| `output.html` | Copy of .htm | Browser-friendly version | ~500KB | N/A |
| `output.json` | Parsed from HTML | Structured summary data | ~50KB | N/A |
| `output.csv` | EnergyPlus ReadVars | Hourly timeseries (8760 rows) | ~2-5MB | ✅ Yes |
| `run_output.log` | EnergyPlus | Simulation logs and warnings | ~100KB | ✅ Partial |
| `eplustbl.htm` | EnergyPlus | Detailed tabular reports | ~1MB | ❌ No |
| `combined_results.json` | Aggregated | All IDF results combined | ~100KB+ | N/A |

#### File Structure Example
```
media/
└── simulation_results/
    └── a1b2c3d4-5678-90ab-cdef-123456789abc/
        ├── building1/
        │   ├── output.htm
        │   ├── output.html
        │   ├── output.json
        │   ├── output.csv
        │   └── run_output.log
        ├── building2/
        │   └── ... (same structure)
        └── combined_results.json
```

### 2. **Database Storage** (Parsed Summary Data)

#### Models & Purpose

**📊 SimulationResult** - Main summary table
```python
class SimulationResult(models.Model):
    simulation_id = UUIDField()          # Links to Simulation
    run_id = CharField()                 # Unique run identifier
    file_name = CharField()              # IDF filename
    building_name = CharField()          # Building identifier
    
    # Core energy metrics (kWh/m²)
    total_energy_use = FloatField()
    heating_demand = FloatField()
    cooling_demand = FloatField()
    lighting_demand = FloatField()
    equipment_demand = FloatField()
    
    # Environmental & cost
    gwp_total = FloatField()             # kg CO2e
    cost_total = FloatField()            # SEK
    
    # Building info
    total_area = FloatField()            # m²
    run_time = FloatField()              # seconds
    
    # Metadata
    status = CharField()                 # 'success' or 'error'
    error_message = TextField()
    raw_json = JSONField()               # Complete parsed result
    
    # Variant tracking
    variant_idx = IntegerField()
    idf_idx = IntegerField()
    construction_set_data = JSONField()
    
    user_id = IntegerField()
    created_at = DateTimeField()
```

**🏢 SimulationZone** - Zone-level details
```python
class SimulationZone(models.Model):
    simulation_result = ForeignKey(SimulationResult)
    zone_name = CharField()              # "Floor_1_Zone_1"
    area = FloatField()                  # m²
    volume = FloatField()                # m³
```

**⚡ SimulationEnergyUse** - Energy breakdown by end use
```python
class SimulationEnergyUse(models.Model):
    simulation_result = ForeignKey(SimulationResult)
    end_use = CharField()                # "Heating", "Cooling", etc.
    electricity = FloatField()           # kWh
    district_heating = FloatField()      # kWh
    total = FloatField()                 # kWh
```

**📈 SimulationHourlyTimeseries** - 8760 hourly values
```python
class SimulationHourlyTimeseries(models.Model):
    simulation_result = ForeignKey(SimulationResult)
    has_hourly = BooleanField()
    hourly_values = JSONField()          # Array of ~8760 floats
```

#### Data Flow: File to Database

```python
# Location: backend/simulation/services.py

def process_file_results(output_file: Path, idf_file):
    """Process and store results for a single IDF file."""
    
    # 1. Parse HTML file
    html_path = output_file.with_suffix('.htm')
    results = parse_html_with_table_lookup(html_path, log_path, [idf_file])
    
    # 2. Parse CSV if exists (hourly data)
    csv_path = output_file.with_suffix('.csv')
    if csv_path.exists():
        hourly_data = parse_readvars_csv(csv_path)
        results['hourly_timeseries'] = hourly_data
    
    # 3. Save as JSON file
    json_path = output_file.with_suffix('.json')
    with open(json_path, 'w') as f:
        json.dump(results, f)
    
    return results

def save_results_to_database(results, job_info):
    """Save parsed results to PostgreSQL."""
    
    # Create main result record
    simulation_result = SimulationResult.objects.create(
        simulation_id=self.simulation.id,
        total_energy_use=result.get("totalEnergyUse"),
        heating_demand=result.get("heatingDemand"),
        # ... all other fields
        raw_json=result,  # Store complete parsed data
    )
    
    # Create zone records
    for zone_data in result.get("zones", []):
        SimulationZone.objects.create(
            simulation_result=simulation_result,
            zone_name=zone_data.get("name"),
            area=zone_data.get("area"),
            volume=zone_data.get("volume")
        )
    
    # Create energy use records
    for end_use, values in result.get("energy_use", {}).items():
        SimulationEnergyUse.objects.create(
            simulation_result=simulation_result,
            end_use=end_use,
            electricity=values.get("electricity"),
            district_heating=values.get("district_heating"),
            total=values.get("total")
        )
    
    # Create hourly timeseries (if available)
    hourly_payload = result.get('hourly_timeseries')
    if hourly_payload:
        SimulationHourlyTimeseries.objects.create(
            simulation_result=simulation_result,
            has_hourly=True,
            hourly_values=hourly_payload
        )
```

## Parsing Strategy

### HTML Parsing (Primary Method)

**Function**: `parse_html_with_table_lookup()`  
**Location**: `backend/simulation/services.py:656`

**What it does**:
1. Reads `output.htm` using BeautifulSoup
2. Extracts data from specific HTML tables:
   - "Site and Source Energy" → Total energy use
   - "Building Area" → Total area
   - "End Uses" → Energy breakdown by end use
   - "Zone Summary" → Zone-level data
3. Reads `run_output.log` for runtime information
4. Normalizes all values (e.g., energy per m²)

**Example parsing logic**:
```python
def get_value_from_table(table_title, row_label, col_index=1):
    """Locate a table by title and return value at row_label and column index."""
    table_header = soup.find('b', string=table_title)
    table = table_header.find_next('table')
    for row in table.find_all('tr'):
        cells = row.find_all('td')
        if cells and row_label in cells[0].text.strip():
            return float(cells[col_index].text.strip())

# Usage
total_energy_use = get_value_from_table("Site and Source Energy", "Total Site Energy", 2)
total_area = get_value_from_table("Building Area", "Total Building Area")
heating_kwh = get_value_from_table("End Uses", "Heating", 12)
```

### CSV Parsing (Hourly Timeseries)

**Function**: `parse_readvars_csv()`  
**Location**: `backend/simulation/services.py`

**What it does**:
1. Reads EnergyPlus `output.csv` (generated by ReadVars utility)
2. Extracts hourly timeseries for variables like:
   - Zone Mean Air Temperature
   - Facility Total HVAC Electric Demand Power
   - etc.
3. Returns JSON structure with ~8760 hourly values

**CSV Structure**:
```csv
Date/Time,ZONE1:Zone Mean Air Temperature [C],Facility Total HVAC [J]
01/01  01:00:00,20.5,1234567.89
01/01  02:00:00,20.3,1245678.90
... (8760 rows total)
```

**Parsed Output**:
```python
{
    "is_hourly": True,
    "date_time": ["01/01 01:00:00", "01/01 02:00:00", ...],
    "variables": {
        "ZONE1:Zone Mean Air Temperature [C]": [20.5, 20.3, ...],
        "Facility Total HVAC [J]": [1234567.89, 1245678.90, ...]
    }
}
```

### Log Parsing (Runtime Extraction)

**What it does**:
1. Reads `run_output.log`
2. Extracts runtime with regex:
   ```python
   runtime_match = re.search(
       r'EnergyPlus Run Time=(\d+)hr\s+(\d+)min\s+([\d\.]+)sec', 
       log_content
   )
   ```
3. Converts to seconds

## When is Data Parsed?

### Timeline

```
Simulation Start
       │
       ▼
EnergyPlus Runs
  (generates output.htm, output.csv, etc.)
       │
       ▼
process_file_results()
  ├─ Parse HTML → extract metrics
  ├─ Parse CSV → extract hourly data
  ├─ Save to output.json
  └─ Return results dict
       │
       ▼
save_results_to_database()
  ├─ Save to SimulationResult
  ├─ Save zones to SimulationZone
  ├─ Save energy breakdown to SimulationEnergyUse
  └─ Save hourly data to SimulationHourlyTimeseries
       │
       ▼
Simulation Complete
```

**Key Point**: ✅ **Parsed ONCE during simulation, stored in DB, NOT parsed on-the-fly**

## API Access Patterns

### Get Parsed Summary (from Database)

```
GET /api/simulation/results/
```

**Returns**: Database records (fast, indexed, queryable)
```json
[
  {
    "id": "...",
    "simulation_id": "a1b2c3d4-...",
    "file_name": "building1.idf",
    "total_energy_use": 120.5,
    "heating_demand": 80.2,
    "cooling_demand": 25.3,
    "total_area": 1000.0,
    "status": "success",
    "raw_json": { ... }
  }
]
```

**Use case**: 
- Results page tables
- Filtering/sorting
- Quick metrics display
- Charts and visualizations

### Get Raw HTML Report (from File System)

```
GET /api/simulation/<id>/download/
```

**Returns**: `output.html` file (or `.htm`, or ZIP)

**Use case**:
- Detailed EnergyPlus report viewing
- Browser display of full results
- Backup/archival

### Get Combined Results (from File System)

```
GET /api/simulation/<id>/results/
```

**Returns**: `combined_results.json` file

**Use case**:
- Batch simulation results
- Export/download
- Legacy compatibility

## Storage Sizes

### Typical Single Simulation

| Component | Size | Count | Total |
|-----------|------|-------|-------|
| IDF file | 50KB | 1 | 50KB |
| EPW file | 2MB | 1 | 2MB |
| HTML output | 500KB | 1 | 500KB |
| CSV output | 3MB | 1 | 3MB |
| JSON parsed | 50KB | 1 | 50KB |
| Logs | 100KB | 1 | 100KB |
| **Files Total** | | | **~5.7MB** |
| **Database** | | | **~10KB** |

### Batch Simulation (100 buildings)

| Component | Total |
|-----------|-------|
| Files on disk | ~570MB |
| Database records | ~1MB |
| **Total** | **~571MB** |

## Performance Considerations

### ✅ **Advantages of Hybrid Approach**

1. **Fast Queries**: Summary data in database with indexes
2. **Detailed Access**: Raw HTML/CSV available when needed
3. **Flexibility**: Can re-parse files if parsing logic changes
4. **Backup**: Multiple copies of same data (file + DB)

### ⚠️ **Potential Issues**

1. **Disk Space**: Files accumulate (~6MB per simulation)
2. **No Cleanup**: Old simulations not automatically deleted
3. **Sync Risk**: File and DB could become inconsistent
4. **Hourly Data Size**: 8760 values in JSON can be large

## Data Retention

### Current Behavior

❌ **No automatic cleanup** - Files and database records persist indefinitely

### Recommendations

1. **Add cleanup policy**:
   ```python
   # Delete simulations older than 90 days
   old_sims = Simulation.objects.filter(
       created_at__lt=timezone.now() - timedelta(days=90),
       status='completed'
   )
   for sim in old_sims:
       # Delete files
       shutil.rmtree(f'media/simulation_results/{sim.id}')
       # Delete database records (cascade)
       sim.delete()
   ```

2. **Archive old results** to cheaper storage (S3, object storage)

3. **Compress old files** (gzip the JSON/HTML/CSV)

## Access Control

### Current State

⚠️ **Limited access control**:
- Files stored in `media/` directory
- No URL signing or expiration
- If you know the path, you can access the file
- Database queries can filter by `user_id`, but not enforced

### Recommended Improvements

```python
# Add access check before serving files
def download_file(request, simulation_id):
    simulation = Simulation.objects.get(id=simulation_id)
    
    # Check ownership
    if simulation.user != request.user:
        return HttpResponse('Forbidden', status=403)
    
    # Serve file
    file_path = f'media/simulation_results/{simulation_id}/output.html'
    return FileResponse(open(file_path, 'rb'))
```

## Summary Table

| Aspect | File System | Database |
|--------|-------------|----------|
| **Storage Location** | `backend/media/` | PostgreSQL |
| **Data Type** | Raw HTML, CSV, logs | Parsed summary metrics |
| **Size per Simulation** | ~6MB | ~10KB |
| **Access Speed** | Slower (file I/O) | Fast (indexed queries) |
| **Queryable** | ❌ No | ✅ Yes |
| **Detailed** | ✅ Complete EnergyPlus output | ⚠️ Summary only |
| **Parsed** | Source data | ✅ Pre-parsed |
| **Use Case** | Detailed review, backup | Charts, filtering, exports |
| **Retention** | Manual cleanup needed | Cascade delete with Simulation |

## Key Takeaways

1. ✅ **Raw results** (HTML, CSV, logs) are stored in `media/simulation_results/`
2. ✅ **Summary metrics** are parsed from HTML and saved to database
3. ✅ **Hourly timeseries** are parsed from CSV and stored as JSON in database
4. ✅ **Parsing happens ONCE** during simulation, not on-the-fly
5. ⚠️ **Both storage methods** are used (files for detail, DB for querying)
6. ⚠️ **No automatic cleanup** - files accumulate over time
7. ⚠️ **Limited access control** on file downloads

---

**Last Updated**: 2025-10-07  
**Document Version**: 1.0  
**Related**: [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), [DEVELOPMENT.md](DEVELOPMENT.md)
