# 3D Viewer with Dragonfly Display Integration

## Overview

This document describes the implementation of 3D building visualization using Dragonfly's display capabilities. The feature allows users to preview their building models with proper geometry, windows, walls, and construction types before running EnergyPlus simulations.

## Architecture

### Backend: Model3DGenerator

**Location:** `/backend/geojson_processor/model_3d_generator.py`

The generator uses Dragonfly models created during IDF conversion to generate 3D visualizations:

1. **Primary Method:** `generate_from_dragonfly_model(dfjson_path)`
   - Loads existing `.dfjson` file created during IDF conversion
   - Uses `dragonfly-display` library if available for rich visualization
   - Falls back to basic geometry extraction if dragonfly-display is unavailable

2. **Dragonfly-Display Integration:**
   ```python
   from dragonfly_display.model import model_to_vis_set
   vis_set = model_to_vis_set(model)
   vis_dict = vis_set.to_dict()
   ```
   - Creates a VisualizationSet with proper building components
   - Includes walls, windows, roofs, floors with type-based coloring
   - Exports as JSON compatible with web viewers

3. **Fallback Visualization:** `_generate_basic_visualization(model)`
   - Extracts building footprints and heights from Dragonfly model
   - Creates simple box geometries with top, bottom, and wall faces
   - Includes building properties (program type, construction set)

### Frontend: ModelViewer3D Component

**Location:** `/frontend/src/components/selectarea/ModelViewer3D.tsx`

Three.js-based 3D viewer with the following features:

**Features:**
- Interactive 3D scene with OrbitControls
- Support for multiple formats (JSON, glTF, OBJ)
- Automatic camera positioning based on model bounds
- Building statistics display (count, vertices, faces)
- Zoom, pan, rotate controls
- Reset view button
- Responsive design with full-height container

**JSON Format Support:**
- Dragonfly-display VisualizationSet format (preferred)
- Basic geometry format with vertices/faces arrays
- Automatic building coloring by index

### Integration Point: SelectAreaPage

**Location:** `/frontend/src/components/selectarea/SelectAreaPage.tsx`

**Workflow:**
1. User draws area on map and clicks "Fetch Area"
2. Backend processes area:
   - Downloads building data from DTCC
   - Converts to Dragonfly model
   - Generates IDF file
   - **Creates .dfjson file** (Dragonfly JSON)
   - Generates 3D visualization from .dfjson
3. Frontend receives `model_url` in API response
4. ModelViewer3D displays below the map
5. User can preview the model before clicking "Simulate Baseline"

## API Response Structure

```json
{
  "success": true,
  "message": "IDF files generated successfully",
  "idf_path": "geojson_processing/{uuid}/city.idf",
  "geojson_path": "geojson_processing/{uuid}/city_enriched.geojson",
  "model_url": "/media/geojson_processing/{uuid}/model_3d.json",
  "work_dir": "geojson_processing/{uuid}"
}
```

## File Structure

After processing, the work directory contains:

```
geojson_processing/{uuid}/
├── city.geojson              # Original GeoJSON
├── city_enriched.geojson     # GeoJSON with building properties
├── city.dfjson               # Dragonfly model (input for 3D viewer)
├── city.idf                  # EnergyPlus IDF file
└── model_3d.json             # 3D visualization file
```

## Benefits of Dragonfly Integration

### 1. **Rich Geometry**
   - Proper wall faces with window penetrations
   - Roof geometry with correct slopes
   - Floor slabs and ground contact surfaces
   - Shading devices (overhangs, fins)

### 2. **Type-Based Visualization**
   - Walls colored by construction type
   - Windows distinguished from opaque surfaces
   - Shading devices highlighted
   - Different building types color-coded

### 3. **Property Information**
   - Program type (residential, office, retail)
   - Construction set (thermal properties)
   - Window-to-wall ratio
   - Building height and floor count

### 4. **Consistency**
   - Same model used for IDF and visualization
   - What you see is what gets simulated
   - No discrepancies between preview and simulation

## Usage Example

### Backend (views.py)

```python
# After IDF conversion (which creates city.dfjson)
dfjson_path = work_dir / 'city.dfjson'

model_generator = Model3DGenerator(str(work_dir))
model_3d_path = model_generator.generate_from_dragonfly_model(
    str(dfjson_path)
)
```

### Frontend (SelectAreaPage.tsx)

```tsx
// After fetching area
<ModelViewer3D
  modelUrl={`${API_BASE_URL}${modelUrl}`}
  modelType="json"
  style={{ minHeight: '500px', flex: 1 }}
/>
```

## Dragonfly-Display Features

When `dragonfly-display` is installed, the visualization includes:

1. **Geometry Types:**
   - `Face3D` - Building surfaces (walls, roofs, floors)
   - `LineSegment3D` - Edge lines
   - `Point3D` - Vertices and key points

