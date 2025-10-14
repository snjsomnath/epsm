# Dragonfly Model Validation

## Overview

The EPSM GeoJSON to IDF converter now includes automatic validation of Dragonfly models to ensure they meet quality standards before conversion to Honeybee/EnergyPlus format.

## Features

### Automatic Validation
During the GeoJSON to IDF conversion process, the Dragonfly model is automatically validated after it's created and before conversion to Honeybee format. This catches potential issues early in the pipeline.

### Validation Checks

The validation system supports multiple check functions from the Dragonfly Model class:

- **`check_all`** (default): Runs all available validation checks
- **`check_no_orphaned_geometry`**: Ensures no geometry is disconnected
- **`check_room_2d_self_intersection`**: Verifies rooms don't self-intersect
- **`check_planar`**: Checks that all surfaces are planar
- **`check_missing_adjacencies`**: Identifies missing adjacency definitions
- **`check_rooms_solid`**: Validates room geometry is solid

### Output Formats

#### Plain Text Format
```
Validating Model using dragonfly-core==1.x.x and dragonfly-schema==1.x.x
✅ Congratulations! Your Model is valid!
```

Or with errors:
```
Validating Model using dragonfly-core==1.x.x and dragonfly-schema==1.x.x
❌ Your Model is invalid for the following reasons:
- Building1 has self-intersecting geometry
- Building2 has missing adjacency definitions
```

#### JSON Format
```json
{
    "type": "ValidationReport",
    "app_name": "Dragonfly",
    "app_version": "1.x.x",
    "schema_version": "1.x.x",
    "valid": true,
    "errors": [],
    "fatal_error": ""
}
```

## Usage

### During GeoJSON Processing

The validation happens automatically when you run the conversion:

```python
from pathlib import Path
from geojson_processor.geojson_to_idf import GeoJSONToIDFConverter

converter = GeoJSONToIDFConverter(work_dir='./output')
idf_path, gbxml_path = converter.process(
    geojson_path=Path('./input.geojson'),
    filter_height_min=3,
    filter_height_max=100,
    filter_area_min=100,
    use_multiplier=False
)
# Validation happens automatically and logs results
```

### Manual Validation

You can also validate models manually:

```python
from dragonfly.model import Model
from geojson_processor.geojson_to_idf import GeoJSONToIDFConverter

# Load a model
model = Model.from_file('./city.dfjson')

# Create converter instance
converter = GeoJSONToIDFConverter(work_dir='./validation_output')

# Validate with default settings (check_all)
result = converter.validate_dragonfly_model(model)
print(result)

# Validate with specific check function
result = converter.validate_dragonfly_model(
    model,
    check_function='check_missing_adjacencies'
)
print(result)

# Get JSON output
result_json = converter.validate_dragonfly_model(
    model,
    check_function='check_all',
    json_output=True
)
print(result_json)
```

### Validate from File

You can validate directly from a DFJSON file:

```python
converter = GeoJSONToIDFConverter(work_dir='./validation_output')

# Pass file path instead of model object
result = converter.validate_dragonfly_model('./city.dfjson')
print(result)
```

### Validate from JSON String

```python
import json
from dragonfly.model import Model

# Get model as JSON string
model = Model.from_file('./city.dfjson')
model_json = json.dumps(model.to_dict())

# Validate from JSON string
converter = GeoJSONToIDFConverter(work_dir='./validation_output')
result = converter.validate_dragonfly_model(model_json)
print(result)
```

## Method Signature

```python
def validate_dragonfly_model(
    self,
    model,                              # Model object, file path, or JSON string
    check_function: str = 'check_all',  # Validation function to use
    check_args: Optional[List] = None,  # Arguments for the check function
    json_output: bool = False           # Return JSON instead of plain text
) -> str:
    """
    Validate a Dragonfly Model and generate a validation report.
    
    Args:
        model: A Dragonfly Model object to validate. Can also be:
               - File path to a DFJSON file
               - JSON string representation of a Model
        check_function: Name of check function on Model class
                       (e.g., 'check_all', 'check_rooms_solid')
        check_args: Optional list of arguments for the check function
        json_output: If True, return JSON formatted report
    
    Returns:
        Validation report as string (plain text or JSON)
    """
```

## Integration in Pipeline

The validation is integrated into the `convert_to_idf()` method:

1. **GeoJSON loaded** → Create Dragonfly Model from GeoJSON
2. **Adjust properties** → Apply building types, constructions, windows
3. **Save DFJSON** → Export model to `city.dfjson`
4. **✨ VALIDATE** → Run validation checks (NEW!)
5. **Convert to Honeybee** → Create Honeybee model
6. **Generate IDF** → Export EnergyPlus IDF file

## Logging

Validation results are automatically logged:

```
INFO - Validating Dragonfly model...
INFO - Validation result: Validating Model using dragonfly-core==1.x.x and dragonfly-schema==1.x.x
✅ Congratulations! Your Model is valid!
```

Or if errors are found:

```
INFO - Validating Dragonfly model...
WARNING - Validation result: Validating Model using dragonfly-core==1.x.x and dragonfly-schema==1.x.x
❌ Your Model is invalid for the following reasons:
- Building1 has self-intersecting geometry
```

## Error Handling

If validation fails due to an exception:

```python
try:
    result = converter.validate_dragonfly_model(model)
except Exception as e:
    logger.error(f"Validation error: {e}")
```

The method includes built-in error handling and will return a formatted error message instead of raising exceptions.

## Testing

Use the provided test script to verify validation:

```bash
cd backend
python test_df_validation.py
```

## Common Validation Issues

### Self-Intersecting Geometry
**Problem:** Room polygons intersect themselves  
**Solution:** Check GeoJSON input for invalid polygons, simplify complex geometries

### Missing Adjacencies
**Problem:** Rooms share walls but adjacencies aren't defined  
**Solution:** Enable `solve_ceiling_adjacencies=True` in `to_honeybee()` call

### Non-Planar Surfaces
**Problem:** Building surfaces aren't perfectly flat  
**Solution:** Check height data in GeoJSON, ensure consistent ground heights

### Orphaned Geometry
**Problem:** Geometry exists without parent building  
**Solution:** Review filtering and enrichment steps in pipeline

## Version Information

The validation report includes version information for:
- **dragonfly-core**: Core Dragonfly library version
- **dragonfly-schema**: Dragonfly schema version

This helps track compatibility and reproduce validation results.

## Future Enhancements

Potential improvements:
- [ ] Add custom validation rules for Swedish building codes
- [ ] Export validation reports to separate JSON files
- [ ] Add validation metrics to database for tracking
- [ ] Create validation dashboard in frontend
- [ ] Support batch validation of multiple models
- [ ] Add repair/auto-fix capabilities for common issues

## References

- [Dragonfly Documentation](https://www.ladybug.tools/dragonfly-core/docs/)
- [Ladybug Tools](https://www.ladybug.tools/)
- [EnergyPlus](https://energyplus.net/)

## License

This validation feature incorporates code patterns from the Ladybug Tools project and is licensed under GPL v3 in accordance with the project's open-source requirements.
