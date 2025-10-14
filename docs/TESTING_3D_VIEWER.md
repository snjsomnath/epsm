# Testing the 3D Model Viewer Feature

## Setup Complete ✅

### What Was Installed:
- ✅ `three` (Three.js 3D library)
- ✅ `@types/three` (TypeScript definitions)
- ✅ Backend `Model3DGenerator` module
- ✅ Frontend `ModelViewer3D` component
- ✅ Integration with `SelectAreaPage`

## How to Test

### 1. Start the Application
```bash
cd /Users/ssanjay/GitHub/epsm
./scripts/start.sh
```

### 2. Navigate to Select Area Page
- Open browser: http://localhost:5173
- Login if needed (demo@chalmers.se / demo123)
- Go to "Select Area" page

### 3. Test the Feature

#### Step 1: Draw an Area
1. Wait for the map to load (Sweden should be visible)
2. Look for drawing tools in the **top-left** corner of the map
3. Click the Rectangle or Polygon tool
4. Draw an area on the map (try a small area in Sweden first)

#### Step 2: Fetch Building Data
1. Once you've drawn an area, click the **"Fetch Area"** button
2. Wait for processing (shows progress dialog)
3. Dialog should say "3D model generated! Review it below."

#### Step 3: View 3D Model
1. The **3D viewer should appear below the map**
2. The map should shrink to 400px height
3. The 3D viewer should show:
   - Buildings in 3D
   - Statistics (buildings count, vertices, faces)
   - Interactive controls

#### Step 4: Interact with 3D Model
- **Rotate**: Left-click and drag
- **Pan**: Right-click and drag
- **Zoom**: Scroll wheel
- **Buttons**:
  - Zoom In (+)
  - Zoom Out (-)
  - Reset View (↻)

#### Step 5: Simulate
1. Review the building geometry
2. Click **"Simulate Baseline"** button at the bottom
3. Should navigate to the Baseline page with IDF data

## Expected Behavior

### ✅ Success Indicators:
- Map loads and drawing tools appear
- Area can be drawn and edited
- "Fetch Area" button becomes enabled after drawing
- Processing dialog shows progress
- 3D viewer appears with buildings
- Buildings are colored (blue/teal by default)
- Ground plane and grid are visible
- Controls are responsive
- Statistics show correct counts
- "Simulate Baseline" button is visible and clickable

### ❌ Common Issues:

#### If 3D viewer doesn't appear:
- Check browser console for errors
- Verify Three.js is loaded: `docker-compose exec frontend npm list three`
- Check backend response includes `model_url` field

#### If model shows but is empty:
- Backend may have failed to generate 3D model
- Check backend logs: `docker-compose logs backend | grep "3D model"`
- Verify GeoJSON has building data

#### If controls don't work:
- Check for JavaScript errors in console
- Ensure OrbitControls are initialized
- Try refreshing the page

## Testing Different Scenarios

### Small Area (Quick Test)
- Draw a small rectangle (~500m x 500m)
- Should have 5-20 buildings
- Fast processing (<10 seconds)

### Medium Area
- Draw a larger rectangle (~1km x 1km)
- May have 50-200 buildings
- Processing 20-30 seconds

### Large Area (Stress Test)
- Draw a 2km x 2km area
- 200+ buildings
- May take 60+ seconds
- Test viewer performance

## API Response Example

When the backend successfully generates a 3D model, the response should include:

```json
{
  "success": true,
  "message": "IDF files generated successfully",
  "idf_path": "geojson_processing/12345/city.idf",
  "geojson_path": "geojson_processing/12345/city_enriched.geojson",
  "model_url": "/media/geojson_processing/12345/model_3d.json",
  "idf_url": "/media/geojson_processing/12345/city.idf",
  "geojson_url": "/media/geojson_processing/12345/city_enriched.geojson"
}
```

The key field is **`model_url`** - this tells the frontend where to load the 3D model from.

## Debugging

### Check Backend Logs
```bash
docker-compose logs backend | tail -50
```
Look for:
- "Generating 3D model for preview..."
- "Generated 3D model: /path/to/model_3d.json"

### Check Frontend Console
Open browser DevTools (F12) and look for:
- Three.js initialization messages
- Model loading status
- Any error messages

### Verify Files Generated
```bash
# Check if 3D model file exists
docker-compose exec backend ls -lh media/geojson_processing/
```

### Test 3D Model URL Directly
After fetching an area, copy the `model_url` from the API response and try accessing it:
```
http://localhost:8000/media/geojson_processing/{uuid}/model_3d.json
```

Should return JSON with building geometry.

## Performance Notes

- Small areas (<50 buildings): Instant rendering
- Medium areas (50-200 buildings): 1-2 second load time
- Large areas (200-500 buildings): 3-5 seconds, may lag on rotation
- Very large areas (500+ buildings): Consider implementing LOD (Level of Detail)

## Next Steps

After verifying the feature works:

1. **Test with real Swedish areas** (Gothenburg, Stockholm, etc.)
2. **Verify building heights** look reasonable in 3D
3. **Check that simulation proceeds** correctly after viewing
4. **Test on different browsers** (Chrome, Firefox, Safari)
5. **Consider adding features** like color coding by building type

## Support

If you encounter issues:
1. Check this testing guide
2. Review browser console logs
3. Check Docker logs for backend
4. Verify Three.js is installed in container
5. Ensure model_url is in API response

---

**Date Created**: October 14, 2025
**Feature**: 3D Model Viewer
**Status**: Ready for Testing