2. **Display Properties:**
   - Colors by surface type (wall, roof, floor, window)
   - Line weights for emphasis
   - Transparency for glass surfaces
   - Material properties visualization

3. **Metadata:**
   - Surface area calculations
   - Orientation (azimuth, tilt)
   - Boundary conditions (outdoor, ground, adiabatic)
   - Construction assemblies

## Fallback Behavior

If `dragonfly-display` is not installed:

1. Basic box geometries are created
2. Simple triangulated faces (walls, top, bottom)
3. Uniform coloring by building index
4. Basic properties (height, program type)

## Testing

### Test the Feature

1. **Start the application:**
   ```bash
   ./scripts/start.sh
   ```

2. **Navigate to Select Area page**

3. **Draw an area containing buildings**

4. **Click "Fetch Area"**
   - Wait for processing dialog
   - Dialog should close automatically
   - Map shrinks to 400px height
   - 3D viewer appears below map

5. **Interact with 3D model:**
   - Left-click + drag: Rotate
   - Right-click + drag: Pan
   - Scroll: Zoom
   - Click "Reset View" to recenter

6. **Check statistics:**
   - Building count
   - Vertex count
   - Face count

7. **Click "Simulate Baseline"** to proceed to simulation

### Check Backend Logs

```bash
docker-compose logs backend | grep "3D model"
```

Expected output:
```
Generating 3D model for preview...
Loading Dragonfly model from .../city.dfjson
Using dragonfly-display for visualization...
Generated dragonfly-display visualization: .../model_3d.json
```

Or with fallback:
```
dragonfly-display not available, falling back to basic visualization
Generated basic visualization with X buildings
```

## Troubleshooting

### Model Not Visible

1. **Check console for errors:**
   - Open browser DevTools (F12)
   - Look for Three.js errors or failed model load

2. **Verify model URL:**
   - Check network tab for `/media/geojson_processing/{uuid}/model_3d.json`
   - Should return 200 status with JSON content

3. **Check backend logs:**
   ```bash
   docker-compose logs backend | tail -50
   ```

### Model Appears Empty

1. **Verify .dfjson exists:**
   ```bash
   docker-compose exec backend ls -la /app/media/geojson_processing/{uuid}/
   ```

2. **Check dragonfly-display installation:**
   ```bash
   docker-compose exec backend pip list | grep dragonfly
   ```

3. **Inspect model_3d.json structure:**
   - Download via browser: `http://localhost:8000/media/geojson_processing/{uuid}/model_3d.json`
   - Check for `buildings` array with geometry

### Coordinate Issues

The Dragonfly model uses local coordinates (meters) centered at the origin, so coordinate transformation should not be an issue. If buildings appear too far:

1. Check the Dragonfly model creation in `geojson_to_idf.py`
2. Verify `Point2D(0, 0)` is used as the origin
3. Ensure `units='Meters'` is set

## Future Enhancements

1. **Color by Construction Type:**
   - Parse construction set assignments
   - Use different colors for residential vs commercial

2. **Window Highlighting:**
   - Distinguish windows from walls
   - Show window-to-wall ratio visually

3. **Interactive Selection:**
   - Click on buildings to see properties
   - Highlight on hover
   - Display tooltips with building info

4. **Export Options:**
   - Download as glTF for external viewers
   - Export as OBJ for CAD software
   - Generate PDF render

5. **Performance Optimization:**
   - Level-of-detail for large models
   - Instancing for repeated geometries
   - Progressive loading

## Dependencies

### Backend
```
dragonfly-core>=1.25.0
dragonfly-display>=1.0.0  # Optional but recommended
honeybee-core>=1.50.0
ladybug-geometry>=1.25.0
```

### Frontend
```
three@^0.160.0
@types/three@^0.160.0
```

## Related Files

- `/backend/geojson_processor/model_3d_generator.py` - 3D model generation
- `/backend/geojson_processor/views.py` - API endpoint integration
- `/backend/geojson_processor/geojson_to_idf.py` - Dragonfly model creation
- `/frontend/src/components/selectarea/ModelViewer3D.tsx` - 3D viewer component
- `/frontend/src/components/selectarea/SelectAreaPage.tsx` - Page integration
- `/docs/3D_VIEWER_FEATURE.md` - Original feature documentation
- `/docs/TESTING_3D_VIEWER.md` - Testing guide

## References

- [Dragonfly Documentation](https://www.ladybug.tools/dragonfly-core/docs/)
- [Dragonfly Display](https://github.com/ladybug-tools/dragonfly-display)
- [Three.js Documentation](https://threejs.org/docs/)
- [VisualizationSet Schema](https://www.ladybug.tools/ladybug-display-schema/visualization.html)
